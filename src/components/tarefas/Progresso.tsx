import { ListChecks } from "lucide-react";

export function Progresso({ feitas, total }: { feitas: number; total: number }) {
  if (total === 0) return null;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 font-mono text-[11px] font-bold text-cinza"
      title={`${feitas} de ${total} subtarefas concluídas`}
    >
      <ListChecks size={14} aria-hidden="true" />
      {feitas}/{total}
    </span>
  );
}
