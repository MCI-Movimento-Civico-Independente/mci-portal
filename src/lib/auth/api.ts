import "server-only";
import { NextResponse } from "next/server";
import { getSessao } from "./sessao";

export const SEM_CACHE = { "cache-control": "no-store" };
export const FALHOU = "Algo deu errado. Tente de novo em alguns minutos.";
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const erroApi = (mensagem: string, status: number) => NextResponse.json({ erro: mensagem }, { status, headers: SEM_CACHE });

/** Rotas de API são endpoints públicos: confere o login e o papel de quem chama. */
export async function sessaoDaApi() {
  const sessao = await getSessao();
  if (!sessao) return { resposta: erroApi("Entre no portal de novo para continuar.", 401) };
  if (!sessao.podeOrg) return { resposta: erroApi("Sem acesso.", 403) };
  return { sessao };
}

/** Só aceita JSON: um formulário de outro site não consegue enviar esse tipo com o cookie da pessoa. */
export async function lerJson<T>(req: Request): Promise<T | null> {
  if (!req.headers.get("content-type")?.startsWith("application/json")) return null;
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
