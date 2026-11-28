import { NextResponse } from "next/server";
import { erroApi, FALHOU, lerJson, SEM_CACHE, sessaoDaApi, UUID } from "@/lib/auth/api";
import { confirmarEnvio } from "@/lib/paginas/arquivos";

/** Depois do envio: o servidor confere o arquivo que chegou ao Storage. */
export async function POST(req: Request, { params }: { params: Promise<{ abaId: string; arquivoId: string }> }) {
  const c = await sessaoDaApi();
  if ("resposta" in c) return c.resposta;
  const { abaId, arquivoId } = await params;
  if (!(await lerJson(req)) || !UUID.test(abaId) || !UUID.test(arquivoId)) return erroApi("Pedido inválido.", 400);
  try {
    const r = await confirmarEnvio(abaId, arquivoId, c.sessao.conta.id);
    return "erro" in r ? erroApi(r.erro, r.status) : NextResponse.json(r, { headers: SEM_CACHE });
  } catch (e) {
    console.error("Falha ao conferir o envio:", e);
    return erroApi(FALHOU, 500);
  }
}
