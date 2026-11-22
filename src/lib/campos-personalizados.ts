import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CampoPersonalizado, TipoCampoPersonalizado, ValorPersonalizado } from "./campos-personalizados-tipos";

// Mesmo modelo de acesso das demais áreas: quem chama já conferiu a sessão
// (e, para criar ou editar campos, que é admin).

const COLUNAS = "id, rotulo, tipo, opcoes, obrigatorio, arquivado";

export async function listarCamposPersonalizados(incluirArquivados = false): Promise<CampoPersonalizado[]> {
  let consulta = createAdminClient().from("campos_personalizados").select(COLUNAS).order("criado_em");
  if (!incluirArquivados) consulta = consulta.eq("arquivado", false);
  const { data, error } = await consulta;
  if (error) throw error;
  return (data ?? []) as CampoPersonalizado[];
}

export async function criarCampoPersonalizado(
  criadoPor: string,
  dados: { rotulo: string; tipo: TipoCampoPersonalizado; opcoes: string[]; obrigatorio: boolean },
): Promise<{ id: string } | "nome_em_uso"> {
  const { data, error } = await createAdminClient()
    .from("campos_personalizados")
    .insert({ ...dados, criado_por: criadoPor })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return "nome_em_uso";
    throw error;
  }
  return { id: data.id as string };
}

/** O tipo não muda depois de criado (os valores já gravados dependem dele). */
export async function atualizarCampoPersonalizado(
  id: string,
  dados: { rotulo: string; opcoes: string[]; obrigatorio: boolean },
): Promise<"ok" | "nome_em_uso" | "nao_achou"> {
  const { data, error } = await createAdminClient()
    .from("campos_personalizados")
    .update(dados)
    .eq("id", id)
    .select("id");
  if (error) {
    if (error.code === "23505") return "nome_em_uso";
    throw error;
  }
  return (data?.length ?? 0) > 0 ? "ok" : "nao_achou";
}

/** Arquivar esconde o campo dos formulários; os valores nas tarefas continuam guardados. */
export async function arquivarCampoPersonalizado(id: string, arquivar: boolean): Promise<"ok" | "nome_em_uso"> {
  const { error } = await createAdminClient().from("campos_personalizados").update({ arquivado: arquivar }).eq("id", id);
  if (error) {
    // Reativar um campo cujo nome já foi tomado por outro ativo.
    if (error.code === "23505") return "nome_em_uso";
    throw error;
  }
  return "ok";
}

/** Grava (ou remove, com null) o valor de um campo numa tarefa, preservando os demais. */
export async function definirValorPersonalizado(
  tarefaId: string,
  campoId: string,
  valor: ValorPersonalizado | null,
): Promise<{ antes: unknown } | null> {
  const db = createAdminClient();
  const { data, error } = await db.from("tarefas").select("campos").eq("id", tarefaId).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const campos = { ...((data.campos as Record<string, unknown> | null) ?? {}) };
  const antes = campos[campoId];
  if (valor === null) delete campos[campoId];
  else campos[campoId] = valor;

  const { error: erroUpd } = await db
    .from("tarefas")
    .update({ campos, atualizado_em: new Date().toISOString() })
    .eq("id", tarefaId);
  if (erroUpd) throw erroUpd;
  return { antes };
}
