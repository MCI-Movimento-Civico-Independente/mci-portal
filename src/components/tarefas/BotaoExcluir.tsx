"use client";

import { Trash2 } from "lucide-react";
import { excluirTarefaAction } from "@/app/org/tarefas/acoes";

export function BotaoExcluir({ id, aviso }: { id: string; aviso: string }) {
  return (
    <form
      action={excluirTarefaAction.bind(null, id)}
      onSubmit={(e) => {
        if (!window.confirm(aviso)) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-bold text-laranja-texto hover:bg-laranja hover:text-preto"
      >
        <Trash2 size={16} aria-hidden="true" />
        Excluir
      </button>
    </form>
  );
}
