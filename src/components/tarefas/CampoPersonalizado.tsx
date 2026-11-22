"use client";

import { useState, useTransition } from "react";
import { atualizarCampoPersonalizadoTarefaAction } from "@/app/org/tarefas/acoes";
import type { CampoPersonalizado } from "@/lib/campos-personalizados-tipos";

const base =
  "min-h-11 w-full border border-transparent bg-transparent px-1.5 text-sm font-medium hover:border-linha hover:bg-creme-claro focus-visible:border-preto disabled:opacity-60";

/**
 * Edita um campo personalizado direto na janela da tarefa. Salva ao sair do campo
 * (texto, número, data) ou ao escolher (lista, caixa). O key faz o campo recomeçar do
 * valor do servidor quando ele muda ou quando o servidor recusa.
 */
export function CampoPersonalizadoInline({
  tarefaId,
  campo,
  valor,
}: {
  tarefaId: string;
  campo: CampoPersonalizado;
  valor: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function salvar(novo: string) {
    if (novo === valor) return;
    setErro(null);
    iniciar(async () => {
      const r = await atualizarCampoPersonalizadoTarefaAction(tarefaId, campo.id, novo);
      if (r.erro) setErro(r.erro);
    });
  }

  const chave = `${valor}|${erro ?? ""}`;
  const comum = { "aria-label": campo.rotulo, disabled: pendente } as const;

  let controle;
  switch (campo.tipo) {
    case "texto_longo":
      controle = (
        <textarea
          key={chave}
          {...comum}
          rows={3}
          maxLength={2000}
          defaultValue={valor}
          onBlur={(e) => salvar(e.target.value)}
          className={`${base} py-2`}
        />
      );
      break;
    case "numero":
      controle = (
        <input
          key={chave}
          {...comum}
          type="number"
          step="any"
          defaultValue={valor}
          onBlur={(e) => salvar(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className={`${base} w-40`}
        />
      );
      break;
    case "data":
      controle = (
        <input
          key={chave}
          {...comum}
          type="date"
          min="2000-01-01"
          max="2100-12-31"
          defaultValue={valor}
          onBlur={(e) => salvar(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className={`${base} w-[8.5rem] font-mono text-xs`}
        />
      );
      break;
    case "lista":
      controle = (
        <select key={chave} {...comum} defaultValue={valor} onChange={(e) => salvar(e.target.value)} className={base}>
          <option value="">—</option>
          {campo.opcoes.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          {/* Valor antigo que saiu da lista de opções continua visível. */}
          {valor && !campo.opcoes.includes(valor) && <option value={valor}>{valor}</option>}
        </select>
      );
      break;
    case "caixa":
      controle = (
        <label className="flex min-h-11 items-center gap-2 px-1.5">
          <input
            key={chave}
            {...comum}
            type="checkbox"
            defaultChecked={valor === "true"}
            onChange={(e) => salvar(e.target.checked ? "true" : "false")}
            className="size-5 accent-preto"
          />
          <span className="text-sm">{valor === "true" ? "Sim" : "Não"}</span>
        </label>
      );
      break;
    default:
      controle = (
        <input
          key={chave}
          {...comum}
          type="text"
          maxLength={200}
          defaultValue={valor}
          onBlur={(e) => salvar(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className={base}
        />
      );
  }

  return (
    <div className="min-w-0">
      {controle}
      {erro && (
        <p role="alert" className="mt-0.5 text-xs font-bold text-laranja-texto">
          {erro}
        </p>
      )}
    </div>
  );
}
