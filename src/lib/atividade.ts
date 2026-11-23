import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Documento } from "@/lib/editor/documento";
import type { Pessoa } from "@/lib/tarefas";

export type Comentario = {
  id: string;
  /** Texto puro (e o conteúdo dos comentários de antes do editor rico). */
  texto: string;
  /** Documento do editor rico; null nos comentários antigos. */
  conteudo: Documento | null;
  criado_em: string;
  editado_em: string | null;
  autor_id: string | null;
  autor: Pessoa | null;
};

export type TipoEvento = "criada" | "campo" | "descricao" | "subtarefa_adicionada" | "subtarefa_removida";

export type Evento = {
  id: string;
  tipo: TipoEvento;
  campo: string | null;
  de_texto: string | null;
  para_texto: string | null;
  criado_em: string;
  autor: Pessoa | null;
};

const AUTOR = "autor:contas!autor_id(id, nome)";

export async function listarComentarios(tarefaId: string): Promise<Comentario[]> {
  const { data, error } = await createAdminClient()
    .from("tarefa_comentarios")
    .select(`id, texto, conteudo, criado_em, editado_em, autor_id, ${AUTOR}`)
    .eq("tarefa_id", tarefaId)
    .is("excluido_em", null)
    .order("criado_em", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as Comentario[];
}

/** "Nível 3 · Articulador" de cada autor, por id da conta. */
export async function niveisDosAutores(contaIds: string[]): Promise<Map<string, string>> {
  if (contaIds.length === 0) return new Map();
  const { data, error } = await createAdminClient().from("perfil_xp").select("conta_id, nivel, nivel_nome").in("conta_id", contaIds);
  if (error) {
    console.error("Falha ao buscar os níveis dos autores:", error);
    return new Map();
  }
  return new Map(
    (data ?? []).map((l) => [l.conta_id as string, `Nível ${l.nivel as number}${l.nivel_nome ? ` · ${l.nivel_nome as string}` : ""}`]),
  );
}

export async function listarHistorico(tarefaId: string): Promise<Evento[]> {
  const { data, error } = await createAdminClient()
    .from("tarefa_historico")
    .select(`id, tipo, campo, de_texto, para_texto, criado_em, ${AUTOR}`)
    .eq("tarefa_id", tarefaId)
    .order("criado_em", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as Evento[];
}

export async function criarComentario(tarefaId: string, autorId: string, conteudo: Documento, texto: string) {
  const { error } = await createAdminClient()
    .from("tarefa_comentarios")
    .insert({ tarefa_id: tarefaId, autor_id: autorId, conteudo, texto });
  if (error) throw error;
}

/** Só o autor edita o próprio comentário. */
export async function editarComentario(id: string, contaId: string, conteudo: Documento, texto: string): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("tarefa_comentarios")
    .update({ conteudo, texto, editado_em: new Date().toISOString() })
    .eq("id", id)
    .eq("autor_id", contaId)
    .is("excluido_em", null)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** Exclusão lógica (excluido_em). O autor apaga o próprio; a coordenação (admin) apaga qualquer um. */
export async function excluirComentario(id: string, contaId: string, admin: boolean): Promise<boolean> {
  const db = createAdminClient();
  const { data, error } = await db.from("tarefa_comentarios").select("autor_id").eq("id", id).is("excluido_em", null).maybeSingle();
  if (error) throw error;
  if (!data) return false;
  if (data.autor_id !== contaId && !admin) return false;
  const { error: erroDel } = await db.from("tarefa_comentarios").update({ excluido_em: new Date().toISOString() }).eq("id", id);
  if (erroDel) throw erroDel;
  return true;
}

/** Registra no histórico. Uma falha aqui é logada mas não desfaz a alteração em si. */
export async function registrarEvento(evento: {
  tarefa_id: string;
  autor_id: string;
  tipo: TipoEvento;
  campo?: string;
  de?: string | null;
  para?: string | null;
}) {
  const { error } = await createAdminClient().from("tarefa_historico").insert({
    tarefa_id: evento.tarefa_id,
    autor_id: evento.autor_id,
    tipo: evento.tipo,
    campo: evento.campo ?? null,
    de_texto: evento.de ?? null,
    para_texto: evento.para ?? null,
  });
  if (error) console.error("Falha ao registrar o histórico:", error);
}
