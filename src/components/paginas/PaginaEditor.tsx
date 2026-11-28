"use client";

import type { Editor } from "@tiptap/core";
import type { Node as NoDoDocumento } from "@tiptap/pm/model";
import { EditorContent, useEditor } from "@tiptap/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AlcaBloco } from "@/components/editor/AlcaBloco";
import { PainelLink } from "@/components/editor/BarraFerramentas";
import { OferecerCartao, PedirCartao, type Oferta } from "@/components/editor/CaixasDeLink";
import { criarCanalDeComandos } from "@/components/editor/comandos";
import { ControlesDeBloco } from "@/components/editor/ControlesDeBloco";
import { inserirAnexos } from "@/components/editor/envio";
import { criarExtensoesPagina } from "@/components/editor/extensoes";
import { MenuComandos } from "@/components/editor/MenuComandos";
import { MenuSelecao } from "@/components/editor/MenuSelecao";
import { CaixaDeDependencia } from "@/components/editor/vinculos/CaixaDeDependencia";
import { criarDadosDeVinculos, type DadosDeVinculos } from "@/components/editor/vinculos/dados";
import { SeletorDeVinculo } from "@/components/editor/vinculos/SeletorDeVinculo";
import { idsCitados } from "@/lib/vinculos/referencias";
import { Botao } from "@/components/ui/Botao";
import { dataRelativa } from "@/lib/datas";
import { hrefSeguro, type Documento } from "@/lib/editor/documento";
import { ARQUIVO, PAGINA } from "@/lib/limites";
import { emAviso, formatarTamanho, SEM_ESPACO, type Uso } from "@/lib/paginas/arquivos-tipos";
import { blocoDeAviso, trocaDe } from "@/lib/paginas/trocas";
import { chaveDoDocumento, controladorDe, temEnvio, type ControladorPagina, type EstadoPagina } from "./controlador";
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
  const enviando = temEnvio(estado.doc);
  const parado = estado.conflito || estado.aviso;
  const quando = estado.atualizadoEm ? dataRelativa(estado.atualizadoEm, Math.max(agora, Date.parse(estado.atualizadoEm))) : "";
  const texto = estado.conflito
    ? "Não salvo"
    : salvando
      ? "Salvando…"
      : (estado.aviso ?? (enviando ? "Enviando arquivo…" : `Salvo${estado.atualizadoPor ? ` · editado por ${estado.atualizadoPor} ${quando}` : ""}`));

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

function AvisoDeEspaco({ uso }: { uso: Uso }) {
  if (!emAviso(uso)) return null;
  const cheio = uso.usado >= uso.maximo;
  return (
    <p role="status" className="mb-4 bg-ouro p-3 text-sm font-bold text-sobre-ouro">
      Este projeto usa {formatarTamanho(uso.usado)} de {formatarTamanho(uso.maximo)}.{cheio && ` ${SEM_ESPACO}`}
    </p>
  );
}

const ACEITOS = Object.keys(ARQUIVO.tipos)
  .map((e) => `.${e}`)
  .join(",");

/** Pede os dados das citações: ao abrir, quando surge uma nova, ao voltar à aba e a cada 60 s. */
function useDadosAoVivo(editor: Editor | null, dados: DadosDeVinculos) {
  useEffect(() => {
    if (!editor) return;
    const definir = () => {
      const ids = idsCitados(editor.state.doc.toJSON() as Documento);
      dados.definirAlvos([...ids.tarefa], [...ids.grupo]);
    };
    const mudou = ({ transaction }: { transaction: { docChanged: boolean } }) => transaction.docChanged && definir();
    const visivel = () => document.visibilityState === "visible" && void dados.atualizar();
    definir();
    void dados.atualizar();
    editor.on("transaction", mudou);
    const cada = window.setInterval(visivel, 60_000);
    document.addEventListener("visibilitychange", visivel);
    return () => {
      editor.off("transaction", mudou);
      window.clearInterval(cada);
      document.removeEventListener("visibilitychange", visivel);
    };
  }, [editor, dados]);
}

const CITACAO = /^((?:tarefa|grupo):[0-9a-f-]{36}):(\d{1,4})$/i;

/** "?ref=tarefa:<id>:<n>" (vindo do "Mencionada em"): rola até a citação e destaca por 2 s. */
function useRolarAteCitacao(editor: Editor | null) {
  const ref = useSearchParams().get("ref");
  useEffect(() => {
    const achado = ref ? CITACAO.exec(ref) : null;
    if (!editor || !achado) return;
    let alvo: HTMLElement | undefined;
    let fim = 0;
    let tentativas = 0;
    // Os blocos aparecem logo depois do editor: tenta por até 5 s.
    const procura = window.setInterval(() => {
      alvo = editor.view.dom.querySelectorAll<HTMLElement>(`[data-ref="${achado[1].toLowerCase()}"]`)[Number(achado[2])];
      if (!alvo && ++tentativas < 50) return;
      window.clearInterval(procura);
      if (!alvo) return;
      alvo.scrollIntoView({ behavior: "smooth", block: "center" });
      alvo.dataset.destaque = "";
      fim = window.setTimeout(() => {
        delete alvo!.dataset.destaque;
        const url = new URL(window.location.href);
        url.searchParams.delete("ref");
        window.history.replaceState(null, "", url);
      }, 2000);
    }, 100);
    return () => {
      window.clearInterval(procura);
      window.clearTimeout(fim);
      if (alvo) delete alvo.dataset.destaque;
    };
  }, [editor, ref]);
}

/** Painel de link logo abaixo do trecho selecionado. */
function LinkJuntoAoTexto({ editor, aoFechar }: { editor: Editor; aoFechar: () => void }) {
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const base = caixa.current?.offsetParent?.getBoundingClientRect();
    if (caixa.current && base) caixa.current.style.top = `${editor.view.coordsAtPos(editor.state.selection.to).bottom - base.top + 8}px`;
  }, [editor]);
  return (
    <div ref={caixa} className="absolute left-12 right-0 z-30 border border-texto bg-menu">
      <PainelLink editor={editor} aoFechar={aoFechar} />
    </div>
  );
}

function Escrita({ abaId, projetoId, pagina, revisao }: { abaId: string; projetoId: string; pagina: ControladorPagina; revisao: number }) {
  // Só o conteúdo de partida; versões novas entram pelo efeito abaixo.
  const [inicial] = useState(() => pagina.ler().doc!);
  const area = useRef<HTMLDivElement>(null);
  const [link, setLink] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cartao, setCartao] = useState(false);
  const [oferta, setOferta] = useState<Oferta | null>(null);
  const [dependencia, setDependencia] = useState(false);
  const [canal] = useState(criarCanalDeComandos);
  const [seletor] = useState(criarCanalDeComandos);
  const [dados] = useState(criarDadosDeVinculos);
  const [extensoes] = useState(() =>
    criarExtensoesPagina({ abaId, canal, seletor, dados, aoPedirLink: () => setLink(true), aoRecusar: setAviso }),
  );
  const editorRef = useRef<Editor | null>(null);

  const anexar = (arquivos: File[]) => {
    const e = editorRef.current;
    if (e) setAviso(inserirAnexos(e, abaId, arquivos));
  };

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
      handleDrop: (view, event, _trecho, movido) => {
        const arquivos = [...(event.dataTransfer?.files ?? [])];
        if (movido || !arquivos.length) return false;
        event.preventDefault();
        const ponto = view.posAtCoords({ left: event.clientX, top: event.clientY });
        if (ponto) editorRef.current?.commands.setTextSelection(ponto.pos);
        anexar(arquivos);
        return true;
      },
      handlePaste: (view, event) => {
        const dados = event.clipboardData;
        if (!dados) return false;
        const texto = dados.getData("text/plain").trim();
        // Print ou arquivo copiado (sem texto junto).
        if (dados.files.length && !texto) {
          event.preventDefault();
          anexar([...dados.files]);
          return true;
        }
        // Um endereço sozinho numa linha vazia: entra como link e oferece o cartão.
        const { $from, empty } = view.state.selection;
        if (!empty || !/^https?:\/\/\S+$/i.test(texto) || $from.parent.type.name !== "paragraph" || $from.parent.content.size) return false;
        const href = hrefSeguro(texto);
        const { cartaoLink } = view.state.schema.nodes;
        if (!href || !$from.node(-1).canReplaceWith($from.index(-1), $from.index(-1) + 1, cartaoLink)) return false;
        event.preventDefault();
        const pos = $from.before();
        view.dispatch(view.state.tr.replaceSelectionWith(view.state.schema.text(texto, [view.state.schema.marks.link.create({ href })]), false));
        setOferta({ url: texto, pos });
        return true;
      },
    },
    onCreate: ({ editor: e }) => {
      editorRef.current = e;
    },
    onUpdate: ({ editor: e, transaction }) => {
      // Andamento de envio não apaga o aviso na tela.
      if (transaction.getMeta("addToHistory") !== false) {
        setAviso(null);
        setOferta(null);
      }
      pagina.alterar(docDe(e));
    },
  });

  useEffect(() => {
    editorRef.current = editor;
    if (!editor) return;
    // O andamento dos envios e as trocas de anexos chegam aqui enquanto o editor está aberto.
    return pagina.registrarEditor({
      envio: (uploadId, attrs) => {
        if (editor.isDestroyed) return false;
        const tr = editor.state.tr;
        editor.state.doc.descendants((no, pos) => {
          if (no.attrs.uploadId === uploadId) tr.setNodeMarkup(pos, undefined, { ...no.attrs, ...attrs });
        });
        if (!tr.docChanged) return false;
        editor.view.dispatch(tr.setMeta("addToHistory", false));
        return true;
      },
      trocas: (trocas) => {
        if (editor.isDestroyed) return false;
        const achados: { no: NoDoDocumento; pos: number; para: string | null }[] = [];
        editor.state.doc.descendants((no, pos) => {
          const troca = trocaDe(no.type.name, no.attrs.arquivoId, trocas);
          if (troca) achados.push({ no, pos, para: troca.para });
        });
        if (!achados.length) return false;
        const tr = editor.state.tr;
        // Do fim para o começo, para as posições continuarem válidas.
        for (const { no, pos, para } of achados.reverse()) {
          if (para) tr.setNodeMarkup(pos, undefined, { ...no.attrs, arquivoId: para });
          else tr.replaceWith(pos, pos + no.nodeSize, editor.schema.nodeFromJSON(blocoDeAviso()));
        }
        editor.view.dispatch(tr.setMeta("addToHistory", false));
        return true;
      },
    });
  }, [editor, pagina]);

  // O documento foi trocado por fora (carregou uma versão nova ou o editor foi recriado).
  useEffect(() => {
    const doc = pagina.ler().doc;
    if (editor && doc && chaveDoDocumento(docDe(editor)) !== chaveDoDocumento(doc)) {
      editor.commands.setContent(doc, { emitUpdate: false });
    }
  }, [editor, pagina, revisao]);

  useDadosAoVivo(editor, dados);
  useRolarAteCitacao(editor);

  /** "/Tarefa" e "/Grupo": escreve o "{", que abre o seletor. */
  const abrirSeletor = (aba: "tarefas" | "grupos") => {
    seletor.pedirAba(aba);
    editorRef.current?.chain().focus().insertContent("{").run();
  };

  if (!editor) return <div className="h-48 animate-pulse bg-sutil" aria-busy="true" />;
  return (
    <div ref={area} className="relative pl-12">
      <EditorContent editor={editor} />
      {/* Área clicável no fim, para continuar escrevendo. */}
      <div aria-hidden="true" onClick={() => editor.chain().focus("end").run()} className="h-40 cursor-text" />
      <ControlesDeBloco editor={editor} area={area} />
      <AlcaBloco editor={editor} area={area} />
      <MenuSelecao editor={editor} aoPedirLink={() => setLink(true)} />
      <MenuComandos
        editor={editor}
        canal={canal}
        acoes={{
          imagem: () => document.getElementById(`imagem-${abaId}`)?.click(),
          arquivo: () => document.getElementById(`arquivo-${abaId}`)?.click(),
          cartao: () => setCartao(true),
          tarefa: () => abrirSeletor("tarefas"),
          grupo: () => abrirSeletor("grupos"),
          dependencia: () => setDependencia(true),
        }}
      />
      <SeletorDeVinculo editor={editor} canal={seletor} projetoId={projetoId} />
      {dependencia && (
        <CaixaDeDependencia
          projetoId={projetoId}
          aoFechar={() => setDependencia(false)}
          aoCriar={(texto) => {
            setDependencia(false);
            setAviso(texto);
            void dados.atualizar();
          }}
        />
      )}
      {[
        ["imagem", "image/*"],
        ["arquivo", ACEITOS],
      ].map(([tipo, aceita]) => (
        <input
          key={tipo}
          id={`${tipo}-${abaId}`}
          type="file"
          multiple
          accept={aceita}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          onChange={(e) => {
            anexar([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      ))}
      {cartao && <PedirCartao editor={editor} aoFechar={() => setCartao(false)} />}
      {oferta && <OferecerCartao editor={editor} oferta={oferta} aoFechar={() => setOferta(null)} />}
      {link && <LinkJuntoAoTexto editor={editor} aoFechar={() => setLink(false)} />}
      {aviso && (
        <div role="alert" className="sticky bottom-24 z-30 flex items-center gap-3 border border-texto bg-menu p-3 text-sm font-bold md:bottom-6">
          <span className="flex-1">{aviso}</span>
          <button type="button" onClick={() => setAviso(null)} className="min-h-9 px-2 text-xs text-suave hover:text-marca-texto">
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}

export function PaginaEditor({ abaId, projetoId, tituloInicial }: { abaId: string; projetoId: string; tituloInicial: string }) {
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
      {estado.uso && <AvisoDeEspaco uso={estado.uso} />}

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
        className="mb-4 block w-full resize-none overflow-hidden bg-transparent pl-12 font-titulo text-4xl font-extrabold leading-tight tracking-tight [field-sizing:content] placeholder:text-suave md:text-5xl"
      />

      {estado.fase === "carregando" && <div className="ml-12 h-48 animate-pulse bg-sutil" aria-busy="true" />}
      {estado.fase === "erro" && (
        <div role="alert" className="ml-12 flex flex-col items-start gap-3">
          <p className="text-sm font-bold text-marca-texto">{estado.aviso}</p>
          <Botao variante="secundario" onClick={() => void pagina.abrir()}>
            Tentar de novo
          </Botao>
        </div>
      )}
      {estado.fase === "pronta" && estado.doc && <Escrita abaId={abaId} projetoId={projetoId} pagina={pagina} revisao={estado.revisao} />}
    </article>
  );
}
