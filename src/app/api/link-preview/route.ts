import { NextResponse } from "next/server";
import { erroApi, FALHOU, sessaoDaApi } from "@/lib/auth/api";
import { obterPrevia } from "@/lib/links/previa";
import { urlPermitida } from "@/lib/links/rede";

export async function GET(req: Request) {
  const c = await sessaoDaApi();
  if ("resposta" in c) return c.resposta;
  const url = urlPermitida(new URL(req.url).searchParams.get("url") ?? "");
  if (!url) return erroApi("Endereço não permitido.", 400);
  try {
    return NextResponse.json(await obterPrevia(url), { headers: { "cache-control": "private, max-age=3600" } });
  } catch (e) {
    console.error("Falha ao montar a prévia:", e);
    return erroApi(FALHOU, 500);
  }
}
