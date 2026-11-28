import { Node, mergeAttributes, type Editor } from "@tiptap/core";
import { Fragment, type Node as NoDoc } from "@tiptap/pm/model";
import { Selection } from "@tiptap/pm/state";

/* Colunas lado a lado. Só existem no primeiro nível do documento: não há colunas dentro de colunas. */

export const MAXIMO_DE_COLUNAS = 3;
export const LARGURA_MINIMA = 15;

/** Documento da página: blocos comuns e, só aqui, as colunas. */
export const DocumentoPagina = Node.create({ name: "doc", topNode: true, content: "(block | colunas)+" });

export const Coluna = Node.create({
  name: "coluna",
  content: "block+",
  isolating: true,
  addAttributes: () => ({
    // Proporção da largura (a soma das colunas é cerca de 100).
    largura: {
      default: 50,
      parseHTML: (el: HTMLElement) => Number(el.getAttribute("data-largura")) || 50,
      renderHTML: ({ largura }: Record<string, unknown>) => ({ "data-largura": String(largura), style: `flex-grow:${Number(largura) || 50}` }),
    },
  }),
  parseHTML: () => [{ tag: 'div[data-type="coluna"]' }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-type": "coluna" }), 0],
});

export const Colunas = Node.create({
  name: "colunas",
  group: "colunas",
  content: "coluna{2,3}",
  isolating: true,
  defining: true,
  parseHTML: () => [{ tag: 'div[data-type="colunas"]' }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-type": "colunas" }), 0],
  addKeyboardShortcuts() {
    return {
      // Apagar numa coluna vazia remove a coluna.
      Backspace: () => {
        const { $from, empty } = this.editor.state.selection;
        if (!empty || $from.depth !== 3 || $from.node(1).type !== this.type || $from.parentOffset !== 0) return false;
        const coluna = $from.node(2);
        if (coluna.childCount !== 1 || !vazia(coluna)) return false;
        removerColuna(this.editor, $from.before(1), $from.index(1));
        return true;
      },
    };
  },
});

const vazia = (coluna: NoDoc) => coluna.childCount === 1 && coluna.firstChild!.type.name === "paragraph" && !coluna.firstChild!.content.size;

const lerColunas = (editor: Editor, pos: number) => {
  const no = editor.state.doc.nodeAt(pos);
  return no?.type.name === "colunas" ? { no, filhas: Array.from({ length: no.childCount }, (_, i) => no.child(i)) } : null;
};

const iguais = (n: number) => Math.round(1000 / n) / 10;

function trocar(editor: Editor, pos: number, tamanho: number, novo: Fragment | NoDoc) {
  const tr = editor.state.tr.replaceWith(pos, pos + tamanho, novo);
  tr.setSelection(Selection.near(tr.doc.resolve(Math.min(pos + 1, tr.doc.content.size)), 1));
  editor.view.dispatch(tr.scrollIntoView());
  editor.view.focus();
}

/** Troca o bloco atual (no primeiro nível) por colunas; o texto que houver vai para a primeira. */
export function criarColunas(editor: Editor, quantas: 2 | 3) {
  const { $from } = editor.state.selection;
  if ($from.depth !== 1) return;
  const { schema } = editor.state;
  const atual = $from.node(1);
  const filhas = Array.from({ length: quantas }, (_, i) =>
    schema.nodes.coluna.create({ largura: iguais(quantas) }, i === 0 ? atual : schema.nodes.paragraph.create()),
  );
  trocar(editor, $from.before(1), atual.nodeSize, schema.nodes.colunas.create(null, filhas));
  editor.commands.setTextSelection($from.before(1) + 3);
}

/** Blocos de todas as colunas, em ordem (colunas vazias não deixam linha em branco). */
function conteudoDe(editor: Editor, filhas: NoDoc[]) {
  const blocos = filhas.filter((c) => !vazia(c)).flatMap((c) => Array.from({ length: c.childCount }, (_, i) => c.child(i)));
  return Fragment.from(blocos.length ? blocos : [editor.state.schema.nodes.paragraph.create()]);
}

export function desfazerColunas(editor: Editor, pos: number) {
  const c = lerColunas(editor, pos);
  if (c) trocar(editor, pos, c.no.nodeSize, conteudoDe(editor, c.filhas));
}

/** Remove uma coluna sem perder o conteúdo. Se sobraria só uma, o bloco se desfaz. */
export function removerColuna(editor: Editor, pos: number, indice: number) {
  const c = lerColunas(editor, pos);
  if (!c) return;
  if (c.filhas.length <= 2) return desfazerColunas(editor, pos);
  const saindo = c.filhas[indice];
  const vizinha = indice > 0 ? indice - 1 : 1;
  const total = c.filhas.reduce((s, f) => s + (f.attrs.largura as number), 0) - (saindo.attrs.largura as number);
  const filhas = c.filhas.flatMap((f, i) => {
    if (i === indice) return [];
    const largura = Math.round(((f.attrs.largura as number) / total) * 1000) / 10;
    let conteudo = f.content;
    if (i === vizinha && !vazia(saindo)) {
      const meu = vazia(f) ? Fragment.empty : f.content;
      conteudo = indice > 0 ? meu.append(saindo.content) : saindo.content.append(meu);
    }
    return [f.type.create({ largura }, conteudo)];
  });
  trocar(editor, pos, c.no.nodeSize, c.no.type.create(null, filhas));
}

export function adicionarColuna(editor: Editor, pos: number) {
  const c = lerColunas(editor, pos);
  if (!c || c.filhas.length >= MAXIMO_DE_COLUNAS) return;
  const largura = iguais(c.filhas.length + 1);
  const { paragraph, coluna } = editor.state.schema.nodes;
  const filhas = [...c.filhas.map((f) => f.type.create({ largura }, f.content)), coluna.create({ largura }, paragraph.create())];
  trocar(editor, pos, c.no.nodeSize, c.no.type.create(null, filhas));
}

/** Grava as larguras. `historico: false` é a prévia durante o arrasto (não entra no desfazer). */
export function definirLarguras(editor: Editor, pos: number, larguras: number[], historico = true) {
  const c = lerColunas(editor, pos);
  if (!c) return;
  const tr = editor.state.tr;
  let p = pos + 1;
  c.filhas.forEach((f, i) => {
    if (larguras[i] !== undefined) tr.setNodeMarkup(p, undefined, { largura: Math.round(larguras[i] * 10) / 10 });
    p += f.nodeSize;
  });
  if (!historico) tr.setMeta("addToHistory", false);
  editor.view.dispatch(tr);
}

export const igualarColunas = (editor: Editor, pos: number) => {
  const c = lerColunas(editor, pos);
  if (c) definirLarguras(editor, pos, c.filhas.map(() => iguais(c.filhas.length)));
};
