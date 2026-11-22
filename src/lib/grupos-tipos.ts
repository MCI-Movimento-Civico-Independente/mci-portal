// Cores dos grupos: paleta livre, guardada como hex. Sem "server-only": a tela e o servidor leem a mesma lista.

export type CorGrupo = string;

export const COR_PADRAO_GRUPO = "#579bfc";

export const CORES_GRUPO: { valor: string; rotulo: string }[] = [
  { valor: "#037f4c", rotulo: "Verde escuro" },
  { valor: "#00c875", rotulo: "Verde" },
  { valor: "#9cd326", rotulo: "Lima" },
  { valor: "#cab641", rotulo: "Mostarda" },
  { valor: "#cfbe48", rotulo: "Amarelo MCI" },
  { valor: "#784bd1", rotulo: "Roxo escuro" },
  { valor: "#9d50dd", rotulo: "Roxo" },
  { valor: "#007eb5", rotulo: "Azul escuro" },
  { valor: "#579bfc", rotulo: "Azul" },
  { valor: "#66ccff", rotulo: "Azul claro" },
  { valor: "#bb3354", rotulo: "Vinho" },
  { valor: "#df2f4a", rotulo: "Vermelho" },
  { valor: "#ff007f", rotulo: "Rosa choque" },
  { valor: "#ff5ac4", rotulo: "Rosa" },
  { valor: "#ff642e", rotulo: "Laranja vivo" },
  { valor: "#d54a24", rotulo: "Laranja MCI" },
  { valor: "#fdab3d", rotulo: "Laranja claro" },
  { valor: "#7f5347", rotulo: "Marrom" },
  { valor: "#c4c4c4", rotulo: "Cinza claro" },
  { valor: "#757575", rotulo: "Cinza" },
];

export const corHexValida = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

/** Cor do grupo para usar em style; valores fora do padrão caem no cinza. */
export const corDoGrupo = (cor: string) => (corHexValida(cor) ? cor : "#c4c4c4");

export type GrupoBasico = { id: string; projeto_id: string; nome: string; cor: CorGrupo; ordem: number };
