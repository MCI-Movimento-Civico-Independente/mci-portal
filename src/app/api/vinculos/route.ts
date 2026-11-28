import { NextResponse } from "next/server";
import { erroApi, FALHOU, lerJson, SEM_CACHE, sessaoDaApi, UUID } from "@/lib/auth/api";
import { buscarVinculos } from "@/lib/vinculos/servidor";

const MAXIMO = 500;
const lista = (v: unknown) =>
  Array.isArray(v) && v.length <= MAXIMO && v.every((i) => typeof i === "string" && UUID.test(i)) ? (v as string[]) : null;

/** Dados ao vivo de todas as tarefas e grupos citados numa página, de uma vez. */
export async function POST(req: Request) {
  const c = await sessaoDaApi();
  if ("resposta" in c) return c.resposta;
  const corpo = await lerJson<{ tarefas?: unknown; grupos?: unknown }>(req);
  const tarefas = lista(corpo?.tarefas);
  const grupos = lista(corpo?.grupos);
  if (!tarefas || !grupos) return erroApi("Pedido inválido.", 400);
  try {
    const quem = { contaId: c.sessao.conta.id, podeOrg: c.sessao.podeOrg };
    return NextResponse.json(await buscarVinculos(tarefas, grupos, quem), { headers: SEM_CACHE });
  } catch (e) {
    console.error("Falha ao buscar os vínculos:", e);
    return erroApi(FALHOU, 500);
  }
}
