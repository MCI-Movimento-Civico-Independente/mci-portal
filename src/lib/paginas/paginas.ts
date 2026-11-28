import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Documento } from "@/lib/editor/documento";
import { PAGINA } from "@/lib/limites";
import { textoPagina } from "./documento";

// Mesmo modelo de acesso do projeto: quem chama já conferiu o login e o papel.

export type Aba = { id: string; projeto_id: string; tipo: "pagina"; titulo: string; posicao: number };

const COLUNAS = "id, projeto_id, tipo, titulo, posicao";

export async function listarAbas(projetoId: string): Promise<Aba[]> {
  const { data, error } = await createAdminClient()
    .from("projeto_abas")
    .select(COLUNAS)
    .eq("projeto_id", projetoId)
    .is("excluido_em", null)
    .order("posicao")
    .order("criado_em");
  if (error) {
    // Migração ainda não aplicada: o projeto abre só com o quadro, em vez de quebrar.
    if (error.code === "PGRST205" || error.code === "42P01") {
      console.error("As tabelas de abas não existem: rode a migração 20261203120000_projeto_abas_paginas.sql.");
      return [];
    }
    throw error;
  }
  return (data ?? []) as Aba[];
}

/** A aba, se existir e não tiver sido excluída. */
export async function abaPorId(id: string): Promise<Aba | null> {
  const { data, error } = await createAdminClient()
    .from("projeto_abas")
    .select(COLUNAS)
    .eq("id", id)
    .is("excluido_em", null)
    .maybeSingle();
  if (error) throw error;
  return data as Aba | null;
}

/** Grava a ordem das abas: a posição é o índice na lista. */
async function gravarOrdem(ids: string[]) {
  const db = createAdminClient();
  for (const [posicao, id] of ids.entries()) {
    const { error } = await db.from("projeto_abas").update({ posicao }).eq("id", id);
    if (error) throw error;
  }
}

async function inserirPagina(
  aba: { projeto_id: string; titulo: string; posicao: number; criado_por: string },
  conteudo?: { conteudo: Documento; conteudo_texto: string },
): Promise<string> {
  const db = createAdminClient();
  const { data, error } = await db.from("projeto_abas").insert({ ...aba, tipo: "pagina" }).select("id").single();
  if (error) throw error;
  const id = data.id as string;
  const { error: erroPagina } = await db
    .from("projeto_paginas")
    .insert({ aba_id: id, atualizado_por: aba.criado_por, ...conteudo });
  if (erroPagina) {
    await db.from("projeto_abas").delete().eq("id", id);
    throw erroPagina;
  }
  return id;
}

export async function criarPagina(projetoId: string, autorId: string): Promise<string | null> {
  const { data, error } = await createAdminClient().from("projetos").select("id").eq("id", projetoId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const abas = await listarAbas(projetoId);
  const posicao = abas.reduce((m, a) => Math.max(m, a.posicao + 1), 0);
  return inserirPagina({ projeto_id: projetoId, titulo: "Nova página", posicao, criado_por: autorId });
}

export async function renomearAba(id: string, titulo: string): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("projeto_abas")
    .update({ titulo })
    .eq("id", id)
    .is("excluido_em", null)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** Reordena. Abas que a lista não citar (criadas por outra pessoa agora há pouco) vão para o fim. */
export async function reordenarAbas(projetoId: string, ids: string[]): Promise<void> {
  const atuais = (await listarAbas(projetoId)).map((a) => a.id);
  const pedidos = ids.filter((id) => atuais.includes(id));
  await gravarOrdem([...pedidos, ...atuais.filter((id) => !pedidos.includes(id))]);
}

/** Cópia da página, logo depois da original. */
export async function duplicarAba(id: string, autorId: string): Promise<string | null> {
  const aba = await abaPorId(id);
  if (!aba) return null;
  const { data, error } = await createAdminClient()
    .from("projeto_paginas")
    .select("conteudo, conteudo_texto")
    .eq("aba_id", id)
    .maybeSingle();
  if (error) throw error;
  const titulo = `${aba.titulo.slice(0, PAGINA.tituloMaxCaracteres - 8)} (cópia)`;
  const nova = await inserirPagina(
    { projeto_id: aba.projeto_id, titulo, posicao: aba.posicao + 1, criado_por: autorId },
    data ? { conteudo: data.conteudo as Documento, conteudo_texto: data.conteudo_texto as string } : undefined,
  );
  const ordem = (await listarAbas(aba.projeto_id)).map((a) => a.id).filter((i) => i !== nova);
  ordem.splice(ordem.indexOf(id) + 1, 0, nova);
  await gravarOrdem(ordem);
  return nova;
}

export async function excluirAba(id: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("projeto_abas")
    .update({ excluido_em: new Date().toISOString() })
    .eq("id", id)
    .is("excluido_em", null);
  if (error) throw error;
}

const inicioDaLixeira = () => new Date(Date.now() - PAGINA.diasNaLixeira * 24 * 60 * 60 * 1000).toISOString();

/** Páginas excluídas nos últimos dias, a mais recente primeiro. As mais antigas continuam no banco. */
export async function listarLixeira(projetoId: string): Promise<{ id: string; titulo: string; excluidoEm: string }[]> {
  const { data, error } = await createAdminClient()
    .from("projeto_abas")
    .select("id, titulo, excluido_em")
    .eq("projeto_id", projetoId)
    .gte("excluido_em", inicioDaLixeira())
    .order("excluido_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((a) => ({ id: a.id as string, titulo: a.titulo as string, excluidoEm: a.excluido_em as string }));
}

/** Tira a página da lixeira e a põe no fim das abas. */
export async function restaurarAba(id: string): Promise<boolean> {
  const db = createAdminClient();
  const { data: aba, error } = await db
    .from("projeto_abas")
    .select("projeto_id")
    .eq("id", id)
    .gte("excluido_em", inicioDaLixeira())
    .maybeSingle();
  if (error) throw error;
  if (!aba) return false;
  const abas = await listarAbas(aba.projeto_id as string);
  const posicao = abas.reduce((m, a) => Math.max(m, a.posicao + 1), 0);
  const { error: erroUpd } = await db.from("projeto_abas").update({ excluido_em: null, posicao }).eq("id", id);
  if (erroUpd) throw erroUpd;
  return true;
}

export type PaginaCarregada = {
  titulo: string;
  conteudo: Documento;
  versao: number;
  atualizadoPor: string | null;
  atualizadoEm: string;
};

type LinhaPagina = {
  conteudo: Documento;
  versao: number;
  atualizado_em: string;
  autor: { nome: string | null } | null;
};

const nomeDe = (autor: { nome: string | null } | null) => autor?.nome?.trim() || "Membro";

async function linhaDaPagina(abaId: string): Promise<LinhaPagina | null> {
  const { data, error } = await createAdminClient()
    .from("projeto_paginas")
    .select("conteudo, versao, atualizado_em, autor:contas!atualizado_por(nome)")
    .eq("aba_id", abaId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as LinhaPagina | null;
}

export async function carregarPagina(abaId: string): Promise<PaginaCarregada | null> {
  const [aba, linha] = await Promise.all([abaPorId(abaId), linhaDaPagina(abaId)]);
  if (!aba || !linha) return null;
  return {
    titulo: aba.titulo,
    conteudo: linha.conteudo,
    versao: linha.versao,
    atualizadoPor: linha.autor ? nomeDe(linha.autor) : null,
    atualizadoEm: linha.atualizado_em,
  };
}

export type ResultadoSalvar =
  | { tipo: "ok"; versao: number; atualizadoEm: string }
  | { tipo: "conflito"; por: string }
  | { tipo: "nao_achou" };

/** Só grava se a versão no banco ainda for a que a pessoa carregou (a conferência é no próprio update). */
export async function salvarPagina(abaId: string, versao: number, doc: Documento, autorId: string): Promise<ResultadoSalvar> {
  if (!(await abaPorId(abaId))) return { tipo: "nao_achou" };
  const agora = new Date().toISOString();
  const { data, error } = await createAdminClient()
    .from("projeto_paginas")
    .update({
      conteudo: doc,
      conteudo_texto: textoPagina(doc),
      versao: versao + 1,
      atualizado_por: autorId,
      atualizado_em: agora,
    })
    .eq("aba_id", abaId)
    .eq("versao", versao)
    .select("versao");
  if (error) throw error;
  if (data?.length) return { tipo: "ok", versao: versao + 1, atualizadoEm: agora };
  const atual = await linhaDaPagina(abaId);
  return atual ? { tipo: "conflito", por: nomeDe(atual.autor) } : { tipo: "nao_achou" };
}
