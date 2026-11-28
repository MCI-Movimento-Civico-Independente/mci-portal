"use client";

import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TbChevronRight, TbGripVertical } from "react-icons/tb";
import { useState, type ReactNode } from "react";
import type { ComiteBasico, ProjetoBasico } from "@/lib/organizacao";
import type { GrupoBasico } from "@/lib/grupos-tipos";
import type { Pessoa, TarefaDb } from "@/lib/tarefas";
import { PRIORIDADE_OPCOES, STATUS_OPCOES } from "@/lib/tarefas-campos";
import { CelulaOpcao, CelulaProjeto, CelulaTitulo } from "./Celulas";
import { CelulaPessoa } from "./CelulaPessoa";
import { CelulaPeriodo } from "./CelulaPeriodo";
import { Cadeado } from "./Cadeado";
import { SubtarefasOrdenaveis } from "./SubtarefasOrdenaveis";
import { LinhaNovaSubtarefa } from "./LinhaNovaSubtarefa";
import { Progresso } from "./Progresso";

/*
 * A tabela mantém sempre o formato de colunas. Quando a área fica estreita, ela rola na
 * horizontal com UMA barra só, embaixo da última tarefa: arrastar a barra move todas as
 * linhas juntas (cabeçalho, tarefas e subtarefas). A coluna "Solicitante" só aparece em
 * áreas largas (@6xl, medido pelo espaço da tabela, não da tela).
 *
 * Modo projeto (arrastável): alça | expandir | tarefa | executor | status | prioridade | período
 * Modo lista:                        expandir | tarefa | projeto | executor | status | prioridade | período
 */
const COLUNAS_PROJETO =
  "grid-cols-[20px_24px_minmax(160px,1fr)_84px_96px_84px_150px] @6xl:grid-cols-[20px_24px_minmax(160px,1fr)_84px_84px_96px_84px_150px]";
const COLUNAS_LISTA =
  "grid-cols-[24px_minmax(160px,1fr)_130px_84px_96px_84px_150px] @6xl:grid-cols-[24px_minmax(160px,1fr)_130px_84px_84px_96px_84px_150px]";
// Largura mínima do conteúdo: abaixo disso a barra de rolagem aparece.
const LARGURA_PROJETO = "min-w-[680px]";
const LARGURA_LISTA = "min-w-[780px]";

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
  /** Presente na página do projeto: some a coluna "Projeto" e as linhas podem ser arrastadas. */
  grupos?: GrupoBasico[];
  /** Id do grupo: a lista vira área de soltar (também quando está vazia). */
  grupoId?: string;
};

type LinhaProps = Omit<Props, "tarefas"> & {
  t: TarefaDb;
  sub?: boolean;
  expansor?: { aberto: boolean; alternar: () => void };
  alca?: ReactNode;
  /** Pointer do dnd-kit: a área do título também arrasta a linha. */
  arrastarPeloTitulo?: (e: React.PointerEvent) => void;
  fantasma?: boolean;
  /** Subtarefa selecionável (ações em massa): caixa de seleção no lugar da setinha. */
  selecao?: { marcado: boolean; alternar: () => void };
};

function Linha({ t, membros, comites, projetos, hoje, qs, caminho = "/org/tarefas", grupos, sub = false, expansor, alca, arrastarPeloTitulo, fantasma = false, selecao }: LinhaProps) {
  const href = `${caminho}?${qs ? `${qs}&` : ""}tarefa=${t.id}`;
  const feitas = t.subtarefas.filter((s) => s.status === "concluida").length;
  const modoProjeto = !!grupos;

  return (
    <div
      className={`grid items-center gap-x-1 border-b border-borda hover:bg-sutil ${modoProjeto ? COLUNAS_PROJETO : COLUNAS_LISTA} ${sub ? "bg-sutil/60" : ""} ${fantasma ? "opacity-40" : ""}`}
    >
      {modoProjeto && <div className="flex size-5 items-center justify-center">{alca}</div>}
      <div className="flex size-6 items-center justify-center">
        {sub && selecao && (
          <input
            type="checkbox"
            checked={selecao.marcado}
            onChange={selecao.alternar}
            aria-label={`Selecionar a subtarefa ${t.titulo}`}
            className="size-4 accent-marca"
          />
        )}
        {expansor && !sub && (
          <button
            type="button"
            aria-expanded={expansor.aberto}
            aria-label={expansor.aberto ? "Recolher subtarefas" : "Mostrar subtarefas"}
            onClick={expansor.alternar}
            className="flex size-6 items-center justify-center hover:bg-sutil"
          >
            <TbChevronRight size={16} aria-hidden="true" className={`transition-transform ${expansor.aberto ? "rotate-90" : ""}`} />
          </button>
        )}
      </div>
      <div
        onPointerDown={arrastarPeloTitulo}
        className={`flex min-w-0 items-center gap-2 ${sub ? "pl-4" : ""} ${
          arrastarPeloTitulo ? "cursor-grab active:cursor-grabbing [&_a]:cursor-grab! [&_a]:active:cursor-grabbing!" : ""
        }`}
      >
        <Cadeado bloqueios={t.bloqueios} status={t.status} />
        <CelulaTitulo id={t.id} valor={t.titulo} href={href} riscado={t.status === "concluida"} />
        <Progresso feitas={feitas} total={t.subtarefas.length} />
      </div>

      {!modoProjeto && (
        <div className="min-w-0">
          {sub ? (
            <span aria-hidden="true" />
          ) : (
            <CelulaProjeto id={t.id} valor={t.projeto_id ?? ""} comites={comites} projetos={projetos} comiteFiltro={t.comite_slug} />
          )}
        </div>
      )}
      <div className="hidden min-w-0 @6xl:block">
        <CelulaPessoa id={t.id} chave="solicitante_id" valor={t.solicitante_id ?? ""} membros={membros} rotulo="Solicitante" />
      </div>
      <div className="min-w-0">
        <CelulaPessoa id={t.id} chave="responsavel_id" valor={t.responsavel_id ?? ""} extras={t.executores_extra} membros={membros} rotulo="Executor" />
      </div>
      <div className="min-w-0">
        <CelulaOpcao id={t.id} chave="status" valor={t.status} opcoes={STATUS_OPCOES} rotulo="Status" />
      </div>
      <div className="min-w-0">
        <CelulaOpcao id={t.id} chave="prioridade" valor={t.prioridade ?? ""} opcoes={PRIORIDADE_OPCOES} rotulo="Prioridade" />
      </div>
      <div className="min-w-0">
        <CelulaPeriodo id={t.id} inicio={t.data_inicio ?? ""} fim={t.prazo ?? ""} hoje={hoje} status={t.status} />
      </div>
    </div>
  );
}

function Corpo(props: Omit<LinhaProps, "expansor" | "sub">) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Linha {...props} expansor={{ aberto, alternar: () => setAberto((v) => !v) }} />
      {aberto && (
        <>
          {props.t.subtarefas.length > 0 && (
            <SubtarefasOrdenaveis
              paiId={props.t.id}
              subtarefas={props.t.subtarefas}
              membros={props.membros}
              hoje={props.hoje}
              renderLinha={(s, a) => (
                <Linha
                  {...props}
                  t={s}
                  sub
                  alca={props.grupos ? a.alca : undefined}
                  arrastarPeloTitulo={a.arrastarPeloTitulo}
                  selecao={{ marcado: a.marcado, alternar: a.alternar }}
                  fantasma={a.fantasma}
                />
              )}
            />
          )}
          <LinhaNovaSubtarefa paiId={props.t.id} />
        </>
      )}
    </>
  );
}

function ItemFixo(props: Omit<LinhaProps, "expansor" | "sub">) {
  return (
    <li>
      <Corpo {...props} />
    </li>
  );
}

/** Linha que pode ser arrastada pela alça (os campos continuam editáveis normalmente). */
function ItemArrastavel(props: Omit<LinhaProps, "expansor" | "sub">) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: props.t.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={isDragging ? "relative z-10" : ""}>
      <Corpo
        {...props}
        fantasma={isDragging}
        arrastarPeloTitulo={(e) => {
          // Campo de texto aberto (editar assunto): o mouse seleciona texto, não arrasta.
          if ((e.target as HTMLElement).closest("input, textarea, select")) return;
          listeners?.onPointerDown?.(e);
        }}
        alca={
          <button
            type="button"
            ref={setActivatorNodeRef}
            aria-label={`Arrastar a tarefa ${props.t.titulo}`}
            title="Arrastar para mudar de grupo ou de posição"
            {...attributes}
            {...listeners}
            className="flex size-5 cursor-grab touch-none items-center justify-center text-suave hover:bg-inverso hover:text-sobre-inverso active:cursor-grabbing"
          >
            <TbGripVertical size={14} aria-hidden="true" />
          </button>
        }
      />
    </li>
  );
}

/** Lista no estilo Monday: campos editáveis na própria linha e subtarefas em lista suspensa. */
export function TabelaTarefas({ tarefas, membros, comites, projetos, hoje, qs, caminho, grupos, grupoId }: Props) {
  const arrastavel = !!grupos && !!grupoId;
  const { setNodeRef } = useDroppable({ id: `grupo:${grupoId ?? "-"}`, disabled: !arrastavel });
  const modoProjeto = !!grupos;
  const colunas = modoProjeto ? COLUNAS_PROJETO : COLUNAS_LISTA;

  const itens = tarefas.map((t) => {
    const props = { t, membros, comites, projetos, hoje, qs, caminho, grupos };
    return arrastavel ? <ItemArrastavel key={t.id} {...props} /> : <ItemFixo key={t.id} {...props} />;
  });

  return (
    // Uma rolagem horizontal só para a tabela inteira (barra fina, embaixo da última tarefa).
    <div className="@container overflow-x-auto pb-1 [scrollbar-width:thin]">
      <div className={modoProjeto ? LARGURA_PROJETO : LARGURA_LISTA}>
        <div aria-hidden="true" className={`grid gap-x-1 border-b border-borda-forte pb-1 rotulo text-[10px] text-suave ${colunas}`}>
          {modoProjeto && <span />}
          <span />
          <span>Tarefa</span>
          {!modoProjeto && <span className="pl-1.5">Projeto</span>}
          <span className="hidden text-center @6xl:block">Solicitante</span>
          <span className="text-center">Executor</span>
          <span>Status</span>
          <span>Prioridade</span>
          <span>Período</span>
        </div>
        {arrastavel ? (
          <SortableContext items={tarefas.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <ul ref={setNodeRef} className="min-h-8">
              {itens}
            </ul>
          </SortableContext>
        ) : (
          <ul>{itens}</ul>
        )}
      </div>
    </div>
  );
}
