export type StatusTarefa = "a_fazer" | "em_andamento" | "em_revisao" | "concluida";

const config: Record<StatusTarefa, { texto: string; classes: string }> = {
  a_fazer: { texto: "A fazer", classes: "bg-preto text-creme-claro border-preto" },
  em_andamento: { texto: "Em andamento", classes: "bg-amarelo text-preto border-amarelo" },
  em_revisao: { texto: "Em revisão", classes: "bg-laranja text-preto border-laranja" },
  concluida: { texto: "Concluída", classes: "bg-transparent text-preto border-preto" },
};

export function EtiquetaStatus({ status }: { status: StatusTarefa }) {
  const { texto, classes } = config[status];
  return (
    <span
      className={`inline-block whitespace-nowrap border px-2 py-1 font-mono text-[11px] font-bold uppercase leading-none ${classes}`}
    >
      {texto}
    </span>
  );
}
