"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";
import type { Pessoa, TarefaDb } from "@/lib/tarefas";
import { PRIORIDADE_OPCOES, STATUS_OPCOES } from "@/lib/tarefas-campos";
import { CaixaConcluir, CelulaData, CelulaOpcao, CelulaPessoa, CelulaTitulo } from "./Celulas";
import { Progresso } from "./Progresso";

// Colunas: expandir | caixa | tarefa | solicitante | executor | status | prioridade | período
const GRID =
  "md:grid md:grid-cols-[28px_44px_minmax(240px,1fr)_130px_130px_150px_120px_290px] md:items-center md:gap-x-1";

type Props = {
  tarefas: TarefaDb[];
  membros: Pessoa[];
  hoje: string;
  /** Query atual (vista, quem) para o link da janela da tarefa conservá-la. */
  qs: string;
};

function Linha({
  t,
  membros,
  hoje,
  qs,
  sub = false,
  expansor,
}: Omit<Props, "tarefas"> & {
  t: TarefaDb;
  sub?: boolean;
  expansor?: { aberto: boolean; alternar: () => void };
}) {
  const href = `/org/tarefas?${qs ? `${qs}&` : ""}tarefa=${t.id}`;
  const feitas = t.subtarefas.filter((s) => s.status === "concluida").length;
  const atrasada = t.status !== "concluida" && !!t.prazo && t.prazo < hoje;

  return (
    <div className={`flex flex-wrap items-center border-b border-linha hover:bg-creme/60 ${GRID} ${sub ? "bg-creme-claro/70" : ""}`}>
      <div className={`flex size-7 items-center justify-center ${sub ? "hidden md:flex" : ""}`}>
        {expansor && t.subtarefas.length > 0 && (
          <button
            type="button"
            aria-expanded={expansor.aberto}
            aria-label={expansor.aberto ? "Recolher subtarefas" : "Mostrar subtarefas"}
            onClick={expansor.alternar}
            className="flex size-7 items-center justify-center hover:bg-creme"
          >
            <ChevronRight size={16} aria-hidden="true" className={`transition-transform ${expansor.aberto ? "rotate-90" : ""}`} />
          </button>
        )}
      </div>
      <div className={sub ? "pl-4 md:pl-3" : ""}>
        <CaixaConcluir id={t.id} status={t.status} />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-none">
        <CelulaTitulo id={t.id} valor={t.titulo} href={href} riscado={t.status === "concluida"} />
        <Progresso feitas={feitas} total={t.subtarefas.length} />
      </div>

      <div className="flex basis-full flex-wrap items-start gap-2 pb-3 pl-12 md:contents">
        <div className="w-36 md:w-auto">
          <CelulaPessoa id={t.id} chave="solicitante_id" valor={t.solicitante_id ?? ""} membros={membros} rotulo="Solicitante" />
        </div>
        <div className="w-36 md:w-auto">
          <CelulaPessoa id={t.id} chave="responsavel_id" valor={t.responsavel_id ?? ""} membros={membros} rotulo="Executor" />
        </div>
        <div className="w-36 md:w-auto">
          <CelulaOpcao id={t.id} chave="status" valor={t.status} opcoes={STATUS_OPCOES} rotulo="Status" />
        </div>
        <div className="w-28 md:w-auto">
          <CelulaOpcao id={t.id} chave="prioridade" valor={t.prioridade ?? ""} opcoes={PRIORIDADE_OPCOES} rotulo="Prioridade" />
        </div>
        <div className="flex items-center gap-1">
          <CelulaData id={t.id} chave="data_inicio" valor={t.data_inicio ?? ""} rotulo="Início" />
          <span aria-hidden="true" className="text-cinza">
            →
          </span>
          <CelulaData id={t.id} chave="prazo" valor={t.prazo ?? ""} rotulo="Entrega" alerta={atrasada} />
        </div>
      </div>
    </div>
  );
}

function Grupo(props: Omit<Props, "tarefas"> & { t: TarefaDb }) {
  const [aberto, setAberto] = useState(false);
  return (
    <li>
      <Linha {...props} expansor={{ aberto, alternar: () => setAberto((v) => !v) }} />
      {aberto &&
        props.t.subtarefas.map((s) => <Linha key={s.id} {...props} t={s} sub />)}
    </li>
  );
}

/** Lista no estilo Monday: campos editáveis na própria linha e subtarefas em lista suspensa. */
export function TabelaTarefas({ tarefas, membros, hoje, qs }: Props) {
  return (
    <div className="overflow-x-auto">
      <div className="md:min-w-[1180px]">
        <div
          aria-hidden="true"
          className={`hidden border-b-2 border-preto pb-2 font-mono text-[11px] uppercase tracking-widest text-cinza md:grid md:grid-cols-[28px_44px_minmax(240px,1fr)_130px_130px_150px_120px_290px] md:gap-x-1`}
        >
          <span />
          <span />
          <span>Tarefa</span>
          <span className="pl-1.5">Solicitante</span>
          <span className="pl-1.5">Executor</span>
          <span>Status</span>
          <span>Prioridade</span>
          <span>Início → Entrega</span>
        </div>
        <ul>
          {tarefas.map((t) => (
            <Grupo key={t.id} t={t} membros={membros} hoje={hoje} qs={qs} />
          ))}
        </ul>
      </div>
    </div>
  );
}
