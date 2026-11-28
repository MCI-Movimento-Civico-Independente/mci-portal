"use client";

import { useId, useRef, type ReactNode } from "react";

/** Menu em popover nativo, preso ao botão que o abre. Fecha com Esc ou clicando fora. */
export function MenuSuspenso({
  rotulo,
  botao,
  className,
  children,
}: {
  rotulo: string;
  botao: ReactNode;
  /** Classes do botão. */
  className: string;
  children: (fechar: () => void) => ReactNode;
}) {
  const id = useId();
  const gatilho = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const fechar = () => document.getElementById(id)?.hidePopover();

  return (
    <>
      <button ref={gatilho} type="button" popoverTarget={id} aria-label={rotulo} title={rotulo} className={className}>
        {botao}
      </button>
      <div
        ref={menu}
        id={id}
        popover="auto"
        onToggle={(e) => {
          const m = menu.current;
          const b = gatilho.current?.getBoundingClientRect();
          if (e.newState !== "open" || !m || !b) return;
          const largura = m.offsetWidth;
          m.style.left = `${Math.max(8, Math.min(b.left, window.innerWidth - largura - 8))}px`;
          const abaixo = b.bottom + 4;
          m.style.top = `${abaixo + m.offsetHeight > window.innerHeight ? Math.max(8, b.top - m.offsetHeight - 4) : abaixo}px`;
        }}
        className="fixed m-0 min-w-56 border border-texto bg-menu p-1.5 text-texto"
      >
        {children(fechar)}
      </div>
    </>
  );
}

export const itemDeMenu =
  "flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm hover:bg-superficie focus-visible:bg-superficie disabled:cursor-not-allowed disabled:text-suave disabled:hover:bg-transparent md:min-h-9";
