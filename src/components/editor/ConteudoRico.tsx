"use client";

import { Fragment, useState, type ReactNode } from "react";
import { hrefSeguro, srcExternoSeguro, type Documento, type No } from "@/lib/editor/documento";
import { Lightbox } from "./Lightbox";

/**
 * Exibe o conteúdo do editor sem carregar o editor: lê o JSON direto e monta o HTML.
 * Os links só abrem http/https/mailto, em outra aba e com rel de segurança.
 */
export function ConteudoRico({ doc, className = "" }: { doc: Documento; className?: string }) {
  return <div className={`conteudo-rico ${className}`}>{doc.content.map((no, i) => bloco(no, i))}</div>;
}

function Imagem({ no }: { no: No }) {
  const [ampliada, setAmpliada] = useState(false);
  const bruto = typeof no.attrs?.src === "string" ? no.attrs.src : null;
  const src = bruto && (srcExternoSeguro(bruto) ?? null);
  const alt = typeof no.attrs?.alt === "string" ? no.attrs.alt : "";
  if (!src) return <p className="text-sm text-suave">Imagem indisponível.</p>;
  return (
    <>
      <button type="button" onClick={() => setAmpliada(true)} aria-label={`Ampliar imagem${alt ? `: ${alt}` : ""}`} className="my-2 block max-w-full cursor-zoom-in">
        {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada do Storage ou imagem externa */}
        <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" className="max-h-96 max-w-full" />
      </button>
      {ampliada && <Lightbox src={src} alt={alt} aoFechar={() => setAmpliada(false)} />}
    </>
  );
}

function inline(no: No, i: number): ReactNode {
  if (no.type === "hardBreak") return <br key={i} />;
  if (no.type !== "text" || !no.text) return null;
  let conteudo: ReactNode = no.text;
  for (const marca of no.marks ?? []) {
    switch (marca.type) {
      case "bold":
        conteudo = <strong>{conteudo}</strong>;
        break;
      case "italic":
        conteudo = <em>{conteudo}</em>;
        break;
      case "underline":
        conteudo = <u>{conteudo}</u>;
        break;
      case "strike":
        conteudo = <s>{conteudo}</s>;
        break;
      case "code":
        conteudo = <code>{conteudo}</code>;
        break;
      case "link": {
        const href = hrefSeguro(marca.attrs?.href);
        if (href) {
          conteudo = (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {conteudo}
            </a>
          );
        }
        break;
      }
    }
  }
  return <Fragment key={i}>{conteudo}</Fragment>;
}

function filhos(no: No) {
  return (no.content ?? []).map((n, i) => bloco(n, i));
}

function bloco(no: No, i: number): ReactNode {
  switch (no.type) {
    case "paragraph":
      return <p key={i}>{(no.content ?? []).map(inline)}</p>;
    case "heading":
      return no.attrs?.level === 3 ? <h3 key={i}>{(no.content ?? []).map(inline)}</h3> : <h2 key={i}>{(no.content ?? []).map(inline)}</h2>;
    case "bulletList":
      return <ul key={i}>{filhos(no)}</ul>;
    case "orderedList":
      return (
        <ol key={i} start={typeof no.attrs?.start === "number" ? no.attrs.start : undefined}>
          {filhos(no)}
        </ol>
      );
    case "listItem":
      return <li key={i}>{filhos(no)}</li>;
    case "taskList":
      return (
        <ul key={i} data-type="taskList">
          {filhos(no)}
        </ul>
      );
    case "taskItem":
      return (
        <li key={i} data-type="taskItem" data-checked={no.attrs?.checked === true}>
          <input type="checkbox" checked={no.attrs?.checked === true} disabled readOnly aria-label={no.attrs?.checked === true ? "Feito" : "A fazer"} />
          <div>{filhos(no)}</div>
        </li>
      );
    case "blockquote":
      return <blockquote key={i}>{filhos(no)}</blockquote>;
    case "codeBlock":
      return (
        <pre key={i}>
          <code>{(no.content ?? []).map((n) => n.text ?? "").join("")}</code>
        </pre>
      );
    case "horizontalRule":
      return <hr key={i} />;
    case "image":
      return <Imagem key={i} no={no} />;
    default:
      return null;
  }
}
