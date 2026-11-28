"use client";

import type { Editor } from "@tiptap/core";
import { Fragment, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { IconType } from "react-icons";
import { TbBinaryTree, TbFile, TbHash, TbLink, TbPhoto, TbUsers, TbAt } from "react-icons/tb";
import { BLOCOS_DA_PAGINA, combina, transformar, type Bloco } from "./blocos";
import type { CanalDeComandos, EstadoComandos } from "./comandos";

const EM_BREVE: { secao: string; itens: { rotulo: string; icone: IconType }[] }[] = [
  {
    secao: "Vínculos do projeto",
    itens: [
      { rotulo: "Mencionar tarefa", icone: TbHash },
      { rotulo: "Mencionar grupo", icone: TbUsers },
      { rotulo: "Mencionar pessoa", icone: TbAt },
      { rotulo: "Dependência", icone: TbBinaryTree },
    ],
  },
  {
    secao: "Mídia",
    itens: [
      { rotulo: "Imagem", icone: TbPhoto },
      { rotulo: "Arquivo", icone: TbFile },
      { rotulo: "Link com prévia", icone: TbLink },
    ],
  },
];

const linha = "flex min-h-9 w-full items-center gap-3 px-3 text-left text-sm";

function Lista({ editor, canal, estado }: { editor: Editor; canal: CanalDeComandos; estado: NonNullable<EstadoComandos> }) {
  const { consulta, trecho } = estado;
  const itens = BLOCOS_DA_PAGINA.filter((b) => combina(consulta, b.rotulo, b.busca, b.atalho ?? ""));
  const breve = EM_BREVE.map((s) => ({ ...s, itens: s.itens.filter((i) => combina(consulta, i.rotulo)) })).filter((s) => s.itens.length);

  // A escolha volta ao primeiro item quando o filtro muda.
  const [escolha, setEscolha] = useState({ consulta, i: 0 });
  const indice = escolha.consulta === consulta ? Math.min(escolha.i, Math.max(0, itens.length - 1)) : 0;
  const caixa = useRef<HTMLDivElement>(null);
  const rolagem = useRef<HTMLDivElement>(null);

  function inserir(b: Bloco) {
    editor.chain().focus().deleteRange(trecho).run();
    // Divisor e alternante entram direto; os demais trocam o tipo do bloco atual.
    if (b.id === "divisor" || b.id === "alternantes") b.aplicar(editor);
    else transformar(editor, b);
  }

  useEffect(() =>
    canal.atenderTeclado((e) => {
      if (!itens.length) return false;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const passo = e.key === "ArrowDown" ? 1 : -1;
        setEscolha({ consulta, i: (indice + passo + itens.length) % itens.length });
        return true;
      }
      if (e.key === "Enter" && !e.isComposing) {
        inserir(itens[indice]);
        return true;
      }
      return false;
    }),
  );

  useEffect(() => {
    rolagem.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [indice]);

  // Posiciona junto do cursor: abaixo, ou acima se faltar espaço.
  useEffect(() => {
    const posicionar = () => {
      const m = caixa.current;
      const r = estado.onde();
      if (!m || !r) return;
      m.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - m.offsetWidth - 8))}px`;
      const abaixo = r.bottom + 6;
      const cabe = abaixo + m.offsetHeight <= window.innerHeight - 8;
      m.style.top = `${cabe ? abaixo : Math.max(8, r.top - m.offsetHeight - 6)}px`;
      m.style.visibility = "visible";
    };
    posicionar();
    window.addEventListener("scroll", posicionar, true);
    window.addEventListener("resize", posicionar);
    return () => {
      window.removeEventListener("scroll", posicionar, true);
      window.removeEventListener("resize", posicionar);
    };
  });

  return (
    <div
      ref={caixa}
      // Clicar no menu não tira o cursor do texto.
      onMouseDown={(e) => e.preventDefault()}
      style={{ visibility: "hidden" }}
      className="fixed left-0 top-0 z-40 flex max-h-[min(26rem,60dvh)] w-80 max-w-[calc(100vw-1rem)] flex-col border border-texto bg-menu text-texto"
    >
      <div ref={rolagem} role="listbox" aria-label="Comandos" className="overflow-y-auto p-1.5">
        {itens.length > 0 && <p className="rotulo px-3 py-2 text-suave">Blocos básicos</p>}
        {itens.map((b, i) => (
          <button
            key={b.id}
            type="button"
            role="option"
            aria-selected={i === indice}
            onMouseMove={() => i !== indice && setEscolha({ consulta, i })}
            onClick={() => inserir(b)}
            className={`${linha} aria-selected:bg-superficie`}
          >
            <b.icone size={17} aria-hidden="true" />
            <span className="flex-1">{b.rotulo}</span>
            {b.atalho && <span className="rotulo text-suave normal-case">{b.atalho}</span>}
          </button>
        ))}
        {breve.map((s) => (
          <Fragment key={s.secao}>
            <p className="rotulo px-3 pb-2 pt-3 text-suave">{s.secao}</p>
            {s.itens.map((i) => (
              <div key={i.rotulo} role="option" aria-disabled="true" aria-selected="false" className={`${linha} cursor-not-allowed text-suave`}>
                <i.icone size={17} aria-hidden="true" />
                <span className="flex-1">{i.rotulo}</span>
                <span className="rotulo text-[10px]">Em breve</span>
              </div>
            ))}
          </Fragment>
        ))}
        {itens.length === 0 && breve.length === 0 && <p className="px-3 py-2 text-sm text-suave">Nenhum comando.</p>}
      </div>
      <p className="rotulo flex justify-between gap-3 border-t border-borda px-3 py-2 text-[10px] text-suave">
        <span>↑↓ navegar · Enter inserir</span>
        <span>Esc fechar</span>
      </p>
    </div>
  );
}

export function MenuComandos({ editor, canal }: { editor: Editor; canal: CanalDeComandos }) {
  const estado = useSyncExternalStore(canal.assinar, canal.ler, () => null);
  return estado ? <Lista editor={editor} canal={canal} estado={estado} /> : null;
}
