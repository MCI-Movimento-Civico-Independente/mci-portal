"use client";

import type { Editor } from "@tiptap/core";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  TbColumns2,
  TbColumnInsertLeft,
  TbColumnInsertRight,
  TbColumnRemove,
  TbDots,
  TbRowInsertBottom,
  TbRowInsertTop,
  TbRowRemove,
  TbTableOff,
  TbTableRow,
  TbTrash,
  TbArrowsHorizontal,
  TbPlus,
} from "react-icons/tb";
import { itemDeMenu, MenuSuspenso } from "@/components/paginas/MenuSuspenso";
import { TABELA } from "@/lib/limites";
import {
  adicionarColuna,
  definirLarguras,
  desfazerColunas,
  igualarColunas,
  LARGURA_MINIMA,
  MAXIMO_DE_COLUNAS,
  removerColuna,
} from "./colunas";
import { elementoDe } from "./mover";

type Divisor = { pos: number; indice: number; x: number; topo: number; altura: number };
type Medidas = {
  divisores: Divisor[];
  /** Célula com o cursor. */
  celula: { x: number; y: number; linhas: number; colunas: number } | null;
  /** Colunas com o cursor. */
  colunas: { pos: number; indice: number; quantas: number; x: number; y: number } | null;
};

const NADA: Medidas = { divisores: [], celula: null, colunas: null };

function medir(e: Editor, base: DOMRect): Medidas {
  const m: Medidas = { divisores: [], celula: null, colunas: null };
  const { doc, selection } = e.state;
  const { $from } = selection;

  doc.forEach((no, pos) => {
    if (no.type.name !== "colunas") return;
    let p = pos + 1;
    const telas: DOMRect[] = [];
    no.forEach((coluna) => {
      const r = elementoDe(e, p)?.getBoundingClientRect();
      if (r) telas.push(r);
      p += coluna.nodeSize;
    });
    const caixa = elementoDe(e, pos)?.getBoundingClientRect();
    if (!caixa) return;
    for (let i = 0; i < telas.length - 1; i++) {
      // Empilhadas (celular): sem divisor.
      if (telas[i + 1].left < telas[i].right - 1) continue;
      m.divisores.push({ pos, indice: i, x: telas[i].right + 6 - base.left, topo: caixa.top - base.top, altura: caixa.height });
    }
    if ($from.depth >= 2 && $from.before(1) === pos) {
      m.colunas = { pos, indice: $from.index(1), quantas: no.childCount, x: caixa.right - base.left, y: caixa.top - base.top };
    }
  });

  for (let d = $from.depth; d > 0; d--) {
    const tipo = $from.node(d).type.name;
    if (tipo !== "tableCell" && tipo !== "tableHeader") continue;
    const r = elementoDe(e, $from.before(d))?.getBoundingClientRect();
    const tabela = $from.node(d - 2);
    if (r) {
      let colunas = 0;
      tabela.firstChild?.forEach((c) => (colunas += c.attrs.colspan as number));
      m.celula = { x: Math.min(r.right, base.right) - base.left, y: r.top - base.top, linhas: tabela.childCount, colunas };
    }
    break;
  }
  return m;
}

const gatilho = "flex size-7 items-center justify-center border border-texto bg-menu text-texto hover:bg-inverso hover:text-sobre-inverso";

/** Menu da célula, menu das colunas e os divisores que ajustam a largura. */
export function ControlesDeBloco({ editor, area }: { editor: Editor; area: RefObject<HTMLDivElement | null> }) {
  const [m, setM] = useState<Medidas>(NADA);
  const arrasto = useRef<{ x: number; a: number; b: number; largura: number; atual: [number, number] } | null>(null);

  useEffect(() => {
    const no = area.current;
    if (!no) return;
    let quadro = 0;
    const atualizar = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => setM(medir(editor, no.getBoundingClientRect())));
    };
    atualizar();
    editor.on("transaction", atualizar);
    // A tabela rola dentro da caixa dela; imagens que carregam mudam as alturas.
    no.addEventListener("scroll", atualizar, true);
    const observador = new ResizeObserver(atualizar);
    observador.observe(editor.view.dom);
    return () => {
      cancelAnimationFrame(quadro);
      editor.off("transaction", atualizar);
      no.removeEventListener("scroll", atualizar, true);
      observador.disconnect();
    };
  }, [editor, area]);

  const larguras = (pos: number) => {
    const no = editor.state.doc.nodeAt(pos);
    return no?.type.name === "colunas" ? Array.from({ length: no.childCount }, (_, i) => no.child(i).attrs.largura as number) : null;
  };
  /** As duas colunas vizinhas do divisor trocam largura; a soma delas não muda. */
  const ajustar = (a: number, b: number, delta: number): [number, number] => {
    const soma = a + b;
    const novo = Math.min(soma - LARGURA_MINIMA, Math.max(LARGURA_MINIMA, a + delta));
    return [novo, soma - novo];
  };
  const gravar = (d: Divisor, par: [number, number], historico: boolean) => {
    const todas = larguras(d.pos);
    if (!todas) return;
    [todas[d.indice], todas[d.indice + 1]] = par;
    definirLarguras(editor, d.pos, todas, historico);
  };

  const opcao = (fechar: () => void, rotulo: string, Icone: typeof TbPlus, fazer: () => void, desligada = false) => (
    <button
      type="button"
      disabled={desligada}
      onClick={() => {
        fechar();
        fazer();
      }}
      className={itemDeMenu}
    >
      <Icone size={16} aria-hidden="true" />
      {rotulo}
    </button>
  );
  const tabela = () => editor.chain().focus();
  const { celula, colunas } = m;

  return (
    <>
      {m.divisores.map((d) => (
        <div
          key={`${d.pos}-${d.indice}`}
          role="separator"
          aria-orientation="vertical"
          aria-label="Largura das colunas (arraste ou use as setas)"
          aria-valuenow={Math.round(larguras(d.pos)?.[d.indice] ?? 50)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const l = larguras(d.pos);
            if (l) gravar(d, ajustar(l[d.indice], l[d.indice + 1], e.key === "ArrowRight" ? 5 : -5), true);
          }}
          onPointerDown={(e) => {
            const l = larguras(d.pos);
            const dom = elementoDe(editor, d.pos);
            if (e.button !== 0 || !l || !dom) return;
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            const total = l.reduce((s, n) => s + n, 0);
            arrasto.current = { x: e.clientX, a: l[d.indice], b: l[d.indice + 1], largura: dom.getBoundingClientRect().width / total, atual: [l[d.indice], l[d.indice + 1]] };
          }}
          onPointerMove={(e) => {
            const a = arrasto.current;
            if (!a) return;
            a.atual = ajustar(a.a, a.b, (e.clientX - a.x) / a.largura);
            gravar(d, a.atual, false);
          }}
          onPointerUp={() => {
            const a = arrasto.current;
            arrasto.current = null;
            if (!a || (a.atual[0] === a.a && a.atual[1] === a.b)) return;
            // Volta ao começo sem registrar, para o desfazer saltar o arrasto inteiro.
            gravar(d, [a.a, a.b], false);
            gravar(d, a.atual, true);
          }}
          onPointerCancel={() => (arrasto.current = null)}
          className="group absolute z-10 flex w-3 cursor-col-resize touch-none justify-center"
          style={{ left: d.x - 2, top: d.topo, height: d.altura }}
        >
          <span aria-hidden="true" className="h-full w-px bg-borda group-hover:w-1 group-hover:bg-marca group-focus-visible:w-1 group-focus-visible:bg-marca" />
        </div>
      ))}

      {colunas && (
        <div className="absolute z-20 -translate-x-full -translate-y-full" style={{ left: colunas.x, top: colunas.y }}>
          <MenuSuspenso rotulo="Opções das colunas" botao={<TbColumns2 size={15} aria-hidden="true" />} className={gatilho}>
            {(fechar) => (
              <>
                {opcao(fechar, "Remover esta coluna", TbColumnRemove, () => removerColuna(editor, colunas.pos, colunas.indice))}
                {opcao(fechar, "Adicionar coluna", TbPlus, () => adicionarColuna(editor, colunas.pos), colunas.quantas >= MAXIMO_DE_COLUNAS)}
                {opcao(fechar, "Larguras iguais", TbArrowsHorizontal, () => igualarColunas(editor, colunas.pos))}
                {opcao(fechar, "Desfazer colunas", TbTrash, () => desfazerColunas(editor, colunas.pos))}
              </>
            )}
          </MenuSuspenso>
        </div>
      )}

      {celula && (
        <div className="absolute z-20 -translate-x-full -translate-y-1/2" style={{ left: celula.x, top: celula.y }}>
          <MenuSuspenso rotulo="Menu da célula" botao={<TbDots size={15} aria-hidden="true" />} className={gatilho}>
            {(fechar) => {
              const semLinhas = celula.linhas >= TABELA.maxLinhas;
              const semColunas = celula.colunas >= TABELA.maxColunas;
              return (
                <div className="max-h-[60dvh] overflow-y-auto">
                  {opcao(fechar, "Linha acima", TbRowInsertTop, () => tabela().addRowBefore().run(), semLinhas)}
                  {opcao(fechar, "Linha abaixo", TbRowInsertBottom, () => tabela().addRowAfter().run(), semLinhas)}
                  {opcao(fechar, "Remover linha", TbRowRemove, () => tabela().deleteRow().run(), celula.linhas <= 1)}
                  {opcao(fechar, "Coluna à esquerda", TbColumnInsertLeft, () => tabela().addColumnBefore().run(), semColunas)}
                  {opcao(fechar, "Coluna à direita", TbColumnInsertRight, () => tabela().addColumnAfter().run(), semColunas)}
                  {opcao(fechar, "Remover coluna", TbColumnRemove, () => tabela().deleteColumn().run(), celula.colunas <= 1)}
                  {opcao(fechar, "Ligar ou desligar o cabeçalho", TbTableRow, () => tabela().toggleHeaderRow().run())}
                  {opcao(fechar, "Excluir tabela", TbTableOff, () => tabela().deleteTable().run())}
                </div>
              );
            }}
          </MenuSuspenso>
        </div>
      )}
    </>
  );
}
