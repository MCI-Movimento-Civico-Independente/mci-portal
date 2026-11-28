"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useRef, useState, useTransition, type PointerEvent, type ReactNode } from "react";
import { TbGripVertical, TbX } from "react-icons/tb";
import { anunciarXp } from "@/components/org/avisos-xp";
import { atualizarEmMassaAction, moverSubtarefaAction } from "@/app/org/tarefas/acoes";
import type { Pessoa, TarefaDb } from "@/lib/tarefas";
import { STATUS_OPCOES } from "@/lib/tarefas-campos";
import { CelulaPeriodo } from "./CelulaPeriodo";
import { CelulaPessoa } from "./CelulaPessoa";

export type ArgsLinhaSub = {
  /** Alça (⋮⋮) de arrastar. */
  alca: ReactNode;
  /** Para a área do título também arrastar a linha. */
  arrastarPeloTitulo: (e: PointerEvent) => void;
  marcado: boolean;
  alternar: () => void;
  fantasma: boolean;
};

function Item({ id, children }: { id: string; children: (a: Pick<ArgsLinhaSub, "alca" | "arrastarPeloTitulo" | "fantasma">) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={isDragging ? "relative z-10" : ""}>
      {children({
        fantasma: isDragging,
        arrastarPeloTitulo: (e) => {
          // Campo de texto aberto (editar assunto): o mouse seleciona texto, não arrasta.
          if ((e.target as HTMLElement).closest("input, textarea, select")) return;
          listeners?.onPointerDown?.(e);
        },
        alca: (
          <button
            type="button"
            ref={setActivatorNodeRef}
            aria-label="Arrastar a subtarefa"
            title="Arrastar para mudar a posição"
            {...attributes}
            {...listeners}
            className="flex size-5 cursor-grab touch-none items-center justify-center text-suave hover:bg-inverso hover:text-sobre-inverso active:cursor-grabbing"
          >
            <TbGripVertical size={14} aria-hidden="true" />
          </button>
        ),
      })}
    </div>
  );
}

/**
 * Subtarefas de uma tarefa: reordenáveis arrastando, com seleção de várias e uma barra de
 * ações em massa (status, executor, solicitante e período). O desenho de cada linha vem de fora.
 */
export function SubtarefasOrdenaveis({
  paiId,
  subtarefas,
  membros,
  hoje,
  renderLinha,
}: {
  paiId: string;
  subtarefas: TarefaDb[];
  membros: Pessoa[];
  hoje: string;
  renderLinha: (s: TarefaDb, a: ArgsLinhaSub) => ReactNode;
}) {
  const doServidor = subtarefas.map((s) => s.id);
  const [ordem, setOrdem] = useState(doServidor);
  const [origem, setOrigem] = useState(subtarefas);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const todas = useRef<HTMLInputElement>(null);

  // Dados novos do servidor substituem a ordem local; some da seleção quem não existe mais.
  if (origem !== subtarefas) {
    setOrigem(subtarefas);
    setOrdem(doServidor);
    setMarcadas((atual) => new Set([...atual].filter((id) => doServidor.includes(id))));
  }

  const porId = new Map(subtarefas.map((s) => [s.id, s]));
  const ids = ordem.filter((id) => marcadas.has(id));
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (todas.current) todas.current.indeterminate = marcadas.size > 0 && marcadas.size < ordem.length;
  }, [marcadas, ordem.length]);

  function aoSoltar(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const de = ordem.indexOf(String(active.id));
    const para = ordem.indexOf(String(over.id));
    if (de < 0 || para < 0) return;
    const nova = arrayMove(ordem, de, para);
    setOrdem(nova);
    setErro(null);
    const proximo = nova[nova.indexOf(String(active.id)) + 1] ?? null;
    iniciar(async () => {
      const r = await moverSubtarefaAction(String(active.id), proximo);
      if (r.erro) {
        setErro(r.erro);
        setOrdem(doServidor);
      }
    });
  }

  function alternar(id: string) {
    setMarcadas((atual) => {
      const novo = new Set(atual);
      if (!novo.delete(id)) novo.add(id);
      return novo;
    });
  }

  function aplicarStatus(valor: string) {
    if (!valor) return;
    setErro(null);
    iniciar(async () => {
      const r = await atualizarEmMassaAction(ids, { tipo: "status", valor });
      if (r.erro) setErro(r.erro);
      anunciarXp(r.xp);
    });
  }

  const chaveBarra = ids.join(",");
  return (
    <div className="border-t border-borda @container">
      <div className="flex min-h-9 items-center gap-2 border-b border-borda px-2">
        <input
          ref={todas}
          type="checkbox"
          aria-label="Selecionar todas as subtarefas"
          checked={ordem.length > 0 && marcadas.size === ordem.length}
          onChange={(e) => setMarcadas(e.target.checked ? new Set(ordem) : new Set())}
          className="size-4 accent-marca"
        />
        <span className="rotulo text-[10px] text-suave">
          Subtarefas · {ordem.length}
          {pendente && " · salvando…"}
        </span>
      </div>

      {ids.length > 0 && (
        <div role="toolbar" aria-label="Ações para as subtarefas selecionadas" className="flex flex-wrap items-center gap-2 bg-bloco px-3 py-2 text-sobre-bloco">
          <span className="rotulo mr-1 text-[11px] font-bold">
            {ids.length} {ids.length === 1 ? "selecionada" : "selecionadas"}
          </span>
          <select
            aria-label="Mudar o status das selecionadas"
            value=""
            disabled={pendente}
            onChange={(e) => aplicarStatus(e.target.value)}
            className="rotulo min-h-11 border-2 border-sobre-bloco/40 bg-bloco px-2 text-[11px] font-bold text-sobre-bloco hover:bg-sobre-bloco hover:text-bloco md:min-h-8"
          >
            <option value="">Status…</option>
            {STATUS_OPCOES.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.rotulo}
              </option>
            ))}
          </select>
          <CelulaPessoa key={`e-${chaveBarra}`} id="" chave="responsavel_id" valor="" membros={membros} rotulo="Executor" massa={ids} />
          <CelulaPessoa key={`s-${chaveBarra}`} id="" chave="solicitante_id" valor="" membros={membros} rotulo="Solicitante" massa={ids} />
          <CelulaPeriodo key={`p-${chaveBarra}`} id="" inicio="" fim="" hoje={hoje} status="a_fazer" massa={ids} />
          <button
            type="button"
            onClick={() => setMarcadas(new Set())}
            className="rotulo ml-auto inline-flex min-h-11 items-center gap-1 px-2 text-[11px] hover:underline md:min-h-8"
          >
            <TbX size={13} aria-hidden="true" />
            Limpar seleção
          </button>
        </div>
      )}
      {erro && (
        <p role="alert" className="border-b border-borda px-3 py-1.5 text-xs font-bold text-marca-texto">
          {erro}
        </p>
      )}

      <DndContext id={`subtarefas-${paiId}`} sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
        <SortableContext items={ordem} strategy={verticalListSortingStrategy}>
          {ordem.map((id) => {
            const s = porId.get(id);
            if (!s) return null;
            return (
              <Item key={id} id={id}>
                {(a) => renderLinha(s, { ...a, marcado: marcadas.has(id), alternar: () => alternar(id) })}
              </Item>
            );
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
}
