"use client";

import { TbArchive, TbArrowBackUp } from "react-icons/tb";
import { arquivarProjetoAction } from "@/app/org/projetos/acoes";

export function BotaoArquivar({ id, arquivado }: { id: string; arquivado: boolean }) {
  const Icone = arquivado ? TbArrowBackUp : TbArchive;
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
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold hover:bg-sutil"
      >
        <Icone size={16} aria-hidden="true" />
        {arquivado ? "Reativar" : "Arquivar"}
      </button>
    </form>
  );
}
