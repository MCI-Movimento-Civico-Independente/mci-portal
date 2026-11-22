import { dataValida, formatarDataCurta } from "./datas";

// Tipos e validação dos campos personalizados. Sem "server-only": a tela usa os
// rótulos e o servidor usa a validação, a partir da mesma definição.

export type TipoCampoPersonalizado = "texto" | "texto_longo" | "numero" | "data" | "lista" | "caixa";

export const TIPOS_PERSONALIZADOS: { valor: TipoCampoPersonalizado; rotulo: string }[] = [
  { valor: "texto", rotulo: "Texto curto" },
  { valor: "texto_longo", rotulo: "Texto longo" },
  { valor: "numero", rotulo: "Número" },
  { valor: "data", rotulo: "Data" },
  { valor: "lista", rotulo: "Lista suspensa" },
  { valor: "caixa", rotulo: "Caixa de marcação" },
];

export const rotuloDoTipo = (tipo: string) => TIPOS_PERSONALIZADOS.find((t) => t.valor === tipo)?.rotulo ?? tipo;

export type CampoPersonalizado = {
  id: string;
  rotulo: string;
  tipo: TipoCampoPersonalizado;
  opcoes: string[];
  obrigatorio: boolean;
  arquivado: boolean;
};

export type ValorPersonalizado = string | number | boolean;

/** Chave do campo dentro de formulario_campos. */
export const chaveFormulario = (id: string) => `p:${id}`;
export const ehChavePersonalizada = (chave: string) => chave.startsWith("p:");
export const idDaChave = (chave: string) => chave.slice(2);

/** O valor como texto, para preencher um input ("" quando vazio). */
export function valorComoTexto(valor: unknown): string {
  if (valor === undefined || valor === null) return "";
  return String(valor);
}

/** Texto legível do valor, para o histórico. */
export function descreverValorPersonalizado(campo: CampoPersonalizado, valor: unknown): string | null {
  if (valor === undefined || valor === null || valor === "") return null;
  if (campo.tipo === "caixa") return valor === true ? "Sim" : "Não";
  if (campo.tipo === "data") return formatarDataCurta(String(valor));
  return String(valor);
}

export type ResultadoValor = { erro: string } | { valor: ValorPersonalizado | null };

/**
 * Valida o texto recebido do formulário. Vazio vira null (remove o valor), exceto
 * em campo obrigatório. Na caixa de marcação, "true" marca e qualquer outra coisa desmarca.
 */
export function validarValorPersonalizado(campo: CampoPersonalizado, bruto: string): ResultadoValor {
  const v = bruto.trim();
  if (campo.tipo === "caixa") return { valor: v === "true" ? true : null };
  if (!v) return campo.obrigatorio ? { erro: `${campo.rotulo} é obrigatório.` } : { valor: null };

  switch (campo.tipo) {
    case "texto":
      return v.length <= 200 ? { valor: v } : { erro: `${campo.rotulo}: no máximo 200 caracteres.` };
    case "texto_longo":
      return v.length <= 2000 ? { valor: v } : { erro: `${campo.rotulo}: no máximo 2000 caracteres.` };
    case "numero": {
      const n = Number(v.replace(",", "."));
      return Number.isFinite(n) && Math.abs(n) <= 1e12 ? { valor: n } : { erro: `${campo.rotulo}: número inválido.` };
    }
    case "data":
      return dataValida(v) ? { valor: v } : { erro: `${campo.rotulo}: data inválida.` };
    case "lista":
      return campo.opcoes.includes(v) ? { valor: v } : { erro: `${campo.rotulo}: escolha uma das opções.` };
  }
}

/** Lê as opções de um campo "lista" a partir de um texto com uma opção por linha. */
export function lerOpcoes(texto: string): { opcoes: string[] } | { erro: string } {
  const opcoes = [...new Set(texto.split("\n").map((o) => o.trim()).filter(Boolean))];
  if (opcoes.length === 0) return { erro: "Informe pelo menos uma opção (uma por linha)." };
  if (opcoes.length > 50) return { erro: "Use no máximo 50 opções." };
  if (opcoes.some((o) => o.length > 60)) return { erro: "Cada opção pode ter no máximo 60 caracteres." };
  return { opcoes };
}
