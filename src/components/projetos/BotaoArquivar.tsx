"use client";

import { Archive, ArchiveRestore } from "lucide-react";
import { arquivarProjetoAction } from "@/app/org/projetos/acoes";

export function BotaoArquivar({ id, arquivado }: { id: string; arquivado: boolean }) {
  const Icone = arquivado ? ArchiveRestore : Archive;
  return (
    <form
      action={arquivarProjetoAction.bind(null, id, !arquivado)}
      onSubmit={(e) => {
        if (!arquivado && !window.confirm("Arquivar este projeto? As tarefas dele continuam existindo.")) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-bold hover:bg-creme"
      >
        <Icone size={16} aria-hidden="true" />
        {arquivado ? "Reativar" : "Arquivar"}
      </button>
    </form>
  );
}
