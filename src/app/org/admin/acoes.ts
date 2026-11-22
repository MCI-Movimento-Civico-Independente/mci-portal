"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  alterarPapel,
  auditar,
  contarAdmins,
  criarComiteOrg,
  excluirComiteOrg,
  moverComiteOrg,
  renomearComiteOrg,
} from "@/lib/admin";
import { buscarConta } from "@/lib/auth/contas";
import { getSessao } from "@/lib/auth/sessao";
import {
  arquivarCampoPersonalizado,
  atualizarCampoPersonalizado,
  criarCampoPersonalizado,
} from "@/lib/campos-personalizados";
import { chaveFormulario, lerOpcoes, TIPOS_PERSONALIZADOS, type TipoCampoPersonalizado } from "@/lib/campos-personalizados-tipos";
import { adicionarCampoAoFormulario, criarFormulario, excluirFormulario, salvarFormulario } from "@/lib/formularios";
import { comitesBasicos } from "@/lib/organizacao";

export type EstadoAdmin = { erro?: string; ok?: boolean; n?: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9-]{1,60}$/;
const PAPEIS = ["membro", "organizacao", "admin"] as const;

// Server Actions são endpoints públicos: cada uma confere que a sessão é de um admin.
async function exigirAdmin() {
  const sessao = await getSessao();
  if (!sessao) redirect("/login?next=/org/admin");
  if (sessao.conta.papel !== "admin") redirect("/org");
  return sessao;
}

const texto = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

export async function alterarPapelAction(contaId: string, papel: string): Promise<EstadoAdmin> {
  const sessao = await exigirAdmin();
  if (!UUID.test(contaId) || !PAPEIS.includes(papel as (typeof PAPEIS)[number])) return { erro: "Pedido inválido." };
  const novo = papel as (typeof PAPEIS)[number];

  try {
    // Nunca deixar a organização sem nenhum admin.
    if (novo !== "admin" && (await contarAdmins()) <= 1) {
      if ((await buscarConta(contaId))?.papel === "admin") return { erro: "É preciso manter pelo menos um admin." };
    }
    const r = await alterarPapel(contaId, novo);
    if (!r) return { erro: "Conta não encontrada." };
    if (r.anterior !== novo) {
      await auditar(sessao.conta.id, "papel_alterado", contaId, { nome: r.nome, de: r.anterior, para: novo });
    }
  } catch (erro) {
    console.error("Falha ao alterar o papel:", erro);
    return { erro: "Algo deu errado. Tente de novo em alguns minutos." };
  }
  revalidatePath("/org", "layout");
  return {};
}

export async function criarComiteAction(anterior: EstadoAdmin, form: FormData): Promise<EstadoAdmin> {
  const sessao = await exigirAdmin();
  const nome = texto(form.get("nome"));
  if (!nome) return { erro: "Dê um nome ao comitê." };
  if (nome.length > 100) return { erro: "O nome pode ter no máximo 100 caracteres." };

  try {
    const r = await criarComiteOrg(nome);
    if (r === "nome_em_uso") return { erro: "Já existe um comitê com esse nome." };
    if (r === "nome_invalido") return { erro: "Use letras ou números no nome." };
    await auditar(sessao.conta.id, "comite_criado", r.slug, { nome });
  } catch (erro) {
    console.error("Falha ao criar comitê:", erro);
    return { erro: "Algo deu errado. Tente de novo em alguns minutos." };
  }
  revalidatePath("/org", "layout");
  return { ok: true, n: (anterior.n ?? 0) + 1 };
}

export async function renomearComiteAction(slug: string, _anterior: EstadoAdmin, form: FormData): Promise<EstadoAdmin> {
  const sessao = await exigirAdmin();
  const nome = texto(form.get("nome"));
  if (!SLUG.test(slug)) return { erro: "Pedido inválido." };
  if (!nome) return { erro: "O nome não pode ficar vazio." };
  if (nome.length > 100) return { erro: "O nome pode ter no máximo 100 caracteres." };

  try {
    const r = await renomearComiteOrg(slug, nome);
    if (r === "nome_em_uso") return { erro: "Já existe um comitê com esse nome." };
    if (r === "nao_achou") return { erro: "Comitê não encontrado." };
    await auditar(sessao.conta.id, "comite_renomeado", slug, { nome });
  } catch (erro) {
    console.error("Falha ao renomear comitê:", erro);
    return { erro: "Algo deu errado. Tente de novo em alguns minutos." };
  }
  revalidatePath("/org", "layout");
  return { ok: true };
}

export async function moverComiteAction(slug: string, direcao: "cima" | "baixo"): Promise<void> {
  const sessao = await exigirAdmin();
  if (!SLUG.test(slug) || (direcao !== "cima" && direcao !== "baixo")) return;
  try {
    await moverComiteOrg(slug, direcao);
    await auditar(sessao.conta.id, "comite_movido", slug, { direcao });
  } catch (erro) {
    console.error("Falha ao mover comitê:", erro);
  }
  revalidatePath("/org", "layout");
}

export async function excluirComiteAction(slug: string): Promise<void> {
  const sessao = await exigirAdmin();
  if (!SLUG.test(slug)) return;
  try {
    if ((await excluirComiteOrg(slug)) === "ok") {
      await auditar(sessao.conta.id, "comite_excluido", slug);
    }
  } catch (erro) {
    console.error("Falha ao excluir comitê:", erro);
  }
  revalidatePath("/org", "layout");
}

// ---------- Formulários ----------

export async function criarFormularioAction(_anterior: EstadoAdmin, form: FormData): Promise<EstadoAdmin> {
  const sessao = await exigirAdmin();
  const nome = texto(form.get("nome"));
  if (!nome) return { erro: "Dê um nome ao formulário." };
  if (nome.length > 80) return { erro: "O nome pode ter no máximo 80 caracteres." };

  let id: string;
  try {
    const r = await criarFormulario(nome);
    if (r === "nome_em_uso") return { erro: "Já existe um formulário com esse nome." };
    id = r.id;
    await auditar(sessao.conta.id, "formulario_criado", id, { nome });
  } catch (erro) {
    console.error("Falha ao criar formulário:", erro);
    return { erro: "Algo deu errado. Tente de novo em alguns minutos." };
  }
  revalidatePath("/org", "layout");
  redirect(`/org/admin/formularios/${id}`);
}

export async function salvarFormularioAction(id: string, _anterior: EstadoAdmin, form: FormData): Promise<EstadoAdmin> {
  const sessao = await exigirAdmin();
  if (!UUID.test(id)) return { erro: "Pedido inválido." };
  const nome = texto(form.get("nome"));
  const descricao = texto(form.get("descricao"));
  if (!nome) return { erro: "O nome não pode ficar vazio." };
  if (nome.length > 80) return { erro: "O nome pode ter no máximo 80 caracteres." };
  if (descricao.length > 500) return { erro: "A descrição pode ter no máximo 500 caracteres." };

  const campos = form.getAll("campo").filter((v): v is string => typeof v === "string");
  const comites = form.getAll("comite").filter((v): v is string => typeof v === "string");

  try {
    const validos = new Set((await comitesBasicos()).map((c) => c.slug));
    if (comites.some((c) => !validos.has(c))) return { erro: "Comitê inválido." };

    const r = await salvarFormulario(id, { nome, descricao: descricao || null, campos, comites });
    if (r === "nome_em_uso") return { erro: "Já existe um formulário com esse nome." };
    if (r === "nao_achou") return { erro: "Formulário não encontrado." };
    await auditar(sessao.conta.id, "formulario_salvo", id, { nome, campos, comites });
  } catch (erro) {
    console.error("Falha ao salvar formulário:", erro);
    return { erro: "Algo deu errado. Tente de novo em alguns minutos." };
  }
  revalidatePath("/org", "layout");
  return { ok: true };
}

export async function excluirFormularioAction(id: string): Promise<void> {
  const sessao = await exigirAdmin();
  if (!UUID.test(id)) return;
  try {
    if ((await excluirFormulario(id)) === "ok") {
      await auditar(sessao.conta.id, "formulario_excluido", id);
    }
  } catch (erro) {
    console.error("Falha ao excluir formulário:", erro);
  }
  revalidatePath("/org", "layout");
  redirect("/org/admin/formularios");
}

// ---------- Campos personalizados ----------

/** Lê opções do formulário: só o tipo "lista" tem opções. */
function lerOpcoesDoForm(tipo: TipoCampoPersonalizado, form: FormData): { opcoes: string[] } | { erro: string } {
  return tipo === "lista" ? lerOpcoes(texto(form.get("opcoes"))) : { opcoes: [] };
}

/**
 * Cria um campo personalizado. Com `formularioId`, já o inclui nesse formulário
 * (é o que acontece quando se cria o campo de dentro do editor de um formulário).
 */
export async function criarCampoPersonalizadoAction(
  formularioId: string,
  anterior: EstadoAdmin,
  form: FormData,
): Promise<EstadoAdmin> {
  const sessao = await exigirAdmin();
  const rotulo = texto(form.get("rotulo"));
  const tipo = texto(form.get("tipo")) as TipoCampoPersonalizado;
  if (!rotulo) return { erro: "Dê um nome ao campo." };
  if (rotulo.length > 60) return { erro: "O nome pode ter no máximo 60 caracteres." };
  if (!TIPOS_PERSONALIZADOS.some((t) => t.valor === tipo)) return { erro: "Escolha o tipo do campo." };
  if (formularioId && !UUID.test(formularioId)) return { erro: "Pedido inválido." };
  const opcoes = lerOpcoesDoForm(tipo, form);
  if ("erro" in opcoes) return { erro: opcoes.erro };
  // Uma caixa de marcação "obrigatória" não faz sentido: forçaria sempre marcar.
  const obrigatorio = tipo !== "caixa" && form.get("obrigatorio") === "on";

  try {
    const r = await criarCampoPersonalizado(sessao.conta.id, { rotulo, tipo, opcoes: opcoes.opcoes, obrigatorio });
    if (r === "nome_em_uso") return { erro: "Já existe um campo com esse nome." };
    if (formularioId) await adicionarCampoAoFormulario(formularioId, chaveFormulario(r.id));
    await auditar(sessao.conta.id, "campo_criado", r.id, { rotulo, tipo, formularioId: formularioId || null });
  } catch (erro) {
    console.error("Falha ao criar campo personalizado:", erro);
    return { erro: "Algo deu errado. Tente de novo em alguns minutos." };
  }
  revalidatePath("/org", "layout");
  return { ok: true, n: (anterior.n ?? 0) + 1 };
}

export async function atualizarCampoPersonalizadoAction(
  id: string,
  tipo: TipoCampoPersonalizado,
  _anterior: EstadoAdmin,
  form: FormData,
): Promise<EstadoAdmin> {
  const sessao = await exigirAdmin();
  if (!UUID.test(id)) return { erro: "Pedido inválido." };
  const rotulo = texto(form.get("rotulo"));
  if (!rotulo) return { erro: "O nome não pode ficar vazio." };
  if (rotulo.length > 60) return { erro: "O nome pode ter no máximo 60 caracteres." };
  const opcoes = lerOpcoesDoForm(tipo, form);
  if ("erro" in opcoes) return { erro: opcoes.erro };
  const obrigatorio = tipo !== "caixa" && form.get("obrigatorio") === "on";

  try {
    const r = await atualizarCampoPersonalizado(id, { rotulo, opcoes: opcoes.opcoes, obrigatorio });
    if (r === "nome_em_uso") return { erro: "Já existe um campo com esse nome." };
    if (r === "nao_achou") return { erro: "Campo não encontrado." };
    await auditar(sessao.conta.id, "campo_editado", id, { rotulo });
  } catch (erro) {
    console.error("Falha ao editar campo personalizado:", erro);
    return { erro: "Algo deu errado. Tente de novo em alguns minutos." };
  }
  revalidatePath("/org", "layout");
  return { ok: true };
}

export async function arquivarCampoPersonalizadoAction(id: string, arquivar: boolean): Promise<void> {
  const sessao = await exigirAdmin();
  if (!UUID.test(id)) return;
  try {
    if ((await arquivarCampoPersonalizado(id, arquivar)) === "ok") {
      await auditar(sessao.conta.id, arquivar ? "campo_arquivado" : "campo_reativado", id);
    }
  } catch (erro) {
    console.error("Falha ao arquivar campo personalizado:", erro);
  }
  revalidatePath("/org", "layout");
}
