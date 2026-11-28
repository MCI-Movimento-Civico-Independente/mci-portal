"use client";

import dynamic from "next/dynamic";

// O editor só existe no navegador (e só baixa quando a pessoa abre uma página).
const PaginaEditor = dynamic(() => import("./PaginaEditor").then((m) => m.PaginaEditor), {
  ssr: false,
  loading: () => <div className="mx-auto h-64 w-full max-w-[780px] animate-pulse bg-sutil" aria-busy="true" />,
});

export function PaginaProjeto(props: { abaId: string; projetoId: string; tituloInicial: string }) {
  return <PaginaEditor {...props} />;
}
