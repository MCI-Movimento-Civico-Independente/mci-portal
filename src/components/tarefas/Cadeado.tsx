import { TbLock } from "react-icons/tb";
import { codigo } from "@/lib/vinculos/tipos";

/** Tarefa bloqueada: depende de outra que ainda não foi concluída. */
export function Cadeado({ bloqueios, status }: { bloqueios: number[]; status: string }) {
  if (!bloqueios.length || status === "concluida") return null;
  const texto = `Depende de ${bloqueios.map(codigo).join(", ")}`;
  return (
    <span role="img" aria-label={texto} title={texto} className="inline-flex shrink-0 text-marca-texto">
      <TbLock size={15} aria-hidden="true" />
    </span>
  );
}
