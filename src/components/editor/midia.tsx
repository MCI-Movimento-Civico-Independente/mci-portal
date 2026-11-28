"use client";

import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import {
  TbAlertTriangle,
  TbAlignCenter,
  TbAlignLeft,
  TbArrowsHorizontal,
  TbDownload,
  TbExternalLink,
  TbFileTypeDocx,
  TbFileTypePdf,
  TbFileTypePpt,
  TbFileTypeXls,
  TbLoader2,
  TbTrash,
  TbZoomIn,
} from "react-icons/tb";
import type { Previa } from "@/lib/links/tipos";
import { extensaoDe, formatarTamanho } from "@/lib/paginas/arquivos-tipos";
import { enviarAnexo, podeRepetir } from "./envio";
import { Lightbox } from "./Lightbox";

/*
 * Blocos de mídia das páginas: imagem, arquivo e cartão de link. No documento ficam só os dados
 * permitidos pelo servidor; `uploadId`, `estado`, `erro` e `previa` existem enquanto sobe.
 */

/** Atributo que sobrevive a copiar e colar (vira data-… no HTML). */
const dado = (nome: string, padrao: string | number | null = null) => ({
  default: padrao,
  parseHTML: (el: HTMLElement) => {
    const v = el.getAttribute(`data-${nome.toLowerCase()}`);
    return v === null ? padrao : typeof padrao === "number" ? Number(v) : v;
  },
  renderHTML: (attrs: Record<string, unknown>) => (attrs[nome] == null ? {} : { [`data-${nome.toLowerCase()}`]: String(attrs[nome]) }),
});
const passageiro = { default: null, rendered: false };
const ENVIO = { uploadId: passageiro, estado: passageiro, erro: passageiro };

type DadosDeEnvio = { uploadId: string | null; estado: "enviando" | "erro" | null; erro: string | null };

function FalhaNoEnvio({ props }: { props: NodeViewProps }) {
  const { uploadId, erro } = props.node.attrs as DadosDeEnvio;
  const { abaId } = props.extension.options as { abaId: string };
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 border-2 border-absurdo bg-menu p-3 text-sm">
      <TbAlertTriangle size={18} aria-hidden="true" className="shrink-0 text-absurdo" />
      <span className="min-w-0 flex-1 font-bold">{erro ?? "Não deu para enviar."}</span>
      {uploadId && podeRepetir(uploadId) && (
        <button
          type="button"
          onClick={() => void enviarAnexo(abaId, uploadId)}
          className="rotulo min-h-9 border-2 border-inverso px-3 text-[11px] font-bold hover:bg-inverso hover:text-sobre-inverso"
        >
          Tentar de novo
        </button>
      )}
      <button type="button" onClick={props.deleteNode} className="rotulo min-h-9 px-2 text-[11px] text-suave hover:text-marca-texto">
        Remover
      </button>
    </div>
  );
}

const ALINHAMENTOS = [
  { valor: "esquerda", rotulo: "Alinhar à esquerda", icone: TbAlignLeft },
  { valor: "centro", rotulo: "Centralizar", icone: TbAlignCenter },
  { valor: "total", rotulo: "Largura total", icone: TbArrowsHorizontal },
];
const ferramenta = "flex size-9 items-center justify-center hover:bg-superficie aria-pressed:bg-inverso aria-pressed:text-sobre-inverso";
// No celular as opções ficam sempre à vista; com mouse, aparecem ao passar por cima.
const aoPassar = "md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100";

function ImagemView(props: NodeViewProps) {
  const { node, selected, updateAttributes, deleteNode, editor, getPos } = props;
  const [ampliada, setAmpliada] = useState(false);
  const { arquivoId, previa, legenda, alinhamento, nome, estado } = node.attrs as DadosDeEnvio & {
    arquivoId: string | null;
    previa: string | null;
    legenda: string;
    alinhamento: string;
    nome: string;
  };
  const src = previa ?? (arquivoId ? `/api/arquivos/${arquivoId}` : null);
  const alt = legenda || nome || "Imagem";
  const caixa = alinhamento === "total" ? "w-full" : alinhamento === "esquerda" ? "mr-auto w-fit max-w-full sm:max-w-[60%]" : "mx-auto w-fit max-w-full";

  return (
    <NodeViewWrapper className="my-3">
      {estado === "erro" ? (
        <FalhaNoEnvio props={props} />
      ) : (
        <figure className={`group relative ${caixa} ${selected ? "outline-2 outline-offset-2 outline-marca-texto" : ""}`}>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element -- endereço assinado na hora ou blob local
            <img
              src={src}
              alt={alt}
              loading="lazy"
              onClick={() => estado !== "enviando" && setAmpliada(true)}
              className={`block cursor-zoom-in ${alinhamento === "total" ? "w-full" : "max-h-[32rem] max-w-full"} ${estado === "enviando" ? "opacity-50" : ""}`}
            />
          ) : (
            <div className="flex h-32 w-64 max-w-full items-center justify-center bg-sutil text-sm text-suave">Imagem indisponível.</div>
          )}
          {estado === "enviando" ? (
            <span role="status" className="rotulo absolute inset-0 flex items-center justify-center gap-2 bg-fundo/40 text-[11px] font-bold">
              <TbLoader2 size={18} aria-hidden="true" className="animate-spin" />
              Enviando…
            </span>
          ) : (
            <div contentEditable={false} className={`absolute right-2 top-2 flex border border-texto bg-menu text-texto ${aoPassar}`}>
              {ALINHAMENTOS.map((a) => (
                <button
                  key={a.valor}
                  type="button"
                  aria-label={a.rotulo}
                  title={a.rotulo}
                  aria-pressed={alinhamento === a.valor}
                  onClick={() => updateAttributes({ alinhamento: a.valor })}
                  className={ferramenta}
                >
                  <a.icone size={16} aria-hidden="true" />
                </button>
              ))}
              <button type="button" aria-label="Ampliar" title="Ampliar" onClick={() => setAmpliada(true)} className={ferramenta}>
                <TbZoomIn size={16} aria-hidden="true" />
              </button>
              <button type="button" aria-label="Remover imagem" title="Remover imagem" onClick={deleteNode} className={ferramenta}>
                <TbTrash size={16} aria-hidden="true" />
              </button>
            </div>
          )}
          <figcaption>
            <input
              aria-label="Legenda da imagem"
              value={legenda}
              maxLength={300}
              placeholder="Legenda (opcional)"
              onChange={(e) => updateAttributes({ legenda: e.target.value })}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const pos = getPos();
                if (pos !== undefined) editor.chain().focus(pos + node.nodeSize).run();
              }}
              className={`rotulo mt-1 w-full min-w-40 bg-transparent py-1 text-[11px] normal-case text-suave placeholder:text-suave ${legenda ? "" : aoPassar}`}
            />
          </figcaption>
        </figure>
      )}
      {ampliada && src && <Lightbox src={src} alt={alt} aoFechar={() => setAmpliada(false)} />}
    </NodeViewWrapper>
  );
}

const ICONES = { pdf: TbFileTypePdf, docx: TbFileTypeDocx, xlsx: TbFileTypeXls, pptx: TbFileTypePpt };

function ArquivoView(props: NodeViewProps) {
  const { arquivoId, nome, tamanho, estado } = props.node.attrs as DadosDeEnvio & { arquivoId: string | null; nome: string; tamanho: number };
  const Icone = ICONES[extensaoDe(nome ?? "") ?? "pdf"];
  return (
    <NodeViewWrapper className="my-2" contentEditable={false}>
      {estado === "erro" ? (
        <FalhaNoEnvio props={props} />
      ) : (
        <div className={`flex items-center gap-3 border border-borda bg-menu p-3 ${props.selected ? "outline-2 outline-marca-texto" : ""}`}>
          <span className="flex size-11 shrink-0 items-center justify-center bg-inverso text-sobre-inverso">
            <Icone size={22} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">{nome}</span>
            <span className="rotulo text-[10px] text-suave">{formatarTamanho(Number(tamanho) || 0)}</span>
          </span>
          {estado === "enviando" || !arquivoId ? (
            <span role="status" className="rotulo flex items-center gap-2 text-[11px] text-suave">
              {estado === "enviando" && <TbLoader2 size={16} aria-hidden="true" className="animate-spin" />}
              {estado === "enviando" ? "Enviando…" : "Indisponível"}
            </span>
          ) : (
            <a
              href={`/api/arquivos/${arquivoId}?baixar=1`}
              target="_blank"
              rel="noopener"
              className="sem-estilo inline-flex min-h-11 items-center gap-2 border-2 border-inverso px-3 text-xs font-bold text-texto hover:bg-inverso hover:text-sobre-inverso md:min-h-9"
            >
              <TbDownload size={15} aria-hidden="true" />
              Baixar
            </a>
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
}

/** Uma consulta por endereço enquanto a tela estiver aberta. */
const previas = new Map<string, Promise<Previa>>();
function buscarPrevia(url: string): Promise<Previa> {
  let p = previas.get(url);
  if (!p) {
    p = fetch(`/api/link-preview?url=${encodeURIComponent(url)}`).then(async (r) => {
      if (!r.ok) throw new Error("sem prévia");
      return (await r.json()) as Previa;
    });
    p.catch(() => previas.delete(url));
    previas.set(url, p);
  }
  return p;
}

function CartaoView({ node, selected }: NodeViewProps) {
  const url = node.attrs.url as string;
  const [achado, setAchado] = useState<{ url: string; previa: Previa | null } | null>(null);
  const [semImagem, setSemImagem] = useState<string | null>(null);
  useEffect(() => {
    let ativo = true;
    buscarPrevia(url)
      .then((previa) => ativo && setAchado({ url, previa }))
      .catch(() => ativo && setAchado({ url, previa: null }));
    return () => {
      ativo = false;
    };
  }, [url]);

  const carregando = achado?.url !== url;
  const previa = carregando ? null : achado!.previa;
  let dominio = url;
  try {
    dominio = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // fica o texto como está
  }
  const imagem = previa?.imagem_url && semImagem !== previa.imagem_url ? previa.imagem_url : null;

  return (
    <NodeViewWrapper className="my-2" contentEditable={false}>
      {/* Abre no site original: nada toca dentro da página. */}
      <a
        href={/^https?:\/\//i.test(url) ? url : undefined}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={`sem-estilo flex min-h-24 border border-borda bg-menu hover:border-texto ${selected ? "outline-2 outline-marca-texto" : ""}`}
      >
        {imagem && (
          // eslint-disable-next-line @next/next/no-img-element -- cópia guardada no portal, endereço assinado na hora
          <img src={imagem} alt="" loading="lazy" onError={() => setSemImagem(imagem)} className="w-28 shrink-0 self-stretch object-cover sm:w-44" />
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-1 p-3" aria-busy={carregando}>
          <span className="line-clamp-2 text-sm font-bold">{carregando ? "Buscando a prévia…" : (previa?.titulo ?? url)}</span>
          {previa?.descricao && <span className="line-clamp-2 text-[13px] text-suave">{previa.descricao}</span>}
          <span className="rotulo mt-auto flex items-center gap-1 text-[10px] text-suave">
            {dominio}
            <TbExternalLink size={12} aria-hidden="true" />
          </span>
        </span>
      </a>
    </NodeViewWrapper>
  );
}

export const ImagemPagina = Node.create<{ abaId: string }>({
  name: "imagem",
  group: "block",
  atom: true,
  addOptions: () => ({ abaId: "" }),
  addAttributes: () => ({
    arquivoId: dado("arquivoId"),
    nome: dado("nome", ""),
    tamanho: dado("tamanho", 0),
    legenda: dado("legenda", ""),
    alinhamento: dado("alinhamento", "centro"),
    previa: passageiro,
    ...ENVIO,
  }),
  parseHTML: () => [{ tag: 'div[data-bloco="imagem"]' }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-bloco": "imagem" })],
  addNodeView: () => ReactNodeViewRenderer(ImagemView),
});

export const ArquivoBloco = Node.create<{ abaId: string }>({
  name: "arquivo",
  group: "block",
  atom: true,
  addOptions: () => ({ abaId: "" }),
  addAttributes: () => ({ arquivoId: dado("arquivoId"), nome: dado("nome", ""), tamanho: dado("tamanho", 0), ...ENVIO }),
  parseHTML: () => [{ tag: 'div[data-bloco="arquivo"]' }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-bloco": "arquivo" })],
  addNodeView: () => ReactNodeViewRenderer(ArquivoView),
});

export const CartaoLink = Node.create({
  name: "cartaoLink",
  group: "block",
  atom: true,
  addAttributes: () => ({ url: dado("url", "") }),
  parseHTML: () => [{ tag: 'div[data-bloco="cartao"]' }],
  renderHTML: ({ HTMLAttributes }) => ["div", mergeAttributes(HTMLAttributes, { "data-bloco": "cartao" })],
  addNodeView: () => ReactNodeViewRenderer(CartaoView),
});
