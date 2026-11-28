// Anexos que o servidor precisou trocar ao salvar (copiados de outro projeto, ou que não deu
// para copiar). Sem "server-only": o servidor e o editor aplicam a mesma troca.
import type { Documento, No } from "@/lib/editor/documento";

export type Troca = { de: string; /** Id da cópia neste projeto; null vira um aviso no lugar do bloco. */ para: string | null };

export const AVISO_DE_COPIA = "Não foi possível copiar este arquivo";

export const blocoDeAviso = (): No => ({ type: "fraseDestaque", content: [{ type: "text", text: AVISO_DE_COPIA }] });

/** A troca que vale para este bloco, se houver. */
export function trocaDe(tipo: string, arquivoId: unknown, trocas: Troca[]): Troca | undefined {
  if ((tipo !== "imagem" && tipo !== "arquivo") || typeof arquivoId !== "string") return undefined;
  return trocas.find((t) => t.de === arquivoId.toLowerCase());
}

export function aplicarTrocas(doc: Documento, trocas: Troca[]): Documento {
  const aplicar = (no: No): No => {
    const troca = trocaDe(no.type, no.attrs?.arquivoId, trocas);
    if (troca) return troca.para ? { ...no, attrs: { ...no.attrs, arquivoId: troca.para } } : blocoDeAviso();
    return no.content ? { ...no, content: no.content.map(aplicar) } : no;
  };
  return aplicar(doc as unknown as No) as unknown as Documento;
}
