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

  let url: string | undefined;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origem}/auth/callback`, skipBrowserRedirect: true },
    });
    if (error) console.error("Falha ao iniciar o login com Google:", error);
    url = data?.url ?? undefined;
  } catch (erro) {
    // Em geral: variáveis do Supabase ausentes ou trocadas.
    console.error("Supabase mal configurado ao iniciar o login com Google:", erro);
    return NextResponse.redirect(new URL("/login?erro=config", origem), 303);
  }
  if (!url) return NextResponse.redirect(new URL("/login?erro=google", origem), 303);

  const jar = await cookies();
  jar.set("mci_oauth_modo", modo, COOKIE);
  if (next) jar.set("mci_oauth_next", next, COOKIE);
  else jar.delete("mci_oauth_next");

  return NextResponse.redirect(url, 303);
}
