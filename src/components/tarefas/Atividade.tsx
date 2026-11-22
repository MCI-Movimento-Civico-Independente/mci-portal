"use client";

import { TbTrash } from "react-icons/tb";
import { useActionState, useState } from "react";
import { comentarAction, excluirComentarioAction, type EstadoForm } from "@/app/org/tarefas/acoes";
import { Botao } from "@/components/ui/Botao";
import { campo } from "./estilos";

export type ComentarioView = { id: string; texto: string; quando: string; autor: string; autorId: string | null };
export type EventoView = { id: string; quando: string; autor: string; frase: string };

function Avatar({ nome }: { nome: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-marca-suave text-xs font-semibold text-marca-texto"
    >
      {nome[0]?.toUpperCase()}
    </span>
  );
}

/** Comentários e histórico da tarefa. Os textos de data chegam prontos do servidor. */
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
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(comentarAction.bind(null, tarefaId), {});

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
          <ul className="flex flex-col gap-4">
            {comentarios.map((c) => (
              <li key={c.id} className="flex gap-3">
                <Avatar nome={c.autor} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-bold">{c.autor}</span>
                    <span className="text-[11px] text-suave">{c.quando}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-snug">{c.texto}</p>
                </div>
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
                      className="flex size-11 items-center justify-center rounded-lg text-suave hover:bg-marca-suave hover:text-marca-texto"
                    >
                      <TbTrash size={16} aria-hidden="true" />
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>

          <form key={estado.n ?? 0} action={acao} className="flex flex-col gap-2 border-t border-borda pt-4">
            <label htmlFor="comentario" className="text-sm font-bold">
              Novo comentário
            </label>
            <textarea
              id="comentario"
              name="texto"
              required
              rows={3}
              maxLength={4000}
              placeholder="Escreva uma atualização, dúvida ou decisão"
              className={`${campo} py-2`}
            />
            {estado.erro && (
              <p role="alert" className="text-sm font-bold text-marca-texto">
                {estado.erro}
              </p>
            )}
            <div>
              <Botao type="submit" disabled={pendente}>
                {pendente ? "Enviando…" : "Comentar"}
              </Botao>
            </div>
          </form>
        </div>
      ) : (
        <div role="tabpanel" className="mt-4">
          {historico.length === 0 ? (
            <p className="text-[15px] text-suave">Nada registrado ainda.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {historico.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <Avatar nome={e.autor} />
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
