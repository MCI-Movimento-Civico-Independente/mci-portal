// Dados dos vínculos entre páginas e quadro. Sem "server-only".
import type { Prioridade, StatusTarefa } from "@/lib/tarefas-campos";
import { STATUS_OPCOES } from "@/lib/tarefas-campos";

export type TipoRef = "tarefa" | "grupo";

type Pessoa = { id: string; nome: string | null };

export type Dependencia = { id: string; numero: number; titulo: string; status: StatusTarefa };

export type TarefaVinculo = {
  id: string;
  numero: number;
  titulo: string;
  status: StatusTarefa;
  prioridade: Prioridade | null;
  data_inicio: string | null;
  prazo: string | null;
  projeto_id: string | null;
  grupo: { id: string; nome: string } | null;
  solicitante: Pessoa | null;
  executores: Pessoa[];
  depende_de: Dependencia[];
};

export type GrupoVinculo = {
  id: string;
  nome: string;
  cor: string;
  projeto_id: string;
  contagem: Record<StatusTarefa, number>;
};

/** Pedido que não pode ser visto vem marcado; o que não existe mais simplesmente não vem. */
export type SemAcesso = { semAcesso: true };
export type Vinculos = {
  tarefas: Record<string, TarefaVinculo | SemAcesso>;
  grupos: Record<string, GrupoVinculo | SemAcesso>;
};

export const temAcesso = <T extends object>(v: T | SemAcesso | undefined): v is T => !!v && !("semAcesso" in v);

export const codigo = (numero: number) => `T-${numero}`;
/** "T-14", "t14" ou "14" → 14. */
export const lerCodigo = (texto: string) => {
  const m = /^\s*(?:t-?\s*)?(\d{1,9})\s*$/i.exec(texto);
  return m ? Number(m[1]) : null;
};

export const rotuloDoStatus = (status: string) => STATUS_OPCOES.find((o) => o.valor === status)?.rotulo ?? status;

/** Abre a tarefa no quadro principal do projeto dela (ou na lista, se não tiver projeto). */
export const linkDaTarefa = (t: { id: string; projeto_id: string | null }) =>
  t.projeto_id ? `/org/projetos/${t.projeto_id}?tarefa=${t.id}` : `/org/tarefas?tarefa=${t.id}`;
export const linkDoGrupo = (g: { id: string; projeto_id: string }) => `/org/projetos/${g.projeto_id}?destaque=${g.id}`;

const lista = (itens: string[]) => (itens.length < 2 ? (itens[0] ?? "") : `${itens.slice(0, -1).join(", ")} e ${itens.at(-1)}`);

/** Pergunta de confirmação ao mover uma tarefa (ou várias) com dependência aberta. */
export function avisoDeBloqueio(bloqueadas: { numero: number; depende: number[] }[], emMassa = false): string {
  const deps = [...new Set(bloqueadas.flatMap((b) => b.depende))].sort((a, b) => a - b).map(codigo);
  const fim = deps.length > 1 ? "que ainda não foram concluídas" : "que ainda não foi concluída";
  const sujeito = !emMassa
    ? "Esta tarefa depende"
    : bloqueadas.length === 1
      ? `${codigo(bloqueadas[0].numero)} depende`
      : `${bloqueadas.length} tarefas selecionadas dependem`;
  return `${sujeito} de ${lista(deps)}, ${fim}. Mover mesmo assim?`;
}
