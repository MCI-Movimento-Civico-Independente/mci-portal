import { NextResponse } from "next/server";
import { getSessao } from "@/lib/auth/sessao";
import { criarUrlDeUpload } from "@/lib/editor/anexos";
import type { TipoAnexo } from "@/lib/editor/documento";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Só gera a URL assinada de upload. O arquivo vai do navegador direto para o Storage.
 * Confere o login, o papel e se a tarefa existe antes de assinar.
 */
export async function POST(req: Request) {
  const sessao = await getSessao();
  if (!sessao) return NextResponse.json({ erro: "Entre no portal para enviar imagens." }, { status: 401 });
  if (!sessao.podeOrg) return NextResponse.json({ erro: "Sem acesso." }, { status: 403 });

  let corpo: { tipo?: unknown; itemId?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }
  const tipo = corpo.tipo;
  const itemId = corpo.itemId;
  if ((tipo !== "tarefa" && tipo !== "comentario") || typeof itemId !== "string" || !UUID.test(itemId)) {
    return NextResponse.json({ erro: "Pedido inválido." }, { status: 400 });
  }

  const { data, error } = await createAdminClient().from("tarefas").select("id").eq("id", itemId).maybeSingle();
  if (error) {
    console.error("Falha ao conferir a tarefa do anexo:", error);
    return NextResponse.json({ erro: "Algo deu errado. Tente de novo em alguns minutos." }, { status: 500 });
  }
  // Descrição de tarefa nova: o id nasce no navegador e a tarefa só existe depois de criada.
  if (!data && tipo !== "tarefa") return NextResponse.json({ erro: "Tarefa não encontrada." }, { status: 404 });

  try {
    return NextResponse.json(await criarUrlDeUpload(tipo as TipoAnexo, itemId));
  } catch (erro) {
    console.error("Falha ao criar a URL de upload:", erro);
    return NextResponse.json({ erro: "Algo deu errado. Tente de novo em alguns minutos." }, { status: 500 });
  }
}
