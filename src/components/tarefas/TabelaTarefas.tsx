"use client";

import { TbChevronRight } from "react-icons/tb";
import { useState } from "react";
import type { ComiteBasico, ProjetoBasico } from "@/lib/organizacao";
import type { GrupoBasico } from "@/lib/grupos-tipos";
import type { Pessoa, TarefaDb } from "@/lib/tarefas";
import { PRIORIDADE_OPCOES, STATUS_OPCOES } from "@/lib/tarefas-campos";
import { CelulaData, CelulaGrupo, CelulaOpcao, CelulaPessoa, CelulaProjeto, CelulaTitulo } from "./Celulas";
import { Progresso } from "./Progresso";

// Colunas: expandir | tarefa | projeto | solicitante | executor | status | prioridade | período
const GRID =
  "md:grid md:grid-cols-[28px_minmax(220px,1fr)_140px_112px_132px_100px_240px] 2xl:grid-cols-[28px_minmax(220px,1fr)_140px_112px_112px_132px_100px_240px] md:items-center md:gap-x-1";

type Props = {
  tarefas: TarefaDb[];
  membros: Pessoa[];
  comites: ComiteBasico[];
  projetos: ProjetoBasico[];
  hoje: string;
  /** Query atual (vista, quem) para o link da janela da tarefa conservá-la. */
  qs: string;
  /** Página onde a tabela está (a janela da tarefa abre por cima dela). */
  caminho?: string;
  /** Na página do projeto a coluna "Projeto" dá lugar à coluna "Grupo". */
  grupos?: GrupoBasico[];
};

function Linha({
  t,
  membros,
  comites,
  projetos,
  hoje,
  qs,
  caminho = "/org/tarefas",
  grupos,
  sub = false,
  expansor,
}: Omit<Props, "tarefas"> & {
  t: TarefaDb;
  sub?: boolean;
  expansor?: { aberto: boolean; alternar: () => void };
}) {
  const href = `${caminho}?${qs ? `${qs}&` : ""}tarefa=${t.id}`;
  const feitas = t.subtarefas.filter((s) => s.status === "concluida").length;
  const atrasada = t.status !== "concluida" && !!t.prazo && t.prazo < hoje;

  return (
    <div className={`flex flex-wrap items-center border-b border-borda hover:bg-sutil ${GRID} ${sub ? "bg-sutil/60" : ""}`}>
      <div className={`flex size-7 items-center justify-center ${sub ? "hidden md:flex" : ""}`}>
        {expansor && t.subtarefas.length > 0 && (
          <button
            type="button"
            aria-expanded={expansor.aberto}
            aria-label={expansor.aberto ? "Recolher subtarefas" : "Mostrar subtarefas"}
            onClick={expansor.alternar}
            className="flex size-7 items-center justify-center hover:bg-sutil"
          >
            <TbChevronRight size={16} aria-hidden="true" className={`transition-transform ${expansor.aberto ? "rotate-90" : ""}`} />
          </button>
        )}
      </div>
      <div className={`flex min-w-0 flex-1 items-center gap-2 md:flex-none ${sub ? "pl-4" : ""}`}>
        <CelulaTitulo id={t.id} valor={t.titulo} href={href} riscado={t.status === "concluida"} />
        <Progresso feitas={feitas} total={t.subtarefas.length} />
      </div>

      <div className="flex basis-full flex-wrap items-start gap-2 pb-3 pl-9 md:contents">
        <div className="w-full sm:w-52 md:w-auto">
          {sub ? (
            <span aria-hidden="true" />
          ) : grupos ? (
            <CelulaGrupo id={t.id} valor={t.grupo_id ?? ""} grupos={grupos.filter((g) => g.projeto_id === t.projeto_id)} />
          ) : (
            <CelulaProjeto id={t.id} valor={t.projeto_id ?? ""} comites={comites} projetos={projetos} comiteFiltro={t.comite_slug} />
          )}
        </div>
        <div className="w-36 md:hidden md:w-auto 2xl:block">
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
          <span aria-hidden="true" className="text-suave">
            →
          </span>
          <CelulaData id={t.id} chave="prazo" valor={t.prazo ?? ""} rotulo="Entrega" alerta={atrasada} />
        </div>
      </div>
    </div>
  );
}

function TarefaComSubtarefas(props: Omit<Props, "tarefas"> & { t: TarefaDb }) {
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
export function TabelaTarefas({ tarefas, membros, comites, projetos, hoje, qs, caminho, grupos }: Props) {
  return (
    <div className="overflow-x-auto">
      <div className="md:min-w-[960px] 2xl:min-w-[1070px]">
        <div
          aria-hidden="true"
          className={`hidden border-b border-borda-forte pb-2 rotulo text-suave md:grid md:grid-cols-[28px_minmax(220px,1fr)_140px_112px_132px_100px_240px] 2xl:grid-cols-[28px_minmax(220px,1fr)_140px_112px_112px_132px_100px_240px] md:gap-x-1`}
        >
          <span />
          <span>Tarefa</span>
          <span className="pl-1.5">{grupos ? "Grupo" : "Projeto"}</span>
          <span className="hidden pl-1.5 2xl:block">Solicitante</span>
          <span className="pl-1.5">Executor</span>
          <span>Status</span>
          <span>Prioridade</span>
          <span>Início → Entrega</span>
        </div>
        <ul>
          {tarefas.map((t) => (
            <TarefaComSubtarefas key={t.id} t={t} membros={membros} comites={comites} projetos={projetos} hoje={hoje} qs={qs} caminho={caminho} grupos={grupos} />
          ))}
        </ul>
      </div>
    </div>
  );
}
