"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { TbX } from "react-icons/tb";
import { fecharAviso, lerAvisos, lerAvisosNoServidor, ouvirAvisos } from "./avisos-xp";

function ouvirJanelas(f: () => void) {
  const observador = new MutationObserver(f);
  observador.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
  return () => observador.disconnect();
}
const janelaAberta = () => document.querySelector<HTMLElement>("dialog[open]");

export function AvisosXp() {
  const avisos = useSyncExternalStore(ouvirAvisos, lerAvisos, lerAvisosNoServidor);
  // Com a janela da tarefa aberta, o aviso precisa estar dentro dela (senão fica atrás do fundo).
  const janela = useSyncExternalStore(ouvirJanelas, janelaAberta, () => null);

  const pilha = (
    <div className="pointer-events-none fixed bottom-24 right-4 z-50 flex w-[min(100%-2rem,22rem)] flex-col gap-2 md:bottom-6 md:right-6">
      {avisos.map((a) => (
        <div
          key={a.id}
          className={`pointer-events-auto flex items-start gap-2 border-l-8 bg-bloco py-2 pl-3 pr-1 text-sobre-bloco ${a.destaque ? "border-ouro" : "border-marca"}`}
        >
          <ul className="min-w-0 flex-1 py-1 text-sm font-bold">
            {a.linhas.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
          <button type="button" aria-label="Fechar aviso" onClick={() => fecharAviso(a.id)} className="flex size-9 items-center justify-center hover:text-ouro">
            <TbX size={16} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
  return (
    <div role="status" aria-live="polite">
      {janela ? createPortal(pilha, janela) : pilha}
    </div>
  );
}
