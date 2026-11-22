import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { FormularioView } from "./formularios-tipos";
import { chaveFormulario } from "./campos-personalizados-tipos";
import { CHAVES_CONFIGURAVEIS } from "./tarefas-campos";

// Mesmo modelo de acesso das demais áreas: quem chama já conferiu a sessão
// (e, para editar, que é admin).

export async function listarFormularios(): Promise<FormularioView[]> {
  const db = createAdminClient();
  const [formularios, campos, comites] = await Promise.all([
    db.from("formularios").select("id, nome, descricao, padrao").order("padrao", { ascending: false }).order("nome"),
    db.from("formulario_campos").select("formulario_id, chave"),
    db.from("comites_org").select("slug, formulario_id").not("formulario_id", "is", null),
  ]);
  if (formularios.error) throw formularios.error;
  if (campos.error) throw campos.error;
  if (comites.error) throw comites.error;

  return ((formularios.data ?? []) as Omit<FormularioView, "campos" | "comites">[]).map((f) => ({
    ...f,
    campos: ((campos.data ?? []) as { formulario_id: string; chave: string }[])
      .filter((c) => c.formulario_id === f.id)
      .map((c) => c.chave),
    comites: ((comites.data ?? []) as { slug: string; formulario_id: string }[])
      .filter((c) => c.formulario_id === f.id)
      .map((c) => c.slug),
  }));
}

/** Cria um formulário copiando os campos do Padrão geral. */
export async function criarFormulario(nome: string): Promise<{ id: string } | "nome_em_uso"> {
  const db = createAdminClient();
  const { data, error } = await db.from("formularios").insert({ nome }).select("id").single();
  if (error) {
    if (error.code === "23505") return "nome_em_uso";
    throw error;
  }
  const id = data.id as string;

  const { data: padrao } = await db.from("formularios").select("id").eq("padrao", true).maybeSingle();
  if (padrao) {
    const { data: campos } = await db.from("formulario_campos").select("chave").eq("formulario_id", padrao.id);
    const linhas = ((campos ?? []) as { chave: string }[]).map((c) => ({ formulario_id: id, chave: c.chave }));
    if (linhas.length) {
      const { error: erroCampos } = await db.from("formulario_campos").insert(linhas);
      if (erroCampos) throw erroCampos;
    }
  }
  return { id };
}

/**
 * Salva nome, descrição, campos e os comitês para os quais este é o padrão.
 * Para o Padrão geral, os comitês não se aplicam (ele vale para quem não tem outro).
 */
export async function salvarFormulario(
  id: string,
  dados: { nome: string; descricao: string | null; campos: string[]; comites: string[] },
): Promise<"ok" | "nome_em_uso" | "nao_achou"> {
  const db = createAdminClient();
  // Campos válidos: os configuráveis do sistema e os personalizados que existem e não estão arquivados.
  const { data: personalizados, error: erroPers } = await db
    .from("campos_personalizados")
    .select("id")
    .eq("arquivado", false);
  if (erroPers) throw erroPers;
  const chavesValidas = new Set([
    ...CHAVES_CONFIGURAVEIS,
    ...((personalizados ?? []) as { id: string }[]).map((c) => chaveFormulario(c.id)),
  ]);
  const campos = dados.campos.filter((c) => chavesValidas.has(c));

  const { data, error } = await db
    .from("formularios")
    .update({ nome: dados.nome, descricao: dados.descricao })
    .eq("id", id)
    .select("id, padrao");
  if (error) {
    if (error.code === "23505") return "nome_em_uso";
    throw error;
  }
  const form = data?.[0] as { id: string; padrao: boolean } | undefined;
  if (!form) return "nao_achou";

  // Campos: adiciona os novos e remove os que saíram.
  const remover = db.from("formulario_campos").delete().eq("formulario_id", id);
  const { error: erroDel } = campos.length
    ? await remover.not("chave", "in", `(${campos.map((c) => `"${c}"`).join(",")})`)
    : await remover;
  if (erroDel) throw erroDel;
  if (campos.length) {
    const { error: erroUp } = await db
      .from("formulario_campos")
      .upsert(campos.map((chave) => ({ formulario_id: id, chave })), { onConflict: "formulario_id,chave", ignoreDuplicates: true });
    if (erroUp) throw erroUp;
  }

  if (!form.padrao) {
    // Solta os comitês desmarcados e prende os marcados (tirando-os de outro formulário).
    const { error: erroSolta } = await db.from("comites_org").update({ formulario_id: null }).eq("formulario_id", id);
    if (erroSolta) throw erroSolta;
    if (dados.comites.length) {
      const { error: erroPrende } = await db.from("comites_org").update({ formulario_id: id }).in("slug", dados.comites);
      if (erroPrende) throw erroPrende;
    }
  }
  return "ok";
}

/** Exclui um formulário (menos o Padrão geral). Comitês e tarefas que o usavam voltam ao Padrão geral. */
export async function excluirFormulario(id: string): Promise<"ok" | "padrao_geral"> {
  const db = createAdminClient();
  const { data } = await db.from("formularios").select("padrao").eq("id", id).maybeSingle();
  if (data?.padrao) return "padrao_geral";
  const { error } = await db.from("formularios").delete().eq("id", id);
  if (error) throw error;
  return "ok";
}

/** Inclui um campo num formulário (sem erro se já estiver). */
export async function adicionarCampoAoFormulario(formularioId: string, chave: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("formulario_campos")
    .upsert({ formulario_id: formularioId, chave }, { onConflict: "formulario_id,chave", ignoreDuplicates: true });
  if (error) throw error;
}
