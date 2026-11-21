import type { StatusTarefa } from "@/components/ui/EtiquetaStatus";

// Dados provisórios do Início (nome e nível já vêm da sessão real). Serão trocados por consultas ao Supabase.
// As datas são texto fixo de propósito: com cacheComponents ativo, ler a hora
// atual em um Server Component exige tratamento especial.

export const saudacao = {
  data: "Sábado · 21 de novembro",
  dataCurta: "Sáb · 21 nov",
  periodo: "Boa noite",
  reunioes: 1,
  comiteReuniao: "TI",
};

export type Tarefa = {
  id: string;
  titulo: string;
  comite: string;
  projeto: string;
  prazo: string;
  status: StatusTarefa;
};

export const tarefas: Tarefa[] = [
  {
    id: "t1",
    titulo: "Revisar o fluxo de cadastro do Carcará",
    comite: "TI",
    projeto: "Bot Carcará",
    prazo: "Hoje",
    status: "em_andamento",
  },
  {
    id: "t2",
    titulo: "Publicar a tela Meu perfil no Mini App",
    comite: "TI",
    projeto: "Mini App",
    prazo: "Seg, 23/11",
    status: "a_fazer",
  },
  {
    id: "t3",
    titulo: "Definir os ícones das conquistas",
    comite: "Design",
    projeto: "Níveis",
    prazo: "Qua, 25/11",
    status: "em_revisao",
  },
  {
    id: "t4",
    titulo: "Escrever o texto da página Como funciona",
    comite: "Conteúdo",
    projeto: "Níveis",
    prazo: "Sex, 27/11",
    status: "a_fazer",
  },
];

export const proximos = [
  {
    id: "e1",
    diaSemana: "Ter",
    dia: "24",
    titulo: "Reunião do comitê de TI",
    detalhe: "19h · online",
    destaque: false,
  },
  {
    id: "e2",
    diaSemana: "Qui",
    dia: "26",
    titulo: "Debate: saneamento básico",
    detalhe: "20h · Praça, tópico Debates",
    destaque: true,
  },
];

export const comites = [
  { id: "ti", nome: "TI", projetosAtivos: 2, coordena: true, cor: "preto" as const },
  { id: "design", nome: "Design", projetosAtivos: 1, coordena: false, cor: "laranja" as const },
];
