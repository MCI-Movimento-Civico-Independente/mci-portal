"use client";

import { useEffect, useRef, useState } from "react";
import { TbX } from "react-icons/tb";
import { listarLixeiraAction, type ItemDaLixeira } from "@/app/org/projetos/acoes-abas";
import { PAGINA } from "@/lib/limites";

/** Janela com as páginas excluídas há pouco, para restaurar. */
export function Lixeira({ projetoId, aoRestaurar, aoFechar }: { projetoId: string; aoRestaurar: (id: string) => void; aoFechar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [dados, setDados] = useState<{ itens: ItemDaLixeira[] } | { erro: string } | null>(null);

  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);
  useEffect(() => {
    let ativo = true;
    listarLixeiraAction(projetoId)
      .catch(() => ({ erro: "Não deu para abrir a lixeira." }))
      .then((r) => ativo && setDados(r));
    return () => {
      ativo = false;
    };
  }, [projetoId]);

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      aria-labelledby="titulo-lixeira"
      className="m-auto max-h-[80dvh] w-[min(100%-2rem,32rem)] overflow-y-auto border border-texto bg-menu p-5 text-texto backdrop:bg-black/60"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="titulo-lixeira" className="font-titulo text-xl font-extrabold">
            Lixeira
          </h2>
          <p className="mt-1 text-sm text-suave">Páginas excluídas nos últimos {PAGINA.diasNaLixeira} dias.</p>
        </div>
        <button
          type="button"
          aria-label="Fechar"
          onClick={() => ref.current?.close()}
          className="flex size-11 shrink-0 items-center justify-center hover:bg-inverso hover:text-sobre-inverso"
        >
          <TbX size={18} aria-hidden="true" />
        </button>
      </div>

      {dados === null ? (
        <div className="mt-4 h-24 animate-pulse bg-sutil" aria-busy="true" />
      ) : "erro" in dados ? (
        <p role="alert" className="mt-4 text-sm font-bold text-marca-texto">
          {dados.erro}
        </p>
      ) : dados.itens.length === 0 ? (
        <p className="mt-4 text-sm">A lixeira está vazia.</p>
      ) : (
        <ul className="mt-4 border-t border-borda">
          {dados.itens.map((i) => (
            <li key={i.id} className="flex items-center gap-3 border-b border-borda py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{i.titulo}</p>
                <p className="rotulo text-[10px] text-suave">Excluída em {i.excluidaEm}</p>
              </div>
              <button
                type="button"
                aria-label={`Restaurar a página ${i.titulo}`}
                onClick={() => aoRestaurar(i.id)}
                className="min-h-11 shrink-0 border-2 border-inverso px-3 text-xs font-bold hover:bg-inverso hover:text-sobre-inverso md:min-h-9"
              >
                Restaurar
              </button>
            </li>
          ))}
        </ul>
      )}
    </dialog>
  );
}
