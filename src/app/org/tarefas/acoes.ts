"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth/sessao";
import { dataValida } from "@/lib/datas";
import {
  atualizarTarefa,
  criarTarefa,
  excluirTarefa,
  membrosOrg,
  tarefaPorId,
  type Alteracao,
  type NovaTarefa,
} from "@/lib/tarefas";
import { campoPorChave, type CampoTarefa, type Prioridade } from "@/lib/tarefas-campos";

export type EstadoForm = { erro?: string; ok?: boolean; n?: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ERRO_PERIODO = "A data de início não pode ser depois da entrega.";

// Server Actions são endpoints públicos: cada uma confere sessão e papel de novo.
async function exigirOrg() {
  const sessao = await getSessao();
  if (!sessao) redirect("/login?next=/org/tarefas");
  if (!sessao.podeOrg) redirect("/comunidade");
  return sessao;
}

const texto = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

type Validado = { erro: string } | { valor: string | null };

/** Valida um valor conforme o tipo do campo no registro (tarefas-campos). */
function validarCampo(campo: CampoTarefa, bruto: string, membros: Set<string>): Validado {
  const v = bruto.trim();
  switch (campo.tipo) {
    case "texto":
      if (!v) return { erro: "Dê um assunto para a tarefa." };
      if (v.length > 200) return { erro: "O assunto pode ter no máximo 200 caracteres." };
      return { valor: v };
    case "opcao": {
      if (!v) return campo.obrigatorio ? { erro: `${campo.rotulo} é obrigatório.` } : { valor: null };
      if (!campo.opcoes?.some((o) => o.valor === v)) return { erro: `${campo.rotulo} inválido.` };
      return { valor: v };
    }
    case "pessoa":
      // Só quem tem acesso à organização pode ser solicitante ou executor.
      if (!v) return { valor: null };
      return UUID.test(v) && membros.has(v) ? { valor: v } : { erro: `${campo.rotulo}: pessoa inválida.` };
    case "data":
      if (!v) return { valor: null };
      return dataValida(v) ? { valor: v } : { erro: "Data inválida." };
  }
}

async function conjuntoMembros() {
  return new Set((await membrosOrg()).map((m) => m.id));
}

/** Edição inline de um campo (lista, quadro e janela da tarefa). */
export async function atualizarCampoAction(id: string, chave: string, valor: string): Promise<EstadoForm> {
  await exigirOrg();
  const campo = campoPorChave(chave);
  if (!campo || !UUID.test(id)) return { erro: "Pedido inválido." };

  const validado = validarCampo(campo, valor, await conjuntoMembros());
  if ("erro" in validado) return { erro: validado.erro };

  if (campo.tipo === "data") {
    const atual = await tarefaPorId(id);
    if (!atual) return { erro: "Tarefa não encontrada." };
    const inicio = chave === "data_inicio" ? validado.valor : atual.data_inicio;
    const fim = chave === "prazo" ? validado.valor : atual.prazo;
    if (inicio && fim && inicio > fim) return { erro: ERRO_PERIODO };
  }

  try {
    if (!(await atualizarTarefa(id, { [campo.chave]: validado.valor } as Alteracao))) {
      return { erro: "Tarefa não encontrada." };
    }
  } catch (erro) {
    console.error("Falha ao atualizar o campo:", erro);
    return { erro: "Não foi possível salvar. Tente de novo." };
  }
  revalidatePath("/org", "layout");
  return {};
}

export async function criarTarefaAction(_anterior: EstadoForm, form: FormData): Promise<EstadoForm> {
  const sessao = await exigirOrg();
  const membros = await conjuntoMembros();

  const lido: Record<string, string | null> = {};
  for (const chave of ["titulo", "solicitante_id", "responsavel_id", "prioridade", "data_inicio", "prazo"]) {
    const v = validarCampo(campoPorChave(chave)!, texto(form.get(chave)), membros);
    if ("erro" in v) return { erro: v.erro };
    lido[chave] = v.valor;
  }
  const descricao = texto(form.get("descricao"));
  if (!descricao) return { erro: "Escreva a descrição da tarefa." };
  if (descricao.length > 2000) return { erro: "A descrição pode ter no máximo 2000 caracteres." };
  if (lido.data_inicio && lido.prazo && lido.data_inicio > lido.prazo) return { erro: ERRO_PERIODO };

  let id: string;
  try {
    id = await criarTarefa(sessao.conta.id, {
      titulo: lido.titulo!,
      descricao,
      prioridade: lido.prioridade as Prioridade | null,
      solicitante_id: lido.solicitante_id,
      responsavel_id: lido.responsavel_id,
      data_inicio: lido.data_inicio,
      prazo: lido.prazo,
    });
  } catch (erro) {
    console.error("Falha ao criar tarefa:", erro);
    return { erro: "Não foi possível salvar a tarefa. Tente de novo." };
  }
  revalidatePath("/org", "layout");
  redirect(`/org/tarefas?tarefa=${id}`);
}

export async function salvarDescricaoAction(
  id: string,
  _anterior: EstadoForm,
  form: FormData,
): Promise<EstadoForm> {
  await exigirOrg();
  if (!UUID.test(id)) return { erro: "Tarefa inválida." };
  const atual = await tarefaPorId(id);
  if (!atual) return { erro: "Tarefa não encontrada." };

  const descricao = texto(form.get("descricao"));
  // A descrição é obrigatória nas tarefas; na subtarefa pode ficar vazia.
  if (!descricao && atual.pai_id === null) return { erro: "Escreva a descrição da tarefa." };
  if (descricao.length > 2000) return { erro: "A descrição pode ter no máximo 2000 caracteres." };

  try {
    await atualizarTarefa(id, { descricao: descricao || null });
  } catch (erro) {
    console.error("Falha ao salvar a descrição:", erro);
    return { erro: "Não foi possível salvar. Tente de novo." };
  }
  revalidatePath("/org", "layout");
  return { ok: true };
}

export async function criarSubtarefaAction(
  paiId: string,
  anterior: EstadoForm,
  form: FormData,
): Promise<EstadoForm> {
  const sessao = await exigirOrg();
  if (!UUID.test(paiId)) return { erro: "Tarefa inválida." };
  const pai = await tarefaPorId(paiId);
  if (!pai) return { erro: "Tarefa não encontrada." };
  if (pai.pai_id) return { erro: "Subtarefas não podem ter subtarefas." };

  const membros = await conjuntoMembros();
  const lido: Record<string, string | null> = {};
  for (const chave of ["titulo", "responsavel_id", "prazo"]) {
    const v = validarCampo(campoPorChave(chave)!, texto(form.get(chave)), membros);
    if ("erro" in v) return { erro: v.erro };
    lido[chave] = v.valor;
  }

  const nova: NovaTarefa = {
    titulo: lido.titulo!,
    descricao: null,
    prioridade: null,
    solicitante_id: sessao.conta.id,
    responsavel_id: lido.responsavel_id,
    data_inicio: null,
    prazo: lido.prazo,
    pai_id: paiId,
  };
  try {
    await criarTarefa(sessao.conta.id, nova);
  } catch (erro) {
    console.error("Falha ao criar subtarefa:", erro);
    return { erro: "Não foi possível criar a subtarefa. Tente de novo." };
  }
  revalidatePath("/org", "layout");
  return { ok: true, n: (anterior.n ?? 0) + 1 };
}

/** Apaga a tarefa (e as subtarefas). Subtarefa volta para a pai; tarefa volta para a lista. */
export async function excluirTarefaAction(id: string): Promise<void> {
  await exigirOrg();
  if (!UUID.test(id)) redirect("/org/tarefas");
  const atual = await tarefaPorId(id);
  if (atual) await excluirTarefa(id);
  revalidatePath("/org", "layout");
  redirect(atual?.pai_id ? `/org/tarefas?tarefa=${atual.pai_id}` : "/org/tarefas");
}
