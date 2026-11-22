import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type ComiteBasico = { slug: string; nome: string };
export type ProjetoBasico = { id: string; nome: string; comite_slug: string; status: "ativo" | "arquivado" };

export type ComiteResumo = ComiteBasico & { projetosAtivos: number; tarefasAbertas: number };

export type ProjetoResumo = ProjetoBasico & {
  descricao: string | null;
  criado_em: string;
  tarefasAbertas: number;
  tarefasTotal: number;
};

// Mesmo modelo de acesso das tarefas: quem chama já conferiu o papel da sessão.

export async function comitesBasicos(): Promise<ComiteBasico[]> {
  const { data, error } = await createAdminClient().from("comites_org").select("slug, nome").order("ordem");
  if (error) throw error;
  return (data ?? []) as ComiteBasico[];
}

export async function projetosBasicos(): Promise<ProjetoBasico[]> {
  const { data, error } = await createAdminClient()
    .from("projetos")
    .select("id, nome, comite_slug, status")
    .order("nome");
  if (error) throw error;
  return (data ?? []) as ProjetoBasico[];
}

/** Tarefas de primeiro nível por comitê/projeto: [abertas, total]. */
async function contagens() {
  const { data, error } = await createAdminClient()
    .from("tarefas")
    .select("comite_slug, projeto_id, status")
    .is("pai_id", null)
    .limit(5000);
  if (error) throw error;
  const porComite = new Map<string, [number, number]>();
  const porProjeto = new Map<string, [number, number]>();
  const soma = (m: Map<string, [number, number]>, k: string | null, aberta: boolean) => {
    if (!k) return;
    const [a, t] = m.get(k) ?? [0, 0];
    m.set(k, [a + (aberta ? 1 : 0), t + 1]);
  };
  for (const t of (data ?? []) as { comite_slug: string | null; projeto_id: string | null; status: string }[]) {
    soma(porComite, t.comite_slug, t.status !== "concluida");
    soma(porProjeto, t.projeto_id, t.status !== "concluida");
  }
  return { porComite, porProjeto };
}

export async function comitesComResumo(): Promise<ComiteResumo[]> {
  const [comites, projetos, { porComite }] = await Promise.all([comitesBasicos(), projetosBasicos(), contagens()]);
  return comites.map((c) => ({
    ...c,
    projetosAtivos: projetos.filter((p) => p.comite_slug === c.slug && p.status === "ativo").length,
    tarefasAbertas: porComite.get(c.slug)?.[0] ?? 0,
  }));
}

export async function projetosComResumo(comiteSlug?: string): Promise<ProjetoResumo[]> {
  let consulta = createAdminClient()
    .from("projetos")
    .select("id, nome, comite_slug, status, descricao, criado_em")
    .order("status")
    .order("nome");
  if (comiteSlug) consulta = consulta.eq("comite_slug", comiteSlug);
  const [{ data, error }, { porProjeto }] = await Promise.all([consulta, contagens()]);
  if (error) throw error;
  return ((data ?? []) as Omit<ProjetoResumo, "tarefasAbertas" | "tarefasTotal">[]).map((p) => ({
    ...p,
    tarefasAbertas: porProjeto.get(p.id)?.[0] ?? 0,
    tarefasTotal: porProjeto.get(p.id)?.[1] ?? 0,
  }));
}

export async function criarProjeto(
  criadoPor: string,
  dados: { comite_slug: string; nome: string; descricao: string | null },
) {
  const { error } = await createAdminClient().from("projetos").insert({ ...dados, criado_por: criadoPor });
  if (error) throw error;
}

export async function mudarStatusProjeto(id: string, status: "ativo" | "arquivado"): Promise<boolean> {
  const { data, error } = await createAdminClient().from("projetos").update({ status }).eq("id", id).select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}
