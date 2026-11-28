"use client";

import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AlcaBloco } from "@/components/editor/AlcaBloco";
import { PainelLink } from "@/components/editor/BarraFerramentas";
import { criarCanalDeComandos } from "@/components/editor/comandos";
import { criarExtensoesPagina } from "@/components/editor/extensoes";
import { MenuComandos } from "@/components/editor/MenuComandos";
import { MenuSelecao } from "@/components/editor/MenuSelecao";
import { Botao } from "@/components/ui/Botao";
import { dataRelativa } from "@/lib/datas";
import type { Documento } from "@/lib/editor/documento";
import { PAGINA } from "@/lib/limites";
import { chaveDoDocumento, controladorDe, type ControladorPagina, type EstadoPagina } from "./controlador";
import { concluirTitulo, lerTitulos, ouvirTitulos, renomear } from "./titulos";

/** O ProseMirror cria `attrs` sem protótipo: a cópia deixa só objetos simples. */
const docDe = (e: Editor) => JSON.parse(JSON.stringify(e.getJSON())) as Documento;

function Indicador({ estado }: { estado: EstadoPagina }) {
  // O "há X min" anda sozinho.
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setAgora(Date.now()), 20_000);
    return () => window.clearInterval(t);
  }, []);

  const salvando = estado.salvando || (estado.pendente && !estado.aviso && !estado.conflito);
  const parado = estado.conflito || estado.aviso;
  const quando = estado.atualizadoEm ? dataRelativa(estado.atualizadoEm, Math.max(agora, Date.parse(estado.atualizadoEm))) : "";
  const texto = estado.conflito
    ? "Não salvo"
    : salvando
      ? "Salvando…"
      : (estado.aviso ?? `Salvo${estado.atualizadoPor ? ` · editado por ${estado.atualizadoPor} ${quando}` : ""}`);

  return (
    <p role="status" aria-live="polite" className={`rotulo flex min-h-6 items-center justify-end gap-2 text-right text-[10px] ${parado ? "text-marca-texto" : "text-suave"}`}>
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${parado ? "bg-absurdo" : salvando ? "bg-ouro" : "bg-verde"}`} />
      {texto}
    </p>
  );
}

function CopiaNaoSalva({ texto, aoDescartar }: { texto: string; aoDescartar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <section aria-label="Texto que não foi salvo" className="mb-6 border border-texto bg-menu p-4">
      <p className="rotulo text-marca-texto">Seu texto que não foi salvo</p>
      <textarea readOnly rows={6} value={texto} className="mt-2 w-full border border-borda bg-superficie p-3 text-sm" />
      <div className="mt-3 flex flex-wrap gap-3">
        <Botao className="min-h-9 px-4 text-xs" onClick={() => void navigator.clipboard.writeText(texto).then(() => setCopiado(true))}>
          {copiado ? "Copiado" : "Copiar"}
        </Botao>
        <Botao variante="secundario" className="min-h-9 px-3 text-xs" onClick={aoDescartar}>
          Descartar
        </Botao>
      </div>
    </section>
  );
}

/** Painel de link logo abaixo do trecho selecionado. */
function LinkJuntoAoTexto({ editor, aoFechar }: { editor: Editor; aoFechar: () => void }) {
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const base = caixa.current?.offsetParent?.getBoundingClientRect();
    if (caixa.current && base) caixa.current.style.top = `${editor.view.coordsAtPos(editor.state.selection.to).bottom - base.top + 8}px`;
  }, [editor]);
  return (
    <div ref={caixa} className="absolute left-8 right-0 z-30 border border-texto bg-menu">
      <PainelLink editor={editor} aoFechar={aoFechar} />
    </div>
  );
}

function Escrita({ pagina, revisao }: { pagina: ControladorPagina; revisao: number }) {
  // Só o conteúdo de partida; versões novas entram pelo efeito abaixo.
  const [inicial] = useState(() => pagina.ler().doc!);
  const area = useRef<HTMLDivElement>(null);
  const [link, setLink] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [canal] = useState(criarCanalDeComandos);
  const [extensoes] = useState(() => criarExtensoesPagina({ canal, aoPedirLink: () => setLink(true) }));

  const editor = useEditor({
    immediatelyRender: false,
    extensions: extensoes,
    content: inicial,
    editorProps: {
      attributes: {
        class: "conteudo-rico conteudo-pagina outline-none",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Conteúdo da página",
      },
      // Arquivos soltos ou colados: o upload das páginas chega numa próxima etapa.
      handleDrop: (_view, event) => {
        if (!event.dataTransfer?.files.length) return false;
        event.preventDefault();
        setAviso("Imagens e arquivos nas páginas chegam numa próxima etapa.");
        return true;
      },
      handlePaste: (_view, event) => {
        const dados = event.clipboardData;
        if (!dados?.files.length || dados.getData("text/plain")) return false;
        event.preventDefault();
        setAviso("Imagens e arquivos nas páginas chegam numa próxima etapa.");
        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      setAviso(null);
      pagina.alterar(docDe(e));
    },
  });

  // O documento foi trocado por fora (carregou uma versão nova ou o editor foi recriado).
  useEffect(() => {
    const doc = pagina.ler().doc;
    if (editor && doc && chaveDoDocumento(docDe(editor)) !== chaveDoDocumento(doc)) {
      editor.commands.setContent(doc, { emitUpdate: false });
    }
  }, [editor, pagina, revisao]);

  if (!editor) return <div className="h-48 animate-pulse bg-sutil" aria-busy="true" />;
  return (
    <div ref={area} className="relative pl-8">
      <EditorContent editor={editor} />
      {/* Área clicável no fim, para continuar escrevendo. */}
      <div aria-hidden="true" onClick={() => editor.chain().focus("end").run()} className="h-40 cursor-text" />
      <AlcaBloco editor={editor} area={area} />
      <MenuSelecao editor={editor} aoPedirLink={() => setLink(true)} />
      <MenuComandos editor={editor} canal={canal} />
      {link && <LinkJuntoAoTexto editor={editor} aoFechar={() => setLink(false)} />}
      {aviso && (
        <p role="alert" className="sticky bottom-24 border border-texto bg-menu p-3 text-sm font-bold md:bottom-6">
          {aviso}
        </p>
      )}
    </div>
  );
}

export function PaginaEditor({ abaId, tituloInicial }: { abaId: string; tituloInicial: string }) {
  const pagina = controladorDe(abaId);
  const estado = useSyncExternalStore(pagina.assinar, pagina.ler, pagina.ler);
  const titulos = useSyncExternalStore(ouvirTitulos, lerTitulos, lerTitulos);
  const titulo = titulos[abaId] ?? tituloInicial;

  useEffect(() => {
    void pagina.abrir();
    const aoEsconder = () => {
      if (document.visibilityState === "hidden") void pagina.salvarAgora();
      else void pagina.abrir();
    };
    document.addEventListener("visibilitychange", aoEsconder);
    return () => {
      document.removeEventListener("visibilitychange", aoEsconder);
      // Trocar de aba salva na hora.
      void pagina.salvarAgora();
      concluirTitulo(abaId);
    };
  }, [pagina, abaId]);

  return (
    <article className="mx-auto w-full max-w-[780px]">
      {estado.fase === "pronta" && <Indicador estado={estado} />}
      {estado.conflito && (
        <div role="alert" className="sticky top-[76px] z-30 mb-4 flex flex-wrap items-center gap-3 bg-bloco p-4 text-sobre-bloco">
          <p className="min-w-0 flex-1 text-sm font-bold">
            Esta página foi alterada por {estado.conflito.por}. Recarregar?
            <span className="mt-1 block font-normal">Seu texto continua abaixo e fica guardado para copiar.</span>
          </p>
          <button
            type="button"
            onClick={() => void pagina.recarregar()}
            className="min-h-11 border-2 border-ouro bg-ouro px-4 text-sm font-bold text-sobre-ouro hover:border-sobre-bloco"
          >
            Recarregar
          </button>
        </div>
      )}
      {estado.copia && <CopiaNaoSalva texto={estado.copia} aoDescartar={() => pagina.descartarCopia()} />}

      <textarea
        aria-label="Título da página"
        rows={1}
        value={titulo}
        maxLength={PAGINA.tituloMaxCaracteres}
        placeholder="Sem título"
        onChange={(e) => renomear(abaId, e.target.value.replace(/\n/g, " "), 800)}
        onBlur={() => concluirTitulo(abaId)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.closest("article")?.querySelector<HTMLElement>(".ProseMirror")?.focus();
          }
        }}
        className="mb-4 block w-full resize-none overflow-hidden bg-transparent pl-8 font-titulo text-4xl font-extrabold leading-tight tracking-tight [field-sizing:content] placeholder:text-suave md:text-5xl"
      />

      {estado.fase === "carregando" && <div className="ml-8 h-48 animate-pulse bg-sutil" aria-busy="true" />}
      {estado.fase === "erro" && (
        <div role="alert" className="ml-8 flex flex-col items-start gap-3">
          <p className="text-sm font-bold text-marca-texto">{estado.aviso}</p>
          <Botao variante="secundario" onClick={() => void pagina.abrir()}>
            Tentar de novo
          </Botao>
        </div>
      )}
      {estado.fase === "pronta" && estado.doc && <Escrita pagina={pagina} revisao={estado.revisao} />}
    </article>
  );
}
