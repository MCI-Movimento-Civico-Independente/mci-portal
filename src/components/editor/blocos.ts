import type { Editor, Range } from "@tiptap/core";
import type { IconType } from "react-icons";
import {
  TbBlockquote,
  TbCaretRight,
  TbH1,
  TbH2,
  TbH3,
  TbInfoCircle,
  TbLetterT,
  TbList,
  TbListCheck,
  TbListNumbers,
  TbSeparatorHorizontal,
  TbTable,
  TbColumns2,
  TbColumns3,
  TbPhoto,
  TbPaperclip,
  TbLink,
} from "react-icons/tb";
import { criarAlternante } from "./blocos-pagina";
import { criarColunas } from "./colunas";
import { inserirBlocos, naTabela } from "./inserir";

/*
 * ÚNICO lugar dos blocos da página: o menu "/", o "Transformar em" do menu de seleção e o
 * menu da alça leem desta lista. Bloco novo = uma linha aqui (e a extensão em extensoes.ts).
 */

/** O que precisa de uma janela ou caixa própria da tela. */
export type AcoesDeMidia = { imagem: () => void; arquivo: () => void; cartao: () => void };

export type Bloco = {
  id: string;
  secao?: "midia";
  /** Insere sem antes converter o bloco atual em texto. */
  direto?: boolean;
  rotulo: string;
  /** Atalho de markdown, mostrado à direita no menu "/". */
  atalho?: string;
  icone: IconType;
  /** Palavras que também encontram o bloco ao filtrar. */
  busca: string;
  /** Aparece em "Transformar em". */
  transforma: boolean;
  /** Aplica ao bloco onde está o cursor. */
  aplicar: (e: Editor, acoes?: AcoesDeMidia) => void;
};

const cadeia = (e: Editor) => e.chain().focus();

export const BLOCOS_DA_PAGINA: Bloco[] = [
  { id: "texto", rotulo: "Texto", icone: TbLetterT, busca: "parágrafo normal", transforma: true, aplicar: (e) => cadeia(e).setParagraph().run() },
  { id: "titulo1", rotulo: "Título 1", atalho: "#", icone: TbH1, busca: "h1 cabeçalho", transforma: true, aplicar: (e) => cadeia(e).setHeading({ level: 1 }).run() },
  { id: "titulo2", rotulo: "Título 2", atalho: "##", icone: TbH2, busca: "h2 cabeçalho", transforma: true, aplicar: (e) => cadeia(e).setHeading({ level: 2 }).run() },
  { id: "titulo3", rotulo: "Título 3", atalho: "###", icone: TbH3, busca: "h3 cabeçalho", transforma: true, aplicar: (e) => cadeia(e).setHeading({ level: 3 }).run() },
  { id: "marcadores", rotulo: "Lista com marcadores", atalho: "-", icone: TbList, busca: "bullet tópicos", transforma: true, aplicar: (e) => cadeia(e).toggleBulletList().run() },
  { id: "numerada", rotulo: "Lista numerada", atalho: "1.", icone: TbListNumbers, busca: "ordenada números", transforma: true, aplicar: (e) => cadeia(e).toggleOrderedList().run() },
  { id: "tarefas", rotulo: "Lista de tarefas", atalho: "[]", icone: TbListCheck, busca: "checklist caixa todo", transforma: true, aplicar: (e) => cadeia(e).toggleTaskList().run() },
  { id: "alternantes", rotulo: "Lista de alternantes", atalho: ">>", icone: TbCaretRight, busca: "toggle recolher expandir detalhes", transforma: false, direto: true, aplicar: (e) => criarAlternante(cadeia(e)).run() },
  { id: "destaque", rotulo: "Frase de destaque", icone: TbInfoCircle, busca: "aviso callout objetivo", transforma: false, aplicar: (e) => cadeia(e).setNode("fraseDestaque").run() },
  { id: "citacao", rotulo: "Citação", atalho: ">", icone: TbBlockquote, busca: "quote", transforma: true, aplicar: (e) => cadeia(e).setBlockquote().run() },
  { id: "divisor", rotulo: "Divisor", atalho: "---", icone: TbSeparatorHorizontal, busca: "linha separador", transforma: false, direto: true, aplicar: (e) => cadeia(e).setHorizontalRule().run() },
  { id: "tabela", rotulo: "Tabela", icone: TbTable, busca: "planilha linhas", transforma: false, direto: true, aplicar: inserirTabela },
  { id: "colunas2", rotulo: "2 colunas", icone: TbColumns2, busca: "duas colunas lado a lado", transforma: false, direto: true, aplicar: (e) => criarColunas(e, 2) },
  { id: "colunas3", rotulo: "3 colunas", icone: TbColumns3, busca: "três colunas lado a lado", transforma: false, direto: true, aplicar: (e) => criarColunas(e, 3) },
  { id: "imagem", secao: "midia", rotulo: "Imagem", icone: TbPhoto, busca: "foto print figura", transforma: false, direto: true, aplicar: (_e, a) => a?.imagem() },
  { id: "arquivo", secao: "midia", rotulo: "Arquivo", icone: TbPaperclip, busca: "anexo pdf docx xlsx pptx", transforma: false, direto: true, aplicar: (_e, a) => a?.arquivo() },
  { id: "cartao", secao: "midia", rotulo: "Link com prévia", icone: TbLink, busca: "cartão url youtube vídeo", transforma: false, direto: true, aplicar: (_e, a) => a?.cartao() },
];

function inserirTabela(e: Editor) {
  const celula = (tipo: string) => ({ type: tipo, content: [{ type: "paragraph" }] });
  const linha = (tipo: string) => ({ type: "tableRow", content: [celula(tipo), celula(tipo), celula(tipo)] });
  inserirBlocos(e, [{ type: "table", content: [linha("tableHeader"), linha("tableCell"), linha("tableCell")] }]);
  // O cursor vai para a primeira célula da tabela que acabou de entrar.
  const antes = e.state.selection.from;
  let primeira = 0;
  e.state.doc.descendants((no, pos) => {
    if (no.type.name === "table" && pos < antes) primeira = pos + 4;
    return true;
  });
  if (primeira) e.commands.setTextSelection(primeira);
}

const NA_CELULA = new Set(["texto", "marcadores", "numerada", "tarefas"]);

/** O bloco pode ser usado onde está o cursor? */
export function cabe(e: Editor, b: Bloco) {
  // Mídia entra depois da tabela; os demais blocos não valem dentro de uma célula.
  if (naTabela(e)) return NA_CELULA.has(b.id) || b.secao === "midia";
  if (b.id === "colunas2" || b.id === "colunas3") return e.state.selection.$from.depth === 1;
  return true;
}

/** Troca o tipo do bloco (ou dos blocos) no trecho: primeiro volta a texto simples, depois aplica. */
export function transformar(e: Editor, bloco: Bloco, trecho?: Range) {
  const c = e.chain().focus();
  if (trecho) c.setTextSelection(trecho);
  c.clearNodes().run();
  if (bloco.id !== "texto") bloco.aplicar(e);
}

const semAcento = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

export const combina = (consulta: string, ...textos: string[]) => semAcento(textos.join(" ")).includes(semAcento(consulta));
