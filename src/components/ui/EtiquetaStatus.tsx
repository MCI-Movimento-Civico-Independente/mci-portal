import { STATUS_OPCOES, type StatusTarefa } from "@/lib/tarefas-campos";

export type { StatusTarefa };

/** Etiqueta de status do manual (a mesma do seletor de status da lista). */
export function EtiquetaStatus({ status }: { status: StatusTarefa }) {
  const opcao = STATUS_OPCOES.find((o) => o.valor === status) ?? STATUS_OPCOES[0];
  return (
    <span className={`inline-block whitespace-nowrap border-2 px-2 py-1 text-[11px] font-bold leading-none ${opcao.classes}`}>
      {opcao.rotulo}
    </span>
  );
}
