import Link from "next/link";
import { TbArrowUpRight, TbUsersGroup } from "react-icons/tb";
import type { ComiteResumo } from "@/lib/organizacao";

/** Cartão de comitê (Início e lista de comitês). */
export function CartaoComite({ comite }: { comite: ComiteResumo }) {
  const { slug, nome, projetosAtivos, tarefasAbertas } = comite;
  return (
    <Link
      href={`/org/comites/${slug}`}
      className="group relative flex min-h-[148px] flex-col justify-between gap-4 rounded-2xl border border-borda bg-superficie p-5 shadow-suave hover:-translate-y-0.5 hover:border-borda-forte hover:shadow-elevado"
    >
      <span className="flex size-11 items-center justify-center rounded-xl bg-marca-suave text-marca-texto">
        <TbUsersGroup size={22} aria-hidden="true" />
      </span>
      <TbArrowUpRight
        size={18}
        aria-hidden="true"
        className="absolute right-4 top-4 text-suave group-hover:text-marca-texto"
      />
      <span className="flex flex-col gap-1.5">
        <span className="text-lg font-semibold leading-snug">{nome}</span>
        <span className="text-xs font-medium text-suave">
          {projetosAtivos} {projetosAtivos === 1 ? "projeto ativo" : "projetos ativos"} · {tarefasAbertas}{" "}
          {tarefasAbertas === 1 ? "tarefa em aberto" : "tarefas em aberto"}
        </span>
      </span>
    </Link>
  );
}
