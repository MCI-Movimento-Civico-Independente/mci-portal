"use client";

import { useEffect, useRef, useState } from "react";
import { TbX } from "react-icons/tb";
import { adicionarDependenciaAction } from "@/app/org/tarefas/acoes-vinculos";
import { BuscaDeTarefa } from "@/components/tarefas/BuscaDeTarefa";
import type { TarefaBuscada } from "@/lib/vinculos/busca";
import { codigo } from "@/lib/vinculos/tipos";

/** "/Dependência": escolhe as duas tarefas, uma depois da outra. */
export function CaixaDeDependencia({ projetoId, aoCriar, aoFechar }: { projetoId: string; aoCriar: (aviso: string) => void; aoFechar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [primeira, setPrimeira] = useState<TarefaBuscada | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);

  async function ligar(outra: TarefaBuscada) {
    if (!primeira || ocupado) return;
    setOcupado(true);
    setErro(null);
    try {
      const r = await adicionarDependenciaAction(primeira.id, outra.id);
      if (!r.erro) return aoCriar(r.aviso ?? "Dependência criada.");
      setErro(r.erro);
    } catch {
      setErro("Não deu para criar a dependência.");
    }
    setOcupado(false);
  }

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      aria-labelledby="titulo-dependencia"
      className="m-auto max-h-[85dvh] w-[min(100%-2rem,32rem)] overflow-y-auto border border-texto bg-menu p-5 text-texto backdrop:bg-black/60"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="titulo-dependencia" className="font-titulo text-xl font-extrabold">
            Nova dependência
          </h2>
          <p className="mt-1 text-sm text-suave">Uma tarefa só começa depois da outra.</p>
        </div>
        <button type="button" aria-label="Fechar" onClick={() => ref.current?.close()} className="flex size-11 shrink-0 items-center justify-center hover:bg-inverso hover:text-sobre-inverso">
          <TbX size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-4">
        {primeira ? (
          <>
            <p className="flex flex-wrap items-center justify-between gap-2 border border-borda bg-superficie p-3 text-sm">
              <span>
                <strong>
                  {codigo(primeira.numero)} {primeira.titulo}
                </strong>
              </span>
              <button type="button" onClick={() => setPrimeira(null)} className="text-xs font-bold text-marca-texto hover:underline">
                Trocar
              </button>
            </p>
            <BuscaDeTarefa key="depende" autoFoco rotulo="Depende de" projetoId={projetoId} ignorar={[primeira.id]} aoEscolher={(t) => void ligar(t)} />
          </>
        ) : (
          <BuscaDeTarefa key="tarefa" autoFoco rotulo="A tarefa" projetoId={projetoId} aoEscolher={setPrimeira} />
        )}
        {erro && (
          <p role="alert" className="text-sm font-bold text-marca-texto">
            {erro}
          </p>
        )}
      </div>
    </dialog>
  );
}
