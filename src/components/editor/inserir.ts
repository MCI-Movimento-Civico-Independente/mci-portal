import type { Editor, JSONContent } from "@tiptap/core";
import { Fragment } from "@tiptap/pm/model";
import { Selection } from "@tiptap/pm/state";

/**
 * Põe blocos inteiros (imagem, arquivo, cartão, tabela) junto do cursor: no lugar do parágrafo
 * vazio ou logo depois do bloco atual, subindo até onde o tipo é aceito. O cursor vai para depois.
 */
export function inserirBlocos(editor: Editor, conteudo: JSONContent[]) {
  const { state } = editor;
  const { $from, to } = state.selection;
  const nos = conteudo.map((c) => state.schema.nodeFromJSON(c));
  const tipo = nos[0].type;

  let trecho = { from: $from.depth ? state.doc.content.size : to, to: $from.depth ? state.doc.content.size : to };
  for (let d = $from.depth; d >= 1; d--) {
    const pai = $from.node(d - 1);
    const i = $from.index(d - 1);
    const no = $from.node(d);
    if (no.type.name === "paragraph" && !no.content.size && pai.canReplaceWith(i, i + 1, tipo)) {
      trecho = { from: $from.before(d), to: $from.after(d) };
      break;
    }
    if (pai.canReplaceWith(i + 1, i + 1, tipo)) {
      trecho = { from: $from.after(d), to: $from.after(d) };
      break;
    }
  }

  const bloco = Fragment.from(nos);
  const tr = state.tr.replaceWith(trecho.from, trecho.to, bloco);
  const fim = trecho.from + bloco.size;
  // Garante uma linha para continuar escrevendo depois do que entrou.
  if (!tr.doc.resolve(fim).nodeAfter?.isTextblock) {
    const $fim = tr.doc.resolve(fim);
    const paragrafo = state.schema.nodes.paragraph;
    if ($fim.parent.canReplaceWith($fim.index(), $fim.index(), paragrafo)) tr.insert(fim, paragrafo.create());
  }
  tr.setSelection(Selection.near(tr.doc.resolve(fim), 1));
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
}

/** O cursor está dentro de uma célula de tabela? */
export function naTabela(editor: Editor) {
  const { $from } = editor.state.selection;
  for (let d = $from.depth; d > 0; d--) if ($from.node(d).type.name === "table") return true;
  return false;
}
