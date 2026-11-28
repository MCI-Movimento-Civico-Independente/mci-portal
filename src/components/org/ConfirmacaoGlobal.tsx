"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { lerConfirmacao, ouvirConfirmacao } from "./confirmacao";

function Janela({ mensagem, responder }: { mensagem: string; responder: (sim: boolean) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    // Aberta por último, fica por cima também da janela da tarefa.
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-labelledby="pergunta-de-confirmacao"
      onCancel={(e) => {
        e.preventDefault();
        responder(false);
      }}
      className="m-auto w-[min(100%-2rem,28rem)] border border-texto bg-menu p-5 text-texto backdrop:bg-black/60"
    >
      <p id="pergunta-de-confirmacao" className="text-[15px] font-bold">
        {mensagem}
      </p>
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" autoFocus onClick={() => responder(false)} className="min-h-11 border-2 border-borda-forte px-4 text-sm font-bold hover:border-texto">
          Cancelar
        </button>
        <button type="button" onClick={() => responder(true)} className="min-h-11 border-2 border-marca bg-marca px-4 text-sm font-bold text-sobre-marca hover:border-texto">
          Mover mesmo assim
        </button>
      </div>
    </dialog>
  );
}

export function ConfirmacaoGlobal() {
  const pergunta = useSyncExternalStore(ouvirConfirmacao, lerConfirmacao, () => null);
  return pergunta ? <Janela key={pergunta.mensagem} {...pergunta} /> : null;
}
