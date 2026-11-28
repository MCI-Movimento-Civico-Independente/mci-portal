"use client";

import type { Editor } from "@tiptap/core";
import { useEffect, useRef, useState, type RefObject } from "react";
import { TbArrowDown, TbArrowUp, TbCopy, TbGripHorizontal, TbGripVertical, TbTrash } from "react-icons/tb";
import { BLOCOS_DA_PAGINA, transformar, type Bloco } from "./blocos";
import { duplicar, elementoDe, ehLista, escolherVaga, excluir, mover, unidades, vagas, vizinho, type Unidade, type Vaga } from "./mover";

/*
 * Alças à esquerda dos blocos. A mais próxima do texto move o item de lista (ou o bloco) sob o
 * ponteiro; quando ele está dentro de uma lista ou de colunas, uma segunda alça, mais à
 * esquerda, move o bloco inteiro. Arrastar muda a ordem; clicar abre o menu.
 * Funciona com mouse, toque e teclado.
 */

type Alca = { u: Unidade; topo: number; x: number; inteiro: boolean };

const LARGURA = 24;
const TEXTUAIS = new Set(["paragraph", "heading", "bulletList", "orderedList", "taskList", "blockquote", "details", "fraseDestaque"]);

/** Alças para a unidade mais interna e para os blocos que a contêm. */
function alcasPara(e: Editor, todas: Unidade[], alvo: Unidade, base: DOMRect): Alca[] {
  const { doc } = e.state;
  const contem = todas.filter((u) => u.pos < alvo.pos && u.pos + u.no.nodeSize > alvo.pos && !u.item);
  // Do mais interno para o mais externo: o próprio, o bloco da coluna e o bloco do documento.
  const cadeia = [alvo, ...contem.reverse()];
  let limite = Infinity;
  return cadeia.flatMap((u, i) => {
    const dom = elementoDe(e, u.pos);
    if (!dom) return [];
    const r = dom.getBoundingClientRect();
    // O marcador da lista fica no recuo dela: a alça vai antes dele.
    const recuo = u.item && dom.parentElement ? parseFloat(getComputedStyle(dom.parentElement).paddingLeft) || 0 : 0;
    const noDoc = doc.resolve(u.pos).depth === 0;
    const natural = noDoc && i > 0 ? 0 : r.left - recuo - LARGURA - base.left;
    const x = Math.max(0, Math.min(natural, limite - LARGURA));
    limite = x;
    return [{ u, x, topo: r.top - base.top, inteiro: i > 0 }];
  });
}

const item = "flex min-h-9 w-full items-center gap-3 px-3 text-left text-sm hover:bg-superficie disabled:text-suave disabled:hover:bg-transparent";

export function AlcaBloco({ editor, area }: { editor: Editor; area: RefObject<HTMLDivElement | null> }) {
  const [alcas, setAlcas] = useState<Alca[]>([]);
  const [menu, setMenu] = useState<number | null>(null);
  const [linha, setLinha] = useState<{ topo: number; esquerda: number; largura: number } | null>(null);
  const arrasto = useRef<{ x: number; y: number; ativo: boolean; vaga: Vaga | null } | null>(null);
  const andou = useRef(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const no = area.current;
    if (!no) return;
    const mostrar = (escolher: (todas: Unidade[]) => Unidade | undefined) => {
      const todas = unidades(editor.state.doc);
      const alvo = escolher(todas);
      setAlcas(alvo ? alcasPara(editor, todas, alvo, no.getBoundingClientRect()) : []);
    };
    // Mouse: a unidade mais interna na altura do ponteiro (em colunas, na coluna dele).
    const aoMover = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse" || arrasto.current || caixa.current?.contains(ev.target as globalThis.Node)) return;
      mostrar((todas) =>
        todas.findLast((u) => {
          const dom = elementoDe(editor, u.pos);
          const r = dom?.getBoundingClientRect();
          if (!r || ev.clientY < r.top - 3 || ev.clientY > r.bottom + 3) return false;
          const coluna = dom!.closest('[data-type="coluna"]')?.getBoundingClientRect();
          return !coluna || (ev.clientX >= coluna.left - 40 && ev.clientX <= coluna.right);
        }),
      );
    };
    // Toque e teclado: onde está o cursor.
    const noCursor = () => {
      if (arrasto.current || !editor.isFocused) return;
      const { from } = editor.state.selection;
      mostrar((todas) => todas.findLast((u) => u.pos <= from && u.pos + u.no.nodeSize > from));
    };
    const mudou = () => {
      setMenu(null);
      if (editor.isFocused) noCursor();
      else setAlcas([]);
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
    if (menu === null) return;
    const fora = (ev: Event) => {
      if (!caixa.current?.contains(ev.target as globalThis.Node)) setMenu(null);
    };
    const tecla = (ev: KeyboardEvent) => ev.key === "Escape" && setMenu(null);
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [menu]);

  /** A unidade ainda é a mesma no documento atual? */
  const valida = (u: Unidade) => u.pos < editor.state.doc.content.size && editor.state.doc.nodeAt(u.pos) === u.no;
  const visiveis = alcas.filter((a) => valida(a.u));

  function encerrar() {
    arrasto.current = null;
    setLinha(null);
    document.body.classList.remove("arrastando");
  }
  const agir = (fazer: () => void) => () => {
    setMenu(null);
    setAlcas([]);
    fazer();
  };
  const trocar = (u: Unidade, b: Bloco) => {
    // Um alternante primeiro se desfaz; os outros blocos são selecionados por inteiro.
    if (u.no.type.name === "details") {
      editor.chain().setTextSelection(u.pos + 2).unsetDetails().run();
      transformar(editor, b);
    } else {
      transformar(editor, b, { from: u.pos + 1, to: u.pos + u.no.nodeSize - 1 });
    }
  };

  return (
    <>
      <div ref={caixa}>
        {visiveis.map((a) => {
          const nome = a.u.item ? "item" : a.inteiro ? "bloco inteiro" : "bloco";
          const Icone = a.inteiro ? TbGripHorizontal : TbGripVertical;
          const cima = vizinho(editor, a.u, -1);
          const baixo = vizinho(editor, a.u, 1);
          return (
            <div key={a.u.pos} className="absolute z-20" style={{ top: a.topo, left: a.x }}>
              <button
                type="button"
                data-alca={a.u.item ? "item" : a.inteiro ? "inteiro" : "bloco"}
                aria-label={`Opções do ${nome} (arraste para mover)`}
                title={`Arraste para mover o ${nome}; clique para opções`}
                aria-expanded={menu === a.u.pos}
                onPointerDown={(ev) => {
                  if (ev.button !== 0) return;
                  ev.currentTarget.setPointerCapture(ev.pointerId);
                  andou.current = false;
                  arrasto.current = { x: ev.clientX, y: ev.clientY, ativo: false, vaga: null };
                }}
                onPointerMove={(ev) => {
                  const d = arrasto.current;
                  if (!d || !valida(a.u)) return;
                  if (!d.ativo && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 5) return;
                  d.ativo = andou.current = true;
                  setMenu(null);
                  document.body.classList.add("arrastando");
                  if (ev.clientY < 90) window.scrollBy(0, -14);
                  else if (ev.clientY > window.innerHeight - 60) window.scrollBy(0, 14);
                  // Nível da lista onde o item está, mais um a cada 24px para a direita.
                  const $pos = editor.state.doc.resolve(a.u.pos);
                  let nivel = 0;
                  for (let p = $pos.depth; p > 0; p--) if (ehLista($pos.node(p))) nivel++;
                  d.vaga = escolherVaga(vagas(editor, a.u), ev.clientX, ev.clientY, {
                    recipiente: $pos.depth ? $pos.before() : -1,
                    nivel: a.u.item ? nivel : 0,
                    // Cada 24px para o lado vale um nível.
                    desvio: a.u.item ? Math.round((ev.clientX - d.x) / 24) : 0,
                  });
                  const base = area.current!.getBoundingClientRect();
                  setLinha(d.vaga && { topo: d.vaga.topo - base.top, esquerda: d.vaga.esquerda - base.left, largura: d.vaga.direita - d.vaga.esquerda });
                }}
                onPointerUp={() => {
                  const d = arrasto.current;
                  encerrar();
                  if (d?.ativo && d.vaga && valida(a.u)) {
                    setAlcas([]);
                    mover(editor, a.u, d.vaga);
                  }
                }}
                onPointerCancel={encerrar}
                onClick={() => {
                  // O clique que encerra um arrasto não abre o menu.
                  if (!andou.current) setMenu((m) => (m === a.u.pos ? null : a.u.pos));
                  andou.current = false;
                }}
                className="flex h-7 w-6 cursor-grab touch-none items-center justify-center text-suave hover:bg-inverso hover:text-sobre-inverso active:cursor-grabbing"
              >
                <Icone size={15} aria-hidden="true" />
              </button>
              {menu === a.u.pos && (
                <div className="absolute left-0 top-full z-10 mt-1 max-h-[60dvh] w-60 overflow-y-auto border border-texto bg-menu p-1.5 text-texto">
                  <button type="button" className={item} onClick={agir(() => duplicar(editor, a.u))}>
                    <TbCopy size={16} aria-hidden="true" />
                    Duplicar
                  </button>
                  <button type="button" className={item} disabled={!cima} onClick={agir(() => cima && mover(editor, a.u, cima))}>
                    <TbArrowUp size={16} aria-hidden="true" />
                    Mover para cima
                  </button>
                  <button type="button" className={item} disabled={!baixo} onClick={agir(() => baixo && mover(editor, a.u, baixo))}>
                    <TbArrowDown size={16} aria-hidden="true" />
                    Mover para baixo
                  </button>
                  <button type="button" className={`${item} text-marca-texto`} onClick={agir(() => excluir(editor, a.u))}>
                    <TbTrash size={16} aria-hidden="true" />
                    Excluir {nome}
                  </button>
                  {!a.u.item && TEXTUAIS.has(a.u.no.type.name) && (
                    <>
                      <p className="rotulo px-3 pb-1 pt-3 text-suave">Transformar em</p>
                      {BLOCOS_DA_PAGINA.filter((b) => b.transforma).map((b) => (
                        <button key={b.id} type="button" className={item} onClick={agir(() => trocar(a.u, b))}>
                          <b.icone size={16} aria-hidden="true" />
                          {b.rotulo}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {linha && (
        <div
          aria-hidden="true"
          data-linha-de-soltar
          className="pointer-events-none absolute z-10 h-0.5 bg-marca"
          style={{ top: linha.topo, left: linha.esquerda, width: linha.largura }}
        />
      )}
    </>
  );
}
