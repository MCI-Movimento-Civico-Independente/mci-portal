"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { TbPencil, TbTrash } from "react-icons/tb";
import { comentarAction, editarComentarioAction, excluirComentarioAction } from "@/app/org/tarefas/acoes";
import { ConteudoRico } from "@/components/editor/ConteudoRico";
import { Avatar } from "@/components/ui/Avatar";
import type { Documento } from "@/lib/editor/documento";

// O editor só é baixado quando a janela da tarefa abre, e nunca na leitura dos comentários.
const EditorRico = dynamic(() => import("@/components/editor/EditorRico").then((m) => m.EditorRico), {
  ssr: false,
  loading: () => <div className="h-36 animate-pulse border-2 border-borda bg-sutil" aria-busy="true" />,
});

export type ComentarioView = {
  id: string;
  doc: Documento;
  /** "há 5 min" (calculado ao carregar) e a data completa, para o title. */
  relativo: string;
  quando: string;
  editado: boolean;
  autor: string;
  autorId: string | null;
  /** "Nível 3 · Articulador" */
  nivel: string | null;
};
export type EventoView = { id: string; quando: string; autor: string; frase: string };

/** Comentários (texto rico) e histórico da tarefa. Os textos de data chegam prontos do servidor. */
export function Atividade({
  tarefaId,
  comentarios,
  historico,
  euId,
  souAdmin,
}: {
  tarefaId: string;
  comentarios: ComentarioView[];
  historico: EventoView[];
  euId: string;
  souAdmin: boolean;
}) {
  const [aba, setAba] = useState<"comentarios" | "historico">("comentarios");
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const botaoAba = (id: typeof aba, rotulo: string, total: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={aba === id}
      onClick={() => setAba(id)}
      className={`min-h-11 border-b-2 px-4 text-sm font-bold ${
        aba === id ? "border-marca text-texto" : "border-transparent text-suave hover:text-texto"
      }`}
    >
      {rotulo} <span className="text-[11px]">{total}</span>
    </button>
  );

  return (
    <section aria-labelledby="titulo-atividade">
      <h2 id="titulo-atividade" className="text-xl font-semibold">
        Atividade
      </h2>
      <div role="tablist" className="mt-2 flex border-b border-borda">
        {botaoAba("comentarios", "Comentários", comentarios.length)}
        {botaoAba("historico", "Histórico", historico.length)}
      </div>

      {aba === "comentarios" ? (
        <div role="tabpanel" className="mt-4 flex flex-col gap-4">
          {comentarios.length === 0 && <p className="text-[15px] text-suave">Nenhum comentário ainda. Comece a conversa.</p>}
          <ul className="flex flex-col gap-5">
            {comentarios.map((c) => (
              <li key={c.id} className="flex gap-3">
                <Avatar pessoa={{ id: c.autorId ?? c.id, nome: c.autor }} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-bold">{c.autor}</span>
                    {c.nivel && <span className="rotulo text-[10px] text-marca-texto">{c.nivel}</span>}
                    <time title={c.quando} className="text-[11px] text-suave">
                      {c.relativo}
                    </time>
                    {c.editado && <span className="text-[11px] text-suave">(editado)</span>}
                  </p>
                  {editandoId === c.id ? (
                    <div className="mt-2">
                      <EditorRico
                        modo="comentario"
                        tarefaId={tarefaId}
                        valor={c.doc}
                        rotuloEnviar="Salvar"
                        autoFoco
                        aoSalvar={(doc) => editarComentarioAction(c.id, tarefaId, doc)}
                        aoTerminar={() => setEditandoId(null)}
                        aoCancelar={() => setEditandoId(null)}
                      />
                    </div>
                  ) : (
                    <ConteudoRico doc={c.doc} className="mt-1" />
                  )}
                </div>
                {editandoId !== c.id && (
                  <div className="flex shrink-0">
                    {c.autorId === euId && (
                      <button
                        type="button"
                        aria-label="Editar comentário"
                        onClick={() => setEditandoId(c.id)}
                        className="flex size-11 items-center justify-center text-suave hover:bg-sutil hover:text-texto"
                      >
                        <TbPencil size={16} aria-hidden="true" />
                      </button>
                    )}
                    {(c.autorId === euId || souAdmin) && (
                      <form
                        action={excluirComentarioAction.bind(null, c.id)}
                        onSubmit={(e) => {
                          if (!window.confirm("Excluir este comentário?")) e.preventDefault();
                        }}
                      >
                        <button
                          type="submit"
                          aria-label="Excluir comentário"
                          className="flex size-11 items-center justify-center text-suave hover:bg-marca-suave hover:text-marca-texto"
                        >
                          <TbTrash size={16} aria-hidden="true" />
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-2 border-t border-borda pt-4">
            <p className="text-sm font-bold">Novo comentário</p>
            <EditorRico modo="comentario" tarefaId={tarefaId} valor={null} limparAoEnviar aoSalvar={(doc) => comentarAction(tarefaId, doc)} />
          </div>
        </div>
      ) : (
        <div role="tabpanel" className="mt-4">
          {historico.length === 0 ? (
            <p className="text-[15px] text-suave">Nada registrado ainda.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {historico.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <Avatar pessoa={{ id: e.id, nome: e.autor }} />
                  <p className="min-w-0 flex-1 leading-snug">
                    <span className="font-bold">{e.autor}</span> {e.frase}
                    <span className="ml-2 text-[11px] text-suave">{e.quando}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
