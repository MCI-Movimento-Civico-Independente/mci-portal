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
  mudarStatusTarefa,
  STATUS,
  tarefaPorId,
  type DadosTarefa,
} from "@/lib/tarefas";
import type { StatusTarefa } from "@/components/ui/EtiquetaStatus";

export type EstadoForm = { erro?: string; ok?: boolean; n?: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server Actions são endpoints públicos: cada uma confere sessão e papel de novo.
async function exigirOrg() {
  const sessao = await getSessao();
  if (!sessao) redirect("/login?next=/org/tarefas");
  if (!sessao.podeOrg) redirect("/comunidade");
  return sessao;
}

const texto = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

type Lido = { erro: string } | { dados: DadosTarefa };

/** Lê e valida os campos comuns do formulário de tarefa. */
async function lerCampos(form: FormData, descricaoObrigatoria: boolean): Promise<Lido> {
  const titulo = texto(form.get("titulo"));
  const descricao = texto(form.get("descricao"));
  const prazo = texto(form.get("prazo"));
  const responsavel = texto(form.get("responsavel"));

  if (!titulo) return { erro: "Dê um assunto para a tarefa." };
  if (titulo.length > 200) return { erro: "O assunto pode ter no máximo 200 caracteres." };
  if (descricaoObrigatoria && !descricao) return { erro: "Escreva a descrição da tarefa." };
  if (descricao.length > 2000) return { erro: "A descrição pode ter no máximo 2000 caracteres." };
  if (prazo && !dataValida(prazo)) return { erro: "Data inválida." };

  let responsavel_id: string | null = null;
  if (responsavel) {
    // Só quem tem acesso à organização pode receber tarefa.
    if (!UUID.test(responsavel) || !(await membrosOrg()).some((m) => m.id === responsavel)) {
      return { erro: "Pessoa inválida em \"Atribuído a\"." };
    }
    responsavel_id = responsavel;
  }

  return { dados: { titulo, descricao: descricao || null, prazo: prazo || null, responsavel_id } };
}

export async function criarTarefaAction(_anterior: EstadoForm, form: FormData): Promise<EstadoForm> {
  const sessao = await exigirOrg();
  const lido = await lerCampos(form, true);
  if ("erro" in lido) return { erro: lido.erro };

  let id: string;
  try {
    id = await criarTarefa(sessao.conta.id, lido.dados);
  } catch (erro) {
    console.error("Falha ao criar tarefa:", erro);
    return { erro: "Não foi possível salvar a tarefa. Tente de novo." };
  }
  revalidatePath("/org", "layout");
  redirect(`/org/tarefas/${id}`);
}

export async function atualizarTarefaAction(
  id: string,
  _anterior: EstadoForm,
  form: FormData,
): Promise<EstadoForm> {
  await exigirOrg();
  if (!UUID.test(id)) return { erro: "Tarefa inválida." };
  const atual = await tarefaPorId(id);
  if (!atual) return { erro: "Tarefa não encontrada." };

  // Descrição só é obrigatória em tarefas; subtarefa pode ficar sem.
  const lido = await lerCampos(form, atual.tarefa.pai_id === null);
  if ("erro" in lido) return { erro: lido.erro };

  try {
    await atualizarTarefa(id, lido.dados);
  } catch (erro) {
    console.error("Falha ao atualizar tarefa:", erro);
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
  if (pai.tarefa.pai_id) return { erro: "Subtarefas não podem ter subtarefas." };

  const lido = await lerCampos(form, false);
  if ("erro" in lido) return { erro: lido.erro };

  try {
    await criarTarefa(sessao.conta.id, { ...lido.dados, pai_id: paiId });
  } catch (erro) {
    console.error("Falha ao criar subtarefa:", erro);
    return { erro: "Não foi possível criar a subtarefa. Tente de novo." };
  }
  revalidatePath("/org", "layout");
  return { ok: true, n: (anterior.n ?? 0) + 1 };
}

export async function mudarStatusAction(id: string, status: string): Promise<EstadoForm> {
  await exigirOrg();
  if (!UUID.test(id) || !STATUS.includes(status as StatusTarefa)) return { erro: "Pedido inválido." };
  try {
    if (!(await mudarStatusTarefa(id, status as StatusTarefa))) return { erro: "Tarefa não encontrada." };
  } catch (erro) {
    console.error("Falha ao mudar o status:", erro);
    return { erro: "Não foi possível atualizar. Tente de novo." };
  }
  revalidatePath("/org", "layout");
  return {};
}

/** Apaga a tarefa (e as subtarefas dela). Vai para a pai se for subtarefa, senão para a lista. */
export async function excluirTarefaAction(id: string): Promise<void> {
  await exigirOrg();
  if (!UUID.test(id)) redirect("/org/tarefas");
  const atual = await tarefaPorId(id);
  if (atual) await excluirTarefa(id);
  revalidatePath("/org", "layout");
  redirect(atual?.tarefa.pai_id ? `/org/tarefas/${atual.tarefa.pai_id}` : "/org/tarefas");
}
