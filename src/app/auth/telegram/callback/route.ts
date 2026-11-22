import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { acharContaPorIdentidade, criarContaComIdentidade, criarSessao } from "@/lib/auth/contas";
import { destinoPosLogin } from "@/lib/auth/destino";
import { clientIdTelegram, COOKIE_OIDC, trocarCodigo } from "@/lib/auth/telegram-oidc";
import { timingSafeEqual } from "node:crypto";

const igual = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Volta do Telegram: confere o state, troca o code, valida o id_token e abre a sessão. */
export async function GET(request: NextRequest) {
  const origem = request.nextUrl.origin;
  const falha = (erro: string) => NextResponse.redirect(new URL(`/login?erro=${erro}`, origem));

  const jar = await cookies();
  const bruto = jar.get(COOKIE_OIDC)?.value;
  jar.delete(COOKIE_OIDC);

  const params = request.nextUrl.searchParams;
  if (params.get("error")) return falha("telegram");

  let guardado: { state: string; verifier: string; next: string | null };
  try {
    guardado = JSON.parse(bruto ?? "");
  } catch {
    return falha("telegram");
  }
  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || !guardado.state || !igual(state, guardado.state)) {
    return falha("telegram");
  }

  const clientId = clientIdTelegram();
  const clientSecret = process.env.TELEGRAM_CLIENT_SECRET;
  if (!clientId || !clientSecret) return falha("config");

  try {
    const perfil = await trocarCodigo({
      code,
      verifier: guardado.verifier,
      redirectUri: `${origem}/auth/telegram/callback`,
      clientId,
      clientSecret,
    });

    const conta =
      (await acharContaPorIdentidade("telegram", perfil.id)) ??
      (await criarContaComIdentidade(perfil.nome, "telegram", perfil.id));
    await criarSessao(conta, `tg${perfil.id}@telegram.mci`);

    return NextResponse.redirect(new URL(destinoPosLogin(conta.papel, guardado.next), origem));
  } catch (erro) {
    console.error("Falha no login OIDC do Telegram:", erro);
    return falha("telegram");
  }
}
