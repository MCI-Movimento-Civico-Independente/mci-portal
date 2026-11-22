"use client";

import type { Pessoa, TarefaDb } from "@/lib/tarefas";
import { STATUS_OPCOES } from "@/lib/tarefas-campos";
import { CelulaPeriodo } from "./CelulaPeriodo";
import { CelulaOpcao, CelulaPessoa, CelulaTitulo } from "./Celulas";

/** Subtarefas dentro da janela da tarefa: campos editáveis na linha. */
export function SubtarefasLista({ subtarefas, membros, hoje }: { subtarefas: TarefaDb[]; membros: Pessoa[]; hoje: string }) {
  return (
    <ul className="mt-3 border-t border-borda">
      {subtarefas.map((s) => (
        <li key={s.id} className="flex flex-wrap items-center border-b border-borda hover:bg-sutil">
          <div className="flex min-w-0 flex-1 basis-48 items-center pl-3">
            <CelulaTitulo id={s.id} valor={s.titulo} riscado={s.status === "concluida"} />
          </div>
          <div className="flex basis-full flex-wrap items-start gap-2 pb-3 pl-3 md:basis-auto md:flex-nowrap md:pb-0 md:pl-0">
            <div className="w-36">
              <CelulaPessoa id={s.id} chave="responsavel_id" valor={s.responsavel_id ?? ""} membros={membros} rotulo="Executor" />
            </div>
            <div className="w-36">
              <CelulaOpcao id={s.id} chave="status" valor={s.status} opcoes={STATUS_OPCOES} rotulo="Status" />
            </div>
            <div className="w-40">
              <CelulaPeriodo
                id={s.id}
                inicio={s.data_inicio ?? ""}
                fim={s.prazo ?? ""}
                hoje={hoje}
                alerta={s.status !== "concluida" && !!s.prazo && s.prazo < hoje}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
