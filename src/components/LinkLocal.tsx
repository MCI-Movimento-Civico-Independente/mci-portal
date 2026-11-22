"use client";

import type { AnchorHTMLAttributes } from "react";

/** Só muda a URL (sem pedir a página ao servidor): o Next integra pushState ao roteador. */
export function irPara(href: string) {
  window.history.pushState(null, "", href);
}

/**
 * Link que abre a janela da tarefa na hora: troca a URL no navegador e deixa o React
 * mostrar a janela com os dados que a tela já tem. Ctrl/⌘-clique e botão do meio continuam
 * abrindo em outra aba, normalmente.
 */
export function LinkLocal({ href, onClick, ...resto }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        irPara(href);
      }}
      {...resto}
    />
  );
}
