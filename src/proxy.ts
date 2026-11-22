import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// No Next 16 o antigo middleware.ts se chama proxy.ts.
// Aqui só atualiza a sessão e exige login. O papel é conferido no banco, no layout de /org.

const ehRota = (caminho: string, base: string) =>
  caminho === base || caminho.startsWith(`${base}/`);

function urlValida(valor: string | undefined): valor is string {
  if (!valor) return false;
  try {
    const { protocol } = new URL(valor);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const protegida = ehRota(pathname, "/org") || ehRota(pathname, "/comunidade");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const paraLogin = () => {
    const destino = new URL("/login", request.url);
    destino.searchParams.set("next", pathname + search);
    return NextResponse.redirect(destino);
  };
  if (!urlValida(url) || !chave) {
    // Configuração quebrada não pode derrubar as páginas públicas.
    console.error(
      "Supabase mal configurado: NEXT_PUBLIC_SUPABASE_URL precisa ser uma URL http(s) e NEXT_PUBLIC_SUPABASE_ANON_KEY a chave anônima (confira se não estão trocadas).",
    );
    return protegida ? paraLogin() : NextResponse.next();
  }

  let resposta = NextResponse.next({ request });
  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(lista) {
        lista.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        lista.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });

  // Não coloque código entre o createServerClient e o getClaims (padrão do @supabase/ssr).
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  // Redirecionar levando junto os cookies renovados.
  const redirecionar = (resp: NextResponse) => {
    resposta.cookies.getAll().forEach((c) => resp.cookies.set(c));
    return resp;
  };

  if (protegida && !claims) return redirecionar(paraLogin());

  // O papel NÃO é conferido aqui: o token guarda o papel da hora do login e fica
  // defasado quando um admin muda o acesso de alguém (quem acabou de ser promovido
  // seria barrado até renovar o token). Quem decide é o banco, no layout de /org e
  // em cada Server Action.

  return resposta;
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
