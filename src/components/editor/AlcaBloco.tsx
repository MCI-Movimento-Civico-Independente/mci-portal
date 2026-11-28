"use client";

import type { Editor } from "@tiptap/core";
import { useEffect, useRef, useState, type RefObject } from "react";
import { TbArrowDown, TbArrowUp, TbCopy, TbGripVertical, TbTrash } from "react-icons/tb";
import { BLOCOS_DA_PAGINA, transformar, type Bloco } from "./blocos";

/*
 * Alça à esquerda de cada bloco de primeiro nível: arrastar muda a ordem; clicar abre o menu
 * (transformar, mover, duplicar, excluir). Funciona com mouse, toque e teclado.
 */

/** Posição, no documento, do bloco número `indice`. */
function posicaoDo(e: Editor, indice: number) {
  let pos = 0;
  for (let i = 0; i < indice; i++) pos += e.state.doc.child(i).nodeSize;
  return pos;
}

const blocosNaTela = (e: Editor) =>
  Array.from({ length: e.state.doc.childCount }, (_, i) => e.view.nodeDOM(posicaoDo(e, i)) as HTMLElement | null);

/** Leva o bloco `de` para antes do bloco `para` (para = total: vai ao fim). */
function mover(e: Editor, de: number, para: number) {
  if (para === de || para === de + 1) return;
  const no = e.state.doc.child(de);
  const origem = posicaoDo(e, de);
  const destino = posicaoDo(e, para);
  const tr = e.state.tr.delete(origem, origem + no.nodeSize);
  tr.insert(tr.mapping.map(destino), no);
  e.view.dispatch(tr.scrollIntoView());
}

const item = "flex min-h-9 w-full items-center gap-3 px-3 text-left text-sm hover:bg-superficie disabled:text-suave disabled:hover:bg-transparent";

export function AlcaBloco({ editor, area }: { editor: Editor; area: RefObject<HTMLDivElement | null> }) {
  const [alvo, setAlvo] = useState<{ i: number; topo: number } | null>(null);
  const [menu, setMenu] = useState(false);
  const [linha, setLinha] = useState<number | null>(null);
  const arrasto = useRef<{ x: number; y: number; ativo: boolean; para: number } | null>(null);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const no = area.current;
    if (!no) return;
    /** Mostra a alça ao lado do bloco `i`. */
    const mostrar = (i: number) => {
      const bloco = blocosNaTela(editor)[i];
      if (!bloco) return setAlvo(null);
      setAlvo({ i, topo: bloco.getBoundingClientRect().top - no.getBoundingClientRect().top });
    };
    // Mouse: o bloco sob o ponteiro.
    const aoMover = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse" || arrasto.current || caixa.current?.contains(ev.target as globalThis.Node)) return;
      const i = blocosNaTela(editor).findIndex((b) => {
        const r = b?.getBoundingClientRect();
        return !!r && ev.clientY >= r.top - 4 && ev.clientY <= r.bottom + 4;
      });
      if (i >= 0) mostrar(i);
    };
    // Toque e teclado: o bloco onde está o cursor.
    const noCursor = () => {
      if (!arrasto.current && editor.isFocused) mostrar(editor.state.selection.$from.index(0));
    };
    const mudou = () => {
      setMenu(false);
      noCursor();
    };
    no.addEventListener("pointermove", aoMover);
    editor.on("selectionUpdate", noCursor);
    editor.on("update", mudou);
    return () => {
      no.removeEventListener("pointermove", aoMover);
      editor.off("selectionUpdate", noCursor);
      editor.off("update", mudou);
    };
  }, [editor, area]);

  // Menu fecha com Esc ou clicando fora.
  useEffect(() => {
    if (!menu) return;
    const fora = (ev: Event) => {
      if (!caixa.current?.contains(ev.target as globalThis.Node)) setMenu(false);
    };
    const tecla = (ev: KeyboardEvent) => ev.key === "Escape" && setMenu(false);
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [menu]);

  if (!alvo || alvo.i >= editor.state.doc.childCount) return null;
  const total = editor.state.doc.childCount;
  const no = editor.state.doc.child(alvo.i);

  /** Onde o bloco cairia: antes do primeiro cujo meio está abaixo do ponteiro. */
  function destino(y: number) {
    const telas = blocosNaTela(editor);
    const i = telas.findIndex((b) => {
      const r = b?.getBoundingClientRect();
      return !!r && y < r.top + r.height / 2;
    });
    const para = i < 0 ? telas.length : i;
    const base = area.current!.getBoundingClientRect();
    const borda = para < telas.length ? telas[para]!.getBoundingClientRect().top - 2 : telas.at(-1)!.getBoundingClientRect().bottom + 2;
    return { para, topo: borda - base.top };
  }

  function encerrar() {
    arrasto.current = null;
    setLinha(null);
    document.body.classList.remove("arrastando");
  }

  const acao = (fazer: () => void) => () => {
    setMenu(false);
    fazer();
  };
  const trocar = (b: Bloco) => {
    const pos = posicaoDo(editor, alvo.i);
    // Um alternante primeiro se desfaz; os outros blocos são selecionados por inteiro.
    if (no.type.name === "details") {
      editor.chain().setTextSelection(pos + 2).unsetDetails().run();
      transformar(editor, b);
    } else {
      transformar(editor, b, { from: pos + 1, to: pos + no.nodeSize - 1 });
    }
  };

  return (
    <>
      <div ref={caixa} className="absolute left-0 z-20" style={{ top: alvo.topo }}>
        <button
          type="button"
          aria-label="Opções do bloco (arraste para mover)"
          title="Arraste para mover; clique para opções"
          aria-expanded={menu}
          onPointerDown={(ev) => {
            if (ev.button !== 0) return;
            ev.currentTarget.setPointerCapture(ev.pointerId);
            arrasto.current = { x: ev.clientX, y: ev.clientY, ativo: false, para: alvo.i };
          }}
          onPointerMove={(ev) => {
            const a = arrasto.current;
            if (!a) return;
            if (!a.ativo && Math.hypot(ev.clientX - a.x, ev.clientY - a.y) < 5) return;
            a.ativo = true;
            setMenu(false);
            document.body.classList.add("arrastando");
            if (ev.clientY < 90) window.scrollBy(0, -14);
            else if (ev.clientY > window.innerHeight - 60) window.scrollBy(0, 14);
            const d = destino(ev.clientY);
            a.para = d.para;
            setLinha(d.topo);
          }}
          onPointerUp={() => {
            const a = arrasto.current;
            encerrar();
            if (a?.ativo) {
              mover(editor, alvo.i, a.para);
              setAlvo(null);
            }
          }}
          onPointerCancel={encerrar}
          onClick={(ev) => {
            // O clique que encerra um arrasto não abre o menu (o ponteiro andou).
            const andou = arrasto.current?.ativo;
            if (!andou && ev.detail < 2) setMenu((v) => !v);
          }}
          className="flex h-7 w-6 cursor-grab touch-none items-center justify-center text-suave hover:bg-inverso hover:text-sobre-inverso active:cursor-grabbing"
        >
          <TbGripVertical size={15} aria-hidden="true" />
        </button>
        {menu && (
          <div className="absolute left-0 top-full mt-1 max-h-[60dvh] w-60 overflow-y-auto border border-texto bg-menu p-1.5 text-texto">
            <button type="button" className={item} onClick={acao(() => editor.chain().focus().insertContentAt(posicaoDo(editor, alvo.i) + no.nodeSize, no.toJSON()).run())}>
              <TbCopy size={16} aria-hidden="true" />
              Duplicar
            </button>
            <button type="button" className={item} disabled={alvo.i === 0} onClick={acao(() => mover(editor, alvo.i, alvo.i - 1))}>
              <TbArrowUp size={16} aria-hidden="true" />
              Mover para cima
            </button>
            <button type="button" className={item} disabled={alvo.i >= total - 1} onClick={acao(() => mover(editor, alvo.i, alvo.i + 2))}>
              <TbArrowDown size={16} aria-hidden="true" />
              Mover para baixo
            </button>
            <button
              type="button"
              className={`${item} text-marca-texto`}
              onClick={acao(() => {
                const pos = posicaoDo(editor, alvo.i);
                editor.chain().focus().deleteRange({ from: pos, to: pos + no.nodeSize }).run();
                setAlvo(null);
              })}
            >
              <TbTrash size={16} aria-hidden="true" />
              Excluir
            </button>
            {no.type.name !== "horizontalRule" && (
              <>
                <p className="rotulo px-3 pb-1 pt-3 text-suave">Transformar em</p>
                {BLOCOS_DA_PAGINA.filter((b) => b.transforma).map((b) => (
                  <button key={b.id} type="button" className={item} onClick={acao(() => trocar(b))}>
                    <b.icone size={16} aria-hidden="true" />
                    {b.rotulo}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>
      {linha !== null && <div aria-hidden="true" className="pointer-events-none absolute left-8 right-0 z-10 h-0.5 bg-marca" style={{ top: linha }} />}
    </>
  );
}
