"use client";

import type { ReactNode } from "react";

/** Botão que dispara uma Server Action, com confirmação opcional. */
export function BotaoAcao({
  acao,
  children,
  aviso,
  perigo = false,
  desabilitado = false,
  titulo,
  rotulo,
}: {
  acao: () => void | Promise<void>;
  children: ReactNode;
  aviso?: string;
  perigo?: boolean;
  desabilitado?: boolean;
  titulo?: string;
  rotulo?: string;
}) {
  return (
    <form
      action={acao}
      onSubmit={(e) => {
        if (aviso && !window.confirm(aviso)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        disabled={desabilitado}
        title={titulo}
        aria-label={rotulo}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold disabled:opacity-40 ${
          perigo ? "text-marca-texto hover:bg-marca-suave" : "hover:bg-sutil"
        }`}
      >
        {children}
      </button>
    </form>
  );
}
