"use client";

import Link from "next/link";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import { closestCenter, DndContext, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import {
  TbArrowLeft,
  TbArrowRight,
  TbCalendar,
  TbCopy,
  TbDots,
  TbFile,
  TbLayoutKanban,
  TbPencil,
  TbPlus,
  TbTable,
  TbTimeline,
  TbTrash,
} from "react-icons/tb";
import { criarPaginaAction, duplicarAbaAction, excluirAbaAction, reordenarAbasAction } from "@/app/org/projetos/acoes-abas";
import { PAGINA } from "@/lib/limites";
import { esquecerPagina, salvarPendente } from "./controlador";
import { itemDeMenu, MenuSuspenso } from "./MenuSuspenso";
import { lerErroDeTitulo, lerTitulos, ouvirTitulos, renomear, tituloDoServidor } from "./titulos";

type AbaDaBarra = { id: string; titulo: string };

const VAZIO: Record<string, string> = {};
const aba = "flex min-h-11 items-center gap-2 whitespace-nowrap border-b-[3px] text-sm select-none";
const abaAtiva = "border-texto font-bold text-texto";
const abaInativa = "border-transparent text-suave hover:text-texto";

function ItemAba({
  a,
  titulo,
  href,
  ativa,
  primeira,
  ultima,
  acoes,
}: {
  a: AbaDaBarra;
  titulo: string;
  href: string;
  ativa: boolean;
  primeira: boolean;
  ultima: boolean;
  acoes: { duplicar: () => void; excluir: () => void; mover: (passo: -1 | 1) => void };
}) {
  const [editando, setEditando] = useState<string | null>(null);
  const cancelado = useRef(false);
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: a.id, disabled: editando !== null });

  const comecar = () => {
    cancelado.current = false;
    setEditando(titulo);
  };
  const concluir = () => {
    if (!cancelado.current && editando?.trim()) renomear(a.id, editando.trim());
    setEditando(null);
  };

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...listeners}
      className={`group flex shrink-0 items-center ${isDragging ? "relative z-10 bg-sutil" : ""}`}
    >
      {editando !== null ? (
        <span className={`${aba} ${abaAtiva} px-3`}>
          <input
            autoFocus
            aria-label="Nome da página"
            value={editando}
            maxLength={PAGINA.tituloMaxCaracteres}
            onFocus={(e) => e.target.select()}
            onChange={(e) => setEditando(e.target.value)}
            onBlur={concluir}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                cancelado.current = true;
                e.currentTarget.blur();
              }
            }}
            className="w-44 border border-texto bg-menu px-1.5 py-0.5 text-sm font-normal [field-sizing:content]"
          />
        </span>
      ) : (
        <Link
          href={href}
          draggable={false}
          aria-current={ativa ? "page" : undefined}
          onDoubleClick={comecar}
          title="Duplo clique renomeia; arraste para mudar a ordem"
          // Durante o arrasto o link não recebe o clique de soltar.
          className={`${aba} ${ativa ? abaAtiva : abaInativa} pl-3 pr-1 ${isDragging ? "pointer-events-none" : ""}`}
        >
          <TbFile size={15} aria-hidden="true" />
          <span className="max-w-48 truncate">{titulo}</span>
        </Link>
      )}
      <span onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
        <MenuSuspenso
          rotulo={`Opções da aba ${titulo}`}
          botao={<TbDots size={15} aria-hidden="true" />}
          className={`flex size-8 items-center justify-center text-suave hover:bg-inverso hover:text-sobre-inverso ${
            ativa ? "" : "md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
          }`}
        >
          {(fechar) => {
            const item = (rotulo: string, Icone: typeof TbCopy, aoClicar: () => void, desligado = false, perigo = false) => (
              <button
                type="button"
                disabled={desligado}
                onClick={() => {
                  fechar();
                  aoClicar();
                }}
                className={`${itemDeMenu} ${perigo ? "text-marca-texto" : ""}`}
              >
                <Icone size={16} aria-hidden="true" />
                {rotulo}
              </button>
            );
            return (
              <>
                {item("Renomear", TbPencil, comecar)}
                {item("Duplicar", TbCopy, acoes.duplicar)}
                {item("Mover para a esquerda", TbArrowLeft, () => acoes.mover(-1), primeira)}
                {item("Mover para a direita", TbArrowRight, () => acoes.mover(1), ultima)}
                {item("Excluir", TbTrash, acoes.excluir, false, true)}
              </>
            );
          }}
        </MenuSuspenso>
      </span>
    </li>
  );
}

function ConfirmarExclusao({ titulo, aoConfirmar, aoCancelar }: { titulo: string; aoConfirmar: () => void; aoCancelar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={aoCancelar}
      aria-labelledby="titulo-excluir-aba"
      className="m-auto w-[min(100%-2rem,26rem)] border border-texto bg-menu p-5 text-texto backdrop:bg-black/60"
    >
      <h2 id="titulo-excluir-aba" className="font-titulo text-xl font-extrabold">
        Excluir a página?
      </h2>
      <p className="mt-2 text-sm">
        A aba <strong>{titulo}</strong> sai do projeto para todo mundo.
      </p>
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" onClick={() => ref.current?.close()} className="min-h-11 border-2 border-borda-forte px-4 text-sm font-bold hover:border-texto">
          Cancelar
        </button>
        <button
          type="button"
          onClick={aoConfirmar}
          className="min-h-11 border-2 border-absurdo bg-absurdo px-4 text-sm font-bold text-sobre-absurdo hover:border-texto"
        >
          Excluir
        </button>
      </div>
    </dialog>
  );
}

/** Abas do projeto: o quadro (fixo, sempre o primeiro) e as páginas. */
export function AbasProjeto({ projetoId, abas }: { projetoId: string; abas: AbaDaBarra[] }) {
  const router = useRouter();
  const ativa = useSelectedLayoutSegment();
  const base = `/org/projetos/${projetoId}`;
  const titulos = useSyncExternalStore(ouvirTitulos, lerTitulos, () => VAZIO);
  const erroTitulo = useSyncExternalStore(ouvirTitulos, lerErroDeTitulo, () => null);
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<AbaDaBarra | null>(null);
  const [pendente, iniciar] = useTransition();

  const doServidor = abas.map((a) => a.id).join();
  const [ordem, setOrdem] = useState(() => abas.map((a) => a.id));
  const [origem, setOrigem] = useState(doServidor);
  if (origem !== doServidor) {
    setOrigem(doServidor);
    setOrdem(abas.map((a) => a.id));
  }
  useEffect(() => {
    abas.forEach((a) => tituloDoServidor(a.id, a.titulo));
  }, [abas]);

  const porId = new Map(abas.map((a) => [a.id, a]));
  const lista = ordem.map((id) => porId.get(id)).filter((a): a is AbaDaBarra => !!a);
  const nome = (a: AbaDaBarra) => titulos[a.id] ?? a.titulo;

  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // No toque, segurar arrasta; deslizar continua rolando as abas.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  function reordenar(nova: string[]) {
    setOrdem(nova);
    setErro(null);
    iniciar(async () => {
      const r = await reordenarAbasAction(projetoId, nova);
      if (r.erro) {
        setErro(r.erro);
        setOrdem(abas.map((a) => a.id));
      }
    });
  }
  function aoSoltar({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const de = ordem.indexOf(String(active.id));
    const para = ordem.indexOf(String(over.id));
    if (de >= 0 && para >= 0) reordenar(arrayMove(ordem, de, para));
  }

  function abrirNova(acao: () => Promise<{ erro?: string; id?: string }>) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if (r.erro) setErro(r.erro);
      else if (r.id) router.push(`${base}/${r.id}`);
    });
  }

  function excluir(alvo: AbaDaBarra) {
    setExcluindo(null);
    setErro(null);
    iniciar(async () => {
      await salvarPendente(alvo.id);
      // Sai da página antes de apagá-la, para não cair em "não encontrada".
      if (ativa === alvo.id) router.push(base);
      const r = await excluirAbaAction(alvo.id);
      if (r.erro) setErro(r.erro);
      else esquecerPagina(alvo.id);
    });
  }

  return (
    <div>
      <nav aria-label="Abas do projeto" className="flex items-stretch overflow-x-auto border-b border-borda [scrollbar-width:none]">
        <Link href={base} aria-current={ativa === null ? "page" : undefined} className={`${aba} shrink-0 px-3 ${ativa === null ? abaAtiva : abaInativa}`}>
          <TbLayoutKanban size={15} aria-hidden="true" />
          Quadro principal
        </Link>
        <DndContext id={`abas-${projetoId}`} sensors={sensores} collisionDetection={closestCenter} onDragEnd={aoSoltar}>
          <SortableContext items={ordem} strategy={horizontalListSortingStrategy}>
            <ul className="flex items-stretch">
              {lista.map((a, i) => (
                <ItemAba
                  key={a.id}
                  a={a}
                  titulo={nome(a)}
                  href={`${base}/${a.id}`}
                  ativa={ativa === a.id}
                  primeira={i === 0}
                  ultima={i === lista.length - 1}
                  acoes={{
                    duplicar: () =>
                      abrirNova(async () => {
                        await salvarPendente(a.id);
                        return duplicarAbaAction(a.id);
                      }),
                    excluir: () => setExcluindo(a),
                    mover: (passo) => reordenar(arrayMove(ordem, ordem.indexOf(a.id), ordem.indexOf(a.id) + passo)),
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        <MenuSuspenso
          rotulo="Nova aba"
          botao={<TbPlus size={17} aria-hidden="true" />}
          className="flex size-11 shrink-0 items-center justify-center hover:bg-inverso hover:text-sobre-inverso"
        >
          {(fechar) => (
            <div className="w-64">
              <p className="rotulo px-3 py-2 text-suave">Nova aba</p>
              <button
                type="button"
                disabled={pendente}
                onClick={() => {
                  fechar();
                  abrirNova(() => criarPaginaAction(projetoId));
                }}
                className={itemDeMenu}
              >
                <TbFile size={17} aria-hidden="true" />
                <span className="flex-1">Página</span>
                <span className="rotulo text-[10px] font-bold">Disponível</span>
              </button>
              {[
                { rotulo: "Tabela de tarefas", icone: TbTable },
                { rotulo: "Calendário", icone: TbCalendar },
                { rotulo: "Cronograma", icone: TbTimeline },
              ].map(({ rotulo, icone: Icone }) => (
                <button key={rotulo} type="button" disabled className={itemDeMenu}>
                  <Icone size={17} aria-hidden="true" />
                  <span className="flex-1">{rotulo}</span>
                  <span className="rotulo text-[10px]">Em breve</span>
                </button>
              ))}
            </div>
          )}
        </MenuSuspenso>
      </nav>
      {(erro ?? erroTitulo) && (
        <p role="alert" className="mt-2 text-sm font-bold text-marca-texto">
          {erro ?? erroTitulo}
        </p>
      )}
      {excluindo && <ConfirmarExclusao titulo={nome(excluindo)} aoCancelar={() => setExcluindo(null)} aoConfirmar={() => excluir(excluindo)} />}
    </div>
  );
}
