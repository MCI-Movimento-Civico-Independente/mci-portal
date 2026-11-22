"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth/sessao";
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
    return { erro: "Não foi possível criar o projeto. Tente de novo." };
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
