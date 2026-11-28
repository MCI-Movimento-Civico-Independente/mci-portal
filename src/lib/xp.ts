import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hojeSP } from "./datas";
import type { AvisoXp } from "./xp-tipos";

// O XP é do bot Carcará: o portal só registra eventos pela função registrar_evento, que
// aplica xp_regras (valor e limite diário) e não repete (conta, ação, referência).

export type TarefaConcluida = {
  id: string;
  pai_id: string | null;
  projeto_id: string | null;
  prazo: string | null;
  criado_por: string | null;
  responsavel_id: string | null;
  executores_extra: string[] | null;
};

/** Resultado de um registro, para uma pessoa. */
export type PremioXp = Omit<AvisoXp, "voce" | "nome"> & { contaId: string };

type Retorno = {
  ok?: boolean;
  xp?: number;
  nivel?: number;
  subiu_de_nivel?: boolean;
  novas_conquistas?: unknown;
  motivo?: string | null;
};

const nomesDasConquistas = (lista: unknown): string[] =>
  (Array.isArray(lista) ? lista : [])
    .map((c) => (typeof c === "string" ? c : ((c as { nome?: string; slug?: string } | null)?.nome ?? (c as { slug?: string } | null)?.slug ?? "")))
    .filter(Boolean);

async function registrar(identidade: { provedor: string; externo_id: string }, acao: string, referencia: string): Promise<Retorno> {
  const { data, error } = await createAdminClient().rpc("registrar_evento", {
    p_provedor: identidade.provedor,
    p_externo_id: identidade.externo_id,
    p_acao: acao,
    p_referencia: referencia,
    p_origem: "portal",
  });
  if (error) throw error;
  return ((Array.isArray(data) ? data[0] : data) ?? {}) as Retorno;
}

/**
 * XP de uma tarefa ou subtarefa que acabou de passar para "concluída". Cada executor recebe o
 * valor cheio; sem executor, recebe quem concluiu. Tarefa pessoal (criada pela própria pessoa e
 * fora de um projeto) não conta. Nunca lança erro: a conclusão vale mesmo se o XP falhar.
 */
export async function premiarConclusao(tarefa: TarefaConcluida, concluidoPor: string): Promise<PremioXp[]> {
  const executores = [...new Set([tarefa.responsavel_id, ...(tarefa.executores_extra ?? [])].filter((i): i is string => !!i))];
  const candidatos = executores.length ? executores : [concluidoPor];
  try {
    const db = createAdminClient();
    let projetoId = tarefa.projeto_id;
    if (tarefa.pai_id) {
      // A subtarefa está no projeto da tarefa original.
      const { data, error } = await db.from("tarefas").select("projeto_id").eq("id", tarefa.pai_id).maybeSingle();
      if (error) throw error;
      projetoId = (data?.projeto_id as string | null | undefined) ?? null;
    }
    const contas = candidatos.filter((c) => projetoId || c !== tarefa.criado_por);
    if (contas.length === 0) return [];

    const { data: identidades, error } = await db.from("identidades").select("conta_id, provedor, externo_id").in("conta_id", contas);
    if (error) throw error;

    const acao = tarefa.pai_id ? "subtarefa_concluida" : "tarefa_concluida";
    const referencia = `${tarefa.pai_id ? "subtarefa" : "tarefa"}:${tarefa.id}`;
    // O bônus de prazo é só de tarefa (subtarefa não ganha).
    const noPrazo = !tarefa.pai_id && !!tarefa.prazo && hojeSP() <= tarefa.prazo;

    const premios: PremioXp[] = [];
    for (const contaId of contas) {
      const premio: PremioXp = { contaId, xp: 0, limite: false, nivel: null, conquistas: [], falhou: false };
      const somar = (r: Retorno) => {
        if (r.ok) premio.xp += r.xp ?? 0;
        if (r.subiu_de_nivel) premio.nivel = r.nivel ?? null;
        premio.conquistas.push(...nomesDasConquistas(r.novas_conquistas));
      };
      try {
        const daPessoa = (identidades ?? []).filter((i) => i.conta_id === contaId);
        const identidade = daPessoa.find((i) => i.provedor === "telegram") ?? daPessoa[0];
        if (!identidade) throw new Error(`Conta ${contaId} sem identidade.`);

        const base = await registrar(identidade as { provedor: string; externo_id: string }, acao, referencia);
        somar(base);
        if (base.motivo === "limite_diario") premio.limite = true;
        // Sem o registro principal (já pago ou limite do dia), não há bônus.
        else if (!base.ok) console.info(`XP não registrado (${acao}, ${referencia}): ${base.motivo ?? "sem motivo"}`);
        else if (noPrazo) somar(await registrar(identidade as { provedor: string; externo_id: string }, "tarefa_no_prazo", referencia));
      } catch (erro) {
        console.error("Falha ao registrar XP:", erro);
        premio.falhou = true;
      }
      premios.push(premio);
    }
    return premios;
  } catch (erro) {
    console.error("Falha ao preparar o XP:", erro);
    return candidatos.map((contaId) => ({ contaId, xp: 0, limite: false, nivel: null, conquistas: [], falhou: true }));
  }
}

/** Junta os registros por pessoa (várias conclusões de uma vez) e tira quem não tem o que avisar. */
export function resumirPremios(premios: PremioXp[], euId: string, nome: (contaId: string) => string): AvisoXp[] {
  const porConta = new Map<string, AvisoXp>();
  for (const p of premios) {
    const a = porConta.get(p.contaId) ?? { voce: p.contaId === euId, nome: nome(p.contaId), xp: 0, limite: false, nivel: null, conquistas: [], falhou: false };
    a.xp += p.xp;
    a.limite ||= p.limite;
    a.falhou ||= p.falhou;
    if (p.nivel !== null) a.nivel = Math.max(a.nivel ?? 0, p.nivel);
    a.conquistas = [...new Set([...a.conquistas, ...p.conquistas])];
    porConta.set(p.contaId, a);
  }
  return [...porConta.values()]
    .filter((a) => a.xp > 0 || a.limite || a.falhou || a.nivel !== null || a.conquistas.length > 0)
    .sort((a, b) => Number(b.voce) - Number(a.voce));
}

/** XP somado desde o dia 1º do mês atual (horário de Brasília). */
export async function xpDoMes(contaId: string): Promise<number> {
  const inicio = `${hojeSP().slice(0, 7)}-01T00:00:00-03:00`;
  const PAGINA = 1000;
  let total = 0;
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await createAdminClient()
      .from("xp_eventos")
      .select("xp")
      .eq("conta_id", contaId)
      .gte("criado_em", inicio)
      .order("id")
      .range(de, de + PAGINA - 1);
    if (error) throw error;
    total += (data ?? []).reduce((s, e) => s + (e.xp as number), 0);
    if ((data?.length ?? 0) < PAGINA) return total;
  }
}
