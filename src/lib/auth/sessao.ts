import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buscarContaPorAuth, provedoresDaConta, type Conta } from "./contas";
import { podeAcessarOrg } from "./destino";

export type Sessao = {
  conta: Conta;
  nome: string;
  primeiroNome: string;
  inicial: string;
  xp: number;
  nivel: {
    numero: number;
    nome: string;
    proximo: string | null;
    xpFaltando: number;
    progresso: number;
  };
  temGoogle: boolean;
  podeOrg: boolean;
};

type LinhaNivel = { nivel: number; nome: string; xp_min: number };

/**
 * Sessão do usuário, lida no servidor. A fonte da verdade é o banco
 * (papel, nome, XP), não o token. Devolve null se não houver login.
 * Memoizada por requisição, então layout e página podem chamar à vontade.
 */
export const getSessao = cache(async (): Promise<Sessao | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const conta = await buscarContaPorAuth(user.id);
  if (!conta) return null;

  const admin = createAdminClient();
  const [perfil, niveis, provedores] = await Promise.all([
    admin
      .from("perfil_xp")
      .select("nome, total, nivel, nivel_nome")
      .eq("conta_id", conta.id)
      .maybeSingle(),
    admin.from("niveis").select("nivel, nome, xp_min").order("nivel"),
    provedoresDaConta(conta.id),
  ]);

  const nome = (conta.nome ?? (perfil.data?.nome as string | undefined) ?? "Membro").trim();
  const total = (perfil.data?.total as number | undefined) ?? 0;
  const lista = (niveis.data ?? []) as LinhaNivel[];
  const numero = (perfil.data?.nivel as number | undefined) ?? lista[0]?.nivel ?? 1;
  const atual = lista.find((n) => n.nivel === numero);
  const seguinte = lista.find((n) => n.nivel > numero);

  const faixa = seguinte ? seguinte.xp_min - (atual?.xp_min ?? 0) : 0;
  const progresso = seguinte && faixa > 0
    ? Math.min(1, Math.max(0, (total - (atual?.xp_min ?? 0)) / faixa))
    : 1;

  return {
    conta,
    nome,
    primeiroNome: nome.split(/\s+/)[0] || nome,
    inicial: (nome[0] ?? "M").toUpperCase(),
    xp: total,
    nivel: {
      numero,
      nome: (perfil.data?.nivel_nome as string | undefined) ?? atual?.nome ?? "Membro",
      proximo: seguinte?.nome ?? null,
      xpFaltando: seguinte ? Math.max(0, seguinte.xp_min - total) : 0,
      progresso,
    },
    temGoogle: provedores.includes("google"),
    podeOrg: podeAcessarOrg(conta.papel),
  };
});
