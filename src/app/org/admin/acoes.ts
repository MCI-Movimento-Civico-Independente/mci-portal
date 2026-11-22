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
    return { erro: "Não foi possível salvar. Tente de novo." };
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
    return { erro: "Não foi possível criar o comitê. Tente de novo." };
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
    return { erro: "Não foi possível salvar. Tente de novo." };
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
