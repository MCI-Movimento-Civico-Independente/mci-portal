"use client";

import { TbX } from "react-icons/tb";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Janela por cima da página, com o <dialog> nativo: o navegador cuida do foco,
 * da tecla Esc e do fundo. Fechar leva para `fecharHref` (a mesma tela, sem a tarefa).
 */
export function Modal({ fecharHref, rotulo, children }: { fecharHref: string; rotulo: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  useEffect(() => {
    const dialogo = ref.current;
    if (dialogo && !dialogo.open) dialogo.showModal();
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-label={rotulo}
      onClose={() => router.push(fecharHref, { scroll: false })}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      className="m-auto max-h-[92dvh] w-[min(100%-1.5rem,60rem)] overflow-y-auto border-2 border-inverso bg-superficie p-0 text-texto backdrop:bg-black/60"
    >
      <div className="relative p-5 md:p-8">
        <button
          type="button"
          aria-label="Fechar"
          onClick={() => ref.current?.close()}
          className="absolute right-3 top-3 flex size-11 items-center justify-center border-2 border-transparent hover:border-inverso hover:bg-inverso hover:text-sobre-inverso"
        >
          <TbX size={20} aria-hidden="true" />
        </button>
        {children}
      </div>
    </dialog>
  );
}
