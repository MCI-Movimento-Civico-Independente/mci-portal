import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Papel } from "./destino";

export type Conta = {
  id: string;
  nome: string | null;
  papel: Papel;
  auth_user_id: string | null;
};

const COLUNAS = "id, nome, papel, auth_user_id";
const VIOLACAO_UNICA = "23505";

export async function buscarConta(id: string): Promise<Conta | null> {
  const { data, error } = await createAdminClient()
    .from("contas")
    .select(COLUNAS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Conta | null;
}

export async function buscarContaPorAuth(authUserId: string): Promise<Conta | null> {
  const { data, error } = await createAdminClient()
    .from("contas")
    .select(COLUNAS)
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw error;
  return data as Conta | null;
}

export async function acharContaPorIdentidade(
  provedor: string,
  externoId: string,
): Promise<Conta | null> {
  const { data, error } = await createAdminClient()
    .from("identidades")
    .select("conta_id")
    .eq("provedor", provedor)
    .eq("externo_id", externoId)
    .maybeSingle();
  if (error) throw error;
  return data ? buscarConta(data.conta_id as string) : null;
}

/** Cria a conta e a identidade. Se outra requisição criou a identidade antes, usa a dela. */
export async function criarContaComIdentidade(
  nome: string,
  provedor: string,
  externoId: string,
  authUserId?: string,
): Promise<Conta> {
  const admin = createAdminClient();
  const { data: nova, error } = await admin
    .from("contas")
    .insert({ nome, ...(authUserId ? { auth_user_id: authUserId } : {}) })
    .select(COLUNAS)
    .single();
  if (error) throw error;
  const conta = nova as Conta;

  const { error: erroIdent } = await admin
    .from("identidades")
    .insert({ provedor, externo_id: externoId, conta_id: conta.id });
  if (!erroIdent) return conta;

  await admin.from("contas").delete().eq("id", conta.id);
  if (erroIdent.code === VIOLACAO_UNICA) {
    const existente = await acharContaPorIdentidade(provedor, externoId);
    if (existente) return existente;
  }
  throw erroIdent;
}

/** Adiciona uma identidade a uma conta existente (vincular). */
export async function vincularIdentidade(
  contaId: string,
  provedor: string,
  externoId: string,
): Promise<"ok" | "de_outra_conta"> {
  const existente = await acharContaPorIdentidade(provedor, externoId);
  if (existente) return existente.id === contaId ? "ok" : "de_outra_conta";
  const { error } = await createAdminClient()
    .from("identidades")
    .insert({ provedor, externo_id: externoId, conta_id: contaId });
  if (error) {
    if (error.code === VIOLACAO_UNICA) return "de_outra_conta";
    throw error;
  }
  return "ok";
}

export async function provedoresDaConta(contaId: string): Promise<string[]> {
  const { data, error } = await createAdminClient()
    .from("identidades")
    .select("provedor")
    .eq("conta_id", contaId);
  if (error) throw error;
  return (data ?? []).map((l) => l.provedor as string);
}

/**
 * Garante o usuário do Supabase Auth da conta e copia o papel para
 * app_metadata.papel (é de lá que o proxy lê). Devolve id e e-mail do usuário.
 */
async function garantirUsuarioAuth(conta: Conta, emailNovo: string) {
  const admin = createAdminClient();
  const appMetadata = { papel: conta.papel };

  if (conta.auth_user_id) {
    const { data, error } = await admin.auth.admin.updateUserById(conta.auth_user_id, {
      app_metadata: appMetadata,
    });
    if (error || !data.user.email) throw error ?? new Error("Usuário do Auth sem e-mail.");
    return { id: data.user.id, email: data.user.email };
  }

  let usuario: { id: string; email: string } | null = null;
  const { data, error } = await admin.auth.admin.createUser({
    email: emailNovo,
    email_confirm: true,
    app_metadata: appMetadata,
  });
  if (data?.user) {
    usuario = { id: data.user.id, email: emailNovo };
  } else {
    // Sobra de uma tentativa anterior que criou o usuário mas não gravou o vínculo.
    for (let pagina = 1; pagina <= 20 && !usuario; pagina++) {
      const { data: lista, error: erroLista } = await admin.auth.admin.listUsers({
        page: pagina,
        perPage: 1000,
      });
      if (erroLista) break;
      const achado = lista.users.find((u) => u.email === emailNovo);
      if (achado) usuario = { id: achado.id, email: emailNovo };
      if (lista.users.length < 1000) break;
    }
    if (!usuario) throw error ?? new Error("Não foi possível criar o usuário do Auth.");
    await admin.auth.admin.updateUserById(usuario.id, { app_metadata: appMetadata });
  }

  const { error: erroVinculo } = await admin
    .from("contas")
    .update({ auth_user_id: usuario.id })
    .eq("id", conta.id);
  if (erroVinculo) throw erroVinculo;
  return usuario;
}

/**
 * Abre a sessão da conta: gera um magic link (sem enviar e-mail) e troca o
 * token no client SSR, que grava os cookies da sessão.
 * `emailNovo` só é usado se a conta ainda não tiver usuário no Auth.
 */
export async function criarSessao(conta: Conta, emailNovo: string) {
  const usuario = await garantirUsuarioAuth(conta, emailNovo);

  const { data, error } = await createAdminClient().auth.admin.generateLink({
    type: "magiclink",
    email: usuario.email,
  });
  if (error || !data.properties?.hashed_token) {
    throw error ?? new Error("Não foi possível gerar o link de sessão.");
  }

  const supabase = await createClient();
  const { error: erroOtp } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (erroOtp) throw erroOtp;
  return usuario.id;
}

/** Remove um usuário do Auth que sobrou (ex.: o do Google quando a conta usa outro). */
export async function descartarUsuarioAuth(authUserId: string) {
  await createAdminClient().auth.admin.deleteUser(authUserId);
}
