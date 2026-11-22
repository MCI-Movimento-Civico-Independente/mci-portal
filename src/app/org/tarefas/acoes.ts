"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarComentario, excluirComentario, registrarEvento } from "@/lib/atividade";
import { getSessao } from "@/lib/auth/sessao";
import { dataValida, formatarDataCurta } from "@/lib/datas";
import { comitesBasicos, projetosBasicos, type ComiteBasico, type ProjetoBasico } from "@/lib/organizacao";
import {
  atualizarTarefa,
  criarTarefa,
  excluirTarefa,
  membrosOrg,
  tarefaPorId,
  type Alteracao,
  type NovaTarefa,
  type Pessoa,
  type TarefaDb,
} from "@/lib/tarefas";
import { campoPorChave, type CampoTarefa, type ChaveCampo, type Prioridade } from "@/lib/tarefas-campos";

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

type Catalogos = { membros: Pessoa[]; comites: ComiteBasico[]; projetos: ProjetoBasico[] };

async function carregarCatalogos(): Promise<Catalogos> {
  const [membros, comites, projetos] = await Promise.all([membrosOrg(), comitesBasicos(), projetosBasicos()]);
  return { membros, comites, projetos };
}

type Validado = { erro: string } | { valor: string | null };

/** Valida um valor conforme o tipo do campo no registro (tarefas-campos). */
function validarCampo(campo: CampoTarefa, bruto: string, cat: Catalogos): Validado {
  const v = bruto.trim();
  switch (campo.tipo) {
    case "texto":
      if (!v) return { erro: "Dê um assunto para a tarefa." };
      if (v.length > 200) return { erro: "O assunto pode ter no máximo 200 caracteres." };
      return { valor: v };
    case "opcao":
      if (!v) return campo.obrigatorio ? { erro: `${campo.rotulo} é obrigatório.` } : { valor: null };
      return campo.opcoes?.some((o) => o.valor === v) ? { valor: v } : { erro: `${campo.rotulo} inválido.` };
    case "pessoa":
      // Só quem tem acesso à organização pode ser solicitante ou executor.
      if (!v) return { valor: null };
      return cat.membros.some((m) => m.id === v) ? { valor: v } : { erro: `${campo.rotulo}: pessoa inválida.` };
    case "data":
      if (!v) return { valor: null };
      return dataValida(v) ? { valor: v } : { erro: "Data inválida." };
    case "comite":
      if (!v) return { valor: null };
      return cat.comites.some((c) => c.slug === v) ? { valor: v } : { erro: "Comitê inválido." };
    case "projeto":
      if (!v) return { valor: null };
      return cat.projetos.some((p) => p.id === v && p.status === "ativo")
        ? { valor: v }
        : { erro: "Projeto inválido ou arquivado." };
  }
}

/** Texto legível de um valor, para o histórico (guardado como estava na época). */
function descrever(campo: CampoTarefa, valor: string | null, cat: Catalogos): string | null {
  if (!valor) return null;
  switch (campo.tipo) {
    case "pessoa":
      return cat.membros.find((m) => m.id === valor)?.nome ?? null;
    case "opcao":
      return campo.opcoes?.find((o) => o.valor === valor)?.rotulo ?? valor;
    case "data":
      return formatarDataCurta(valor);
    case "comite":
      return cat.comites.find((c) => c.slug === valor)?.nome ?? valor;
    case "projeto":
      return cat.projetos.find((p) => p.id === valor)?.nome ?? null;
    default:
      return valor;
  }
}

const valorAtual = (t: TarefaDb, chave: ChaveCampo) => (t as unknown as Record<string, string | null>)[chave] ?? null;

/** Edição inline de um campo (lista, quadro e janela da tarefa). */
export async function atualizarCampoAction(id: string, chave: string, valor: string): Promise<EstadoForm> {
  const sessao = await exigirOrg();
  const campo = campoPorChave(chave);
  if (!campo || !UUID.test(id)) return { erro: "Pedido inválido." };

  const [atual, cat] = await Promise.all([tarefaPorId(id), carregarCatalogos()]);
  if (!atual) return { erro: "Tarefa não encontrada." };
  if (atual.pai_id && (chave === "comite_slug" || chave === "projeto_id")) {
    return { erro: "A subtarefa segue o comitê e o projeto da tarefa original." };
  }

  const validado = validarCampo(campo, valor, cat);
  if ("erro" in validado) return { erro: validado.erro };

  const patch: Alteracao = { [campo.chave]: validado.valor };

  if (campo.tipo === "data") {
    const inicio = chave === "data_inicio" ? validado.valor : atual.data_inicio;
    const fim = chave === "prazo" ? validado.valor : atual.prazo;
    if (inicio && fim && inicio > fim) return { erro: ERRO_PERIODO };
  }
  // Escolher um projeto traz o comitê dele; trocar o comitê solta um projeto de outro comitê.
  if (chave === "projeto_id" && validado.valor) {
    patch.comite_slug = cat.projetos.find((p) => p.id === validado.valor)!.comite_slug;
  }
  if (chave === "comite_slug" && atual.projeto_id) {
    const projetoAtual = cat.projetos.find((p) => p.id === atual.projeto_id);
    if (projetoAtual && projetoAtual.comite_slug !== validado.valor) patch.projeto_id = null;
  }

  try {
    if (!(await atualizarTarefa(id, patch))) return { erro: "Tarefa não encontrada." };
  } catch (erro) {
    console.error("Falha ao atualizar o campo:", erro);
    return { erro: "Não foi possível salvar. Tente de novo." };
  }

  for (const chaveAlterada of Object.keys(patch) as ChaveCampo[]) {
    const c = campoPorChave(chaveAlterada)!;
    const antes = valorAtual(atual, chaveAlterada);
    const depois = (patch as Record<string, string | null>)[chaveAlterada] ?? null;
    if (antes === depois) continue;
    await registrarEvento({
      tarefa_id: id,
      autor_id: sessao.conta.id,
      tipo: "campo",
      campo: c.rotulo,
      de: descrever(c, antes, cat),
      para: descrever(c, depois, cat),
    });
  }

  revalidatePath("/org", "layout");
  return {};
}

export async function criarTarefaAction(_anterior: EstadoForm, form: FormData): Promise<EstadoForm> {
  const sessao = await exigirOrg();
  const cat = await carregarCatalogos();

  const lido: Record<string, string | null> = {};
  for (const chave of ["titulo", "comite_slug", "projeto_id", "solicitante_id", "responsavel_id", "prioridade", "data_inicio", "prazo"]) {
    const v = validarCampo(campoPorChave(chave)!, texto(form.get(chave)), cat);
    if ("erro" in v) return { erro: v.erro };
    lido[chave] = v.valor;
  }
  const descricao = texto(form.get("descricao"));
  if (!descricao) return { erro: "Escreva a descrição da tarefa." };
  if (descricao.length > 2000) return { erro: "A descrição pode ter no máximo 2000 caracteres." };
  if (lido.data_inicio && lido.prazo && lido.data_inicio > lido.prazo) return { erro: ERRO_PERIODO };

  // O projeto manda: escolher um projeto define o comitê.
  if (lido.projeto_id) lido.comite_slug = cat.projetos.find((p) => p.id === lido.projeto_id)!.comite_slug;

  let id: string;
  try {
    id = await criarTarefa(sessao.conta.id, {
      titulo: lido.titulo!,
      descricao,
      comite_slug: lido.comite_slug,
      projeto_id: lido.projeto_id,
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
  await registrarEvento({ tarefa_id: id, autor_id: sessao.conta.id, tipo: "criada" });
  revalidatePath("/org", "layout");
  redirect(`/org/tarefas?tarefa=${id}`);
}

export async function salvarDescricaoAction(id: string, _anterior: EstadoForm, form: FormData): Promise<EstadoForm> {
  const sessao = await exigirOrg();
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
  if ((atual.descricao ?? "") !== descricao) {
    await registrarEvento({ tarefa_id: id, autor_id: sessao.conta.id, tipo: "descricao" });
  }
  revalidatePath("/org", "layout");
  return { ok: true };
}

export async function criarSubtarefaAction(paiId: string, anterior: EstadoForm, form: FormData): Promise<EstadoForm> {
  const sessao = await exigirOrg();
  if (!UUID.test(paiId)) return { erro: "Tarefa inválida." };
  const [pai, cat] = await Promise.all([tarefaPorId(paiId), carregarCatalogos()]);
  if (!pai) return { erro: "Tarefa não encontrada." };
  if (pai.pai_id) return { erro: "Subtarefas não podem ter subtarefas." };

  const lido: Record<string, string | null> = {};
  for (const chave of ["titulo", "responsavel_id", "prazo"]) {
    const v = validarCampo(campoPorChave(chave)!, texto(form.get(chave)), cat);
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
    const subId = await criarTarefa(sessao.conta.id, nova);
    await registrarEvento({ tarefa_id: subId, autor_id: sessao.conta.id, tipo: "criada" });
  } catch (erro) {
    console.error("Falha ao criar subtarefa:", erro);
    return { erro: "Não foi possível criar a subtarefa. Tente de novo." };
  }
  await registrarEvento({
    tarefa_id: paiId,
    autor_id: sessao.conta.id,
    tipo: "subtarefa_adicionada",
    para: lido.titulo,
  });
  revalidatePath("/org", "layout");
  return { ok: true, n: (anterior.n ?? 0) + 1 };
}

/** Apaga a tarefa (e as subtarefas). Subtarefa volta para a pai; tarefa volta para a lista. */
export async function excluirTarefaAction(id: string): Promise<void> {
  const sessao = await exigirOrg();
  if (!UUID.test(id)) redirect("/org/tarefas");
  const atual = await tarefaPorId(id);
  if (atual) {
    if (atual.pai_id) {
      await registrarEvento({
        tarefa_id: atual.pai_id,
        autor_id: sessao.conta.id,
        tipo: "subtarefa_removida",
        de: atual.titulo,
      });
    }
    await excluirTarefa(id);
  }
  revalidatePath("/org", "layout");
  redirect(atual?.pai_id ? `/org/tarefas?tarefa=${atual.pai_id}` : "/org/tarefas");
}

export async function comentarAction(tarefaId: string, anterior: EstadoForm, form: FormData): Promise<EstadoForm> {
  const sessao = await exigirOrg();
  if (!UUID.test(tarefaId)) return { erro: "Tarefa inválida." };
  const comentario = texto(form.get("texto"));
  if (!comentario) return { erro: "Escreva o comentário." };
  if (comentario.length > 4000) return { erro: "O comentário pode ter no máximo 4000 caracteres." };
  if (!(await tarefaPorId(tarefaId))) return { erro: "Tarefa não encontrada." };

  try {
    await criarComentario(tarefaId, sessao.conta.id, comentario);
  } catch (erro) {
    console.error("Falha ao comentar:", erro);
    return { erro: "Não foi possível enviar o comentário. Tente de novo." };
  }
  revalidatePath("/org", "layout");
  return { ok: true, n: (anterior.n ?? 0) + 1 };
}

export async function excluirComentarioAction(id: string): Promise<void> {
  const sessao = await exigirOrg();
  if (!UUID.test(id)) return;
  try {
    await excluirComentario(id, sessao.conta.id, sessao.conta.papel === "admin");
  } catch (erro) {
    console.error("Falha ao excluir o comentário:", erro);
  }
  revalidatePath("/org", "layout");
}
