import { TbChecklist } from "react-icons/tb";

export function Progresso({ feitas, total }: { feitas: number; total: number }) {
  if (total === 0) return null;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold text-suave"
      title={`${feitas} de ${total} subtarefas concluídas`}
    >
      <TbChecklist size={14} aria-hidden="true" />
      {feitas}/{total}
    </span>
  );
}
