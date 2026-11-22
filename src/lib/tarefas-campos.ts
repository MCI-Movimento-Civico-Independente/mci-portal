// Registro dos campos de uma tarefa. Sem "server-only": a tela e as Server Actions
// leem a mesma lista (rótulo, tipo, opções), então o que aparece e o que é aceito
// vêm de um lugar só. É a base para a futura central de administração, que
// passará a guardar essas definições no banco em vez de no código.

export type StatusTarefa = "a_fazer" | "em_andamento" | "em_revisao" | "concluida";
export type Prioridade = "baixa" | "media" | "alta" | "urgente";

export type Opcao = { valor: string; rotulo: string; classes: string };

export const STATUS_OPCOES: Opcao[] = [
  { valor: "a_fazer", rotulo: "A fazer", classes: "bg-preto text-creme-claro border-preto" },
  { valor: "em_andamento", rotulo: "Em andamento", classes: "bg-amarelo text-preto border-amarelo" },
  { valor: "em_revisao", rotulo: "Em revisão", classes: "bg-laranja text-preto border-laranja" },
  { valor: "concluida", rotulo: "Concluída", classes: "bg-transparent text-preto border-preto" },
];

export const PRIORIDADE_OPCOES: Opcao[] = [
  { valor: "", rotulo: "—", classes: "bg-transparent text-cinza border-linha" },
  { valor: "baixa", rotulo: "Baixa", classes: "bg-creme-claro text-preto border-cinza" },
  { valor: "media", rotulo: "Média", classes: "bg-amarelo/40 text-preto border-amarelo" },
  { valor: "alta", rotulo: "Alta", classes: "bg-laranja text-preto border-laranja" },
  { valor: "urgente", rotulo: "Urgente", classes: "bg-laranja-texto text-creme-claro border-laranja-texto" },
];

export type ChaveCampo =
  | "titulo"
  | "comite_slug"
  | "projeto_id"
  | "solicitante_id"
  | "responsavel_id"
  | "status"
  | "prioridade"
  | "data_inicio"
  | "prazo";

export type CampoTarefa = {
  chave: ChaveCampo;
  rotulo: string;
  tipo: "texto" | "opcao" | "pessoa" | "data" | "comite" | "projeto";
  obrigatorio?: boolean;
  opcoes?: Opcao[];
};

export const CAMPOS: CampoTarefa[] = [
  { chave: "titulo", rotulo: "Tarefa", tipo: "texto", obrigatorio: true },
  { chave: "comite_slug", rotulo: "Comitê", tipo: "comite" },
  { chave: "projeto_id", rotulo: "Projeto", tipo: "projeto" },
  { chave: "solicitante_id", rotulo: "Solicitante", tipo: "pessoa" },
  { chave: "responsavel_id", rotulo: "Executor", tipo: "pessoa" },
  { chave: "status", rotulo: "Status", tipo: "opcao", obrigatorio: true, opcoes: STATUS_OPCOES },
  { chave: "prioridade", rotulo: "Prioridade", tipo: "opcao", opcoes: PRIORIDADE_OPCOES },
  { chave: "data_inicio", rotulo: "Início", tipo: "data" },
  { chave: "prazo", rotulo: "Entrega", tipo: "data" },
];

export const campoPorChave = (chave: string) => CAMPOS.find((c) => c.chave === chave);
