import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StatusTarefa } from "@/lib/tarefas-campos";
import type { Dependencia } from "./tipos";

const LOTE = 150;
const emLotes = <T>(itens: T[]) => Array.from({ length: Math.ceil(itens.length / LOTE) }, (_, i) => itens.slice(i * LOTE, (i + 1) * LOTE));

type Par = { tarefa_id: string; depende_de_id: string };

/**
 * Dependências ainda abertas de cada tarefa: id da tarefa → números das que faltam concluir.
 * Sem `ids`, de todas. Sem a migração aplicada, ninguém aparece bloqueado.
 */
export async function bloqueiosAbertos(ids?: string[]): Promise<Map<string, number[]>> {
  const db = createAdminClient();
  const pares: Par[] = [];
  for (const lote of ids ? emLotes(ids) : [null]) {
    let consulta = db.from("tarefa_dependencias").select("tarefa_id, depende_de_id").limit(5000);
    if (lote) consulta = consulta.in("tarefa_id", lote);
    const { data, error } = await consulta;
    if (error) {
      if (error.code === "PGRST205" || error.code === "42P01") return new Map();
      throw error;
    }
    pares.push(...((data ?? []) as Par[]));
  }
  const abertas = new Map<string, number>();
  for (const lote of emLotes([...new Set(pares.map((p) => p.depende_de_id))])) {
    const { data, error } = await db.from("tarefas").select("id, numero").in("id", lote).neq("status", "concluida");
    if (error) throw error;
    for (const t of data ?? []) abertas.set(t.id as string, Number(t.numero));
  }
  const saida = new Map<string, number[]>();
  for (const p of pares) {
    const numero = abertas.get(p.depende_de_id);
    if (numero !== undefined) saida.set(p.tarefa_id, [...(saida.get(p.tarefa_id) ?? []), numero].sort((a, b) => a - b));
  }
  return saida;
}

/** As tarefas de que esta depende. */
export async function listarDependencias(tarefaId: string): Promise<Dependencia[]> {
  const { data, error } = await createAdminClient()
    .from("tarefa_dependencias")
    .select("tarefa:tarefas!depende_de_id(id, numero, titulo, status)")
    .eq("tarefa_id", tarefaId);
  if (error) throw error;
  return (data as unknown as { tarefa: { id: string; numero: number; titulo: string; status: StatusTarefa } }[])
    .map((d) => ({ ...d.tarefa, numero: Number(d.tarefa.numero) }))
    .sort((a, b) => a.numero - b.numero);
}

export async function criarDependencia(tarefaId: string, dependeDeId: string, autorId: string): Promise<"ok" | "ciclo" | "repetida" | "nao_achou"> {
  const { error } = await createAdminClient()
    .from("tarefa_dependencias")
    .insert({ tarefa_id: tarefaId, depende_de_id: dependeDeId, criado_por: autorId });
  if (!error) return "ok";
  // A conferência de ciclo é feita no banco, dentro da própria inserção.
  if (error.message.includes("dependencia_em_ciclo") || error.message.includes("tarefa_dependencias_outra")) return "ciclo";
  if (error.code === "23505") return "repetida";
  if (error.code === "23503") return "nao_achou";
  throw error;
}

export async function removerDependencia(tarefaId: string, dependeDeId: string): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("tarefa_dependencias")
    .delete()
    .eq("tarefa_id", tarefaId)
    .eq("depende_de_id", dependeDeId)
    .select("tarefa_id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
