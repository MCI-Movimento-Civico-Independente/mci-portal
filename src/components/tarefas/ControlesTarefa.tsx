"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import type { StatusTarefa } from "@/components/ui/EtiquetaStatus";
import { mudarStatusAction } from "@/app/org/tarefas/acoes";

const ROTULOS: Record<StatusTarefa, string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  em_revisao: "Em revisão",
  concluida: "Concluída",
};

/** Caixa de concluir/reabrir (alvo de toque de 44px). */
export function CaixaConcluir({ id, status }: { id: string; status: StatusTarefa }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const concluida = status === "concluida";

  return (
    <>
      <button
        type="button"
        disabled={pendente}
        aria-label={concluida ? "Reabrir tarefa" : "Concluir tarefa"}
        aria-pressed={concluida}
        onClick={() =>
          iniciar(async () => {
            const r = await mudarStatusAction(id, concluida ? "a_fazer" : "concluida");
            setErro(r.erro ?? null);
          })
        }
        className="group flex size-11 shrink-0 items-center justify-center disabled:opacity-50"
      >
        <span
          className={`flex size-5 items-center justify-center border-2 border-preto group-hover:bg-amarelo ${
            concluida ? "bg-preto text-creme-claro group-hover:bg-laranja-texto" : ""
          }`}
        >
          {concluida && <Check size={14} strokeWidth={3} aria-hidden="true" />}
        </span>
      </button>
      {erro && (
        <span role="alert" className="sr-only">
          {erro}
        </span>
      )}
    </>
  );
}

export function SeletorStatus({ id, status }: { id: string; status: StatusTarefa }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  return (
    <div>
      <label className="sr-only" htmlFor={`status-${id}`}>
        Status
      </label>
      <select
        id={`status-${id}`}
        value={status}
        disabled={pendente}
        onChange={(e) =>
          iniciar(async () => {
            const r = await mudarStatusAction(id, e.target.value);
            setErro(r.erro ?? null);
          })
        }
        className="min-h-11 border border-linha bg-creme-claro px-2 font-mono text-[11px] font-bold uppercase hover:border-preto disabled:opacity-50"
      >
        {Object.entries(ROTULOS).map(([valor, texto]) => (
          <option key={valor} value={valor}>
            {texto}
          </option>
        ))}
      </select>
      {erro && (
        <p role="alert" className="mt-1 text-xs font-bold text-laranja-texto">
          {erro}
        </p>
      )}
    </div>
  );
}
