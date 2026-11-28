"use client";

import type { Editor } from "@tiptap/core";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { IconType } from "react-icons";
import { TbAt } from "react-icons/tb";
import { BLOCOS_DA_PAGINA, cabe, combina, transformar, type AcoesDaTela, type Bloco } from "./blocos";
import type { CanalDeComandos, EstadoComandos } from "./comandos";

// Chega numa próxima etapa, com as notificações.
const EM_BREVE: { rotulo: string; icone: IconType }[] = [{ rotulo: "Mencionar pessoa", icone: TbAt }];

/** Posiciona a caixa junto do cursor: abaixo, ou acima se faltar espaço. */
export function usePosicaoNoCursor(onde: () => DOMRect | null) {
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const posicionar = () => {
      const m = caixa.current;
      const r = onde();
      if (!m || !r) return;
      m.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - m.offsetWidth - 8))}px`;
      const abaixo = r.bottom + 6;
      const cabeEmbaixo = abaixo + m.offsetHeight <= window.innerHeight - 8;
      m.style.top = `${cabeEmbaixo ? abaixo : Math.max(8, r.top - m.offsetHeight - 6)}px`;
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
  return caixa;
}

const linha = "flex min-h-9 w-full items-center gap-3 px-3 text-left text-sm";

type Props = { editor: Editor; canal: CanalDeComandos; acoes: AcoesDaTela };

function Lista({ editor, canal, acoes, estado }: Props & { estado: NonNullable<EstadoComandos> }) {
  const { consulta, trecho } = estado;
  const achados = BLOCOS_DA_PAGINA.filter((b) => cabe(editor, b) && combina(consulta, b.rotulo, b.busca, b.atalho ?? ""));
  // Na ordem em que aparecem: básicos e, depois dos vínculos, mídia.
  const basicos = achados.filter((b) => !b.secao);
  const vinculos = achados.filter((b) => b.secao === "vinculo");
  const midia = achados.filter((b) => b.secao === "midia");
  const itens = [...basicos, ...vinculos, ...midia];
  const breve = EM_BREVE.filter((i) => combina(consulta, i.rotulo));
  // "/ " no meio do texto, ou palavras que não são comando: o menu sai da frente.
  const esconder = consulta.startsWith(" ") || (consulta.includes(" ") && !itens.length);

  // A escolha volta ao primeiro item quando o filtro muda.
  const [escolha, setEscolha] = useState({ consulta, i: 0 });
  const indice = escolha.consulta === consulta ? Math.min(escolha.i, Math.max(0, itens.length - 1)) : 0;
  const rolagem = useRef<HTMLDivElement>(null);

  function inserir(b: Bloco) {
    editor.chain().focus().deleteRange(trecho).run();
    // Uns entram direto; os demais trocam o tipo do bloco atual.
    if (b.direto) b.aplicar(editor, acoes);
    else transformar(editor, b);
  }

  useEffect(() =>
    canal.atenderTeclado((e) => {
      if (!itens.length || esconder) return false;
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

  const caixa = usePosicaoNoCursor(estado.onde);

  if (esconder) return null;

  const opcao = (b: Bloco) => {
    const i = itens.indexOf(b);
    return (
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
    );
  };

  return (
    <div
      ref={caixa}
      // Clicar no menu não tira o cursor do texto.
      onMouseDown={(e) => e.preventDefault()}
      style={{ visibility: "hidden" }}
      className="fixed left-0 top-0 z-40 flex max-h-[min(26rem,60dvh)] w-80 max-w-[calc(100vw-1rem)] flex-col border border-texto bg-menu text-texto"
    >
      <div ref={rolagem} role="listbox" aria-label="Comandos" className="overflow-y-auto p-1.5">
        {basicos.length > 0 && <p className="rotulo px-3 py-2 text-suave">Blocos básicos</p>}
        {basicos.map(opcao)}
        {(vinculos.length > 0 || breve.length > 0) && <p className="rotulo px-3 pb-2 pt-3 text-suave">Vínculos do projeto</p>}
        {vinculos.map(opcao)}
        {breve.map((i) => (
          <div key={i.rotulo} role="option" aria-disabled="true" aria-selected="false" className={`${linha} cursor-not-allowed text-suave`}>
            <i.icone size={17} aria-hidden="true" />
            <span className="flex-1">{i.rotulo}</span>
            <span className="rotulo text-[10px]">Em breve</span>
          </div>
        ))}
        {midia.length > 0 && <p className="rotulo px-3 pb-2 pt-3 text-suave">Mídia</p>}
        {midia.map(opcao)}
        {itens.length === 0 && breve.length === 0 && <p className="px-3 py-2 text-sm text-suave">Nenhum comando.</p>}
      </div>
      <p className="rotulo flex justify-between gap-3 border-t border-borda px-3 py-2 text-[10px] text-suave">
        <span>↑↓ navegar · Enter inserir</span>
        <span>Esc fechar</span>
      </p>
    </div>
  );
}

export function MenuComandos(props: Props) {
  const estado = useSyncExternalStore(props.canal.assinar, props.canal.ler, () => null);
  return estado ? <Lista {...props} estado={estado} /> : null;
}
