"use client";

import { TbTrash } from "react-icons/tb";
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
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-marca-texto hover:bg-marca-suave"
      >
        <TbTrash size={16} aria-hidden="true" />
        Excluir
      </button>
    </form>
  );
}
