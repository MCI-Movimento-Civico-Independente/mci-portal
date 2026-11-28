import { Extension } from "@tiptap/core";
import type { Node as NoDoc } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { PAGINA, TABELA } from "@/lib/limites";
import { MAXIMO_DE_IMAGENS } from "./envio";

function medir(doc: NoDoc) {
  const m = { imagens: 0, colunas: 0, linhas: 0 };
  doc.descendants((no) => {
    if (no.type.name === "imagem") m.imagens++;
    if (no.type.name !== "table") return true;
    m.linhas = Math.max(m.linhas, no.childCount);
    no.forEach((linha) => {
      let colunas = 0;
      linha.forEach((celula) => (colunas += celula.attrs.colspan as number));
      m.colunas = Math.max(m.colunas, colunas);
    });
    return true;
  });
  return m;
}

/** Barra qualquer mudança (digitar, Tab, colar, duplicar) que passe dos limites da página. */
export const LimitesDaPagina = Extension.create<{ aoRecusar: (mensagem: string) => void }>({
  name: "limitesDaPagina",
  addOptions: () => ({ aoRecusar: () => {} }),
  addProseMirrorPlugins() {
    const { aoRecusar } = this.options;
    return [
      new Plugin({
        filterTransaction: (tr, estado) => {
          if (!tr.docChanged) return true;
          const novo = medir(tr.doc);
          if (novo.imagens <= PAGINA.maxImagens && novo.colunas <= TABELA.maxColunas && novo.linhas <= TABELA.maxLinhas) return true;
          const antes = medir(estado.doc);
          const recusa =
            novo.imagens > PAGINA.maxImagens && novo.imagens > antes.imagens
              ? MAXIMO_DE_IMAGENS
              : (novo.colunas > TABELA.maxColunas && novo.colunas > antes.colunas) || (novo.linhas > TABELA.maxLinhas && novo.linhas > antes.linhas)
                ? `Cada tabela aceita até ${TABELA.maxColunas} colunas e ${TABELA.maxLinhas} linhas.`
                : null;
          if (!recusa) return true;
          queueMicrotask(() => aoRecusar(recusa));
          return false;
        },
      }),
    ];
  },
});
