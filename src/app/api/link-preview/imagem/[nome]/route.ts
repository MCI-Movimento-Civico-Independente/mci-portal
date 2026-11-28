import { NextResponse } from "next/server";
import { erroApi, FALHOU, sessaoDaApi } from "@/lib/auth/api";
import { BUCKET_PREVIAS, NOME_DE_PREVIA } from "@/lib/links/previa";
import { createAdminClient } from "@/lib/supabase/admin";

/** Leva à imagem guardada de uma prévia por uma URL assinada. */
export async function GET(_req: Request, { params }: { params: Promise<{ nome: string }> }) {
  const c = await sessaoDaApi();
  if ("resposta" in c) return c.resposta;
  const { nome } = await params;
  if (!NOME_DE_PREVIA.test(nome)) return erroApi("Imagem não encontrada.", 404);
  try {
    const { data, error } = await createAdminClient().storage.from(BUCKET_PREVIAS).createSignedUrl(nome, 300);
    if (error || !data) return erroApi("Imagem não encontrada.", 404);
    return NextResponse.redirect(data.signedUrl, { status: 302, headers: { "cache-control": "private, max-age=240" } });
  } catch (e) {
    console.error("Falha ao assinar a imagem da prévia:", e);
    return erroApi(FALHOU, 500);
  }
}
