import { NextResponse } from "next/server";
import { erroApi, FALHOU, sessaoDaApi, UUID } from "@/lib/auth/api";
import { urlDeLeitura } from "@/lib/paginas/arquivos";

/** Leva ao arquivo por uma URL assinada gerada na hora. `?baixar=1` salva com o nome original. */
export async function GET(req: Request, { params }: { params: Promise<{ arquivoId: string }> }) {
  const c = await sessaoDaApi();
  if ("resposta" in c) return c.resposta;
  const { arquivoId } = await params;
  if (!UUID.test(arquivoId)) return erroApi("Arquivo não encontrado.", 404);
  const baixar = new URL(req.url).searchParams.get("baixar") === "1";
  try {
    const url = await urlDeLeitura(arquivoId, baixar, 300);
    if (!url) return erroApi("Arquivo não encontrado.", 404);
    return NextResponse.redirect(url, {
      status: 302,
      // O navegador reaproveita o endereço da imagem por menos tempo do que a assinatura vale.
      headers: { "cache-control": baixar ? "no-store" : "private, max-age=240" },
    });
  } catch (e) {
    console.error("Falha ao assinar o arquivo:", e);
    return erroApi(FALHOU, 500);
  }
}
