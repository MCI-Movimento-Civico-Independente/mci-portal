import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CORES_GRUPO, type CorGrupo, type GrupoBasico } from "./grupos-tipos";

// Mesmo modelo de acesso das tarefas: quem chama já conferiu a sessão e o papel.

const COLUNAS = "id, projeto_id, nome, cor, ordem";

export async function listarGrupos(projetoId?: string): Promise<GrupoBasico[]> {
  let consulta = createAdminClient().from("projeto_grupos").select(COLUNAS).order("ordem").order("criado_em");
  if (projetoId) consulta = consulta.eq("projeto_id", projetoId);
  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as GrupoBasico[];
}

/** Cria "Novo grupo" (ou "Novo grupo 2", 3...) já pronto para renomear e trocar a cor. */
export async function criarGrupoPadrao(projetoId: string): Promise<void> {
  const db = createAdminClient();
  const existentes = await listarGrupos(projetoId);
  const ordem = Math.max(0, ...existentes.map((g) => g.ordem)) + 1;
  const usados = new Set(existentes.map((g) => g.nome.trim().toLowerCase()));
  let nome = "Novo grupo";
  for (let n = 2; usados.has(nome.toLowerCase()); n++) nome = `Novo grupo ${n}`;
  const cor = CORES_GRUPO[existentes.length % CORES_GRUPO.length].valor;
  const { error } = await db.from("projeto_grupos").insert({ projeto_id: projetoId, nome, cor, ordem });
  if (error) throw error;
}

export async function atualizarGrupo(id: string, dados: { nome?: string; cor?: CorGrupo }): Promise<"ok" | "nome_em_uso" | "nao_achou"> {
  const { data, error } = await createAdminClient().from("projeto_grupos").update(dados).eq("id", id).select("id");
  if (error) {
    if (error.code === "23505") return "nome_em_uso";
    throw error;
  }
  return (data?.length ?? 0) > 0 ? "ok" : "nao_achou";
}

/**
 * As tarefas do grupo vão para o primeiro grupo que sobrar. O último grupo do projeto
 * não pode ser excluído (toda tarefa de projeto fica em algum grupo).
 */
export async function excluirGrupo(id: string): Promise<"ok" | "ultimo"> {
  const db = createAdminClient();
  const { data: alvo, error } = await db.from("projeto_grupos").select("projeto_id").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!alvo) return "ok";
  const outros = (await listarGrupos(alvo.projeto_id as string)).filter((g) => g.id !== id);
  if (outros.length === 0) return "ultimo";
  const { error: erroMover } = await db.from("tarefas").update({ grupo_id: outros[0].id }).eq("grupo_id", id);
  if (erroMover) throw erroMover;
  const { error: erroDel } = await db.from("projeto_grupos").delete().eq("id", id);
  if (erroDel) throw erroDel;
  return "ok";
}

/** Troca de lugar com o vizinho e renumera (1, 2, 3...). */
export async function moverGrupo(id: string, direcao: "cima" | "baixo"): Promise<void> {
  const db = createAdminClient();
  const { data: alvo, error } = await db.from("projeto_grupos").select("projeto_id").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!alvo) return;
  const lista = await listarGrupos(alvo.projeto_id as string);
  const i = lista.findIndex((g) => g.id === id);
  const j = direcao === "cima" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= lista.length) return;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  for (const [indice, g] of lista.entries()) {
    if (g.ordem !== indice + 1) {
      const { error: erroUpd } = await db.from("projeto_grupos").update({ ordem: indice + 1 }).eq("id", g.id);
      if (erroUpd) throw erroUpd;
    }
  }
}
