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
} from "react-icons/tb";
import { criarAlternante } from "./blocos-pagina";

/*
 * ÚNICO lugar dos blocos da página: o menu "/", o "Transformar em" do menu de seleção e o
 * menu da alça leem desta lista. Bloco novo = uma linha aqui (e a extensão em extensoes.ts).
 */

export type Bloco = {
  id: string;
  rotulo: string;
  /** Atalho de markdown, mostrado à direita no menu "/". */
  atalho?: string;
  icone: IconType;
  /** Palavras que também encontram o bloco ao filtrar. */
  busca: string;
  /** Aparece em "Transformar em". */
  transforma: boolean;
  /** Aplica ao bloco onde está o cursor (que já está como parágrafo simples ou texto). */
  aplicar: (e: Editor) => void;
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
  { id: "alternantes", rotulo: "Lista de alternantes", atalho: ">>", icone: TbCaretRight, busca: "toggle recolher expandir detalhes", transforma: false, aplicar: (e) => criarAlternante(cadeia(e)).run() },
  { id: "destaque", rotulo: "Frase de destaque", icone: TbInfoCircle, busca: "aviso callout objetivo", transforma: false, aplicar: (e) => cadeia(e).setNode("fraseDestaque").run() },
  { id: "citacao", rotulo: "Citação", atalho: ">", icone: TbBlockquote, busca: "quote", transforma: true, aplicar: (e) => cadeia(e).setBlockquote().run() },
  { id: "divisor", rotulo: "Divisor", atalho: "---", icone: TbSeparatorHorizontal, busca: "linha separador", transforma: false, aplicar: (e) => cadeia(e).setHorizontalRule().run() },
];

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
