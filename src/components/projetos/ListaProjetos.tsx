import Link from "next/link";
import type { ProjetoResumo } from "@/lib/organizacao";
import { BotaoArquivar } from "./BotaoArquivar";

export function ListaProjetos({ projetos }: { projetos: ProjetoResumo[] }) {
  if (projetos.length === 0) return <p className="text-[15px] text-cinza">Nenhum projeto ainda.</p>;
  return (
    <ul>
      {projetos.map((p) => (
        <li key={p.id} className="flex flex-wrap items-center gap-x-4 border-b border-linha py-3 last:border-b-0">
          <div className="min-w-0 flex-1 basis-60">
            <p className={`text-[15px] font-bold ${p.status === "arquivado" ? "text-cinza line-through" : ""}`}>
              {p.nome}
              {p.status === "arquivado" && (
                <span className="ml-2 font-mono text-[11px] font-normal uppercase no-underline">Arquivado</span>
              )}
            </p>
            {p.descricao && <p className="mt-0.5 text-sm text-cinza">{p.descricao}</p>}
          </div>
          <Link
            href={`/org/tarefas?quem=todas&projeto=${p.id}`}
            className="inline-flex min-h-11 items-center font-mono text-[11px] uppercase tracking-wider text-laranja-texto hover:underline"
          >
            {p.tarefasAbertas} em aberto · {p.tarefasTotal} no total
          </Link>
          <BotaoArquivar id={p.id} arquivado={p.status === "arquivado"} />
        </li>
      ))}
    </ul>
  );
}
