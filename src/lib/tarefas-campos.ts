// Registro dos campos de uma tarefa. Sem "server-only": a tela e as Server Actions
// leem a mesma lista (rótulo, tipo, opções), então o que aparece e o que é aceito
// vêm de um lugar só. É a base para a futura central de administração, que
// passará a guardar essas definições no banco em vez de no código.

export type StatusTarefa = "a_fazer" | "em_andamento" | "em_revisao" | "concluida";
export type Prioridade = "baixa" | "media" | "alta" | "urgente";

export type Opcao = { valor: string; rotulo: string; classes: string };

// Etiquetas do manual: mono, caixa alta, cor chapada.
// A FAZER (inverso) · EM ANDAMENTO (amarelo) · EM REVISÃO (laranja) · CONCLUÍDA (contorno).
const ETIQUETA = "font-mono uppercase tracking-wide";
export const STATUS_OPCOES: Opcao[] = [
  { valor: "a_fazer", rotulo: "A fazer", classes: `${ETIQUETA} border-inverso bg-inverso text-sobre-inverso` },
  { valor: "em_andamento", rotulo: "Em andamento", classes: `${ETIQUETA} border-ouro bg-ouro text-sobre-ouro` },
  { valor: "em_revisao", rotulo: "Em revisão", classes: `${ETIQUETA} border-marca bg-marca text-sobre-marca` },
  { valor: "concluida", rotulo: "Concluída", classes: `${ETIQUETA} border-inverso bg-transparent text-texto` },
];

export const PRIORIDADE_OPCOES: Opcao[] = [
  { valor: "", rotulo: "—", classes: `${ETIQUETA} border-transparent bg-transparent text-suave` },
  { valor: "baixa", rotulo: "Baixa", classes: `${ETIQUETA} border-borda-forte bg-transparent text-suave` },
  { valor: "media", rotulo: "Média", classes: `${ETIQUETA} border-ouro bg-ouro text-sobre-ouro` },
  { valor: "alta", rotulo: "Alta", classes: `${ETIQUETA} border-marca bg-marca text-sobre-marca` },
  { valor: "urgente", rotulo: "Urgente", classes: `${ETIQUETA} border-absurdo bg-absurdo text-sobre-absurdo` },
];

export type ChaveCampo =
  | "titulo"
  | "comite_slug"
  | "formulario_id"
  | "projeto_id"
  | "grupo_id"
  | "solicitante_id"
  | "responsavel_id"
  | "status"
  | "prioridade"
  | "data_inicio"
  | "prazo";

export type CampoTarefa = {
  chave: ChaveCampo;
  rotulo: string;
  tipo: "texto" | "opcao" | "pessoa" | "data" | "comite" | "projeto" | "formulario" | "grupo";
  obrigatorio?: boolean;
  /** Campo que existe em todo formulário (não dá para remover). */
  fixo?: boolean;
  opcoes?: Opcao[];
};

export const CAMPOS: CampoTarefa[] = [
  { chave: "titulo", rotulo: "Tarefa", tipo: "texto", obrigatorio: true, fixo: true },
  { chave: "comite_slug", rotulo: "Comitê", tipo: "comite", fixo: true },
  { chave: "formulario_id", rotulo: "Formulário", tipo: "formulario", fixo: true },
  { chave: "projeto_id", rotulo: "Projeto", tipo: "projeto" },
  // Grupo do projeto (como na Monday): só aparece quando a tarefa tem projeto.
  { chave: "grupo_id", rotulo: "Grupo", tipo: "grupo", fixo: true },
  { chave: "solicitante_id", rotulo: "Solicitante", tipo: "pessoa" },
  { chave: "responsavel_id", rotulo: "Executor", tipo: "pessoa" },
  { chave: "status", rotulo: "Status", tipo: "opcao", obrigatorio: true, fixo: true, opcoes: STATUS_OPCOES },
  { chave: "prioridade", rotulo: "Prioridade", tipo: "opcao", opcoes: PRIORIDADE_OPCOES },
  { chave: "data_inicio", rotulo: "Início", tipo: "data" },
  { chave: "prazo", rotulo: "Entrega", tipo: "data" },
];

export const campoPorChave = (chave: string) => CAMPOS.find((c) => c.chave === chave);

/** Campos que cada formulário pode adicionar ou remover. */
export const CAMPOS_CONFIGURAVEIS = CAMPOS.filter((c) => !c.fixo);
export const CHAVES_CONFIGURAVEIS: string[] = CAMPOS_CONFIGURAVEIS.map((c) => c.chave);
