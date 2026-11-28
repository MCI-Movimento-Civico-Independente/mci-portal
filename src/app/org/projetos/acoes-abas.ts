"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth/sessao";
import { PAGINA } from "@/lib/limites";
import { criarPagina, duplicarAba, excluirAba, renomearAba, reordenarAbas } from "@/lib/paginas/paginas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FALHOU = "Algo deu errado. Tente de novo em alguns minutos.";

// Server Actions são endpoints públicos: cada uma confere sessão e papel de novo.
async function exigirOrg() {
  const sessao = await getSessao();
  if (!sessao) redirect("/login?next=/org/projetos");
  if (!sessao.podeOrg) redirect("/comunidade");
  return sessao;
}

export type RetornoAba = { erro?: string; id?: string };

async function tentar(rotulo: string, fazer: () => Promise<RetornoAba>): Promise<RetornoAba> {
  try {
    const r = await fazer();
    if (!r.erro) revalidatePath("/org/projetos", "layout");
    return r;
  } catch (erro) {
    console.error(`Falha ao ${rotulo}:`, erro);
    return { erro: FALHOU };
  }
}

export async function criarPaginaAction(projetoId: string): Promise<RetornoAba> {
  const sessao = await exigirOrg();
  if (!UUID.test(projetoId)) return { erro: "Projeto inválido." };
  return tentar("criar a página", async () => {
    const id = await criarPagina(projetoId, sessao.conta.id);
    return id ? { id } : { erro: "Projeto não encontrado." };
  });
}

export async function renomearAbaAction(id: string, titulo: string): Promise<RetornoAba> {
  await exigirOrg();
  const nome = typeof titulo === "string" ? titulo.trim() : "";
  if (!UUID.test(id)) return { erro: "Aba inválida." };
  if (!nome) return { erro: "Dê um nome à página." };
  if (nome.length > PAGINA.tituloMaxCaracteres) return { erro: `O nome pode ter no máximo ${PAGINA.tituloMaxCaracteres} caracteres.` };
  return tentar("renomear a aba", async () => ((await renomearAba(id, nome)) ? {} : { erro: "Aba não encontrada." }));
}

export async function reordenarAbasAction(projetoId: string, ids: string[]): Promise<RetornoAba> {
  await exigirOrg();
  if (!UUID.test(projetoId) || !Array.isArray(ids) || ids.length > 100 || ids.some((i) => typeof i !== "string" || !UUID.test(i))) {
    return { erro: "Pedido inválido." };
  }
  return tentar("reordenar as abas", async () => {
    await reordenarAbas(projetoId, ids);
    return {};
  });
}

export async function duplicarAbaAction(id: string): Promise<RetornoAba> {
  const sessao = await exigirOrg();
  if (!UUID.test(id)) return { erro: "Aba inválida." };
  return tentar("duplicar a aba", async () => {
    const nova = await duplicarAba(id, sessao.conta.id);
    return nova ? { id: nova } : { erro: "Aba não encontrada." };
  });
}

export async function excluirAbaAction(id: string): Promise<RetornoAba> {
  await exigirOrg();
  if (!UUID.test(id)) return { erro: "Aba inválida." };
  return tentar("excluir a aba", async () => {
    await excluirAba(id);
    return {};
  });
}
