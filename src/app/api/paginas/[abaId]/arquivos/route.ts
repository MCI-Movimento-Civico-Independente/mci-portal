import { NextResponse } from "next/server";
import { erroApi, FALHOU, lerJson, SEM_CACHE, sessaoDaApi, UUID } from "@/lib/auth/api";
import { reservarEnvio } from "@/lib/paginas/arquivos";
import { abaPorId } from "@/lib/paginas/paginas";

/** Antes de cada envio: confere tipo, tamanho e a cota do projeto, e devolve a URL assinada. */
export async function POST(req: Request, { params }: { params: Promise<{ abaId: string }> }) {
  const c = await sessaoDaApi();
  if ("resposta" in c) return c.resposta;
  const { abaId } = await params;
  const corpo = await lerJson<{ nome?: unknown; tamanho?: unknown; especie?: unknown }>(req);
  const { nome, tamanho, especie } = corpo ?? {};
  if (
    !UUID.test(abaId) ||
    typeof nome !== "string" ||
    typeof tamanho !== "number" ||
    !Number.isInteger(tamanho) ||
    tamanho <= 0 ||
    (especie !== "imagem" && especie !== "arquivo")
  ) {
    return erroApi("Pedido inválido.", 400);
  }
  try {
    const aba = await abaPorId(abaId);
    if (!aba) return erroApi("Página não encontrada.", 404);
    const r = await reservarEnvio(aba, c.sessao.conta.id, { nome, tamanho, especie });
    return "erro" in r ? erroApi(r.erro, r.status) : NextResponse.json(r, { headers: SEM_CACHE });
  } catch (e) {
    console.error("Falha ao preparar o envio:", e);
    return erroApi(FALHOU, 500);
  }
}
