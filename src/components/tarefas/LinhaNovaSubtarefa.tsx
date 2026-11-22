"use client";

import { useRef, useState, useTransition } from "react";
import { TbPlus } from "react-icons/tb";
import { criarSubtarefaAction } from "@/app/org/tarefas/acoes";

/**
 * Última linha das subtarefas: "Adicionar subtarefa". Vira um campo; Enter cria e já
 * deixa o campo pronto para a próxima, Esc (ou sair com o campo vazio) fecha.
 */
export function LinhaNovaSubtarefa({ paiId }: { paiId: string }) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const campo = useRef<HTMLInputElement>(null);

  function criar() {
    const titulo = campo.current?.value.trim() ?? "";
    if (!titulo || pendente) return;
    const dados = new FormData();
    dados.set("titulo", titulo);
    setErro(null);
    iniciar(async () => {
      const r = await criarSubtarefaAction(paiId, {}, dados);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      if (campo.current) campo.current.value = "";
      campo.current?.focus();
    });
  }

  return (
    <div className="border-b border-borda bg-sutil/60 pl-12 pr-2">
      {aberto ? (
        <div className="flex flex-wrap items-center gap-2 py-1">
          <input
            ref={campo}
            autoFocus
            aria-label="Título da nova subtarefa"
            placeholder="Título da subtarefa e Enter"
            maxLength={200}
            disabled={pendente}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                criar();
              }
              if (e.key === "Escape") setAberto(false);
            }}
            onBlur={(e) => {
              if (!e.target.value.trim() && !pendente) setAberto(false);
            }}
            className="min-h-11 w-full max-w-md border border-inverso bg-superficie px-2 text-sm placeholder:text-suave md:min-h-8 md:text-[13px]"
          />
          <span className="rotulo text-[10px] text-suave">{pendente ? "Criando…" : "Enter adiciona · Esc fecha"}</span>
          {erro && (
            <p role="alert" className="basis-full text-xs font-bold text-marca-texto">
              {erro}
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="rotulo flex min-h-11 w-full items-center gap-1.5 text-left font-bold text-suave hover:text-texto md:min-h-8"
        >
          <TbPlus size={14} aria-hidden="true" />
          Adicionar subtarefa
        </button>
      )}
    </div>
  );
}
