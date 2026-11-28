// Documento de uma página (JSON do Tiptap): texto puro e validação.
// Sem "server-only": o navegador usa o texto puro; o servidor usa a validação.
import { hrefSeguro, type Documento, type Marca, type No } from "@/lib/editor/documento";
import { PAGINA, TABELA } from "@/lib/limites";
import { NOS_DE_REFERENCIA, referenciaDe, type Rotulo } from "@/lib/vinculos/referencias";
import { extensaoDe, nomeLimpo, type Especie } from "./arquivos-tipos";

const MAX_NOS = 20_000;
const MAX_PROFUNDIDADE = 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Para liberar um bloco novo: inclua aqui e trate em `limparNo`.
const BLOCOS = [
  "paragraph", "heading", "bulletList", "orderedList", "taskList", "details", "fraseDestaque", "blockquote", "horizontalRule",
  "table", "imagem", "arquivo", "cartaoLink", "tarefaBloco", "grupoBloco",
];
/** O que cabe numa linha de texto (as menções de tarefa e grupo são parte da frase). */
const NA_LINHA = ["text", "hardBreak", "tarefaMencao", "grupoMencao"];
const NA_CELULA = ["paragraph", "bulletList", "orderedList", "taskList"];
const FILHOS: Record<string, string[]> = {
  // Colunas só no primeiro nível: assim nunca há colunas dentro de colunas.
  doc: [...BLOCOS, "colunas"],
  colunas: ["coluna"],
  coluna: BLOCOS,
  table: ["tableRow"],
  tableRow: ["tableCell", "tableHeader"],
  tableCell: NA_CELULA,
  tableHeader: NA_CELULA,
  imagem: [],
  arquivo: [],
  cartaoLink: [],
  paragraph: NA_LINHA,
  heading: NA_LINHA,
  fraseDestaque: NA_LINHA,
  tarefaBloco: [],
  tarefaMencao: [],
  grupoBloco: [],
  grupoMencao: [],
  bulletList: ["listItem"],
  orderedList: ["listItem"],
  taskList: ["taskItem"],
  listItem: BLOCOS,
  taskItem: BLOCOS,
  blockquote: BLOCOS,
  details: ["detailsSummary", "detailsContent"],
  detailsSummary: ["text"],
  detailsContent: BLOCOS,
  horizontalRule: [],
  hardBreak: [],
};
const MARCAS = ["bold", "italic", "underline", "strike", "code", "link", "highlight"];

class Recusado extends Error {}

export type AnexoCitado = { id: string; especie: Especie };
type Contexto = { nos: number; anexos: AnexoCitado[]; imagens: number };

const texto = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const inteiro = (v: unknown, min: number, max: number, padrao: number) =>
  typeof v === "number" && Number.isInteger(v) ? Math.min(Math.max(v, min), max) : padrao;

/** Imagem ou arquivo: precisa apontar para um upload (o servidor confere se é do projeto). */
function anexo(no: No, especie: Especie, ctx: Contexto) {
  const id = no.attrs?.arquivoId;
  if (typeof id !== "string" || !UUID.test(id)) throw new Recusado();
  ctx.anexos.push({ id: id.toLowerCase(), especie });
  return {
    arquivoId: id.toLowerCase(),
    nome: nomeLimpo(texto(no.attrs?.nome, 200)),
    tamanho: inteiro(no.attrs?.tamanho, 0, 100_000_000, 0),
  };
}

function limparMarcas(marcas: unknown): Marca[] | undefined {
  if (marcas === undefined) return undefined;
  if (!Array.isArray(marcas)) throw new Recusado();
  const saida: Marca[] = [];
  for (const m of marcas as Marca[]) {
    if (typeof m?.type !== "string" || !MARCAS.includes(m.type)) throw new Recusado();
    if (m.type === "link") {
      // Link com endereço não permitido perde o link e mantém o texto.
      const href = hrefSeguro(m.attrs?.href);
      if (href) saida.push({ type: "link", attrs: { href, target: "_blank", rel: "noopener noreferrer nofollow" } });
    } else if (!saida.some((x) => x.type === m.type)) {
      saida.push({ type: m.type });
    }
  }
  return saida.length ? saida : undefined;
}

function limparNo(bruto: unknown, pai: string, profundidade: number, ctx: Contexto): No {
  if (typeof bruto !== "object" || bruto === null) throw new Recusado();
  const no = bruto as No;
  if (typeof no.type !== "string" || !FILHOS[pai].includes(no.type)) throw new Recusado();
  if (profundidade > MAX_PROFUNDIDADE || ++ctx.nos > MAX_NOS) throw new Recusado();

  if (no.type === "text") {
    if (typeof no.text !== "string" || no.text.length === 0) throw new Recusado();
    const marcas = limparMarcas(no.marks);
    return { type: "text", text: no.text, ...(marcas ? { marks: marcas } : {}) };
  }
  if (no.content !== undefined && !Array.isArray(no.content)) throw new Recusado();
  const filhos = (no.content ?? []).map((f) => limparNo(f, no.type, profundidade + 1, ctx));
  const comFilhos = (extra: Partial<No> = {}): No => ({ type: no.type, ...extra, ...(filhos.length ? { content: filhos } : {}) });
  const exigirFilhos = () => {
    if (filhos.length === 0) throw new Recusado();
  };

  switch (no.type) {
    case "paragraph":
    case "fraseDestaque":
    case "detailsSummary":
      return comFilhos();
    case "hardBreak":
    case "horizontalRule":
      return { type: no.type };
    case "heading": {
      const nivel = no.attrs?.level;
      return comFilhos({ attrs: { level: nivel === 2 || nivel === 3 ? nivel : 1 } });
    }
    case "bulletList":
    case "taskList":
    case "blockquote":
    case "detailsContent":
      exigirFilhos();
      return comFilhos();
    case "orderedList": {
      exigirFilhos();
      const inicio = Number.isInteger(no.attrs?.start) ? Math.min(Math.max(no.attrs!.start as number, 1), 9999) : 1;
      return comFilhos({ attrs: { start: inicio } });
    }
    case "listItem":
    case "taskItem":
      if (filhos[0]?.type !== "paragraph") throw new Recusado();
      return comFilhos(no.type === "taskItem" ? { attrs: { checked: no.attrs?.checked === true } } : {});
    case "details":
      if (filhos.length !== 2 || filhos[0].type !== "detailsSummary" || filhos[1].type !== "detailsContent") throw new Recusado();
      return comFilhos({ attrs: { open: no.attrs?.open === true } });
    case "table": {
      exigirFilhos();
      if (filhos.length > TABELA.maxLinhas) throw new Recusado();
      return comFilhos();
    }
    case "tableRow": {
      const colunas = filhos.reduce((n, c) => n + ((c.attrs?.colspan as number) ?? 1), 0);
      if (colunas > TABELA.maxColunas) throw new Recusado();
      return comFilhos();
    }
    case "tableCell":
    case "tableHeader":
      exigirFilhos();
      return comFilhos({
        attrs: {
          colspan: inteiro(no.attrs?.colspan, 1, TABELA.maxColunas, 1),
          rowspan: inteiro(no.attrs?.rowspan, 1, TABELA.maxLinhas, 1),
        },
      });
    case "colunas":
      if (filhos.length < 2 || filhos.length > 3) throw new Recusado();
      return comFilhos();
    case "coluna": {
      exigirFilhos();
      const l = no.attrs?.largura;
      const largura = typeof l === "number" && Number.isFinite(l) ? Math.round(Math.min(Math.max(l, 10), 90) * 10) / 10 : 50;
      return comFilhos({ attrs: { largura } });
    }
    case "imagem": {
      if (++ctx.imagens > PAGINA.maxImagens) throw new Recusado();
      const alinhamento = no.attrs?.alinhamento;
      return {
        type: "imagem",
        attrs: {
          ...anexo(no, "imagem", ctx),
          legenda: texto(no.attrs?.legenda, 300),
          alinhamento: alinhamento === "esquerda" || alinhamento === "total" ? alinhamento : "centro",
        },
      };
    }
    case "arquivo": {
      const dados = anexo(no, "arquivo", ctx);
      if (!extensaoDe(dados.nome)) throw new Recusado();
      return { type: "arquivo", attrs: dados };
    }
    case "cartaoLink": {
      const url = hrefSeguro(no.attrs?.url);
      if (!url || !/^https?:/.test(url)) throw new Recusado();
      return { type: "cartaoLink", attrs: { url } };
    }
    case "tarefaBloco":
    case "tarefaMencao":
    case "grupoBloco":
    case "grupoMencao": {
      // Guarda só o id: nome, status e o resto vêm ao vivo do quadro.
      const atributo = NOS_DE_REFERENCIA[no.type].atributo;
      const id = no.attrs?.[atributo];
      if (typeof id !== "string" || !UUID.test(id)) throw new Recusado();
      return { type: no.type, attrs: { [atributo]: id.toLowerCase() } };
    }
    default:
      throw new Recusado();
  }
}

const bytes = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).length;
const GRANDE = `A página passou do limite de ${PAGINA.conteudoMaxBytes / 1024} KB. Divida o conteúdo em mais páginas.`;

/** Valida o JSON vindo do navegador. Nada é descartado em silêncio: o que não é permitido recusa o salvamento. */
export function validarPagina(bruto: unknown): { doc: Documento; anexos: AnexoCitado[] } | { erro: string; grande?: boolean } {
  if (typeof bruto !== "object" || bruto === null || (bruto as No).type !== "doc" || !Array.isArray((bruto as No).content)) {
    return { erro: "Conteúdo inválido." };
  }
  if (bytes(bruto) > PAGINA.conteudoMaxBytes) return { erro: GRANDE, grande: true };
  try {
    const ctx: Contexto = { nos: 0, anexos: [], imagens: 0 };
    const filhos = (bruto as No).content!.map((f) => limparNo(f, "doc", 1, ctx));
    const doc: Documento = { type: "doc", content: filhos.length ? filhos : [{ type: "paragraph" }] };
    // A limpeza acrescenta atributos aos links: confere de novo.
    if (bytes(doc) > PAGINA.conteudoMaxBytes) return { erro: GRANDE, grande: true };
    return { doc, anexos: ctx.anexos };
  } catch (erro) {
    if (erro instanceof Recusado) return { erro: "A página tem um bloco ou uma formatação que ainda não é aceita." };
    throw erro;
  }
}

/** Texto simples, uma linha por bloco: usado na busca e para copiar o que não foi salvo. */
export function textoPagina(doc: Documento | null | undefined, rotulo: Rotulo = () => ""): string {
  const linhas: string[] = [];
  const deLinha = (n: No) => {
    const r = referenciaDe(n);
    return r ? rotulo(r.tipo, r.id) : n.type === "hardBreak" ? "\n" : (n.text ?? "");
  };
  const andar = (no: No, prefixo: string) => {
    if (no.type === "paragraph" || no.type === "heading" || no.type === "fraseDestaque" || no.type === "detailsSummary") {
      linhas.push(prefixo + (no.content ?? []).map(deLinha).join(""));
      return;
    }
    if (no.type === "horizontalRule") {
      linhas.push("---");
      return;
    }
    const citacao = referenciaDe(no);
    if (citacao) {
      const t = rotulo(citacao.tipo, citacao.id);
      if (t) linhas.push(prefixo + t);
      return;
    }
    if (no.type === "imagem" || no.type === "arquivo" || no.type === "cartaoLink") {
      const t = no.type === "imagem" ? no.attrs?.legenda : no.type === "arquivo" ? no.attrs?.nome : no.attrs?.url;
      if (typeof t === "string" && t) linhas.push(prefixo + t);
      return;
    }
    (no.content ?? []).forEach((filho, i) => {
      const marcador =
        no.type === "listItem" ? "- " : no.type === "taskItem" ? (no.attrs?.checked ? "[x] " : "[ ] ") : "";
      andar(filho, i === 0 && marcador ? prefixo + marcador : prefixo);
    });
  };
  for (const no of doc?.content ?? []) andar(no, "");
  return linhas.join("\n").trim();
}
