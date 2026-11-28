// Documento de uma página (JSON do Tiptap): texto puro e validação.
// Sem "server-only": o navegador usa o texto puro; o servidor usa a validação.
import { hrefSeguro, type Documento, type Marca, type No } from "@/lib/editor/documento";
import { PAGINA } from "@/lib/limites";

const MAX_NOS = 20_000;
const MAX_PROFUNDIDADE = 30;

// Para liberar um bloco novo (tabela, colunas, imagem…): inclua aqui e trate em `limparNo`.
const BLOCOS = ["paragraph", "heading", "bulletList", "orderedList", "taskList", "details", "fraseDestaque", "blockquote", "horizontalRule"];
const FILHOS: Record<string, string[]> = {
  doc: BLOCOS,
  paragraph: ["text", "hardBreak"],
  heading: ["text", "hardBreak"],
  fraseDestaque: ["text", "hardBreak"],
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

function limparNo(bruto: unknown, pai: string, profundidade: number, contador: { nos: number }): No {
  if (typeof bruto !== "object" || bruto === null) throw new Recusado();
  const no = bruto as No;
  if (typeof no.type !== "string" || !FILHOS[pai].includes(no.type)) throw new Recusado();
  if (profundidade > MAX_PROFUNDIDADE || ++contador.nos > MAX_NOS) throw new Recusado();

  if (no.type === "text") {
    if (typeof no.text !== "string" || no.text.length === 0) throw new Recusado();
    const marcas = limparMarcas(no.marks);
    return { type: "text", text: no.text, ...(marcas ? { marks: marcas } : {}) };
  }
  if (no.content !== undefined && !Array.isArray(no.content)) throw new Recusado();
  const filhos = (no.content ?? []).map((f) => limparNo(f, no.type, profundidade + 1, contador));
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
    default:
      throw new Recusado();
  }
}

const bytes = (v: unknown) => new TextEncoder().encode(JSON.stringify(v)).length;
const GRANDE = `A página passou do limite de ${PAGINA.conteudoMaxBytes / 1024} KB. Divida o conteúdo em mais páginas.`;

/** Valida o JSON vindo do navegador. Nada é descartado em silêncio: o que não é permitido recusa o salvamento. */
export function validarPagina(bruto: unknown): { doc: Documento } | { erro: string; grande?: boolean } {
  if (typeof bruto !== "object" || bruto === null || (bruto as No).type !== "doc" || !Array.isArray((bruto as No).content)) {
    return { erro: "Conteúdo inválido." };
  }
  if (bytes(bruto) > PAGINA.conteudoMaxBytes) return { erro: GRANDE, grande: true };
  try {
    const contador = { nos: 0 };
    const filhos = (bruto as No).content!.map((f) => limparNo(f, "doc", 1, contador));
    const doc: Documento = { type: "doc", content: filhos.length ? filhos : [{ type: "paragraph" }] };
    // A limpeza acrescenta atributos aos links: confere de novo.
    if (bytes(doc) > PAGINA.conteudoMaxBytes) return { erro: GRANDE, grande: true };
    return { doc };
  } catch (erro) {
    if (erro instanceof Recusado) return { erro: "A página tem um bloco ou uma formatação que ainda não é aceita." };
    throw erro;
  }
}

/** Texto simples, uma linha por bloco: usado na busca e para copiar o que não foi salvo. */
export function textoPagina(doc: Documento | null | undefined): string {
  const linhas: string[] = [];
  const andar = (no: No, prefixo: string) => {
    if (no.type === "paragraph" || no.type === "heading" || no.type === "fraseDestaque" || no.type === "detailsSummary") {
      linhas.push(prefixo + (no.content ?? []).map((n) => (n.type === "hardBreak" ? "\n" : (n.text ?? ""))).join(""));
      return;
    }
    if (no.type === "horizontalRule") {
      linhas.push("---");
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
