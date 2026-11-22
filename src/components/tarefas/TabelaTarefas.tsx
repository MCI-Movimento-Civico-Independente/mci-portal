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
import { CelulaData, CelulaOpcao, CelulaPessoa, CelulaProjeto, CelulaTitulo } from "./Celulas";
import { Progresso } from "./Progresso";

/*
 * Layout por largura do CONTAINER (não da tela): com o menu lateral aberto a tela
 * sobra pouco, então medir a tela fazia a tabela ganhar rolagem horizontal à toa.
 * Abaixo do ponto de corte a linha vira um cartão compacto (sem rolagem).
 *
 * Modo projeto (arrastável): handle | expandir | tarefa | executor | status | prioridade | período
 * Modo lista:                        expandir | tarefa | projeto | executor | status | prioridade | período
 * A partir de @6xl entra a coluna "Solicitante".
 */
const GRID_PROJETO =
  "@3xl:grid @3xl:grid-cols-[20px_24px_minmax(160px,1fr)_120px_96px_84px_212px] @6xl:grid-cols-[20px_24px_minmax(160px,1fr)_108px_120px_96px_84px_212px] @3xl:items-center @3xl:gap-x-1";
const GRID_LISTA =
  "@4xl:grid @4xl:grid-cols-[24px_minmax(160px,1fr)_130px_120px_96px_84px_212px] @6xl:grid-cols-[24px_minmax(160px,1fr)_130px_108px_120px_96px_84px_212px] @4xl:items-center @4xl:gap-x-1";

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
};

function Linha({ t, membros, comites, projetos, hoje, qs, caminho = "/org/tarefas", grupos, sub = false, expansor, alca, arrastarPeloTitulo, fantasma = false }: LinhaProps) {
  const href = `${caminho}?${qs ? `${qs}&` : ""}tarefa=${t.id}`;
  const feitas = t.subtarefas.filter((s) => s.status === "concluida").length;
  const atrasada = t.status !== "concluida" && !!t.prazo && t.prazo < hoje;
  const modoProjeto = !!grupos;
  // Classes de cada ponto de corte escritas por extenso (o Tailwind não lê nomes montados).
  const c = modoProjeto
    ? { contents: "@3xl:contents", auto: "@3xl:w-auto", ocultoNoCorte: "@3xl:hidden @6xl:block", none: "@3xl:flex-none", subOculto: "hidden @3xl:flex" }
    : { contents: "@4xl:contents", auto: "@4xl:w-auto", ocultoNoCorte: "@4xl:hidden @6xl:block", none: "@4xl:flex-none", subOculto: "hidden @4xl:flex" };

  return (
    <div
      className={`flex flex-wrap items-center border-b border-borda hover:bg-sutil ${modoProjeto ? GRID_PROJETO : GRID_LISTA} ${sub ? "bg-sutil/60" : ""} ${fantasma ? "opacity-40" : ""}`}
    >
      {modoProjeto && <div className="flex size-7 items-center justify-center @3xl:size-5">{alca}</div>}
      <div className={`flex size-7 items-center justify-center @3xl:size-6 ${sub ? c.subOculto : ""}`}>
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
      <div
        onPointerDown={arrastarPeloTitulo}
        className={`flex min-w-0 flex-1 items-center gap-2 ${c.none} ${sub ? "pl-4" : ""} ${
          arrastarPeloTitulo ? "cursor-grab active:cursor-grabbing [&_a]:cursor-grab! [&_a]:active:cursor-grabbing!" : ""
        }`}
      >
        <CelulaTitulo id={t.id} valor={t.titulo} href={href} riscado={t.status === "concluida"} />
        <Progresso feitas={feitas} total={t.subtarefas.length} />
      </div>

      <div className={`flex basis-full flex-wrap items-start gap-x-2 gap-y-0 pb-2 pl-9 ${c.contents}`}>
        {!modoProjeto && (
          <div className={`w-full sm:w-52 ${c.auto}`}>
            {sub ? (
              <span aria-hidden="true" />
            ) : (
              <CelulaProjeto id={t.id} valor={t.projeto_id ?? ""} comites={comites} projetos={projetos} comiteFiltro={t.comite_slug} />
            )}
          </div>
        )}
        <div className={`w-36 ${c.ocultoNoCorte} ${c.auto}`}>
          <CelulaPessoa id={t.id} chave="solicitante_id" valor={t.solicitante_id ?? ""} membros={membros} rotulo="Solicitante" />
        </div>
        <div className={`w-36 ${c.auto}`}>
          <CelulaPessoa id={t.id} chave="responsavel_id" valor={t.responsavel_id ?? ""} membros={membros} rotulo="Executor" />
        </div>
        <div className={`w-36 ${c.auto}`}>
          <CelulaOpcao id={t.id} chave="status" valor={t.status} opcoes={STATUS_OPCOES} rotulo="Status" />
        </div>
        <div className={`w-28 ${c.auto}`}>
          <CelulaOpcao id={t.id} chave="prioridade" valor={t.prioridade ?? ""} opcoes={PRIORIDADE_OPCOES} rotulo="Prioridade" />
        </div>
        <div className="flex items-center gap-0.5">
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

function Corpo(props: Omit<LinhaProps, "expansor" | "sub">) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Linha {...props} expansor={{ aberto, alternar: () => setAberto((v) => !v) }} />
      {aberto && props.t.subtarefas.map((s) => <Linha key={s.id} {...props} t={s} sub alca={undefined} arrastarPeloTitulo={undefined} fantasma={false} />)}
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
            className="flex size-7 cursor-grab touch-none items-center justify-center text-suave hover:bg-inverso hover:text-sobre-inverso active:cursor-grabbing @3xl:size-5"
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
  const cabecalho = modoProjeto
    ? "@3xl:grid @3xl:grid-cols-[20px_24px_minmax(160px,1fr)_120px_96px_84px_212px] @6xl:grid-cols-[20px_24px_minmax(160px,1fr)_108px_120px_96px_84px_212px] @3xl:gap-x-1"
    : "@4xl:grid @4xl:grid-cols-[24px_minmax(160px,1fr)_130px_120px_96px_84px_212px] @6xl:grid-cols-[24px_minmax(160px,1fr)_130px_108px_120px_96px_84px_212px] @4xl:gap-x-1";
  const mostrar = modoProjeto ? "@3xl:grid" : "@4xl:grid";

  const itens = tarefas.map((t) => {
    const props = { t, membros, comites, projetos, hoje, qs, caminho, grupos };
    return arrastavel ? <ItemArrastavel key={t.id} {...props} /> : <ItemFixo key={t.id} {...props} />;
  });

  return (
    // Rolagem horizontal só aparece se mesmo assim não couber, e com barra fina.
    <div className="@container overflow-x-auto [scrollbar-width:thin]">
      <div
        aria-hidden="true"
        className={`hidden border-b border-borda-forte pb-1 rotulo text-[10px] text-suave ${mostrar} ${cabecalho}`}
      >
        {modoProjeto && <span />}
        <span />
        <span>Tarefa</span>
        {!modoProjeto && <span className="pl-1.5">Projeto</span>}
        <span className="hidden pl-1.5 @6xl:block">Solicitante</span>
        <span className="pl-1.5">Executor</span>
        <span>Status</span>
        <span>Prioridade</span>
        <span>Início → Entrega</span>
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
  );
}
