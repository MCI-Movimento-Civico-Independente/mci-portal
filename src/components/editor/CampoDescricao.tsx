"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { documentoDeTexto, estaVazio, type Documento } from "@/lib/editor/documento";

const EditorRico = dynamic(() => import("./EditorRico").then((m) => m.EditorRico), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse border-2 border-borda bg-sutil" aria-busy="true" />,
});

/**
 * Descrição de um formulário de tarefa nova, com a mesma formatação dos comentários.
 * A tarefa ainda não existe, então o id dela nasce aqui: as imagens sobem para a pasta desse id
 * e o servidor cria a tarefa com ele (campos `tarefa_id` e `descricao_doc`).
 */
export function CampoDescricao({ placeholder }: { placeholder?: string }) {
  const [tarefaId] = useState(() => crypto.randomUUID());
  const [doc, setDoc] = useState<Documento>(() => documentoDeTexto(null));
  const [imagens, setImagens] = useState<"carregando" | "erro" | null>(null);
  const guarda = useRef<HTMLInputElement>(null);

  const motivo = estaVazio(doc)
    ? "Escreva a descrição da tarefa."
    : imagens === "carregando"
      ? "Espere a imagem terminar de subir."
      : imagens === "erro"
        ? "Tente de novo ou remova a imagem com erro."
        : "";
  useEffect(() => {
    guarda.current?.setCustomValidity(motivo);
  }, [motivo]);

  return (
    <div className="relative">
      <input type="hidden" name="tarefa_id" value={tarefaId} />
      <input type="hidden" name="descricao_doc" value={JSON.stringify(doc)} />
      <EditorRico
        modo="campo"
        tarefaId={tarefaId}
        valor={null}
        placeholder={placeholder}
        aoSalvar={async () => ({})}
        aoMudar={(novo, pendentes) => {
          setDoc(novo);
          setImagens(pendentes);
        }}
      />
      {/* Barra o envio (com a mensagem do navegador) enquanto a descrição estiver vazia ou com imagem pendente. */}
      <input
        ref={guarda}
        aria-hidden="true"
        tabIndex={-1}
        required
        readOnly
        value={motivo ? "" : "ok"}
        className="pointer-events-none absolute bottom-0 left-1/2 h-px w-px opacity-0"
      />
    </div>
  );
}
