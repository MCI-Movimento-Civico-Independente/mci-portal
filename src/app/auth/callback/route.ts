import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  acharContaPorIdentidade,
  buscarContaPorAuth,
  criarContaComIdentidade,
  criarSessao,
  descartarUsuarioAuth,
  vincularIdentidade,
  type Conta,
} from "@/lib/auth/contas";
import { destinoPosLogin } from "@/lib/auth/destino";
import { createClient } from "@/lib/supabase/server";

/** Volta do Google: resolve a conta MCI, abre a sessão dela e (se preciso) vincula. */
export async function GET(request: NextRequest) {
  const origem = request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const jar = await cookies();
  const modo = jar.get("mci_oauth_modo")?.value;
  const next = jar.get("mci_oauth_next")?.value;
  jar.delete("mci_oauth_modo");
  jar.delete("mci_oauth_next");

  const falha = (erro: string) => NextResponse.redirect(new URL(`/login?erro=${erro}`, origem));
  if (!code) return falha("google");

  try {
    const supabase = await createClient();

    // Quem estava logado ANTES do Google, para o caso de vincular.
    let contaAnterior: Conta | null = null;
    if (modo === "vincular") {
      const { data } = await supabase.auth.getUser();
      if (data.user) contaAnterior = await buscarContaPorAuth(data.user.id);
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) return falha("google");
    const googleUser = data.user;
    const googleId = googleUser.identities?.find((i) => i.provider === "google")?.id;
    if (!googleId) return falha("google");

    let conta: Conta;
    if (modo === "vincular" && contaAnterior) {
      const resultado = await vincularIdentidade(contaAnterior.id, "google", googleId);
      if (resultado === "de_outra_conta") {
        // Volta para a sessão de quem pediu o vínculo antes de avisar o erro.
        await criarSessao(contaAnterior, "");
        if (contaAnterior.auth_user_id !== googleUser.id) await descartarUsuarioAuth(googleUser.id);
        return NextResponse.redirect(new URL("/comunidade?aviso=google_outra_conta", origem));
      }
      conta = contaAnterior;
    } else {
      const existente = await acharContaPorIdentidade("google", googleId);
      conta =
        existente ??
        (await criarContaComIdentidade(
          (googleUser.user_metadata?.full_name as string | undefined) ??
            googleUser.email ??
            "Membro",
          "google",
          googleId,
          googleUser.id,
        ));
    }

    // Sempre refaz a sessão da conta MCI: garante app_metadata.papel no token.
    await criarSessao(conta, googleUser.email ?? "");
    if (conta.auth_user_id !== googleUser.id && (await buscarContaPorAuth(googleUser.id)) === null) {
      await descartarUsuarioAuth(googleUser.id);
    }

    const aviso = modo === "vincular" ? "?aviso=google_vinculado" : "";
    const destino = destinoPosLogin(conta.papel, next);
    return NextResponse.redirect(new URL(`${destino}${destino.includes("?") ? "" : aviso}`, origem));
  } catch (erro) {
    console.error("Falha no retorno do Google:", erro);
    return falha("falha");
  }
}
