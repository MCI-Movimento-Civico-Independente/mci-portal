import { STATUS_OPCOES, type StatusTarefa } from "@/lib/tarefas-campos";

export type { StatusTarefa };

/** Etiqueta de status (a mesma cor do seletor de status da lista). */
export function EtiquetaStatus({ status }: { status: StatusTarefa }) {
  const opcao = STATUS_OPCOES.find((o) => o.valor === status) ?? STATUS_OPCOES[0];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold leading-none ${opcao.classes}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {opcao.rotulo}
    </span>
  );
}
