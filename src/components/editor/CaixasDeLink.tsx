"use client";

import type { Editor } from "@tiptap/core";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { hrefSeguro } from "@/lib/editor/documento";
import { inserirBlocos } from "./inserir";

/** Caixa logo abaixo de um ponto do documento. */
function JuntoDe({ editor, pos, children }: { editor: Editor; pos: number; children: ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const base = caixa.current?.offsetParent?.getBoundingClientRect();
    if (caixa.current && base) caixa.current.style.top = `${editor.view.coordsAtPos(pos).bottom - base.top + 8}px`;
  }, [editor, pos]);
  return (
    <div ref={caixa} className="absolute left-12 right-0 z-30 max-w-md border border-texto bg-menu text-texto">
      {children}
    </div>
  );
}

const botao = "min-h-11 border-2 border-inverso px-3 text-xs font-bold hover:bg-inverso hover:text-sobre-inverso md:min-h-9";

/** "/ Link com prévia": pede o endereço e insere o cartão. */
export function PedirCartao({ editor, aoFechar }: { editor: Editor; aoFechar: () => void }) {
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pos] = useState(() => editor.state.selection.to);

  function criar() {
    const bruto = texto.trim();
    const url = hrefSeguro(/^[a-z][a-z0-9+.-]*:/i.test(bruto) ? bruto : `https://${bruto}`);
    if (!bruto || !url || !/^https?:/.test(url)) return setErro("Use um endereço http ou https.");
    editor.commands.focus();
    inserirBlocos(editor, [{ type: "cartaoLink", attrs: { url } }]);
    aoFechar();
  }

  return (
    <JuntoDe editor={editor} pos={pos}>
      <div className="flex flex-wrap items-center gap-2 p-2">
        <input
          autoFocus
          aria-label="Endereço do link"
          placeholder="Cole o endereço"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setErro(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              criar();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              aoFechar();
              editor.commands.focus();
            }
          }}
          className="min-h-9 min-w-0 flex-1 border-2 border-borda-forte bg-menu px-2 text-sm focus-visible:border-texto"
        />
        <button type="button" onClick={criar} className={botao}>
          Criar cartão
        </button>
        <button type="button" onClick={aoFechar} className="min-h-9 px-2 text-xs text-suave hover:text-marca-texto">
          Cancelar
        </button>
        {erro && (
          <p role="alert" className="basis-full text-xs font-bold text-marca-texto">
            {erro}
          </p>
        )}
      </div>
    </JuntoDe>
  );
}

export type Oferta = { url: string; pos: number };

/** Depois de colar um endereço numa linha vazia: manter o link ou virar cartão. */
export function OferecerCartao({ editor, oferta, aoFechar }: { editor: Editor; oferta: Oferta; aoFechar: () => void }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [aoFechar]);

  function virarCartao() {
    const no = editor.state.doc.nodeAt(oferta.pos);
    if (no?.type.name === "paragraph" && no.textContent === oferta.url) {
      editor.chain().focus().setTextSelection(oferta.pos + 1).deleteRange({ from: oferta.pos + 1, to: oferta.pos + no.nodeSize - 1 }).run();
      inserirBlocos(editor, [{ type: "cartaoLink", attrs: { url: oferta.url } }]);
    }
    aoFechar();
  }

  return (
    <JuntoDe editor={editor} pos={oferta.pos + 1}>
      <div role="group" aria-label="Como mostrar o link" className="flex flex-wrap items-center gap-2 p-2" onMouseDown={(e) => e.preventDefault()}>
        <span className="rotulo mr-1 text-[10px] text-suave">Mostrar como</span>
        <button
          type="button"
          className={botao}
          onClick={() => {
            aoFechar();
            editor.commands.focus();
          }}
        >
          Link
        </button>
        <button type="button" className={botao} onClick={virarCartao}>
          Cartão com prévia
        </button>
      </div>
    </JuntoDe>
  );
}
