"use client";

import type { Pessoa, TarefaDb } from "@/lib/tarefas";
import { STATUS_OPCOES } from "@/lib/tarefas-campos";
import { CelulaPeriodo } from "./CelulaPeriodo";
import { CelulaPessoa } from "./CelulaPessoa";
import { CelulaOpcao, CelulaTitulo } from "./Celulas";
import { SubtarefasOrdenaveis } from "./SubtarefasOrdenaveis";

/** Subtarefas dentro da janela da tarefa: campos editáveis, arrastar para ordenar e ações em massa. */
export function SubtarefasLista({ paiId, subtarefas, membros, hoje }: { paiId: string; subtarefas: TarefaDb[]; membros: Pessoa[]; hoje: string }) {
  if (subtarefas.length === 0) return null;
  return (
    <div className="mt-3">
      <SubtarefasOrdenaveis
        paiId={paiId}
        subtarefas={subtarefas}
        membros={membros}
        hoje={hoje}
        renderLinha={(s, a) => (
          <div className={`flex flex-wrap items-center border-b border-borda hover:bg-sutil ${a.fantasma ? "opacity-40" : ""}`}>
            <div className="flex items-center gap-1 pl-2">
              {a.alca}
              <input
                type="checkbox"
                checked={a.marcado}
                onChange={a.alternar}
                aria-label={`Selecionar a subtarefa ${s.titulo}`}
                className="size-4 accent-marca"
              />
            </div>
            <div
              onPointerDown={a.arrastarPeloTitulo}
              className="flex min-w-0 flex-1 basis-48 cursor-grab items-center pl-2 active:cursor-grabbing [&_a]:cursor-grab!"
            >
              <CelulaTitulo id={s.id} valor={s.titulo} riscado={s.status === "concluida"} />
            </div>
            <div className="flex basis-full flex-wrap items-start gap-2 pb-2 pl-3 md:basis-auto md:flex-nowrap md:pb-0 md:pl-0">
              <div className="w-24">
                <CelulaPessoa id={s.id} chave="responsavel_id" valor={s.responsavel_id ?? ""} extras={s.executores_extra} membros={membros} rotulo="Executor" />
              </div>
              <div className="w-36">
                <CelulaOpcao id={s.id} chave="status" valor={s.status} opcoes={STATUS_OPCOES} rotulo="Status" />
              </div>
              <div className="w-40">
                <CelulaPeriodo id={s.id} inicio={s.data_inicio ?? ""} fim={s.prazo ?? ""} hoje={hoje} status={s.status} />
              </div>
            </div>
          </div>
        )}
      />
    </div>
  );
}
