import { NextResponse } from "next/server";
import { getSessao } from "@/lib/auth/sessao";
import { PAGINA } from "@/lib/limites";
import { validarPagina } from "@/lib/paginas/documento";
import { carregarPagina, salvarPagina } from "@/lib/paginas/paginas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEM_CACHE = { "cache-control": "no-store" };
const erro = (mensagem: string, status: number) => NextResponse.json({ erro: mensagem }, { status, headers: SEM_CACHE });
const FALHOU = "Algo deu errado. Tente de novo em alguns minutos.";

/** Login e papel de quem acessa o projeto, e o id da aba. */
async function conferir(params: Promise<{ abaId: string }>) {
  const sessao = await getSessao();
  if (!sessao) return { resposta: erro("Entre no portal de novo para continuar.", 401) };
  if (!sessao.podeOrg) return { resposta: erro("Sem acesso.", 403) };
  const { abaId } = await params;
  if (!UUID.test(abaId)) return { resposta: erro("Página não encontrada.", 404) };
  return { sessao, abaId };
}

export async function GET(_req: Request, { params }: { params: Promise<{ abaId: string }> }) {
  const c = await conferir(params);
  if ("resposta" in c) return c.resposta;
  try {
    const pagina = await carregarPagina(c.abaId);
    return pagina ? NextResponse.json(pagina, { headers: SEM_CACHE }) : erro("Página não encontrada.", 404);
  } catch (e) {
    console.error("Falha ao carregar a página:", e);
    return erro(FALHOU, 500);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ abaId: string }> }) {
  const c = await conferir(params);
  if ("resposta" in c) return c.resposta;
  // Exigir JSON impede que um formulário de outro site grave com o cookie da pessoa.
  if (!req.headers.get("content-type")?.startsWith("application/json")) return erro("Pedido inválido.", 415);

  const texto = await req.text();
  // Folga para o envelope; o limite exato do conteúdo é conferido na validação.
  if (Buffer.byteLength(texto) > PAGINA.conteudoMaxBytes + 1024) {
    return erro(`A página passou do limite de ${PAGINA.conteudoMaxBytes / 1024} KB.`, 413);
  }
  let corpo: { versao?: unknown; conteudo?: unknown };
  try {
    corpo = JSON.parse(texto);
  } catch {
    return erro("Pedido inválido.", 400);
  }
  const versao = corpo?.versao;
  if (typeof versao !== "number" || !Number.isInteger(versao) || versao < 1) return erro("Pedido inválido.", 400);
  const v = validarPagina(corpo.conteudo);
  if ("erro" in v) return erro(v.erro, v.grande ? 413 : 400);

  try {
    const quem = { contaId: c.sessao.conta.id, podeOrg: c.sessao.podeOrg };
    const r = await salvarPagina(c.abaId, versao, v.doc, v.anexos, quem);
    if (r.tipo === "nao_achou") return erro("Esta página foi excluída.", 404);
    if (r.tipo === "citacao_invalida") {
      return erro("A página cita uma tarefa ou um grupo que não existe mais. Tire o bloco “removido” para salvar.", 400);
    }
    if (r.tipo === "conflito") return NextResponse.json({ conflito: true, por: r.por }, { status: 409, headers: SEM_CACHE });
    return NextResponse.json(
      { versao: r.versao, atualizadoEm: r.atualizadoEm, atualizadoPor: c.sessao.nome, uso: r.uso, trocas: r.trocas },
      { headers: SEM_CACHE },
    );
  } catch (e) {
    console.error("Falha ao salvar a página:", e);
    return erro(FALHOU, 500);
  }
}
