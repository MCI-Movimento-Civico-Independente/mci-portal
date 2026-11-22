"use client";

import { useEffect, useState } from "react";
import { carregarAtividadeAction } from "@/app/org/tarefas/acoes";
import { Atividade, type ComentarioView, type EventoView } from "./Atividade";

type Dados = { comentarios: ComentarioView[]; historico: EventoView[] };

/**
 * Comentários e histórico carregam depois que a janela já abriu. `versao` muda quando a
 * tarefa é atualizada (novo comentário, edição de campo), e então a atividade é buscada de novo.
 */
export function AtividadeCarregavel({
  tarefaId,
  euId,
  souAdmin,
  versao,
}: {
  tarefaId: string;
  euId: string;
  souAdmin: boolean;
  versao: unknown;
}) {
  const [dados, setDados] = useState<{ id: string; valor: Dados } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    carregarAtividadeAction(tarefaId).then((r) => {
      if (!ativo) return;
      if ("erro" in r) setErro(r.erro);
      else {
        setErro(null);
        setDados({ id: tarefaId, valor: r });
      }
    });
    return () => {
      ativo = false;
    };
  }, [tarefaId, versao]);

  const atual = dados?.id === tarefaId ? dados.valor : null;
  if (!atual) {
    return (
      <section aria-labelledby="titulo-atividade" aria-busy={!erro}>
        <h2 id="titulo-atividade" className="text-xl font-semibold">
          Atividade
        </h2>
        {erro ? (
          <p role="alert" className="mt-3 text-sm font-bold text-marca-texto">
            {erro}
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3" aria-label="Carregando comentários">
            <div className="h-4 w-2/3 animate-pulse bg-sutil" />
            <div className="h-4 w-1/2 animate-pulse bg-sutil" />
            <div className="h-20 w-full animate-pulse bg-sutil" />
          </div>
        )}
      </section>
    );
  }
  return <Atividade tarefaId={tarefaId} euId={euId} souAdmin={souAdmin} comentarios={atual.comentarios} historico={atual.historico} />;
}
