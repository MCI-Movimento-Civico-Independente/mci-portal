// Documento do editor rico (JSON do Tiptap): tipos, texto puro e validação.
// Sem "server-only": o navegador usa o texto puro e os tipos; o servidor usa a validação.

export type Marca = { type: string; attrs?: Record<string, unknown> };
export type No = { type: string; attrs?: Record<string, unknown>; content?: No[]; marks?: Marca[]; text?: string };
export type Documento = { type: "doc"; content: No[] };

export const LIMITE_CARACTERES = 50_000;
const LIMITE_JSON = 600_000;
const LIMITE_NOS = 5_000;
const LIMITE_PROFUNDIDADE = 12;

export type TipoAnexo = "tarefa" | "comentario";
const CAMINHO_ANEXO = /^(tarefa|comentario)\/([0-9a-f-]{36})\/([0-9a-f-]{36})\.webp$/i;
export const caminhoDoAnexo = (caminho: string) => CAMINHO_ANEXO.exec(caminho);

export const documentoVazio = (): Documento => ({ type: "doc", content: [{ type: "paragraph" }] });

/** Texto simples (várias linhas) vira documento: usado nas descrições e comentários antigos. */
export function documentoDeTexto(texto: string | null | undefined): Documento {
  const linhas = (texto ?? "").split(/\r?\n/);
  const paragrafos = linhas.map((l): No => (l ? { type: "paragraph", content: [{ type: "text", text: l }] } : { type: "paragraph" }));
  return { type: "doc", content: paragrafos.length ? paragrafos : [{ type: "paragraph" }] };
}

/** Texto puro do documento (busca, prévias e conferência de tamanho). Uma linha por bloco. */
export function textoPuro(doc: Documento | null | undefined): string {
  const linhas: string[] = [];
  const andar = (no: No, prefixo = "") => {
    if (no.type === "text") return;
    if (no.type === "paragraph" || no.type === "heading" || no.type === "codeBlock") {
      linhas.push(prefixo + (no.content ?? []).map((n) => (n.type === "hardBreak" ? "\n" : (n.text ?? ""))).join(""));
      return;
    }
    if (no.type === "horizontalRule") return;
    for (const filho of no.content ?? []) {
      andar(filho, no.type === "taskItem" || no.type === "listItem" ? "• " : prefixo);
    }
  };
  for (const no of doc?.content ?? []) andar(no);
  return linhas.join("\n").trim();
}

export const temImagem = (doc: Documento | null | undefined): boolean => {
  const achou = (no: No): boolean => no.type === "image" || (no.content ?? []).some(achou);
  return (doc?.content ?? []).some(achou);
};

/** Documento sem texto e sem imagem. */
export const estaVazio = (doc: Documento | null | undefined) => textoPuro(doc).length === 0 && !temImagem(doc);

// ---------- validação (servidor) ----------

const BLOCOS = ["paragraph", "heading", "bulletList", "orderedList", "taskList", "blockquote", "codeBlock", "horizontalRule", "image"];
const BLOCOS_DE_ITEM = ["paragraph", "bulletList", "orderedList", "taskList", "blockquote", "codeBlock", "image"];
const INLINE = ["text", "hardBreak"];
const FILHOS: Record<string, string[]> = {
  doc: BLOCOS,
  paragraph: INLINE,
  heading: INLINE,
  bulletList: ["listItem"],
  orderedList: ["listItem"],
  taskList: ["taskItem"],
  listItem: BLOCOS_DE_ITEM,
  taskItem: BLOCOS_DE_ITEM,
  blockquote: BLOCOS_DE_ITEM,
  codeBlock: ["text"],
  horizontalRule: [],
  hardBreak: [],
  image: [],
};

/** Só http, https e mailto. Qualquer outro esquema (javascript:, data:…) é descartado. */
export function hrefSeguro(href: unknown): string | null {
  if (typeof href !== "string" || href.length > 2000) return null;
  try {
    const url = new URL(href.trim());
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function srcExternoSeguro(src: unknown): string | null {
  if (typeof src !== "string" || src.length > 2000) return null;
  try {
    const url = new URL(src.trim());
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

type Contexto = { tipo: TipoAnexo; tarefaId: string; nos: number };

const MARCAS = ["bold", "italic", "underline", "strike", "code", "link"];

function limparMarcas(marcas: unknown): Marca[] | undefined {
  if (!Array.isArray(marcas)) return undefined;
  const saida: Marca[] = [];
  for (const m of marcas) {
    const tipo = (m as Marca)?.type;
    if (typeof tipo !== "string" || !MARCAS.includes(tipo)) continue;
    if (tipo === "link") {
      const href = hrefSeguro((m as Marca).attrs?.href);
      if (href) saida.push({ type: "link", attrs: { href, target: "_blank", rel: "noopener noreferrer nofollow" } });
    } else if (!saida.some((x) => x.type === tipo)) {
      saida.push({ type: tipo });
    }
  }
  return saida.length ? saida : undefined;
}

function limparNo(bruto: unknown, pai: string, profundidade: number, ctx: Contexto): No | null {
  if (typeof bruto !== "object" || bruto === null || profundidade > LIMITE_PROFUNDIDADE) return null;
  const no = bruto as No;
  if (typeof no.type !== "string" || !(FILHOS[pai] ?? []).includes(no.type)) return null;
  if (++ctx.nos > LIMITE_NOS) return null;

  if (no.type === "text") {
    if (typeof no.text !== "string" || no.text.length === 0) return null;
    const marcas = pai === "codeBlock" ? undefined : limparMarcas(no.marks);
    return { type: "text", text: no.text, ...(marcas ? { marks: marcas } : {}) };
  }
  if (no.type === "hardBreak" || no.type === "horizontalRule") return { type: no.type };

  if (no.type === "image") {
    const alt = typeof no.attrs?.alt === "string" ? no.attrs.alt.slice(0, 200) : undefined;
    const caminho = typeof no.attrs?.path === "string" ? no.attrs.path : null;
    if (caminho) {
      const m = caminhoDoAnexo(caminho);
      // O arquivo precisa ser do mesmo tipo de uso e da mesma tarefa deste conteúdo.
      if (!m || m[1].toLowerCase() !== ctx.tipo || m[2].toLowerCase() !== ctx.tarefaId.toLowerCase()) return null;
      return { type: "image", attrs: { path: caminho, ...(alt ? { alt } : {}) } };
    }
    const src = srcExternoSeguro(no.attrs?.src);
    return src ? { type: "image", attrs: { src, ...(alt ? { alt } : {}) } } : null;
  }

  const filhos: No[] = [];
  for (const f of Array.isArray(no.content) ? no.content : []) {
    const limpo = limparNo(f, no.type, profundidade + 1, ctx);
    if (limpo) filhos.push(limpo);
  }

  switch (no.type) {
    case "paragraph":
      return filhos.length ? { type: "paragraph", content: filhos } : { type: "paragraph" };
    case "heading": {
      const nivel = no.attrs?.level === 3 ? 3 : 2;
      return { type: "heading", attrs: { level: nivel }, ...(filhos.length ? { content: filhos } : {}) };
    }
    case "codeBlock": {
      const linguagem = typeof no.attrs?.language === "string" && /^[\w+#-]{1,30}$/.test(no.attrs.language) ? no.attrs.language : null;
      return { type: "codeBlock", ...(linguagem ? { attrs: { language: linguagem } } : {}), ...(filhos.length ? { content: filhos } : {}) };
    }
    case "bulletList":
    case "orderedList":
    case "taskList": {
      if (filhos.length === 0) return null;
      const inicio = no.type === "orderedList" && Number.isInteger(no.attrs?.start) ? Math.min(Math.max(no.attrs!.start as number, 1), 9999) : null;
      return { type: no.type, ...(inicio ? { attrs: { start: inicio } } : {}), content: filhos };
    }
    case "listItem":
    case "taskItem": {
      const conteudo = filhos.length ? filhos : [{ type: "paragraph" }];
      return no.type === "taskItem"
        ? { type: "taskItem", attrs: { checked: no.attrs?.checked === true }, content: conteudo }
        : { type: "listItem", content: conteudo };
    }
    case "blockquote":
      return { type: "blockquote", content: filhos.length ? filhos : [{ type: "paragraph" }] };
    default:
      return null;
  }
}

/** Valida o JSON vindo do navegador: mantém só os nós e marcas permitidos e confere os limites. */
export function validarDocumento(bruto: unknown, tipo: TipoAnexo, tarefaId: string): { doc: Documento } | { erro: string } {
  if (typeof bruto !== "object" || bruto === null || (bruto as No).type !== "doc") return { erro: "Conteúdo inválido." };
  if (JSON.stringify(bruto).length > LIMITE_JSON) return { erro: "O conteúdo é grande demais." };
  const ctx: Contexto = { tipo, tarefaId, nos: 0 };
  const filhos: No[] = [];
  for (const f of Array.isArray((bruto as No).content) ? (bruto as No).content! : []) {
    const limpo = limparNo(f, "doc", 1, ctx);
    if (limpo) filhos.push(limpo);
  }
  const doc: Documento = { type: "doc", content: filhos.length ? filhos : [{ type: "paragraph" }] };
  if (textoPuro(doc).length > LIMITE_CARACTERES) return { erro: `O texto pode ter no máximo ${LIMITE_CARACTERES.toLocaleString("pt-BR")} caracteres.` };
  return { doc };
}
