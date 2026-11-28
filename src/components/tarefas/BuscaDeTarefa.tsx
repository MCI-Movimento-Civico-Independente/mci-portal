"use client";

import { useEffect, useId, useState } from "react";
import { rotuloDoStatus, codigo } from "@/lib/vinculos/tipos";
import type { TarefaBuscada } from "@/lib/vinculos/busca";

/**
 * Campo que procura tarefas por título ou código. Com `projetoId`, começa nas tarefas do projeto
 * e oferece "Buscar em outros projetos".
 */
export function BuscaDeTarefa({
  rotulo,
  projetoId,
  ignorar = [],
  aoEscolher,
  autoFoco = false,
}: {
  rotulo: string;
  projetoId: string | null;
  ignorar?: string[];
  aoEscolher: (t: TarefaBuscada) => void;
  autoFoco?: boolean;
}) {
  const id = useId();
  const [q, setQ] = useState("");
  const [outros, setOutros] = useState(false);
  const [achadas, setAchadas] = useState<{ chave: string; tarefas: TarefaBuscada[] | null } | null>(null);
  const chave = new URLSearchParams({ ...(projetoId ? { projeto: projetoId } : {}), ...(outros ? { outros: "1" } : {}), q }).toString();

  useEffect(() => {
    const controle = new AbortController();
    const espera = window.setTimeout(() => {
      fetch(`/api/vinculaveis?${chave}`, { signal: controle.signal })
        .then(async (r) => (r.ok ? ((await r.json()) as { tarefas: TarefaBuscada[] }).tarefas : null))
        .then((tarefas) => setAchadas({ chave, tarefas }))
        .catch(() => !controle.signal.aborted && setAchadas({ chave, tarefas: null }));
    }, 200);
    return () => {
      window.clearTimeout(espera);
      controle.abort();
    };
  }, [chave]);

  const lista = achadas?.tarefas?.filter((t) => !ignorar.includes(t.id));
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="rotulo text-suave">
        {rotulo}
      </label>
      <input
        id={id}
        type="search"
        autoFocus={autoFoco}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (lista?.[0]) aoEscolher(lista[0]);
          }
        }}
        placeholder="Título ou código (T-14)"
        className="min-h-11 w-full border-2 border-borda-forte bg-menu px-3 text-sm focus-visible:border-texto"
      />
      <ul className="max-h-48 overflow-y-auto border border-borda bg-menu" aria-busy={achadas?.chave !== chave}>
        {lista?.map((t) => (
          <li key={t.id}>
            <button type="button" onClick={() => aoEscolher(t)} className="flex min-h-11 w-full flex-col justify-center px-3 py-1 text-left hover:bg-superficie">
              <span className="text-sm font-bold">{t.titulo}</span>
              <span className="rotulo text-[10px] text-suave">
                {codigo(t.numero)} · {rotuloDoStatus(t.status)}
                {outros && t.projeto ? ` · ${t.projeto}` : t.grupo ? ` · ${t.grupo}` : ""}
              </span>
            </button>
          </li>
        ))}
        {achadas && !lista?.length && (
          <li className="px-3 py-2 text-sm text-suave">{achadas.tarefas ? "Nenhuma tarefa encontrada." : "Não deu para buscar."}</li>
        )}
      </ul>
      {projetoId && (
        <button type="button" onClick={() => setOutros((v) => !v)} className="min-h-9 self-start text-xs font-bold text-marca-texto hover:underline">
          {outros ? "Voltar para este projeto" : "Buscar em outros projetos"}
        </button>
      )}
    </div>
  );
}
