import "server-only";
import type { Papel } from "@/lib/auth/destino";
import { createAdminClient } from "@/lib/supabase/admin";

// Funções da central de administração. Quem chama (as Server Actions e as páginas
// de /org/admin) já conferiu que a sessão é de um admin.

export type ContaAdmin = {
  id: string;
  nome: string;
  papel: Papel;
  criado_em: string;
  nivel: { numero: number; nome: string } | null;
  xp: number;
  provedores: string[];
};

/** Mantém só letras, números, espaço e @._- para o termo entrar com segurança no filtro. */
const limparBusca = (q: string) => q.replace(/[^\p{L}\p{N}\s@._-]/gu, "").trim().slice(0, 60);

export async function listarContas(q?: string, limite = 100): Promise<ContaAdmin[]> {
  const db = createAdminClient();
  let consulta = db.from("contas").select("id, nome, papel, criado_em").order("nome").limit(limite);
  const termo = q ? limparBusca(q) : "";
  if (termo) consulta = consulta.ilike("nome", `%${termo}%`);
  const { data, error } = await consulta;
  if (error) throw error;
  const contas = (data ?? []) as { id: string; nome: string | null; papel: Papel; criado_em: string }[];
  if (contas.length === 0) return [];

  const ids = contas.map((c) => c.id);
  const [xp, ident] = await Promise.all([
    db.from("perfil_xp").select("conta_id, nivel, nivel_nome, total").in("conta_id", ids),
    db.from("identidades").select("conta_id, provedor").in("conta_id", ids),
  ]);
  if (xp.error) throw xp.error;
  if (ident.error) throw ident.error;

  const xpPor = new Map((xp.data ?? []).map((x) => [x.conta_id as string, x]));
  const provedores = new Map<string, string[]>();
  for (const i of (ident.data ?? []) as { conta_id: string; provedor: string }[]) {
    provedores.set(i.conta_id, [...(provedores.get(i.conta_id) ?? []), i.provedor]);
  }

  return contas.map((c) => {
    const x = xpPor.get(c.id);
    return {
      id: c.id,
      nome: c.nome?.trim() || "Sem nome",
      papel: c.papel,
      criado_em: c.criado_em,
      nivel: x ? { numero: x.nivel as number, nome: x.nivel_nome as string } : null,
      xp: (x?.total as number | undefined) ?? 0,
      provedores: provedores.get(c.id) ?? [],
    };
  });
}

export async function contarAdmins(): Promise<number> {
  const { count, error } = await createAdminClient()
    .from("contas")
    .select("id", { count: "exact", head: true })
    .eq("papel", "admin");
  if (error) throw error;
  return count ?? 0;
}

/** Muda o papel da conta e copia para app_metadata (de onde o token lê). Devolve o papel anterior. */
export async function alterarPapel(contaId: string, papel: Papel): Promise<{ anterior: Papel; nome: string } | null> {
  const db = createAdminClient();
  const { data: conta, error } = await db
    .from("contas")
    .select("id, nome, papel, auth_user_id")
    .eq("id", contaId)
    .maybeSingle();
  if (error) throw error;
  if (!conta) return null;

  const { error: erroUpd } = await db.from("contas").update({ papel }).eq("id", contaId);
  if (erroUpd) throw erroUpd;
  if (conta.auth_user_id) {
    const { error: erroAuth } = await db.auth.admin.updateUserById(conta.auth_user_id as string, {
      app_metadata: { papel },
    });
    if (erroAuth) console.error("Papel salvo, mas falhou ao atualizar o app_metadata:", erroAuth);
  }
  return { anterior: conta.papel as Papel, nome: (conta.nome as string | null) ?? "Sem nome" };
}

export async function auditar(autorId: string, acao: string, alvo: string, detalhes: Record<string, unknown> = {}) {
  const { error } = await createAdminClient()
    .from("auditoria_admin")
    .insert({ autor_id: autorId, acao, alvo, detalhes });
  if (error) console.error("Falha ao registrar a auditoria:", error);
}

// ---------- Comitês ----------

export function gerarSlug(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export async function criarComiteOrg(nome: string): Promise<{ slug: string } | "nome_em_uso" | "nome_invalido"> {
  const db = createAdminClient();
  const base = gerarSlug(nome);
  if (!base) return "nome_invalido";

  const { data: existentes, error } = await db.from("comites_org").select("slug, nome, ordem");
  if (error) throw error;
  const lista = (existentes ?? []) as { slug: string; nome: string; ordem: number }[];
  if (lista.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) return "nome_em_uso";

  let slug = base;
  for (let n = 2; lista.some((c) => c.slug === slug) && n < 50; n++) slug = `${base}-${n}`;
  const ordem = Math.max(0, ...lista.map((c) => c.ordem)) + 1;

  const { error: erroIns } = await db.from("comites_org").insert({ slug, nome, ordem });
  if (erroIns) {
    if (erroIns.code === "23505") return "nome_em_uso";
    throw erroIns;
  }
  return { slug };
}

export async function renomearComiteOrg(slug: string, nome: string): Promise<"ok" | "nome_em_uso" | "nao_achou"> {
  const { data, error } = await createAdminClient().from("comites_org").update({ nome }).eq("slug", slug).select("slug");
  if (error) {
    if (error.code === "23505") return "nome_em_uso";
    throw error;
  }
  return (data?.length ?? 0) > 0 ? "ok" : "nao_achou";
}

/** Troca de lugar com o vizinho e renumera a ordem (1, 2, 3...), evitando valores repetidos. */
export async function moverComiteOrg(slug: string, direcao: "cima" | "baixo"): Promise<void> {
  const db = createAdminClient();
  const { data, error } = await db.from("comites_org").select("slug, ordem").order("ordem").order("nome");
  if (error) throw error;
  const lista = (data ?? []) as { slug: string; ordem: number }[];
  const i = lista.findIndex((c) => c.slug === slug);
  const j = direcao === "cima" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= lista.length) return;
  [lista[i], lista[j]] = [lista[j], lista[i]];
  for (const [indice, c] of lista.entries()) {
    if (c.ordem !== indice + 1) {
      const { error: erroUpd } = await db.from("comites_org").update({ ordem: indice + 1 }).eq("slug", c.slug);
      if (erroUpd) throw erroUpd;
    }
  }
}

export async function usoDosComites(): Promise<Map<string, { projetos: number; tarefas: number }>> {
  const db = createAdminClient();
  const [projetos, tarefas] = await Promise.all([
    db.from("projetos").select("comite_slug").limit(5000),
    db.from("tarefas").select("comite_slug").not("comite_slug", "is", null).limit(10000),
  ]);
  if (projetos.error) throw projetos.error;
  if (tarefas.error) throw tarefas.error;
  const uso = new Map<string, { projetos: number; tarefas: number }>();
  const pega = (slug: string) => uso.get(slug) ?? { projetos: 0, tarefas: 0 };
  for (const p of (projetos.data ?? []) as { comite_slug: string }[]) {
    uso.set(p.comite_slug, { ...pega(p.comite_slug), projetos: pega(p.comite_slug).projetos + 1 });
  }
  for (const t of (tarefas.data ?? []) as { comite_slug: string }[]) {
    uso.set(t.comite_slug, { ...pega(t.comite_slug), tarefas: pega(t.comite_slug).tarefas + 1 });
  }
  return uso;
}

/** Só exclui comitê sem projetos nem tarefas. */
export async function excluirComiteOrg(slug: string): Promise<"ok" | "em_uso"> {
  const uso = (await usoDosComites()).get(slug);
  if (uso && (uso.projetos > 0 || uso.tarefas > 0)) return "em_uso";
  const { error } = await createAdminClient().from("comites_org").delete().eq("slug", slug);
  if (error) {
    if (error.code === "23503") return "em_uso";
    throw error;
  }
  return "ok";
}
