import type { Vinculos } from "@/lib/vinculos/tipos";

/*
 * Dados ao vivo das tarefas e grupos citados numa página. Uma só consulta para tudo, pedida
 * quando aparece uma citação nova, ao voltar para a aba do navegador e a cada 60 s.
 */

export type EstadoDosVinculos = Vinculos & {
  /** Ids que já tiveram resposta: o que não veio nos dados foi removido. */
  respondidos: Set<string>;
  falhou: boolean;
};

const VAZIO: EstadoDosVinculos = { tarefas: {}, grupos: {}, respondidos: new Set(), falhou: false };

export function criarDadosDeVinculos() {
  let estado = VAZIO;
  let alvos = { tarefas: [] as string[], grupos: [] as string[] };
  let espera = 0;
  let pedido = 0;
  const ouvintes = new Set<() => void>();

  async function atualizar() {
    window.clearTimeout(espera);
    const { tarefas, grupos } = alvos;
    if (!tarefas.length && !grupos.length) return;
    const meu = ++pedido;
    try {
      const resposta = await fetch("/api/vinculos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tarefas, grupos }),
        cache: "no-store",
      });
      if (!resposta.ok) throw new Error();
      const v = (await resposta.json()) as Vinculos;
      // Uma resposta mais antiga não passa por cima de uma mais nova.
      if (meu !== pedido) return;
      estado = { ...v, respondidos: new Set([...tarefas, ...grupos]), falhou: false };
    } catch {
      if (meu !== pedido) return;
      estado = { ...estado, falhou: true };
    }
    ouvintes.forEach((f) => f());
  }

  return {
    assinar(f: () => void) {
      ouvintes.add(f);
      return () => void ouvintes.delete(f);
    },
    ler: () => estado,
    atualizar,
    /** O que a página cita agora. Só busca de novo se aparecer algo que ainda não foi respondido. */
    definirAlvos(tarefas: string[], grupos: string[]) {
      alvos = { tarefas, grupos };
      if (![...tarefas, ...grupos].some((id) => !estado.respondidos.has(id))) return;
      window.clearTimeout(espera);
      espera = window.setTimeout(() => void atualizar(), 80);
    },
  };
}
export type DadosDeVinculos = ReturnType<typeof criarDadosDeVinculos>;
