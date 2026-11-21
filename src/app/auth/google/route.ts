import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { nextSeguro } from "@/lib/auth/destino";
import { createClient } from "@/lib/supabase/server";

const COOKIE = { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 } as const;

/**
 * Inicia o login (ou o vínculo) com o Google. É POST para que um link de
 * terceiros não consiga disparar o fluxo no navegador de quem está logado.
 */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const modo = form.get("modo") === "vincular" ? "vincular" : "login";
  const next = nextSeguro(form.get("next"));
  const origem = request.nextUrl.origin;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origem}/auth/callback`, skipBrowserRedirect: true },
  });
  if (error || !data.url) {
    console.error("Falha ao iniciar o login com Google:", error);
    return NextResponse.redirect(new URL("/login?erro=google", origem), 303);
  }

  const jar = await cookies();
  jar.set("mci_oauth_modo", modo, COOKIE);
  if (next) jar.set("mci_oauth_next", next, COOKIE);
  else jar.delete("mci_oauth_next");

  return NextResponse.redirect(data.url, 303);
}
