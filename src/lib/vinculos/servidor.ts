import "server-only";
import { podeVerProjeto, type Quem } from "@/lib/auth/projetos";
import type { Documento } from "@/lib/editor/documento";
import { createAdminClient } from "@/lib/supabase/admin";
import { extrairReferencias, idsCitados, type Referencia, type Rotulo } from "./referencias";
import { codigo, temAcesso, type GrupoVinculo, type TarefaVinculo, type TipoRef, type Vinculos } from "./tipos";

/** Todas as tarefas e grupos pedidos numa consulta só (função portal_vinculos no banco). */
export async function buscarVinculos(tarefas: string[], grupos: string[], quem: Quem): Promise<Vinculos> {
  const saida: Vinculos = { tarefas: {}, grupos: {} };
  if (!tarefas.length && !grupos.length) return saida;
  const { data, error } = await createAdminClient().rpc("portal_vinculos", { p_tarefas: tarefas, p_grupos: grupos });
  if (error) throw error;
  const r = data as { tarefas: TarefaVinculo[]; grupos: GrupoVinculo[] };
  for (const t of r.tarefas) {
    saida.tarefas[t.id] = podeVerProjeto(quem, t.projeto_id) ? { ...t, numero: Number(t.numero) } : { semAcesso: true };
  }
  for (const g of r.grupos) saida.grupos[g.id] = podeVerProjeto(quem, g.projeto_id) ? g : { semAcesso: true };
  return saida;
}

/**
 * Citações NOVAS da página (as que não estavam na versão gravada) precisam existir e ser de
 * projetos que a pessoa vê. As antigas passam: uma tarefa excluída não trava o salvamento.
 */
export async function citacoesValidas(novo: Documento, antigo: Documento | null, quem: Quem): Promise<boolean> {
  const agora = idsCitados(novo);
  const antes = idsCitados(antigo);
  const tarefas = [...agora.tarefa].filter((id) => !antes.tarefa.has(id));
  const grupos = [...agora.grupo].filter((id) => !antes.grupo.has(id));
  const v = await buscarVinculos(tarefas, grupos, quem);
  return tarefas.every((id) => temAcesso(v.tarefas[id])) && grupos.every((id) => temAcesso(v.grupos[id]));
}

/** Nomes para o texto de busca e para os trechos do "Mencionada em". */
export async function rotulosDe(doc: Documento, quem: Quem) {
  const ids = idsCitados(doc);
  const v = await buscarVinculos([...ids.tarefa], [...ids.grupo], quem);
  return (tipo: TipoRef, id: string) => {
    if (tipo === "grupo") {
      const g = v.grupos[id];
      return temAcesso(g) ? g.nome : "grupo removido";
    }
    const t = v.tarefas[id];
    return temAcesso(t) ? `${codigo(t.numero)} ${t.titulo}` : "tarefa removida";
  };
}

const chave = (r: Pick<Referencia, "tipo" | "refId" | "blocoId">) => `${r.tipo}:${r.refId}:${r.blocoId}`;

/** Grava só o que mudou nas citações de uma página. */
export async function sincronizarReferencias(abaId: string, doc: Documento, rotulo: Rotulo) {
  const db = createAdminClient();
  const novas = extrairReferencias(doc, rotulo);
  const { data, error } = await db.from("paginas_referencias").select("tipo, ref_id, bloco_id, trecho").eq("aba_id", abaId);
  if (error) throw error;
  const gravadas = new Map(
    (data ?? []).map((l) => [chave({ tipo: l.tipo as TipoRef, refId: l.ref_id as string, blocoId: l.bloco_id as string }), l.trecho as string]),
  );

  const querida = new Set(novas.map(chave));
  for (const velha of [...gravadas.keys()].filter((k) => !querida.has(k))) {
    const [tipo, refId, blocoId] = velha.split(":");
    const r = await db.from("paginas_referencias").delete().eq("aba_id", abaId).eq("tipo", tipo).eq("ref_id", refId).eq("bloco_id", blocoId);
    if (r.error) throw r.error;
  }
  const mudadas = novas.filter((n) => gravadas.get(chave(n)) !== n.trecho);
  if (mudadas.length) {
    const r = await db
      .from("paginas_referencias")
      .upsert(mudadas.map((n) => ({ aba_id: abaId, tipo: n.tipo, ref_id: n.refId, bloco_id: n.blocoId, trecho: n.trecho })));
    if (r.error) throw r.error;
  }
}

export type Mencao = { projetoId: string; abaId: string; pagina: string; blocoId: string; trecho: string };

/** Páginas (não excluídas) que citam a tarefa ou o grupo. */
export async function mencoesDe(tipo: TipoRef, refId: string, quem: Quem): Promise<Mencao[]> {
  const { data, error } = await createAdminClient()
    .from("paginas_referencias")
    .select("bloco_id, trecho, aba:projeto_abas!aba_id(id, titulo, projeto_id, posicao, excluido_em)")
    .eq("tipo", tipo)
    .eq("ref_id", refId)
    .limit(100);
  if (error) throw error;
  type Linha = { bloco_id: string; trecho: string; aba: { id: string; titulo: string; projeto_id: string; excluido_em: string | null } };
  return (data as unknown as Linha[])
    .filter((l) => !l.aba.excluido_em && podeVerProjeto(quem, l.aba.projeto_id))
    .map((l) => ({ projetoId: l.aba.projeto_id, abaId: l.aba.id, pagina: l.aba.titulo, blocoId: l.bloco_id, trecho: l.trecho }))
    .sort((a, b) => a.pagina.localeCompare(b.pagina, "pt-BR") || Number(a.blocoId) - Number(b.blocoId));
}
