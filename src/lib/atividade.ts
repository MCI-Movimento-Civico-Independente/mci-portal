import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Pessoa } from "@/lib/tarefas";

export type Comentario = {
  id: string;
  texto: string;
  criado_em: string;
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
    .select(`id, texto, criado_em, autor_id, ${AUTOR}`)
    .eq("tarefa_id", tarefaId)
    .order("criado_em", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as Comentario[];
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

export async function criarComentario(tarefaId: string, autorId: string, texto: string) {
  const { error } = await createAdminClient()
    .from("tarefa_comentarios")
    .insert({ tarefa_id: tarefaId, autor_id: autorId, texto });
  if (error) throw error;
}

/** Só o autor (ou um admin) apaga um comentário. Devolve false se não pôde. */
export async function excluirComentario(id: string, contaId: string, admin: boolean): Promise<boolean> {
  const db = createAdminClient();
  const { data, error } = await db.from("tarefa_comentarios").select("autor_id").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return false;
  if (data.autor_id !== contaId && !admin) return false;
  const { error: erroDel } = await db.from("tarefa_comentarios").delete().eq("id", id);
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
