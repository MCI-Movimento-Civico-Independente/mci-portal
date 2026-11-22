"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth/sessao";
import { atualizarGrupo, criarGrupoPadrao, excluirGrupo, moverGrupo } from "@/lib/grupos";
import { corHexValida } from "@/lib/grupos-tipos";
import { comitesBasicos, criarProjeto, mudarStatusProjeto } from "@/lib/organizacao";

export type EstadoProjeto = { erro?: string; ok?: boolean; n?: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function exigirOrg() {
  const sessao = await getSessao();
  if (!sessao) redirect("/login?next=/org/projetos");
  if (!sessao.podeOrg) redirect("/comunidade");
  return sessao;
}

const texto = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

export async function criarProjetoAction(anterior: EstadoProjeto, form: FormData): Promise<EstadoProjeto> {
  const sessao = await exigirOrg();
  const comite = texto(form.get("comite"));
  const nome = texto(form.get("nome"));
  const descricao = texto(form.get("descricao"));

  if (!(await comitesBasicos()).some((c) => c.slug === comite)) return { erro: "Escolha o comitê do projeto." };
  if (!nome) return { erro: "Dê um nome ao projeto." };
  if (nome.length > 120) return { erro: "O nome pode ter no máximo 120 caracteres." };
  if (descricao.length > 1000) return { erro: "A descrição pode ter no máximo 1000 caracteres." };

  try {
    await criarProjeto(sessao.conta.id, { comite_slug: comite, nome, descricao: descricao || null });
  } catch (erro) {
    console.error("Falha ao criar projeto:", erro);
    return { erro: "Algo deu errado. Tente de novo em alguns minutos." };
  }
  revalidatePath("/org", "layout");
  return { ok: true, n: (anterior.n ?? 0) + 1 };
}

export async function arquivarProjetoAction(id: string, arquivar: boolean): Promise<void> {
  await exigirOrg();
  if (!UUID.test(id)) return;
  try {
    await mudarStatusProjeto(id, arquivar ? "arquivado" : "ativo");
  } catch (erro) {
    console.error("Falha ao mudar o status do projeto:", erro);
  }
  revalidatePath("/org", "layout");
}

// ---------- Grupos do projeto ----------

/** Um clique: cria "Novo grupo" para a pessoa renomear e escolher a cor depois. */
export async function criarGrupoAction(projetoId: string): Promise<void> {
  await exigirOrg();
  if (!UUID.test(projetoId)) return;
  try {
    await criarGrupoPadrao(projetoId);
  } catch (erro) {
    console.error("Falha ao criar grupo:", erro);
  }
  revalidatePath("/org", "layout");
}

export async function mudarCorGrupoAction(id: string, cor: string): Promise<void> {
  await exigirOrg();
  if (!UUID.test(id) || !corHexValida(cor)) return;
  try {
    await atualizarGrupo(id, { cor });
  } catch (erro) {
    console.error("Falha ao mudar a cor do grupo:", erro);
  }
  revalidatePath("/org", "layout");
}

export async function atualizarGrupoAction(id: string, _anterior: EstadoProjeto, form: FormData): Promise<EstadoProjeto> {
  await exigirOrg();
  const nome = texto(form.get("nome"));
  if (!UUID.test(id)) return { erro: "Pedido inválido." };
  if (!nome) return { erro: "O nome não pode ficar vazio." };
  if (nome.length > 60) return { erro: "O nome pode ter no máximo 60 caracteres." };

  try {
    const r = await atualizarGrupo(id, { nome });
    if (r === "nome_em_uso") return { erro: "Já existe um grupo com esse nome neste projeto." };
    if (r === "nao_achou") return { erro: "Grupo não encontrado." };
  } catch (erro) {
    console.error("Falha ao editar grupo:", erro);
    return { erro: "Algo deu errado. Tente de novo em alguns minutos." };
  }
  revalidatePath("/org", "layout");
  return { ok: true };
}

export async function moverGrupoAction(id: string, direcao: "cima" | "baixo"): Promise<void> {
  await exigirOrg();
  if (!UUID.test(id) || (direcao !== "cima" && direcao !== "baixo")) return;
  try {
    await moverGrupo(id, direcao);
  } catch (erro) {
    console.error("Falha ao mover grupo:", erro);
  }
  revalidatePath("/org", "layout");
}

/** As tarefas do grupo não são apagadas: vão para o primeiro grupo que sobrar. */
export async function excluirGrupoAction(id: string): Promise<void> {
  await exigirOrg();
  if (!UUID.test(id)) return;
  try {
    await excluirGrupo(id);
  } catch (erro) {
    console.error("Falha ao excluir grupo:", erro);
  }
  revalidatePath("/org", "layout");
}
