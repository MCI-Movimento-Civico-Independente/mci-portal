"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useEffect, useState, useTransition } from "react";
import { moverTarefaAction } from "@/app/org/tarefas/acoes";
import { TabelaTarefas } from "@/components/tarefas/TabelaTarefas";
import type { GrupoBasico } from "@/lib/grupos-tipos";
import type { ComiteBasico, ProjetoBasico } from "@/lib/organizacao";
import type { Pessoa, TarefaDb } from "@/lib/tarefas";
import { BotaoNovoGrupo } from "./FormGrupo";
import { GrupoRecolhivel } from "./GrupoRecolhivel";

type Itens = Record<string, string[]>;
const PREFIXO = "grupo:";

/** Ids das tarefas de cada grupo, na ordem manual (ordem, depois criação). */
function distribuir(grupos: GrupoBasico[], tarefas: TarefaDb[]): Itens {
  const itens: Itens = Object.fromEntries(grupos.map((g) => [g.id, [] as string[]]));
  const ordenadas = [...tarefas].sort((a, b) => a.ordem - b.ordem || (a.criado_em < b.criado_em ? -1 : 1));
  for (const t of ordenadas) if (t.grupo_id && itens[t.grupo_id]) itens[t.grupo_id].push(t.id);
  return itens;
}

/**
 * Grupos do projeto com arrastar e soltar: reordena dentro do grupo e leva a tarefa
 * para outro grupo. A tela muda na hora; se o servidor recusar, volta ao que era.
 */
export function QuadroGrupos({
  projetoId,
  grupos,
  tarefas,
  membros,
  comites,
  projetos,
  hoje,
  caminho,
}: {
  projetoId: string;
  grupos: GrupoBasico[];
  tarefas: TarefaDb[];
  membros: Pessoa[];
  comites: ComiteBasico[];
  projetos: ProjetoBasico[];
  hoje: string;
  caminho: string;
}) {
  const [itens, setItens] = useState<Itens>(() => distribuir(grupos, tarefas));
  const [origem, setOrigem] = useState({ grupos, tarefas });
  const [ativoId, setAtivoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  // Dados novos do servidor substituem o estado local (ajuste durante a renderização).
  if (origem.grupos !== grupos || origem.tarefas !== tarefas) {
    setOrigem({ grupos, tarefas });
    setItens(distribuir(grupos, tarefas));
  }

  // Durante o arrasto, o cursor é a mãozinha fechada em qualquer lugar da tela.
  useEffect(() => {
    if (!ativoId) return;
    document.body.classList.add("arrastando");
    return () => document.body.classList.remove("arrastando");
  }, [ativoId]);

  const porId = new Map(tarefas.map((t) => [t.id, t]));
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const grupoDe = (id: string, estado: Itens) =>
    id.startsWith(PREFIXO) ? id.slice(PREFIXO.length) : Object.keys(estado).find((g) => estado[g].includes(id));

  function aoIniciar(e: DragStartEvent) {
    setErro(null);
    setAtivoId(String(e.active.id));
  }

  // Passando por cima de outro grupo, a tarefa já aparece nele.
  function aoPassar(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const de = grupoDe(String(active.id), itens);
    const para = grupoDe(String(over.id), itens);
    if (!de || !para || de === para) return;
    setItens((atual) => {
      const alvo = atual[para];
      const indiceSobre = alvo.indexOf(String(over.id));
      const indice = indiceSobre >= 0 ? indiceSobre : alvo.length;
      return {
        ...atual,
        [de]: atual[de].filter((id) => id !== String(active.id)),
        [para]: [...alvo.slice(0, indice), String(active.id), ...alvo.slice(indice)],
      };
    });
  }

  function aoSoltar(e: DragEndEvent) {
    setAtivoId(null);
    const { active, over } = e;
    const id = String(active.id);
    const antes = origem.tarefas.find((t) => t.id === id);
    if (!over || !antes) {
      setItens(distribuir(grupos, tarefas));
      return;
    }
    const grupo = grupoDe(id, itens);
    if (!grupo) return;

    let final = itens[grupo];
    const sobre = String(over.id);
    if (!sobre.startsWith(PREFIXO) && sobre !== id && final.includes(sobre)) {
      const de = final.indexOf(id);
      const para = final.indexOf(sobre);
      if (de >= 0 && para >= 0) final = arrayMove(final, de, para);
    }
    const proximo = final[final.indexOf(id) + 1] ?? null;
    const novo = { ...itens, [grupo]: final };
    setItens(novo);

    // Nada mudou: não chama o servidor.
    const antigoGrupo = antes.grupo_id;
    const antigaLista = distribuir(grupos, tarefas)[grupo] ?? [];
    if (antigoGrupo === grupo && antigaLista.join() === final.join()) return;

    iniciar(async () => {
      const r = await moverTarefaAction(id, grupo, proximo);
      if (r.erro) {
        setErro(r.erro);
        setItens(distribuir(grupos, tarefas));
      }
    });
  }

  const ativa = ativoId ? porId.get(ativoId) : null;
  const hrefNova = (grupoId: string) => `${caminho}?nova=1&grupo=${grupoId}`;

  return (
    <div className="flex flex-col gap-4">
      {erro && (
        <p role="alert" className="border-2 border-absurdo bg-superficie p-3 text-sm font-bold text-absurdo">
          {erro}
        </p>
      )}
      <DndContext
        id={`quadro-${projetoId}`}
        sensors={sensores}
        collisionDetection={closestCorners}
        onDragStart={aoIniciar}
        onDragOver={aoPassar}
        onDragEnd={aoSoltar}
        onDragCancel={() => {
          setAtivoId(null);
          setItens(distribuir(grupos, tarefas));
        }}
      >
        {grupos.map((g, i) => {
          const lista = (itens[g.id] ?? []).map((id) => porId.get(id)).filter((t): t is TarefaDb => !!t);
          const feitas = lista.filter((t) => t.status === "concluida").length;
          return (
            <GrupoRecolhivel
              key={g.id}
              grupo={g}
              total={lista.length}
              feitas={feitas}
              hrefNovaTarefa={hrefNova(g.id)}
              primeiro={i === 0}
              ultimo={i === grupos.length - 1}
              podeExcluir={grupos.length > 1}
            >
              {lista.length === 0 && <p className="px-2 py-2 text-sm text-suave">Nenhuma tarefa. Arraste uma para cá ou use “+ Tarefa”.</p>}
              <TabelaTarefas
                tarefas={lista}
                membros={membros}
                comites={comites}
                projetos={projetos}
                grupos={grupos}
                grupoId={g.id}
                hoje={hoje}
                qs=""
                caminho={caminho}
              />
            </GrupoRecolhivel>
          );
        })}
        <DragOverlay dropAnimation={null}>
          {ativa && (
            <div className="border-2 border-inverso bg-superficie px-3 py-2 text-sm font-bold">{ativa.titulo}</div>
          )}
        </DragOverlay>
      </DndContext>
      {grupos.length === 0 && <p className="px-1 text-[15px] text-suave">Este projeto ainda não tem grupos. Adicione o primeiro abaixo.</p>}
      <BotaoNovoGrupo projetoId={projetoId} />
    </div>
  );
}
