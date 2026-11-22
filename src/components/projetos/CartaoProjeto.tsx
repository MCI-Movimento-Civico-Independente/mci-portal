import Link from "next/link";
import { TbArrowUpRight } from "react-icons/tb";
import type { ProjetoResumo } from "@/lib/organizacao";

/** Cartão de projeto: nome, comitê, progresso das tarefas. */
export function CartaoProjeto({ projeto, nomeComite }: { projeto: ProjetoResumo; nomeComite: string }) {
  const { id, nome, descricao, status, tarefasAbertas, tarefasTotal } = projeto;
  const feitas = tarefasTotal - tarefasAbertas;
  const pct = tarefasTotal > 0 ? Math.round((feitas / tarefasTotal) * 100) : 0;
  const arquivado = status === "arquivado";

  return (
    <Link
      href={`/org/projetos/${id}`}
      className={`group relative flex min-h-[170px] flex-col justify-between gap-4 border-2 bg-superficie p-5 hover:-translate-y-0.5 hover:border-texto ${
        arquivado ? "border-borda opacity-70" : "border-borda-forte"
      }`}
    >
      <TbArrowUpRight size={18} aria-hidden="true" className="absolute right-3.5 top-3.5 text-suave group-hover:text-marca-texto" />
      <div className="flex flex-col gap-2 pr-6">
        <p className="rotulo text-suave">{nomeComite}</p>
        <h3 className="text-lg font-semibold leading-snug">{nome}</h3>
        {descricao && <p className="line-clamp-2 text-sm text-suave">{descricao}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <div
          role="progressbar"
          aria-label={`Tarefas concluídas em ${nome}`}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 bg-sutil"
        >
          <div className="h-full bg-ouro" style={{ width: `${pct}%` }} />
        </div>
        <p className="rotulo flex items-center justify-between text-suave">
          <span>
            {tarefasAbertas} em aberto · {tarefasTotal} no total
          </span>
          {arquivado && <span className="border-2 border-borda-forte px-1.5 py-0.5 font-bold">Arquivado</span>}
        </p>
      </div>
    </Link>
  );
}
