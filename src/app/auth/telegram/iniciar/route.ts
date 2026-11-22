import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { nextSeguro } from "@/lib/auth/destino";
import { clientIdTelegram, COOKIE_OIDC, novoPedido, oidcConfigurado } from "@/lib/auth/telegram-oidc";

/** Inicia o login OIDC do Telegram. POST, para não ser disparado por link de terceiros. */
export async function POST(request: NextRequest) {
  const origem = request.nextUrl.origin;
  const clientId = clientIdTelegram();
  if (!oidcConfigurado() || !clientId) {
    return NextResponse.redirect(new URL("/login?erro=config", origem), 303);
  }

  const form = await request.formData();
  const next = nextSeguro(form.get("next"));
  const { url, state, verifier } = novoPedido(clientId, `${origem}/auth/telegram/callback`);

  (await cookies()).set(COOKIE_OIDC, JSON.stringify({ state, verifier, next }), {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 600,
  });
  return NextResponse.redirect(url, 303);
}
