"use client";

import { useEffect, useRef } from "react";
import { TbX } from "react-icons/tb";

/** Imagem em tamanho grande, por cima de tudo. Esc, o X ou um clique no fundo fecham. */
export function Lightbox({ src, alt, aoFechar }: { src: string; alt: string; aoFechar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialogo = ref.current;
    if (dialogo && !dialogo.open) dialogo.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label="Imagem em tamanho grande"
      onClose={aoFechar}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto max-h-[96dvh] max-w-[96vw] overflow-visible bg-transparent p-0 backdrop:bg-black/80"
    >
      <button
        type="button"
        aria-label="Fechar imagem"
        onClick={() => ref.current?.close()}
        className="absolute -top-2 right-0 z-10 flex size-11 -translate-y-full items-center justify-center bg-inverso text-sobre-inverso hover:bg-marca"
      >
        <TbX size={20} aria-hidden="true" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada do Storage ou imagem externa */}
      <img src={src} alt={alt} referrerPolicy="no-referrer" className="max-h-[92dvh] max-w-[96vw] object-contain" />
    </dialog>
  );
}
