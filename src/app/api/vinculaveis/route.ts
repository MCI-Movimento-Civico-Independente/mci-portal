import { NextResponse } from "next/server";
import { erroApi, FALHOU, SEM_CACHE, sessaoDaApi, UUID } from "@/lib/auth/api";
import { buscarVinculaveis } from "@/lib/vinculos/busca";

/** Busca do seletor "{": ?projeto=<id>&q=<texto>&outros=1 */
export async function GET(req: Request) {
  const c = await sessaoDaApi();
  if ("resposta" in c) return c.resposta;
  const p = new URL(req.url).searchParams;
  const projeto = p.get("projeto");
  if (projeto && !UUID.test(projeto)) return erroApi("Pedido inválido.", 400);
  try {
    const quem = { contaId: c.sessao.conta.id, podeOrg: c.sessao.podeOrg };
    const r = await buscarVinculaveis({ projetoId: projeto, outros: p.get("outros") === "1", q: p.get("q") ?? "" }, quem);
    return NextResponse.json(r, { headers: SEM_CACHE });
  } catch (e) {
    console.error("Falha na busca de vínculos:", e);
    return erroApi(FALHOU, 500);
  }
}
