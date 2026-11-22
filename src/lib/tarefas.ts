import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Prioridade, StatusTarefa } from "./tarefas-campos";

export type Pessoa = { id: string; nome: string | null };

export type TarefaDb = {
  id: string;
  titulo: string;
  descricao: string | null;
  status: StatusTarefa;
  prioridade: Prioridade | null;
  data_inicio: string | null;
  prazo: string | null;
  pai_id: string | null;
  comite_slug: string | null;
  formulario_id: string | null;
  projeto_id: string | null;
  grupo_id: string | null;
  solicitante_id: string | null;
  responsavel_id: string | null;
  criado_em: string;
  /** Posição dentro do grupo (arrastar e soltar). */
  ordem: number;
  concluida_em: string | null;
  /** Valores dos campos personalizados: {"<id do campo>": valor}. */
  campos: Record<string, string | number | boolean>;
  projeto: { id: string; nome: string } | null;
  solicitante: Pessoa | null;
  /** O "Executor" na tela. */
  responsavel: Pessoa | null;
  /** Subtarefas (só em tarefas de primeiro nível). */
  subtarefas: TarefaDb[];
  /** Título da tarefa-pai, quando esta é uma subtarefa. */
  paiTitulo: string | null;
};

// Modelo de acesso: quem é da organização (papel organizacao/admin) vê e edita
// TODAS as tarefas, como num quadro compartilhado. Quem chama já conferiu o papel
// da sessão (layout de /org e Server Actions). A service role ignora o RLS, então
// essa conferência na borda é o que protege estes dados.

const COLUNAS =
  "id, titulo, descricao, status, prioridade, data_inicio, prazo, pai_id, comite_slug, formulario_id, projeto_id, grupo_id, solicitante_id, responsavel_id, criado_em, ordem, concluida_em, campos, " +
  "projeto:projetos!projeto_id(id, nome), solicitante:contas!solicitante_id(id, nome), responsavel:contas!responsavel_id(id, nome)";

type Linha = Omit<TarefaDb, "subtarefas" | "paiTitulo">;
const comoLinhas = (dados: unknown) => (dados ?? []) as Linha[];

/** Prazo mais próximo primeiro, sem prazo por último; empate: a mais nova primeiro. */
function ordenar(a: Linha, b: Linha) {
  if (a.prazo !== b.prazo) {
    if (!a.prazo) return 1;
    if (!b.prazo) return -1;
    return a.prazo < b.prazo ? -1 : 1;
  }
  return a.criado_em < b.criado_em ? 1 : -1;
}

function montar(topo: Linha[], subs: Linha[]): TarefaDb[] {
  const porPai = new Map<string, Linha[]>();
  for (const s of subs) {
    if (!s.pai_id) continue;
    porPai.set(s.pai_id, [...(porPai.get(s.pai_id) ?? []), s]);
  }
  return [...topo].sort(ordenar).map((t) => ({
    ...t,
    paiTitulo: null,
    subtarefas: (porPai.get(t.id) ?? []).map((s) => ({ ...s, subtarefas: [], paiTitulo: t.titulo })),
  }));
}

/**
 * Tarefas de primeiro nível, cada uma com as subtarefas aninhadas.
 * Com `executorId`: as tarefas desse executor e também as tarefas-pai de
 * subtarefas dele (para a subtarefa aparecer no contexto da tarefa original).
 */
export type FiltroTarefas = {
  executorId?: string;
  comite?: string;
  projetoId?: string;
};

export async function listarTarefas(filtro: FiltroTarefas = {}): Promise<TarefaDb[]> {
  const admin = createAdminClient();
  // Subtarefas herdam o comitê e o projeto da tarefa original, então o filtro vale para ela.
  const passa = (t: Linha) =>
    (!filtro.comite || t.comite_slug === filtro.comite) && (!filtro.projetoId || t.projeto_id === filtro.projetoId);

  if (!filtro.executorId) {
    const [topo, subs] = await Promise.all([
      admin.from("tarefas").select(COLUNAS).is("pai_id", null).limit(500),
      admin.from("tarefas").select(COLUNAS).not("pai_id", "is", null).order("criado_em").limit(2000),
    ]);
    if (topo.error) throw topo.error;
    if (subs.error) throw subs.error;
    return montar(comoLinhas(topo.data).filter(passa), comoLinhas(subs.data));
  }

  const { data, error } = await admin
    .from("tarefas")
    .select(COLUNAS)
    .eq("responsavel_id", filtro.executorId)
    .limit(500);
  if (error) throw error;
  const minhas = comoLinhas(data);

  const topo = minhas.filter((t) => !t.pai_id);
  const jaTem = new Set(topo.map((t) => t.id));
  const paisFaltando = [...new Set(minhas.map((t) => t.pai_id).filter((id): id is string => !!id))].filter(
    (id) => !jaTem.has(id),
  );
  if (paisFaltando.length) {
    const { data: pais, error: erroPais } = await admin.from("tarefas").select(COLUNAS).in("id", paisFaltando);
    if (erroPais) throw erroPais;
    topo.push(...comoLinhas(pais));
  }
  const visiveis = topo.filter(passa);
  if (visiveis.length === 0) return [];

  const { data: subs, error: erroSubs } = await admin
    .from("tarefas")
    .select(COLUNAS)
    .in("pai_id", visiveis.map((t) => t.id))
    .order("criado_em");
  if (erroSubs) throw erroSubs;
  return montar(visiveis, comoLinhas(subs));
}

/** Tarefas (de qualquer nível) em aberto atribuídas à conta, para o Início. */
export async function tarefasAbertasDe(contaId: string, limite = 50): Promise<TarefaDb[]> {
  const { data, error } = await createAdminClient()
    .from("tarefas")
    .select(COLUNAS)
    .eq("responsavel_id", contaId)
    .neq("status", "concluida")
    .order("prazo", { ascending: true, nullsFirst: false })
    .order("criado_em", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return comoLinhas(data).map((t) => ({ ...t, subtarefas: [], paiTitulo: null }));
}

/** Uma tarefa com as subtarefas (se for de primeiro nível) ou o título da pai (se for subtarefa). */
export async function tarefaPorId(id: string): Promise<TarefaDb | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("tarefas").select(COLUNAS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const tarefa = data as unknown as Linha;

  if (tarefa.pai_id) {
    const { data: pai, error: erroPai } = await admin
      .from("tarefas")
      .select("titulo")
      .eq("id", tarefa.pai_id)
      .maybeSingle();
    if (erroPai) throw erroPai;
    return { ...tarefa, subtarefas: [], paiTitulo: (pai?.titulo as string | undefined) ?? null };
  }

  const { data: filhas, error: erroFilhas } = await admin
    .from("tarefas")
    .select(COLUNAS)
    .eq("pai_id", id)
    .order("criado_em");
  if (erroFilhas) throw erroFilhas;
  return montar([tarefa], comoLinhas(filhas))[0];
}

/** Pessoas que podem ser solicitante ou executor: quem tem acesso à organização. */
export async function membrosOrg(): Promise<Pessoa[]> {
  const { data, error } = await createAdminClient()
    .from("contas")
    .select("id, nome")
    .in("papel", ["organizacao", "admin"])
    .order("nome");
  if (error) throw error;
  return (data ?? []) as Pessoa[];
}

export type NovaTarefa = {
  titulo: string;
  descricao: string | null;
  comite_slug?: string | null;
  formulario_id?: string | null;
  projeto_id?: string | null;
  grupo_id?: string | null;
  campos?: Record<string, string | number | boolean>;
  prioridade: Prioridade | null;
  solicitante_id: string | null;
  responsavel_id: string | null;
  data_inicio: string | null;
  prazo: string | null;
  pai_id?: string | null;
};

export async function criarTarefa(criadoPor: string, dados: NovaTarefa): Promise<string> {
  const { data, error } = await createAdminClient()
    .from("tarefas")
    .insert({ ...dados, criado_por: criadoPor })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export type Alteracao = Partial<
  Pick<
    Linha,
    | "titulo"
    | "descricao"
    | "status"
    | "prioridade"
    | "data_inicio"
    | "prazo"
    | "solicitante_id"
    | "responsavel_id"
    | "comite_slug"
    | "formulario_id"
    | "projeto_id"
    | "grupo_id"
  >
>;

/** Aplica a alteração. Mudar o status também ajusta concluida_em. Devolve false se a tarefa não existe. */
export async function atualizarTarefa(id: string, alteracao: Alteracao): Promise<boolean> {
  const agora = new Date().toISOString();
  const { data, error } = await createAdminClient()
    .from("tarefas")
    .update({
      ...alteracao,
      atualizado_em: agora,
      ...(alteracao.status ? { concluida_em: alteracao.status === "concluida" ? agora : null } : {}),
    })
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

/**
 * Põe a tarefa (de primeiro nível) em um grupo, antes de `antesDeId` (ou no fim, se for null).
 * Usa a média entre as vizinhas; se o espaço acabar, renumera o grupo.
 */
export async function moverTarefa(
  id: string,
  grupoId: string,
  antesDeId: string | null,
): Promise<"ok" | "nao_achou" | "grupo_invalido"> {
  const db = createAdminClient();
  const { data: tarefa, error } = await db.from("tarefas").select("id, projeto_id, pai_id").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!tarefa || tarefa.pai_id) return "nao_achou";
  const { data: grupo, error: erroGrupo } = await db
    .from("projeto_grupos")
    .select("id, projeto_id")
    .eq("id", grupoId)
    .maybeSingle();
  if (erroGrupo) throw erroGrupo;
  if (!grupo || grupo.projeto_id !== tarefa.projeto_id) return "grupo_invalido";

  const { data: lista, error: erroLista } = await db
    .from("tarefas")
    .select("id, ordem")
    .eq("grupo_id", grupoId)
    .is("pai_id", null)
    .neq("id", id)
    .order("ordem")
    .order("criado_em");
  if (erroLista) throw erroLista;
  const outras = (lista ?? []) as { id: string; ordem: number }[];

  const i = antesDeId ? outras.findIndex((t) => t.id === antesDeId) : -1;
  const pos = i < 0 ? outras.length : i;
  const antes = outras[pos - 1]?.ordem;
  const depois = outras[pos]?.ordem;
  let ordem: number;
  if (antes !== undefined && depois !== undefined) ordem = (antes + depois) / 2;
  else if (depois !== undefined) ordem = depois - 1000;
  else if (antes !== undefined) ordem = antes + 1000;
  else ordem = 1000;

  const apertado = antes !== undefined && depois !== undefined && depois - antes < 0.001;
  if (apertado) {
    // Sem espaço entre as vizinhas: renumera o grupo inteiro (1000, 2000, ...), com a tarefa no lugar.
    const ids = outras.map((t) => t.id);
    ids.splice(pos, 0, id);
    for (const [n, tid] of ids.entries()) {
      const patch = tid === id ? { ordem: (n + 1) * 1000, grupo_id: grupoId } : { ordem: (n + 1) * 1000 };
      const { error: erroUpd } = await db.from("tarefas").update(patch).eq("id", tid);
      if (erroUpd) throw erroUpd;
    }
    return "ok";
  }
  const { error: erroUpd } = await db.from("tarefas").update({ grupo_id: grupoId, ordem }).eq("id", id);
  if (erroUpd) throw erroUpd;
  return "ok";
}
