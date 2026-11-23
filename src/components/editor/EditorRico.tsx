"use client";

import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { useRef, useState } from "react";
import { Botao } from "@/components/ui/Botao";
import { documentoDeTexto, estaVazio, LIMITE_CARACTERES, type Documento } from "@/lib/editor/documento";
import { BarraFerramentas, MenuFlutuante, PainelDaBarra, type Painel } from "./BarraFerramentas";
import { ConteudoRico } from "./ConteudoRico";
import { criarExtensoes } from "./extensoes";
import { imagensPendentes, inserirImagens } from "./upload";

type Retorno = { erro?: string };

export type PropsEditorRico = {
  /** descricao: abre como texto formatado, edita ao clicar e salva sozinho. comentario: editor compacto com botão. */
  modo: "descricao" | "comentario" | "campo";
  tarefaId: string;
  /** Documento atual (com as imagens já assinadas). */
  valor: Documento | null;
  /** Texto puro de antes do editor rico, quando ainda não há documento. */
  textoAlternativo?: string | null;
  /** Descrição de tarefa: não pode ficar vazia. */
  obrigatorio?: boolean;
  /** Descrição: salva (sozinho). Comentário: envia. */
  aoSalvar: (doc: Documento) => Promise<Retorno>;
  placeholder?: string;
  /** Comentário: texto do botão e o que fazer depois de enviar ou cancelar. */
  rotuloEnviar?: string;
  limparAoEnviar?: boolean;
  aoTerminar?: () => void;
  aoCancelar?: () => void;
  autoFoco?: boolean;
  /** Modo "campo" (dentro de um formulário): avisa a cada mudança, sem salvar nem enviar. */
  aoMudar?: (doc: Documento, imagens: "carregando" | "erro" | null) => void;
};

/**
 * Editor de texto rico (Tiptap): um componente, dois usos. A lista de extensões e a barra de
 * ferramentas ficam em extensoes.ts, para o editor crescer (menções, menu "/", blocos).
 */
/** O ProseMirror cria `attrs` sem protótipo; o React não serializa isso para a Server Action ("$T"). */
function docPlano(editor: Editor): Documento {
  return JSON.parse(JSON.stringify(editor.getJSON())) as Documento;
}

export function EditorRico(props: PropsEditorRico) {
  return props.modo === "descricao" ? <Descricao {...props} /> : <Corpo {...props} inicial={props.valor ?? documentoDeTexto(props.textoAlternativo)} />;
}

/** Descrição: lê como texto formatado; clicar (ou Enter) entra na edição. */
function Descricao(props: PropsEditorRico) {
  const [salvo, setSalvo] = useState<Documento>(props.valor ?? documentoDeTexto(props.textoAlternativo));
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <Corpo
        {...props}
        autoFoco
        inicial={salvo}
        aoSair={(doc) => {
          setSalvo(doc);
          setEditando(false);
        }}
      />
    );
  }
  const vazio = estaVazio(salvo);
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Editar a descrição"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("a, button, input")) setEditando(true);
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          setEditando(true);
        }
      }}
      className="min-h-16 cursor-text border-2 border-transparent px-3 py-2 hover:border-borda hover:bg-sutil/40 focus-visible:border-texto"
    >
      {vazio ? <p className="text-[15px] text-suave">{props.placeholder ?? "Clique para escrever a descrição…"}</p> : <ConteudoRico doc={salvo} />}
    </div>
  );
}

function Corpo({
  modo,
  tarefaId,
  inicial,
  obrigatorio = false,
  aoSalvar,
  placeholder,
  rotuloEnviar = "Comentar",
  limparAoEnviar = false,
  aoTerminar,
  aoCancelar,
  autoFoco = false,
  aoMudar,
  aoSair,
}: PropsEditorRico & { inicial: Documento; aoSair?: (doc: Documento) => void }) {
  const ehCampo = modo === "campo";
  const ehDescricao = modo === "descricao" || ehCampo;
  const tipo = ehDescricao ? "tarefa" : "comentario";
  const [painel, setPainel] = useState<Painel>(null);
  const [estado, setEstado] = useState<"parado" | "salvando" | "salvo" | "erro">("parado");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const salvoRef = useRef(JSON.stringify(inicial));
  const timer = useRef<number | undefined>(undefined);
  const editorRef = useRef<Editor | null>(null);
  const [extensoes] = useState(() =>
    criarExtensoes({
      placeholder: placeholder ?? (ehDescricao ? "Descreva o que precisa ser feito e o resultado esperado" : "Escreva uma atualização, dúvida ou decisão"),
      tipo,
      tarefaId,
      aoPedirLink: () => setPainel("link"),
    }),
  );

  /** Descrição: grava se mudou. Devolve true se está tudo salvo. */
  async function salvar(editor: Editor): Promise<boolean> {
    window.clearTimeout(timer.current);
    const pendente = imagensPendentes(editor);
    if (pendente === "carregando") return false; // volta a salvar quando a imagem terminar de subir
    if (pendente === "erro") {
      setEstado("erro");
      setMensagem("Tente de novo ou remova a imagem com erro para salvar.");
      return false;
    }
    const doc = docPlano(editor);
    const json = JSON.stringify(doc);
    if (json === salvoRef.current) return true;
    if (obrigatorio && estaVazio(doc)) {
      setEstado("erro");
      setMensagem("A descrição não pode ficar vazia.");
      return false;
    }
    setEstado("salvando");
    setMensagem(null);
    const r = await aoSalvar(doc);
    if (r.erro) {
      setEstado("erro");
      setMensagem(r.erro);
      return false;
    }
    salvoRef.current = json;
    setEstado("salvo");
    return true;
  }

  async function enviar(editor: Editor) {
    if (enviando) return;
    const pendente = imagensPendentes(editor);
    if (pendente) {
      setMensagem(pendente === "carregando" ? "Espere a imagem terminar de subir." : "Tente de novo ou remova a imagem com erro.");
      return;
    }
    const doc = docPlano(editor);
    if (estaVazio(doc)) {
      setMensagem("Escreva algo ou cole uma imagem.");
      return;
    }
    setEnviando(true);
    setMensagem(null);
    const r = await aoSalvar(doc);
    setEnviando(false);
    if (r.erro) {
      setMensagem(r.erro);
      return;
    }
    if (limparAoEnviar) editor.commands.clearContent(true);
    aoTerminar?.();
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: extensoes,
    content: inicial,
    autofocus: autoFoco ? "end" : false,
    editorProps: {
      attributes: {
        class: "conteudo-rico outline-none",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": ehDescricao ? "Descrição da tarefa" : "Comentário",
      },
      handlePaste: (_view, event) => {
        const imagens = [...(event.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
        if (imagens.length === 0 || !editorRef.current) return false;
        event.preventDefault();
        inserirImagens(editorRef.current, imagens, tipo, tarefaId);
        return true;
      },
      handleDrop: (view, event, _slice, movido) => {
        const imagens = [...(event.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith("image/"));
        if (movido || imagens.length === 0 || !editorRef.current) return false;
        event.preventDefault();
        const ponto = view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (ponto) editorRef.current.commands.setTextSelection(ponto.pos);
        inserirImagens(editorRef.current, imagens, tipo, tarefaId);
        return true;
      },
      handleKeyDown: (_view, event) => {
        if (!ehDescricao && (event.metaKey || event.ctrlKey) && event.key === "Enter" && editorRef.current) {
          event.preventDefault();
          void enviar(editorRef.current);
          return true;
        }
        return false;
      },
    },
    onCreate: ({ editor: e }) => {
      editorRef.current = e;
    },
    onUpdate: ({ editor: e }) => {
      setMensagem(null);
      if (ehCampo) {
        aoMudar?.(docPlano(e), imagensPendentes(e));
        return;
      }
      if (!ehDescricao) return;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void salvar(e), 1500); // salva sozinho 1,5 s depois da última digitação
    },
  });

  const caracteresBruto = useEditorState({
    editor,
    selector: ({ editor: e }) => e?.storage.characterCount?.characters() ?? 0,
  });

  const caracteres = caracteresBruto ?? 0;
  const cancelarEdicao = (e: Editor) => {
    window.clearTimeout(timer.current);
    e.commands.setContent(JSON.parse(salvoRef.current));
    aoSair?.(JSON.parse(salvoRef.current));
  };

  const altura = ehCampo ? "min-h-32 px-3 py-2" : ehDescricao ? "min-h-40 px-4 py-3" : "min-h-20 px-3 py-2";
  return (
    <div
      className="border-2 border-borda bg-superficie focus-within:border-texto"
      onBlur={(e) => {
        // Descrição: ao sair do editor, grava e volta a ler como texto formatado.
        if (!ehDescricao || ehCampo || !editor || e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        void salvar(editor).then((ok) => ok && aoSair?.(JSON.parse(salvoRef.current)));
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && editor && !painel) {
          e.preventDefault();
          e.stopPropagation(); // não fecha a janela da tarefa
          if (ehCampo) return;
          if (ehDescricao) cancelarEdicao(editor);
          else aoCancelar?.();
        }
      }}
    >
      {editor ? (
        <>
          <BarraFerramentas editor={editor} painel={painel} aoMudarPainel={setPainel} />
          <PainelDaBarra painel={painel} editor={editor} tipo={tipo} tarefaId={tarefaId} aoFechar={() => setPainel(null)} />
          <MenuFlutuante editor={editor} aoMudarPainel={setPainel} />
          <EditorContent editor={editor} className={altura} />
        </>
      ) : (
        <div className={altura} aria-busy="true">
          <div className="h-4 w-1/2 animate-pulse bg-sutil" />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t-2 border-borda px-3 py-2">
        {ehCampo ? (
          <span className="rotulo text-[10px] text-suave">Cole ou arraste imagens aqui</span>
        ) : ehDescricao ? (
          <>
            <Botao variante="secundario" className="min-h-9 px-3 text-xs" onClick={() => editor && void salvar(editor).then((ok) => ok && aoSair?.(JSON.parse(salvoRef.current)))}>
              Pronto
            </Botao>
            <span role="status" aria-live="polite" className="rotulo text-[10px] text-suave">
              {estado === "salvando" ? "Salvando…" : estado === "salvo" ? "Salvo" : "Salva sozinho · Esc cancela"}
            </span>
          </>
        ) : (
          <>
            <Botao className="min-h-9 px-4 text-xs" disabled={enviando || !editor} onClick={() => editor && void enviar(editor)}>
              {enviando ? "Enviando…" : rotuloEnviar}
            </Botao>
            {aoCancelar && (
              <Botao variante="secundario" className="min-h-9 px-3 text-xs" onClick={aoCancelar}>
                Cancelar
              </Botao>
            )}
            <span className="rotulo hidden text-[10px] text-suave sm:inline">Ctrl/⌘ + Enter envia</span>
          </>
        )}
        {caracteres > LIMITE_CARACTERES * 0.8 && (
          <span className="rotulo ml-auto text-[10px] text-suave">
            {caracteres.toLocaleString("pt-BR")} / {LIMITE_CARACTERES.toLocaleString("pt-BR")}
          </span>
        )}
        {mensagem && (
          <p role="alert" className="basis-full text-xs font-bold text-marca-texto">
            {mensagem}
          </p>
        )}
      </div>
    </div>
  );
}
