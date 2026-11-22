"use client";

import { X } from "lucide-react";
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
      className="m-auto max-h-[92dvh] w-[min(100%-1.5rem,60rem)] overflow-y-auto border border-preto bg-creme p-0 text-preto backdrop:bg-preto/60"
    >
      <div className="relative p-5 md:p-8">
        <button
          type="button"
          aria-label="Fechar"
          onClick={() => ref.current?.close()}
          className="absolute right-2 top-2 flex size-11 items-center justify-center hover:bg-preto hover:text-creme-claro"
        >
          <X size={20} aria-hidden="true" />
        </button>
        {children}
      </div>
    </dialog>
  );
}
