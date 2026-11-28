// O que uma página cita (tarefas e grupos). Sem "server-only": funções puras sobre o documento.
import type { Documento, No } from "@/lib/editor/documento";
import type { TipoRef } from "./tipos";

export const NOS_DE_REFERENCIA: Record<string, { tipo: TipoRef; atributo: "tarefaId" | "grupoId"; bloco: boolean }> = {
  tarefaBloco: { tipo: "tarefa", atributo: "tarefaId", bloco: true },
  tarefaMencao: { tipo: "tarefa", atributo: "tarefaId", bloco: false },
  grupoBloco: { tipo: "grupo", atributo: "grupoId", bloco: true },
  grupoMencao: { tipo: "grupo", atributo: "grupoId", bloco: false },
};

export function referenciaDe(no: No): { tipo: TipoRef; id: string; bloco: boolean } | null {
  const r = NOS_DE_REFERENCIA[no.type];
  const id = r && no.attrs?.[r.atributo];
  return r && typeof id === "string" ? { tipo: r.tipo, id: id.toLowerCase(), bloco: r.bloco } : null;
}

export type Referencia = { tipo: TipoRef; refId: string; blocoId: string; trecho: string };
export type Rotulo = (tipo: TipoRef, id: string) => string;

const MAX_TRECHO = 160;
const cortar = (t: string) => {
  const limpo = t.replace(/\s+/g, " ").trim();
  return limpo.length > MAX_TRECHO ? `${limpo.slice(0, MAX_TRECHO - 1)}…` : limpo;
};

const textoDaLinha = (no: No, rotulo: Rotulo) =>
  (no.content ?? [])
    .map((n) => {
      const r = referenciaDe(n);
      return r ? rotulo(r.tipo, r.id) : n.type === "hardBreak" ? " " : (n.text ?? "");
    })
    .join("");

/** Ids citados, sem repetir. */
export function idsCitados(doc: Documento | null | undefined) {
  const saida = { tarefa: new Set<string>(), grupo: new Set<string>() };
  const andar = (no: No) => {
    const r = referenciaDe(no);
    if (r) saida[r.tipo].add(r.id);
    no.content?.forEach(andar);
  };
  doc?.content.forEach(andar);
  return saida;
}

/**
 * Uma entrada por citação. `blocoId` é a ordem dela entre as citações da mesma tarefa ou grupo
 * (a tela usa a mesma ordem para rolar até lá). O trecho de uma menção é a linha em que está;
 * o de um bloco, o título acima dele.
 */
export function extrairReferencias(doc: Documento, rotulo: Rotulo): Referencia[] {
  const saida: Referencia[] = [];
  const vezes = new Map<string, number>();
  let titulo = "";
  const registrar = (tipo: TipoRef, refId: string, trecho: string) => {
    const chave = `${tipo}:${refId}`;
    const n = vezes.get(chave) ?? 0;
    vezes.set(chave, n + 1);
    saida.push({ tipo, refId, blocoId: String(n), trecho: cortar(trecho) });
  };
  const andar = (no: No) => {
    if (no.type === "heading") titulo = textoDaLinha(no, rotulo);
    const r = referenciaDe(no);
    if (r?.bloco) return registrar(r.tipo, r.id, titulo ? `Bloco em “${titulo}”` : "Bloco na página");
    const linha = (no.content ?? []).some((n) => referenciaDe(n)?.bloco === false) ? textoDaLinha(no, rotulo) : "";
    for (const filho of no.content ?? []) {
      const f = referenciaDe(filho);
      if (f && !f.bloco) registrar(f.tipo, f.id, linha);
      else andar(filho);
    }
  };
  doc.content.forEach(andar);
  return saida;
}
