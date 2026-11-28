"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { NodeSelection } from "@tiptap/pm/state";
import { useState } from "react";
import { TbBold, TbChevronDown, TbHighlight, TbItalic, TbLink } from "react-icons/tb";
import { BLOCOS_DA_PAGINA, transformar } from "./blocos";
import { naTabela } from "./inserir";

const botao = "flex size-9 shrink-0 items-center justify-center hover:bg-superficie aria-pressed:bg-inverso aria-pressed:text-sobre-inverso";

/** Menu flutuante da página ao selecionar texto. */
export function MenuSelecao({ editor, aoPedirLink }: { editor: Editor; aoPedirLink: () => void }) {
  const [lista, setLista] = useState(false);
  const ativo = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      highlight: e.isActive("highlight"),
      link: e.isActive("link"),
      tabela: naTabela(e),
    }),
  });

  const marca = (rotulo: string, Icone: typeof TbBold, ligado: boolean, aoClicar: () => void) => (
    <button type="button" aria-label={rotulo} title={rotulo} aria-pressed={ligado} onClick={aoClicar} className={botao}>
      <Icone size={17} aria-hidden="true" />
    </button>
  );

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: "top", onHide: () => setLista(false) }}
      // Só para texto selecionado: imagens, arquivos e cartões têm os próprios botões.
      shouldShow={({ editor: e, state, from, to }) =>
        e.isEditable && !(state.selection instanceof NodeSelection) && state.doc.textBetween(from, to).length > 0
      }
      onMouseDown={(e) => e.preventDefault()}
      className="z-30 border border-texto bg-menu text-texto"
    >
      <div className="relative flex items-center">
        {marca("Negrito (Ctrl+B)", TbBold, ativo.bold, () => editor.chain().focus().toggleBold().run())}
        {marca("Itálico (Ctrl+I)", TbItalic, ativo.italic, () => editor.chain().focus().toggleItalic().run())}
        {marca("Link (Ctrl+K)", TbLink, ativo.link, aoPedirLink)}
        {marca("Destaque (Ctrl+Shift+H)", TbHighlight, ativo.highlight, () => editor.chain().focus().toggleHighlight().run())}
        {!ativo.tabela && <span aria-hidden="true" className="mx-1 h-5 w-px bg-borda" />}
        <button
          type="button"
          hidden={ativo.tabela}
          aria-expanded={lista}
          onClick={() => setLista((v) => !v)}
          className={`h-9 items-center gap-1 whitespace-nowrap px-2 text-sm hover:bg-superficie ${ativo.tabela ? "hidden" : "flex"}`}
        >
          Transformar em
          <TbChevronDown size={14} aria-hidden="true" />
        </button>
        {lista && !ativo.tabela && (
          <div className="absolute right-0 top-full z-10 mt-1 max-h-64 w-60 overflow-y-auto whitespace-nowrap border border-texto bg-menu p-1.5">
            {BLOCOS_DA_PAGINA.filter((b) => b.transforma).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setLista(false);
                  transformar(editor, b);
                }}
                className="flex min-h-9 w-full items-center gap-3 px-3 text-left text-sm hover:bg-superficie"
              >
                <b.icone size={16} aria-hidden="true" />
                {b.rotulo}
              </button>
            ))}
          </div>
        )}
      </div>
    </BubbleMenu>
  );
}
