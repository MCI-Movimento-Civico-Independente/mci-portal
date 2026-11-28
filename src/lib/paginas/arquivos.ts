import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ARQUIVO, COTA_PROJETO, IMAGEM } from "@/lib/limites";
import {
  ARQUIVO_GRANDE,
  conteudoConfere,
  extensaoDe,
  IMAGEM_GRANDE,
  nomeLimpo,
  RECUSA_TIPO,
  SEM_ESPACO,
  type Especie,
  type Uso,
} from "./arquivos-tipos";

// Mesmo modelo de acesso das páginas: quem chama já conferiu o login e o papel.

export const BUCKET_PAGINAS = "paginas";
/** Um pedido de envio ainda não confirmado reserva espaço por este tempo. */
const RESERVA_MS = 60 * 60 * 1000;
const PAGINA_DE_LINHAS = 1000;

type Recusa = { erro: string; status: number };

export async function usoDoProjeto(projetoId: string, ignorar?: string): Promise<Uso> {
  const limiteReserva = new Date(Date.now() - RESERVA_MS).toISOString();
  let usado = 0;
  for (let de = 0; ; de += PAGINA_DE_LINHAS) {
    const { data, error } = await createAdminClient()
      .from("projeto_arquivos")
      .select("id, tamanho")
      .eq("projeto_id", projetoId)
      .is("excluido_em", null)
      .or(`confirmado.eq.true,criado_em.gt."${limiteReserva}"`)
      .order("id")
      .range(de, de + PAGINA_DE_LINHAS - 1);
    if (error) throw error;
    for (const a of data ?? []) if (a.id !== ignorar) usado += Number(a.tamanho);
    if ((data?.length ?? 0) < PAGINA_DE_LINHAS) return { usado, maximo: COTA_PROJETO.maxBytes };
  }
}

/** Confere tipo, tamanho e cota, registra o arquivo e devolve a URL assinada de envio. */
export async function reservarEnvio(
  aba: { id: string; projeto_id: string },
  autorId: string,
  pedido: { nome: string; tamanho: number; especie: Especie },
): Promise<{ id: string; caminho: string; token: string; tipo: string; uso: Uso } | Recusa> {
  const nome = nomeLimpo(pedido.nome);
  const ext = pedido.especie === "imagem" ? "webp" : extensaoDe(nome);
  if (!ext) return { erro: RECUSA_TIPO, status: 415 };
  const tipo = ext === "webp" ? IMAGEM.tipo : ARQUIVO.tipos[ext];
  if (pedido.especie === "imagem" && pedido.tamanho > IMAGEM.maxBytes) return { erro: IMAGEM_GRANDE, status: 413 };
  if (pedido.especie === "arquivo" && pedido.tamanho > ARQUIVO.maxBytes) return { erro: ARQUIVO_GRANDE, status: 413 };

  const uso = await usoDoProjeto(aba.projeto_id);
  if (uso.usado + pedido.tamanho > uso.maximo) return { erro: SEM_ESPACO, status: 403 };

  const db = createAdminClient();
  const caminho = `${aba.projeto_id}/${aba.id}/${crypto.randomUUID()}.${ext}`;
  const { data: url, error: erroUrl } = await db.storage.from(BUCKET_PAGINAS).createSignedUploadUrl(caminho);
  if (erroUrl || !url) throw erroUrl ?? new Error("Sem URL de upload.");
  const { data, error } = await db
    .from("projeto_arquivos")
    .insert({ projeto_id: aba.projeto_id, aba_id: aba.id, caminho, nome, tamanho: pedido.tamanho, tipo, criado_por: autorId })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id as string, caminho, token: url.token, tipo, uso: { ...uso, usado: uso.usado + pedido.tamanho } };
}

/**
 * Depois do envio direto ao Storage: lê o arquivo, confere tamanho real, primeiros bytes e cota.
 * Se não passar, apaga o arquivo e o registro.
 */
export async function confirmarEnvio(abaId: string, arquivoId: string, autorId: string): Promise<{ tamanho: number; uso: Uso } | Recusa> {
  const db = createAdminClient();
  const { data: linha, error } = await db
    .from("projeto_arquivos")
    .select("id, projeto_id, caminho, tipo, tamanho, confirmado")
    .eq("id", arquivoId)
    .eq("aba_id", abaId)
    .eq("criado_por", autorId)
    .maybeSingle();
  if (error) throw error;
  if (!linha) return { erro: "Arquivo não encontrado.", status: 404 };
  const projetoId = linha.projeto_id as string;
  if (linha.confirmado) return { tamanho: Number(linha.tamanho), uso: await usoDoProjeto(projetoId) };

  const caminho = linha.caminho as string;
  const { data: blob, error: erroDownload } = await db.storage.from(BUCKET_PAGINAS).download(caminho);
  if (erroDownload || !blob) return { erro: "O envio não terminou. Tente de novo.", status: 409 };

  const recusar = async (erro: string, status: number): Promise<Recusa> => {
    await db.storage.from(BUCKET_PAGINAS).remove([caminho]);
    await db.from("projeto_arquivos").delete().eq("id", arquivoId);
    return { erro, status };
  };
  const imagem = linha.tipo === IMAGEM.tipo;
  if (blob.size > (imagem ? IMAGEM.maxBytes : ARQUIVO.maxBytes)) return recusar(imagem ? IMAGEM_GRANDE : ARQUIVO_GRANDE, 413);
  if (!conteudoConfere(linha.tipo as string, new Uint8Array(await blob.arrayBuffer()))) {
    return recusar("O conteúdo do arquivo não bate com o tipo dele.", 415);
  }
  const antes = await usoDoProjeto(projetoId, arquivoId);
  if (antes.usado + blob.size > antes.maximo) return recusar(SEM_ESPACO, 403);

  const { error: erroUpd } = await db.from("projeto_arquivos").update({ confirmado: true, tamanho: blob.size }).eq("id", arquivoId);
  if (erroUpd) throw erroUpd;
  return { tamanho: blob.size, uso: { ...antes, usado: antes.usado + blob.size } };
}

/** URL assinada, gerada na hora. Com `baixar`, o navegador salva com o nome original. */
export async function urlDeLeitura(arquivoId: string, baixar: boolean, segundos: number): Promise<string | null> {
  const db = createAdminClient();
  const { data, error } = await db.from("projeto_arquivos").select("caminho, nome, confirmado").eq("id", arquivoId).maybeSingle();
  if (error) throw error;
  if (!data?.confirmado) return null;
  const { data: url, error: erroUrl } = await db.storage
    .from(BUCKET_PAGINAS)
    .createSignedUrl(data.caminho as string, segundos, baixar ? { download: data.nome as string } : undefined);
  if (erroUrl) throw erroUrl;
  return url.signedUrl;
}

/** Tipos dos arquivos confirmados do projeto, entre os pedidos (os que faltarem não são dele). */
export async function tiposDosArquivos(projetoId: string, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await createAdminClient()
    .from("projeto_arquivos")
    .select("id, tipo")
    .eq("projeto_id", projetoId)
    .eq("confirmado", true)
    .in("id", ids);
  if (error) throw error;
  return new Map((data ?? []).map((a) => [a.id as string, a.tipo as string]));
}

/**
 * Marca como excluídos os candidatos que nenhuma página ativa do projeto usa, e desmarca os
 * que voltaram a ser usados (desfazer, restaurar a página, colar em outra).
 * `daAba`: inclui como candidatos os enviados por aquela página.
 */
export async function sincronizarArquivos(projetoId: string, candidatos: string[], daAba?: string): Promise<void> {
  const db = createAdminClient();
  const ids = new Set(candidatos);
  if (daAba) {
    const { data, error } = await db.from("projeto_arquivos").select("id").eq("aba_id", daAba);
    if (error) throw error;
    for (const a of data ?? []) ids.add(a.id as string);
  }
  if (ids.size === 0) return;

  const { data: abas, error } = await db
    .from("projeto_abas")
    .select("pagina:projeto_paginas(arquivos)")
    .eq("projeto_id", projetoId)
    .is("excluido_em", null);
  if (error) throw error;
  type Pagina = { arquivos: string[] } | null;
  // A relação é um para um, mas aceitamos as duas formas que a API pode devolver.
  const usados = new Set(
    (abas as unknown as { pagina: Pagina | Pagina[] }[]).flatMap((a) => [a.pagina].flat().flatMap((p) => p?.arquivos ?? [])),
  );

  const fora = [...ids].filter((i) => !usados.has(i));
  const dentro = [...ids].filter((i) => usados.has(i));
  if (fora.length) {
    const r = await db.from("projeto_arquivos").update({ excluido_em: new Date().toISOString() }).in("id", fora).is("excluido_em", null);
    if (r.error) throw r.error;
  }
  if (dentro.length) {
    const r = await db.from("projeto_arquivos").update({ excluido_em: null }).in("id", dentro).not("excluido_em", "is", null);
    if (r.error) throw r.error;
  }
}

export type ArquivoDoProjeto = { id: string; nome: string; tamanho: number; pagina: string | null; criadoEm: string };

export async function listarArquivosDoProjeto(projetoId: string): Promise<ArquivoDoProjeto[]> {
  const { data, error } = await createAdminClient()
    .from("projeto_arquivos")
    .select("id, nome, tamanho, criado_em, aba:projeto_abas!aba_id(titulo)")
    .eq("projeto_id", projetoId)
    .eq("confirmado", true)
    .is("excluido_em", null)
    .order("tamanho", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data as unknown as { id: string; nome: string; tamanho: number; criado_em: string; aba: { titulo: string } | null }[]).map((a) => ({
    id: a.id,
    nome: a.nome,
    tamanho: Number(a.tamanho),
    pagina: a.aba?.titulo ?? null,
    criadoEm: a.criado_em,
  }));
}
