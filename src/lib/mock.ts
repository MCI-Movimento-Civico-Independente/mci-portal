// Dados provisórios do Início (nome, nível e tarefas já vêm do banco). Serão trocados por consultas ao Supabase.
// As datas são texto fixo de propósito: com cacheComponents ativo, ler a hora
// atual em um Server Component exige tratamento especial.

export const saudacao = {
  data: "Sábado · 21 de novembro",
  dataCurta: "Sáb · 21 nov",
  periodo: "Boa noite",
  reunioes: 1,
  comiteReuniao: "TI",
};

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
