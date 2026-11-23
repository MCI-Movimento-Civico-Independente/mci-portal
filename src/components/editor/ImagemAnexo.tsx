"use client";

import Image, { type ImageOptions } from "@tiptap/extension-image";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useState } from "react";
import { TbAlertTriangle, TbLoader2 } from "react-icons/tb";
import type { TipoAnexo } from "@/lib/editor/documento";
import { Lightbox } from "./Lightbox";
import { repetirEnvio } from "./upload";

function ImagemView({ node, editor, extension, deleteNode }: NodeViewProps) {
  const [ampliada, setAmpliada] = useState(false);
  const { src, alt, estado, uploadId, erroMsg } = node.attrs as {
    src: string | null;
    alt: string | null;
    estado: "carregando" | "erro" | null;
    uploadId: string | null;
    erroMsg: string | null;
  };
  const { tipo, tarefaId } = extension.options as { tipo: TipoAnexo; tarefaId: string };

  return (
    <NodeViewWrapper className="imagem-anexo my-2" data-drag-handle>
      {estado === "erro" ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 border-2 border-absurdo bg-superficie p-3 text-sm">
          <TbAlertTriangle size={18} aria-hidden="true" className="shrink-0 text-absurdo" />
          <span className="min-w-0 flex-1 font-bold">{erroMsg ?? "Não deu para enviar a imagem."}</span>
          {uploadId && (
            <button
              type="button"
              onClick={() => repetirEnvio(editor, uploadId, tipo, tarefaId)}
              className="rotulo min-h-8 border-2 border-inverso px-3 text-[11px] font-bold hover:bg-inverso hover:text-sobre-inverso"
            >
              Tentar de novo
            </button>
          )}
          <button type="button" onClick={deleteNode} className="rotulo min-h-8 px-2 text-[11px] text-suave hover:text-marca-texto">
            Remover
          </button>
        </div>
      ) : src ? (
        <span className="relative inline-block max-w-full">
          <button
            type="button"
            disabled={estado === "carregando"}
            onClick={() => setAmpliada(true)}
            aria-label={`Ampliar imagem${alt ? `: ${alt}` : ""}`}
            className="block max-w-full cursor-zoom-in disabled:cursor-progress"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada, blob local ou imagem externa */}
            <img src={src} alt={alt ?? ""} loading="lazy" referrerPolicy="no-referrer" className={`max-h-96 max-w-full ${estado === "carregando" ? "opacity-50" : ""}`} />
          </button>
          {estado === "carregando" && (
            <span role="status" className="rotulo absolute inset-0 flex items-center justify-center gap-2 bg-fundo/40 text-[11px] font-bold">
              <TbLoader2 size={18} aria-hidden="true" className="animate-spin" />
              Enviando…
            </span>
          )}
        </span>
      ) : (
        <span className="text-sm text-suave">Imagem indisponível.</span>
      )}
      {ampliada && src && <Lightbox src={src} alt={alt ?? ""} aoFechar={() => setAmpliada(false)} />}
    </NodeViewWrapper>
  );
}

/**
 * Imagem do documento. No JSON ficam o `path` do Storage (ou o `src` https de imagens externas);
 * `estado`, `uploadId` e `erroMsg` só existem enquanto a imagem sobe.
 */
export const ImagemAnexo = Image.extend<ImageOptions & { tipo: TipoAnexo; tarefaId: string }>({
  addOptions() {
    return { ...this.parent?.(), tipo: "tarefa", tarefaId: "" } as ImageOptions & { tipo: TipoAnexo; tarefaId: string };
  },
  addAttributes() {
    return {
      ...this.parent?.(),
      path: { default: null, rendered: false },
      estado: { default: null, rendered: false },
      uploadId: { default: null, rendered: false },
      erroMsg: { default: null, rendered: false },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImagemView);
  },
});
