// Cores dos grupos (as da marca). Sem "server-only": a tela e o servidor leem a mesma lista.

export type CorGrupo = "neutro" | "grafite" | "laranja" | "ouro" | "verde" | "roxo";

export const CORES_GRUPO: { valor: CorGrupo; rotulo: string; bloco: string }[] = [
  { valor: "neutro", rotulo: "Neutro", bloco: "bg-borda-forte" },
  { valor: "grafite", rotulo: "Preto", bloco: "bg-inverso" },
  { valor: "laranja", rotulo: "Laranja", bloco: "bg-marca" },
  { valor: "ouro", rotulo: "Amarelo", bloco: "bg-ouro" },
  { valor: "verde", rotulo: "Verde", bloco: "bg-verde" },
  { valor: "roxo", rotulo: "Roxo", bloco: "bg-roxo" },
];

export const blocoDaCor = (cor: string) => CORES_GRUPO.find((c) => c.valor === cor)?.bloco ?? "bg-borda-forte";

export type GrupoBasico = { id: string; projeto_id: string; nome: string; cor: CorGrupo; ordem: number };
