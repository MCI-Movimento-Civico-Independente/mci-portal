"use client";

import Link from "next/link";
import type { Pessoa, TarefaDb } from "@/lib/tarefas";
import { PRIORIDADE_OPCOES, STATUS_OPCOES } from "@/lib/tarefas-campos";
import { CelulaOpcao, CelulaPessoa } from "./Celulas";
import { Progresso } from "./Progresso";
import { formatarPrazo } from "@/lib/datas";

/** Cartão do quadro. Mostra só tarefas de primeiro nível; as subtarefas ficam dentro da janela da tarefa. */
export function CartaoTarefa({ t, membros, hoje, qs }: { t: TarefaDb; membros: Pessoa[]; hoje: string; qs: string }) {
  const feitas = t.subtarefas.filter((s) => s.status === "concluida").length;
  const atrasada = t.status !== "concluida" && !!t.prazo && t.prazo < hoje;
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-borda bg-superficie p-3 shadow-suave hover:-translate-y-0.5 hover:border-borda-forte hover:shadow-elevado">
      <Link
        href={`/org/tarefas?${qs ? `${qs}&` : ""}tarefa=${t.id}`}
        scroll={false}
        className="text-[15px] font-bold leading-snug hover:text-marca-texto hover:underline"
      >
        {t.titulo}
      </Link>
      {t.projeto && <p className="truncate text-[11px] uppercase text-suave">{t.projeto.nome}</p>}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Progresso feitas={feitas} total={t.subtarefas.length} />
        {t.prazo && (
          <span className={`text-[11px] uppercase ${atrasada ? "font-bold text-marca-texto" : "text-suave"}`}>
            {formatarPrazo(t.prazo, hoje)}
          </span>
        )}
      </div>
      <CelulaPessoa id={t.id} chave="responsavel_id" valor={t.responsavel_id ?? ""} membros={membros} rotulo="Executor" />
      <div className="grid grid-cols-2 gap-2">
        <CelulaOpcao id={t.id} chave="status" valor={t.status} opcoes={STATUS_OPCOES} rotulo="Status" />
        <CelulaOpcao id={t.id} chave="prioridade" valor={t.prioridade ?? ""} opcoes={PRIORIDADE_OPCOES} rotulo="Prioridade" />
      </div>
    </li>
  );
}
