import "server-only";
import type { StatusTarefa } from "@/components/ui/EtiquetaStatus";
import { createAdminClient } from "@/lib/supabase/admin";

export const STATUS: StatusTarefa[] = ["a_fazer", "em_andamento", "em_revisao", "concluida"];

export type Pessoa = { id: string; nome: string | null };

export type TarefaDb = {
  id: string;
  titulo: string;
  descricao: string | null;
  status: StatusTarefa;
  prazo: string | null;
  comite_slug: string | null;
  pai_id: string | null;
  responsavel_id: string | null;
  criado_em: string;
  concluida_em: string | null;
  responsavel: Pessoa | null;
  /** Título da tarefa-pai, quando esta é uma subtarefa. */
  paiTitulo: string | null;
  /** Contagem de subtarefas (só faz sentido em tarefas de primeiro nível). */
  subtotal: number;
  subfeitas: number;
};

// Modelo de acesso: quem é da organização (papel organizacao/admin) vê e edita
// TODAS as tarefas, como num quadro compartilhado. Quem chama já conferiu o papel
// da sessão (ver as Server Actions e o layout de /org). A service role ignora o
// RLS, então essa conferência na borda é o que protege estes dados.

const COLUNAS =
  "id, titulo, descricao, status, prazo, comite_slug, pai_id, responsavel_id, criado_em, concluida_em, responsavel:contas!responsavel_id(id, nome)";

type Linha = Omit<TarefaDb, "paiTitulo" | "subtotal" | "subfeitas">;

/** Acrescenta contagem de subtarefas e o título da tarefa-pai. */
async function enriquecer(linhas: Linha[]): Promise<TarefaDb[]> {
  if (linhas.length === 0) return [];
  const admin = createAdminClient();

  const ids = linhas.map((t) => t.id);
  const paiIds = [...new Set(linhas.map((t) => t.pai_id).filter((x): x is string => !!x))];

  const [subs, pais] = await Promise.all([
    admin.from("tarefas").select("pai_id, status").in("pai_id", ids),
    paiIds.length
      ? admin.from("tarefas").select("id, titulo").in("id", paiIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (subs.error) throw subs.error;
  if (pais.error) throw pais.error;

  const total = new Map<string, number>();
  const feitas = new Map<string, number>();
  for (const s of (subs.data ?? []) as { pai_id: string; status: string }[]) {
    total.set(s.pai_id, (total.get(s.pai_id) ?? 0) + 1);
    if (s.status === "concluida") feitas.set(s.pai_id, (feitas.get(s.pai_id) ?? 0) + 1);
  }
  const titulos = new Map(((pais.data ?? []) as { id: string; titulo: string }[]).map((p) => [p.id, p.titulo]));

  return linhas.map((t) => ({
    ...t,
    paiTitulo: t.pai_id ? (titulos.get(t.pai_id) ?? null) : null,
    subtotal: total.get(t.id) ?? 0,
    subfeitas: feitas.get(t.id) ?? 0,
  }));
}

export type FiltroTarefas = {
  /** Só as tarefas atribuídas a esta conta. Sem isso, traz todas. */
  responsavelId?: string;
  situacao: "abertas" | "concluidas";
  limite?: number;
};

/** Lista tarefas (de qualquer nível). Abertas: prazo mais próximo primeiro, sem prazo por último. */
export async function listarTarefas(filtro: FiltroTarefas): Promise<TarefaDb[]> {
  let consulta = createAdminClient().from("tarefas").select(COLUNAS);
  if (filtro.responsavelId) consulta = consulta.eq("responsavel_id", filtro.responsavelId);

  if (filtro.situacao === "abertas") {
    consulta = consulta
      .neq("status", "concluida")
      .order("prazo", { ascending: true, nullsFirst: false })
      .order("criado_em", { ascending: false });
  } else {
    consulta = consulta.eq("status", "concluida").order("concluida_em", { ascending: false });
  }

  const { data, error } = await consulta.limit(filtro.limite ?? (filtro.situacao === "abertas" ? 200 : 30));
  if (error) throw error;
  return enriquecer((data ?? []) as unknown as Linha[]);
}

export type TarefaDetalhe = { tarefa: TarefaDb; subtarefas: TarefaDb[] };

export async function tarefaPorId(id: string): Promise<TarefaDetalhe | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("tarefas").select(COLUNAS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: filhas, error: erroFilhas } = await admin
    .from("tarefas")
    .select(COLUNAS)
    .eq("pai_id", id)
    .order("criado_em", { ascending: true });
  if (erroFilhas) throw erroFilhas;

  const [tarefa] = await enriquecer([data as unknown as Linha]);
  return { tarefa, subtarefas: await enriquecer((filhas ?? []) as unknown as Linha[]) };
}

/** Pessoas que podem receber tarefas: quem tem acesso à organização. */
export async function membrosOrg(): Promise<Pessoa[]> {
  const { data, error } = await createAdminClient()
    .from("contas")
    .select("id, nome")
    .in("papel", ["organizacao", "admin"])
    .order("nome");
  if (error) throw error;
  return (data ?? []) as Pessoa[];
}

export type DadosTarefa = {
  titulo: string;
  descricao: string | null;
  prazo: string | null;
  responsavel_id: string | null;
};

export async function criarTarefa(criadoPor: string, dados: DadosTarefa & { pai_id?: string | null }): Promise<string> {
  const { data, error } = await createAdminClient()
    .from("tarefas")
    .insert({ ...dados, criado_por: criadoPor })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function atualizarTarefa(id: string, dados: DadosTarefa): Promise<boolean> {
  const { data, error } = await createAdminClient()
    .from("tarefas")
    .update({ ...dados, atualizado_em: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function mudarStatusTarefa(id: string, status: StatusTarefa): Promise<boolean> {
  const agora = new Date().toISOString();
  const { data, error } = await createAdminClient()
    .from("tarefas")
    .update({ status, atualizado_em: agora, concluida_em: status === "concluida" ? agora : null })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** Apaga a tarefa e, por cascata no banco, as subtarefas dela. */
export async function excluirTarefa(id: string): Promise<void> {
  const { error } = await createAdminClient().from("tarefas").delete().eq("id", id);
  if (error) throw error;
}
