// Busca de uma página externa com limites: 5 s no total, no máximo 3 redirecionamentos, resposta
// curta e conexão só com IP público (conferido na hora de conectar, para o DNS não enganar).
import { lookup } from "node:dns";
import { get as getHttp, type IncomingMessage } from "node:http";
import { get as getHttps } from "node:https";
import type { LookupFunction } from "node:net";
import type { Readable } from "node:stream";
import { createBrotliDecompress, createGunzip, createInflate } from "node:zlib";
import { ipPublico, urlPermitida } from "./rede";

export const TEMPO_MAX_MS = 5000;
export const MAX_REDIRECIONAMENTOS = 3;
const MAX_BYTES = 768 * 1024;

const buscaSegura: LookupFunction = (nome, opcoes, responder) => {
  lookup(nome, { all: true }, (erro, enderecos) => {
    if (erro) return responder(erro, "", 4);
    if (!enderecos.length || enderecos.some((e) => !ipPublico(e.address))) {
      return responder(new Error("Endereço não permitido."), "", 4);
    }
    if (opcoes.all) responder(null, enderecos);
    else responder(null, enderecos[0].address, enderecos[0].family);
  });
};

export type Opcoes = {
  /** Limite do corpo (já descomprimido). */
  maxBytes: number;
  /** Precisa vir inteiro (imagem): passar do limite é erro. Senão, para no fim do <head>. */
  inteiro?: boolean;
  /** Confere o tipo antes de baixar o corpo. */
  aceita?: (tipo: string) => boolean;
  accept: string;
};

const PAGINA_HTML: Opcoes = { maxBytes: MAX_BYTES, accept: "text/html,application/xhtml+xml,application/json;q=0.9" };

function pedir(url: URL, sinal: AbortSignal, accept: string): Promise<IncomingMessage> {
  return new Promise((ok, falha) => {
    const get = url.protocol === "https:" ? getHttps : getHttp;
    get(
      url,
      {
        signal: sinal,
        lookup: buscaSegura,
        agent: false, // conexão nova, sempre passando pela conferência do endereço
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; PreviaDeLinks/1.0)",
          accept,
          "accept-language": "pt-BR,pt;q=0.9,en;q=0.5",
          "accept-encoding": "gzip, deflate, br",
        },
      },
      ok,
    ).on("error", falha);
  });
}

/** Lê o corpo até o limite de tamanho (nas páginas, basta chegar ao fim do <head>). */
function ler(resposta: IncomingMessage, sinal: AbortSignal, { maxBytes, inteiro }: Opcoes): Promise<Buffer> {
  const codificacao = resposta.headers["content-encoding"];
  const descompressor =
    codificacao === "gzip" ? createGunzip() : codificacao === "br" ? createBrotliDecompress() : codificacao === "deflate" ? createInflate() : null;
  const corpo: Readable = descompressor ? resposta.pipe(descompressor) : resposta;

  return new Promise((ok, falha) => {
    const partes: Buffer[] = [];
    let total = 0;
    const terminar = () => {
      sinal.removeEventListener("abort", abortar);
      resposta.destroy();
      ok(Buffer.concat(partes));
    };
    const abortar = () => {
      resposta.destroy();
      falha(new Error("A página demorou demais."));
    };
    sinal.addEventListener("abort", abortar, { once: true });
    corpo.on("data", (parte: Buffer) => {
      partes.push(parte);
      total += parte.length;
      if (inteiro && total > maxBytes) {
        sinal.removeEventListener("abort", abortar);
        resposta.destroy();
        falha(new Error("Arquivo grande demais."));
      } else if (!inteiro && (total >= maxBytes || parte.includes("</head>"))) terminar();
    });
    corpo.on("end", terminar);
    corpo.on("error", falha);
    resposta.on("error", falha);
  });
}

export type Resposta = { url: URL; tipo: string; corpo: Buffer };

export async function buscarExterno(inicio: string, opcoes: Opcoes = PAGINA_HTML): Promise<Resposta> {
  const sinal = AbortSignal.timeout(TEMPO_MAX_MS);
  let url = urlPermitida(inicio);
  for (let saltos = 0; url; saltos++) {
    const resposta = await pedir(url, sinal, opcoes.accept);
    const status = resposta.statusCode ?? 0;
    const destino = resposta.headers.location;
    if (status >= 300 && status < 400 && destino) {
      resposta.destroy();
      if (saltos >= MAX_REDIRECIONAMENTOS) throw new Error("Redirecionamentos demais.");
      url = urlPermitida(new URL(destino, url).toString());
      continue;
    }
    if (status < 200 || status >= 300) {
      resposta.destroy();
      throw new Error(`Resposta ${status}.`);
    }
    const tipo = resposta.headers["content-type"] ?? "";
    const declarado = Number(resposta.headers["content-length"] ?? 0);
    if ((opcoes.aceita && !opcoes.aceita(tipo)) || (opcoes.inteiro && declarado > opcoes.maxBytes)) {
      resposta.destroy();
      throw new Error("Tipo ou tamanho não aceito.");
    }
    return { url, tipo, corpo: await ler(resposta, sinal, opcoes) };
  }
  throw new Error("Endereço não permitido.");
}
