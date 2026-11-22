"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarComentario, excluirComentario, registrarEvento } from "@/lib/atividade";
import { getSessao } from "@/lib/auth/sessao";
import { dataValida, formatarDataCurta } from "@/lib/datas";
import { definirValorPersonalizado, listarCamposPersonalizados } from "@/lib/campos-personalizados";
import {
  chaveFormulario,
  descreverValorPersonalizado,
  validarValorPersonalizado,
  type ValorPersonalizado,
} from "@/lib/campos-personalizados-tipos";
import { listarFormularios } from "@/lib/formularios";
import { listarGrupos } from "@/lib/grupos";
import type { GrupoBasico } from "@/lib/grupos-tipos";
import { resolverFormulario, type FormularioView } from "@/lib/formularios-tipos";
import { comitesBasicos, projetosBasicos, type ComiteBasico, type ProjetoBasico } from "@/lib/organizacao";
import {
  atualizarTarefa,
  criarTarefa,
  excluirTarefa,
  membrosOrg,
  moverTarefa,
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

type Catalogos = {
  membros: Pessoa[];
  comites: ComiteBasico[];
  projetos: ProjetoBasico[];
  formularios: FormularioView[];
  grupos: GrupoBasico[];
};

async function carregarCatalogos(): Promise<Catalogos> {
  const [membros, comites, projetos, formularios, grupos] = await Promise.all([
    membrosOrg(),
    comitesBasicos(),
    projetosBasicos(),
    listarFormularios(),
    listarGrupos(),
  ]);
  return { membros, comites, projetos, formularios, grupos };
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
    case "grupo":
      if (!v) return { valor: null };
      return cat.grupos.some((g) => g.id === v) ? { valor: v } : { erro: "Grupo inválido." };
    case "formulario":
      if (!v) return { valor: null };
      return cat.formularios.some((f) => f.id === v) ? { valor: v } : { erro: "Formulário inválido." };
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
    case "formulario":
      return cat.formularios.find((f) => f.id === valor)?.nome ?? null;
    case "grupo":
      return cat.grupos.find((g) => g.id === valor)?.nome ?? null;
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
  if (atual.pai_id && (chave === "comite_slug" || chave === "projeto_id" || chave === "formulario_id" || chave === "grupo_id")) {
    return { erro: "A subtarefa segue o comitê, o projeto, o grupo e o formulário da tarefa original." };
  }

  const validado = validarCampo(campo, valor, cat);
  if ("erro" in validado) return { erro: validado.erro };

  const patch: Alteracao = { [campo.chave]: validado.valor };

  if (campo.tipo === "data") {
    const inicio = chave === "data_inicio" ? validado.valor : atual.data_inicio;
    const fim = chave === "prazo" ? validado.valor : atual.prazo;
    if (inicio && fim && inicio > fim) return { erro: ERRO_PERIODO };
  }
  // O grupo precisa ser do projeto da tarefa.
  if (chave === "grupo_id" && validado.valor) {
    if (!atual.projeto_id) return { erro: "Escolha um projeto antes de escolher o grupo." };
    const grupo = cat.grupos.find((g) => g.id === validado.valor);
    if (grupo?.projeto_id !== atual.projeto_id) return { erro: "O grupo precisa ser do projeto da tarefa." };
  }
  // Trocar de projeto tira a tarefa do grupo (o grupo era do projeto anterior).
  if (chave === "projeto_id" && atual.grupo_id) patch.grupo_id = null;
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
    return { erro: "Algo deu errado. Tente de novo em alguns minutos." };
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
  for (const chave of ["titulo", "comite_slug", "formulario_id", "projeto_id", "grupo_id", "solicitante_id", "responsavel_id", "prioridade", "data_inicio", "prazo"]) {
    const v = validarCampo(campoPorChave(chave)!, texto(form.get(chave)), cat);
    if ("erro" in v) return { erro: v.erro };
    lido[chave] = v.valor;
  }
  const descricao = texto(form.get("descricao"));
  if (!descricao) return { erro: "Escreva a descrição da tarefa." };
  if (descricao.length > 2000) return { erro: "A descrição pode ter no máximo 2000 caracteres." };
  if (lido.data_inicio && lido.prazo && lido.data_inicio > lido.prazo) return { erro: ERRO_PERIODO };

  // O grupo precisa ser do projeto escolhido.
  if (lido.grupo_id) {
    const grupo = cat.grupos.find((g) => g.id === lido.grupo_id);
    if (!lido.projeto_id || grupo?.projeto_id !== lido.projeto_id) return { erro: "O grupo precisa ser do projeto escolhido." };
  }

  // O projeto manda: escolher um projeto define o comitê.
  if (lido.projeto_id) lido.comite_slug = cat.projetos.find((p) => p.id === lido.projeto_id)!.comite_slug;
  // Sem formulário escolhido, vale o do comitê (ou o Padrão geral).
  const formularioEscolhido = cat.formularios.find((f) => f.id === lido.formulario_id) ?? resolverFormulario(cat.formularios, lido.comite_slug);
  const formularioId = formularioEscolhido?.id ?? null;

  // Campos personalizados: só os do formulário escolhido (campos de outros formulários são ignorados).
  const personalizados = (await listarCamposPersonalizados()).filter((c) =>
    formularioEscolhido?.campos.includes(chaveFormulario(c.id)),
  );
  const camposValores: Record<string, ValorPersonalizado> = {};
  for (const c of personalizados) {
    const r = validarValorPersonalizado(c, texto(form.get(`p_${c.id}`)));
    if ("erro" in r) return { erro: r.erro };
    if (r.valor !== null) camposValores[c.id] = r.valor;
  }

  let id: string;
  try {
    id = await criarTarefa(sessao.conta.id, {
      titulo: lido.titulo!,
      descricao,
      comite_slug: lido.comite_slug,
      formulario_id: formularioId,
      campos: camposValores,
      projeto_id: lido.projeto_id,
      grupo_id: lido.grupo_id,
      prioridade: lido.prioridade as Prioridade | null,
      solicitante_id: lido.solicitante_id,
      responsavel_id: lido.responsavel_id,
      data_inicio: lido.data_inicio,
      prazo: lido.prazo,
    });
  } catch (erro) {
    console.error("Falha ao criar tarefa:", erro);
    return { erro: "Algo deu errado. Tente de novo em alguns minutos." };
  }
  await registrarEvento({ tarefa_id: id, autor_id: sessao.conta.id, tipo: "criada" });
  revalidatePath("/org", "layout");
  // Volta para a página de onde veio (lista de tarefas ou página do projeto), com a tarefa aberta.
  const retorno = texto(form.get("retorno"));
  const base = /^\/org\/(tarefas|projetos\/[0-9a-f-]{36})$/i.test(retorno) ? retorno : "/org/tarefas";
  redirect(`${base}?tarefa=${id}`);
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
    return { erro: "Algo deu errado. Tente de novo em alguns minutos." };
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
    return { erro: "Algo deu errado. Tente de novo em alguns minutos." };
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
    return { erro: "Algo deu errado. Tente de novo em alguns minutos." };
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

/** Edição inline de um campo personalizado na janela da tarefa. */
export async function atualizarCampoPersonalizadoTarefaAction(
  tarefaId: string,
  campoId: string,
  valor: string,
): Promise<EstadoForm> {
  const sessao = await exigirOrg();
  if (!UUID.test(tarefaId) || !UUID.test(campoId)) return { erro: "Pedido inválido." };

  const campo = (await listarCamposPersonalizados()).find((c) => c.id === campoId);
  if (!campo) return { erro: "Campo não encontrado." };
  const validado = validarValorPersonalizado(campo, valor);
  if ("erro" in validado) return { erro: validado.erro };

  let anterior: unknown;
  try {
    const r = await definirValorPersonalizado(tarefaId, campoId, validado.valor);
    if (!r) return { erro: "Tarefa não encontrada." };
    anterior = r.antes;
  } catch (erro) {
    console.error("Falha ao salvar o campo personalizado:", erro);
    return { erro: "Algo deu errado. Tente de novo em alguns minutos." };
  }

  const de = descreverValorPersonalizado(campo, anterior);
  const para = descreverValorPersonalizado(campo, validado.valor);
  if (de !== para) {
    await registrarEvento({ tarefa_id: tarefaId, autor_id: sessao.conta.id, tipo: "campo", campo: campo.rotulo, de, para });
  }
  revalidatePath("/org", "layout");
  return {};
}

/** Arrastar e soltar: muda a tarefa de grupo e/ou de posição dentro do projeto. */
export async function moverTarefaAction(id: string, grupoId: string, antesDeId: string | null): Promise<EstadoForm> {
  const sessao = await exigirOrg();
  if (!UUID.test(id) || !UUID.test(grupoId) || (antesDeId !== null && !UUID.test(antesDeId))) return { erro: "Pedido inválido." };

  const [atual, grupos] = await Promise.all([tarefaPorId(id), listarGrupos()]);
  if (!atual) return { erro: "Tarefa não encontrada." };
  try {
    const r = await moverTarefa(id, grupoId, antesDeId);
    if (r === "nao_achou") return { erro: "Só tarefas (não subtarefas) podem ser movidas." };
    if (r === "grupo_invalido") return { erro: "O grupo precisa ser do projeto da tarefa." };
  } catch (erro) {
    console.error("Falha ao mover a tarefa:", erro);
    return { erro: "Algo deu errado. Tente de novo em alguns minutos." };
  }
  if (atual.grupo_id !== grupoId) {
    await registrarEvento({
      tarefa_id: id,
      autor_id: sessao.conta.id,
      tipo: "campo",
      campo: "Grupo",
      de: grupos.find((g) => g.id === atual.grupo_id)?.nome ?? null,
      para: grupos.find((g) => g.id === grupoId)?.nome ?? null,
    });
  }
  revalidatePath("/org", "layout");
  return {};
}

/** Período (início e entrega) escolhido no calendário: salva os dois de uma vez. Vazio limpa. */
export async function atualizarPeriodoAction(id: string, inicio: string, fim: string): Promise<EstadoForm> {
  const sessao = await exigirOrg();
  if (!UUID.test(id)) return { erro: "Pedido inválido." };
  if ((inicio && !dataValida(inicio)) || (fim && !dataValida(fim))) return { erro: "Data inválida." };
  if (inicio && fim && inicio > fim) return { erro: ERRO_PERIODO };

  const [atual, cat] = await Promise.all([tarefaPorId(id), carregarCatalogos()]);
  if (!atual) return { erro: "Tarefa não encontrada." };

  const patch: Alteracao = { data_inicio: inicio || null, prazo: fim || null };
  try {
    if (!(await atualizarTarefa(id, patch))) return { erro: "Tarefa não encontrada." };
  } catch (erro) {
    console.error("Falha ao atualizar o período:", erro);
    return { erro: "Algo deu errado. Tente de novo em alguns minutos." };
  }
  for (const chave of ["data_inicio", "prazo"] as const) {
    const c = campoPorChave(chave)!;
    const antes = valorAtual(atual, chave);
    const depois = patch[chave] ?? null;
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
