import Link from "next/link";
import { ListChecks } from "lucide-react";
import { formatarPrazo } from "@/lib/datas";
import type { TarefaDb } from "@/lib/tarefas";
import { CaixaConcluir, SeletorStatus } from "./ControlesTarefa";
import { Pessoa } from "./Pessoa";

export function Progresso({ feitas, total }: { feitas: number; total: number }) {
  if (total === 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-cinza"
      title={`${feitas} de ${total} subtarefas concluídas`}
    >
      <ListChecks size={14} aria-hidden="true" />
      {feitas}/{total}
    </span>
  );
}

export function textoPrazo(t: TarefaDb, hoje: string) {
  const atrasada = t.status !== "concluida" && t.prazo !== null && t.prazo < hoje;
  return { texto: formatarPrazo(t.prazo, hoje), atrasada };
}

/** Linha da lista: caixa, assunto, progresso, responsável, prazo e status. */
export function LinhaTarefa({ t, hoje }: { t: TarefaDb; hoje: string }) {
  const { texto, atrasada } = textoPrazo(t, hoje);
  return (
    <li className="flex items-center gap-2 border-b border-linha py-1.5 last:border-b-0 hover:bg-creme/60 md:gap-4">
      <CaixaConcluir id={t.id} status={t.status} />
      <div className="min-w-0 flex-1 py-1">
        <Link
          href={`/org/tarefas/${t.id}`}
          className={`block text-[15px] font-bold leading-snug hover:text-laranja-texto hover:underline ${
            t.status === "concluida" ? "line-through opacity-60" : ""
          }`}
        >
          {t.titulo}
        </Link>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {t.paiTitulo && (
            <span className="truncate font-mono text-[11px] uppercase text-cinza">↳ {t.paiTitulo}</span>
          )}
          <Progresso feitas={t.subfeitas} total={t.subtotal} />
          <span
            className={`font-mono text-[11px] uppercase tracking-wider ${
              atrasada ? "font-bold text-laranja-texto" : "text-cinza"
            }`}
          >
            {texto}
          </span>
          <span className="md:hidden">
            <Pessoa pessoa={t.responsavel} />
          </span>
        </p>
      </div>
      <div className="hidden w-32 shrink-0 md:block">
        <Pessoa pessoa={t.responsavel} />
      </div>
      <SeletorStatus id={t.id} status={t.status} />
    </li>
  );
}
