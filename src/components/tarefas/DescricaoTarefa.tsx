"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { carregarDescricaoAction, salvarDescricaoRicaAction } from "@/app/org/tarefas/acoes";
import { ConteudoRico } from "@/components/editor/ConteudoRico";
import { documentoDeTexto, type Documento } from "@/lib/editor/documento";

const EditorRico = dynamic(() => import("@/components/editor/EditorRico").then((m) => m.EditorRico), {
  ssr: false,
  loading: () => <div className="h-24 animate-pulse bg-sutil" aria-busy="true" />,
});

/**
 * Descrição da tarefa (só tarefas; subtarefas usam os comentários). Começa mostrando o texto
 * que a lista já tem e troca pelo documento formatado (com as imagens assinadas) quando chega.
 */
export function DescricaoTarefa({ tarefaId, textoAtual }: { tarefaId: string; textoAtual: string | null }) {
  const [carregado, setCarregado] = useState<{ id: string; doc: Documento } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    carregarDescricaoAction(tarefaId).then((r) => {
      if (!ativo) return;
      if ("erro" in r) setErro(r.erro);
      else setCarregado({ id: tarefaId, doc: r.doc });
    });
    return () => {
      ativo = false;
    };
  }, [tarefaId]);

  const doc = carregado?.id === tarefaId ? carregado.doc : null;
  return (
    <section aria-labelledby="titulo-descricao">
      <h2 id="titulo-descricao" className="mb-1 text-sm font-bold">
        Descrição
      </h2>
      {doc ? (
        <EditorRico modo="descricao" tarefaId={tarefaId} valor={doc} obrigatorio aoSalvar={(novo) => salvarDescricaoRicaAction(tarefaId, novo)} />
      ) : erro ? (
        <p role="alert" className="text-sm font-bold text-marca-texto">
          {erro}
        </p>
      ) : (
        <div className="border-2 border-transparent px-3 py-2" aria-busy="true">
          <ConteudoRico doc={documentoDeTexto(textoAtual)} />
        </div>
      )}
    </section>
  );
}
