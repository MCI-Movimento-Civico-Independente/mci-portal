"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Fragment, useRef, useState } from "react";
import { hrefSeguro, srcExternoSeguro, type TipoAnexo } from "@/lib/editor/documento";
import { BARRA, MENU_FLUTUANTE, type Ferramenta } from "./extensoes";
import { inserirImagens } from "./upload";

export type Painel = "link" | "imagem" | null;

const botao =
  "flex size-9 shrink-0 items-center justify-center text-texto hover:bg-sutil disabled:cursor-not-allowed disabled:opacity-35 aria-pressed:bg-inverso aria-pressed:text-sobre-inverso md:size-8";

// Mantém o foco (e a seleção) no texto ao clicar nos botões.
const semPerderFoco = (e: React.MouseEvent) => e.preventDefault();

/** Estado (ativo/habilitado) de cada botão, lido da lista BARRA. */
function useEstadoDosBotoes(editor: Editor) {
  return useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const mapa: Record<string, { ativa: boolean; pode: boolean }> = {};
      for (const f of BARRA) mapa[f.id] = { ativa: f.ativa?.(e) ?? false, pode: f.pode?.(e) ?? true };
      return mapa;
    },
    equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });
}

function BotaoFerramenta({ f, estado, aoClicar }: { f: Ferramenta; estado: { ativa: boolean; pode: boolean }; aoClicar: () => void }) {
  const Icone = f.icone;
  return (
    <button
      type="button"
      aria-label={f.rotulo}
      aria-pressed={f.ativa ? estado.ativa : undefined}
      title={f.atalho ? `${f.rotulo} (${f.atalho})` : f.rotulo}
      disabled={!estado.pode}
      onMouseDown={semPerderFoco}
      onClick={aoClicar}
      className={botao}
    >
      <Icone size={17} aria-hidden="true" />
    </button>
  );
}

/** Barra fixa acima do editor. No celular rola na horizontal. */
export function BarraFerramentas({ editor, painel, aoMudarPainel }: { editor: Editor; painel: Painel; aoMudarPainel: (p: Painel) => void }) {
  const estado = useEstadoDosBotoes(editor);
  return (
    <div role="toolbar" aria-label="Formatação do texto" className="flex items-center overflow-x-auto border-b-2 border-borda bg-superficie px-1 py-1 [scrollbar-width:thin]">
      {BARRA.map((f, i) => (
        <Fragment key={f.id}>
          {i > 0 && BARRA[i - 1].grupo !== f.grupo && <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-borda" />}
          <BotaoFerramenta
            f={f}
            estado={estado[f.id]}
            aoClicar={() => (f.painel ? aoMudarPainel(painel === f.painel ? null : f.painel) : f.executar?.(editor))}
          />
        </Fragment>
      ))}
    </div>
  );
}

/** Menu flutuante ao selecionar texto: negrito, itálico, link e citação (da mesma lista BARRA). */
export function MenuFlutuante({ editor, aoMudarPainel }: { editor: Editor; aoMudarPainel: (p: Painel) => void }) {
  const estado = useEstadoDosBotoes(editor);
  return (
    <BubbleMenu editor={editor} options={{ placement: "top" }} className="flex border-2 border-inverso bg-superficie">
      {BARRA.filter((f) => MENU_FLUTUANTE.includes(f.id)).map((f) => (
        <BotaoFerramenta key={f.id} f={f} estado={estado[f.id]} aoClicar={() => (f.painel ? aoMudarPainel("link") : f.executar?.(editor))} />
      ))}
    </BubbleMenu>
  );
}

const campoPainel = "min-h-9 min-w-0 flex-1 border-2 border-borda-forte bg-superficie px-2 text-sm hover:border-texto focus-visible:border-texto";
const botaoPainel = "rotulo min-h-9 border-2 border-inverso px-3 text-[11px] font-bold hover:bg-inverso hover:text-sobre-inverso";

function PainelLink({ editor, aoFechar }: { editor: Editor; aoFechar: () => void }) {
  const [url, setUrl] = useState(() => (editor.getAttributes("link").href as string | undefined) ?? "");
  const [erro, setErro] = useState<string | null>(null);

  function aplicar() {
    const texto = url.trim();
    if (!texto) return remover();
    const href = hrefSeguro(/^[a-z][a-z0-9+.-]*:/i.test(texto) ? texto : `https://${texto}`);
    if (!href) return setErro("Use um endereço http, https ou mailto.");
    if (editor.state.selection.empty && !editor.isActive("link")) {
      editor.chain().focus().insertContent({ type: "text", text: texto, marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    aoFechar();
  }
  function remover() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    aoFechar();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b-2 border-borda bg-sutil p-2">
      <label htmlFor="editor-link" className="sr-only">
        Endereço do link
      </label>
      <input
        id="editor-link"
        autoFocus
        value={url}
        placeholder="https://…"
        onChange={(e) => {
          setUrl(e.target.value);
          setErro(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            aplicar();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            aoFechar();
            editor.commands.focus();
          }
        }}
        className={campoPainel}
      />
      <button type="button" onClick={aplicar} className={botaoPainel}>
        Aplicar
      </button>
      {editor.isActive("link") && (
        <button type="button" onClick={remover} className={`${botaoPainel} border-borda-forte text-suave`}>
          Remover link
        </button>
      )}
      {erro && (
        <p role="alert" className="basis-full text-xs font-bold text-marca-texto">
          {erro}
        </p>
      )}
    </div>
  );
}

function PainelImagem({ editor, tipo, tarefaId, aoFechar }: { editor: Editor; tipo: TipoAnexo; tarefaId: string; aoFechar: () => void }) {
  const [url, setUrl] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  function inserirUrl() {
    const src = srcExternoSeguro(url.trim());
    if (!src) return setErro("Use o endereço completo de uma imagem, começando com https://");
    editor.chain().focus().insertContent({ type: "image", attrs: { src } }).run();
    aoFechar();
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b-2 border-borda bg-sutil p-2">
      <input
        ref={arquivo}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-label="Escolher imagem do computador"
        onChange={(e) => {
          const arquivos = [...(e.target.files ?? [])];
          if (arquivos.length) inserirImagens(editor, arquivos, tipo, tarefaId);
          e.target.value = "";
          aoFechar();
        }}
      />
      <button type="button" onClick={() => arquivo.current?.click()} className={botaoPainel}>
        Escolher arquivo
      </button>
      <span className="rotulo text-[10px] text-suave">ou</span>
      <label htmlFor="editor-imagem-url" className="sr-only">
        Endereço da imagem
      </label>
      <input
        id="editor-imagem-url"
        value={url}
        placeholder="https://…/imagem.png"
        onChange={(e) => {
          setUrl(e.target.value);
          setErro(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            inserirUrl();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            aoFechar();
          }
        }}
        className={campoPainel}
      />
      <button type="button" onClick={inserirUrl} className={botaoPainel}>
        Inserir
      </button>
      <p className="basis-full text-[11px] text-suave">Prints e imagens também podem ser coladas ou arrastadas para dentro do texto. Máximo de 8 MB por imagem.</p>
      {erro && (
        <p role="alert" className="basis-full text-xs font-bold text-marca-texto">
          {erro}
        </p>
      )}
    </div>
  );
}

export function PainelDaBarra({ painel, editor, tipo, tarefaId, aoFechar }: { painel: Painel; editor: Editor; tipo: TipoAnexo; tarefaId: string; aoFechar: () => void }) {
  if (painel === "link") return <PainelLink editor={editor} aoFechar={aoFechar} />;
  if (painel === "imagem") return <PainelImagem editor={editor} tipo={tipo} tarefaId={tarefaId} aoFechar={aoFechar} />;
  return null;
}
