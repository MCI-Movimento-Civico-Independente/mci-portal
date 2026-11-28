import { Extension, InputRule, Node, mergeAttributes, type ChainedCommands } from "@tiptap/core";
import HorizontalRule from "@tiptap/extension-horizontal-rule";

/** Frase de destaque: um parágrafo com ícone e fundo amarelo. */
export const FraseDestaque = Node.create({
  name: "fraseDestaque",
  group: "block",
  content: "inline*",
  defining: true,
  parseHTML: () => [{ tag: 'div[data-type="fraseDestaque"]' }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-type": "fraseDestaque" }), 0],
  addKeyboardShortcuts() {
    return {
      // Apagar no começo volta a ser texto.
      Backspace: () => {
        const { $anchor, empty } = this.editor.state.selection;
        if (!empty || $anchor.parent.type !== this.type || $anchor.parentOffset !== 0) return false;
        return this.editor.commands.setParagraph();
      },
    };
  },
});

/** Divisor só depois do espaço ("--- "), não no terceiro traço. */
export const Divisor = HorizontalRule.extend({
  addInputRules() {
    return [
      new InputRule({
        find: /^(?:---|—-)\s$/,
        handler: ({ range, chain }) => {
          chain().deleteRange(range).setHorizontalRule().run();
        },
      }),
    ];
  },
});

/** Alternante novo já nasce aberto, para o Enter no título levar ao conteúdo. */
export const criarAlternante = (c: ChainedCommands) => c.setDetails().updateAttributes("details", { open: true });

/** ">> " cria uma lista de alternantes ("> " continua sendo citação). */
export const AtalhoAlternante = Extension.create({
  name: "atalhoAlternante",
  // Antes do Enter da extensão Details.
  priority: 200,
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { state } = this.editor;
        const { $head, empty } = state.selection;
        if (!empty) return false;
        // No título de um alternante aberto: vai para a linha vazia do conteúdo, sem criar outra.
        if ($head.parent.type.name === "detailsSummary") {
          const pos = $head.after();
          const primeiro = state.doc.nodeAt(pos)?.firstChild;
          if (!$head.node(-1).attrs.open || primeiro?.type.name !== "paragraph" || primeiro.content.size) return false;
          return this.editor.commands.setTextSelection(pos + 2);
        }
        // Linha vazia no fim do conteúdo: sai do alternante.
        const dentro = $head.depth > 1 && $head.node(-1).type.name === "detailsContent";
        if (!dentro || $head.parent.content.size || $head.index(-1) === 0 || $head.index(-1) !== $head.node(-1).childCount - 1) return false;
        const linha = { from: $head.before(), to: $head.after() };
        // Depois de apagar a linha, o fim do alternante recua o tamanho dela.
        const depois = $head.after(-2) - (linha.to - linha.from);
        return this.editor
          .chain()
          .deleteRange(linha)
          .insertContentAt(depois, { type: "paragraph" })
          .setTextSelection(depois + 1)
          .run();
      },
    };
  },
  addInputRules() {
    return [
      new InputRule({
        find: /^>>\s$/,
        handler: ({ range, chain }) => {
          criarAlternante(chain().deleteRange(range)).run();
        },
      }),
    ];
  },
});
