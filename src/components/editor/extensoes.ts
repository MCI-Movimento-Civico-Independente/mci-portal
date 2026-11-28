import { Extension, type Editor, type Extensions } from "@tiptap/core";
import CharacterCount from "@tiptap/extension-character-count";
import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import Highlight from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import Placeholder, { type PlaceholderOptions } from "@tiptap/extension-placeholder";
import StarterKit, { type StarterKitOptions } from "@tiptap/starter-kit";
import type { IconType } from "react-icons";
import {
  TbArrowBackUp,
  TbArrowForwardUp,
  TbBlockquote,
  TbBold,
  TbCode,
  TbCodeDots,
  TbH2,
  TbH3,
  TbItalic,
  TbLink,
  TbList,
  TbListCheck,
  TbListNumbers,
  TbPhoto,
  TbSeparatorHorizontal,
  TbStrikethrough,
  TbUnderline,
} from "react-icons/tb";
import { LIMITE_CARACTERES, type TipoAnexo } from "@/lib/editor/documento";
import { AtalhoAlternante, Divisor, FraseDestaque } from "./blocos-pagina";
import { Coluna, Colunas, DocumentoPagina } from "./colunas";
import { Comandos, Seletor, type CanalDeComandos } from "./comandos";
import type { DadosDeVinculos } from "./vinculos/dados";
import { GrupoBloco, GrupoMencao, TarefaBloco, TarefaMencao } from "./vinculos/nos";
import { LimitesDaPagina } from "./limites-editor";
import { ArquivoBloco, CartaoLink, ImagemPagina } from "./midia";
import { ImagemAnexo } from "./ImagemAnexo";

/*
 * ÚNICO lugar da lista de extensões e da barra de ferramentas. Há dois conjuntos sobre a
 * mesma base: `criarExtensoes` (tarefas e comentários, com a `BARRA`) e `criarExtensoesPagina`
 * (páginas, com o menu "/" e os blocos de blocos.ts).
 */

export type OpcoesExtensoes = {
  placeholder: string;
  tipo: TipoAnexo;
  tarefaId: string;
  /** Ctrl/Cmd+K: abre o painel de link. */
  aoPedirLink: () => void;
};

/** Uma célula de tabela só leva texto e listas. */
const NA_CELULA = "(paragraph | bulletList | orderedList | taskList)+";

/** Parte comum a todos os editores: texto, listas, link, placeholder e Ctrl/Cmd+K. */
function criarBasico({
  starter,
  placeholder,
  aoPedirLink,
}: {
  starter: Partial<StarterKitOptions>;
  placeholder: Partial<PlaceholderOptions>;
  aoPedirLink: () => void;
}): Extensions {
  return [
    StarterKit.configure({
      link: {
        openOnClick: false,
        autolink: true,
        linkOnPaste: true, // colar uma URL sobre o texto selecionado vira link
        defaultProtocol: "https",
        protocols: ["mailto"],
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
      },
      ...starter,
    }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Placeholder.configure(placeholder),
    Extension.create({
      name: "atalhoLink",
      addKeyboardShortcuts() {
        return {
          "Mod-k": () => {
            aoPedirLink();
            return true;
          },
        };
      },
    }),
  ];
}

/** Descrição das tarefas e comentários. */
export function criarExtensoes({ placeholder, tipo, tarefaId, aoPedirLink }: OpcoesExtensoes): Extensions {
  return [
    ...criarBasico({
      starter: { heading: { levels: [2, 3] } }, // o H1 é o título da tarefa
      placeholder: { placeholder },
      aoPedirLink,
    }),
    ImagemAnexo.configure({ tipo, tarefaId, inline: false, allowBase64: false }),
    CharacterCount.configure({ limit: LIMITE_CARACTERES }),
  ];
}

/**
 * Páginas dos projetos: o básico com os blocos de documento. "{" abre o seletor de tarefas e
 * grupos; "@" (pessoas) fica reservado para a próxima etapa: nada aqui usa esse gatilho.
 */
export function criarExtensoesPagina({
  abaId,
  canal,
  seletor,
  dados,
  aoPedirLink,
  aoRecusar,
}: {
  abaId: string;
  canal: CanalDeComandos;
  /** Canal do seletor "{" e os dados ao vivo das citações. */
  seletor: CanalDeComandos;
  dados: DadosDeVinculos;
  aoPedirLink: () => void;
  /** Um limite da página barrou a mudança. */
  aoRecusar: (mensagem: string) => void;
}): Extensions {
  return [
    ...criarBasico({
      starter: {
        document: false, // trocado pelo DocumentoPagina, que aceita colunas no primeiro nível
        heading: { levels: [1, 2, 3] },
        codeBlock: false, // não faz parte dos blocos desta etapa
        horizontalRule: false, // trocado pelo Divisor, que espera o espaço
        dropcursor: { color: "var(--marca)", width: 2 },
      },
      placeholder: {
        includeChildren: true,
        showOnlyCurrent: true,
        placeholder: ({ node }) => {
          if (node.type.name === "heading") return `Título ${node.attrs.level}`;
          if (node.type.name === "detailsSummary") return "Título do alternante";
          if (node.type.name === "fraseDestaque") return "Frase de destaque";
          return "Digite / para comandos";
        },
      },
      aoPedirLink,
    }),
    Highlight,
    Details.configure({
      persist: true, // a página lembra o que ficou aberto
      renderToggleButton: ({ element, isOpen }) => {
        element.setAttribute("aria-label", isOpen ? "Recolher" : "Expandir");
        element.setAttribute("aria-expanded", String(isOpen));
      },
    }),
    DetailsSummary,
    DetailsContent,
    FraseDestaque,
    Divisor,
    AtalhoAlternante,
    DocumentoPagina,
    Colunas,
    Coluna,
    // A tabela vem dentro de uma caixa que rola na horizontal.
    Table.configure({ resizable: false, renderWrapper: true }),
    TableRow,
    TableHeader.extend({ content: NA_CELULA }),
    TableCell.extend({ content: NA_CELULA }),
    ImagemPagina.configure({ abaId }),
    ArquivoBloco.configure({ abaId }),
    CartaoLink,
    LimitesDaPagina.configure({ aoRecusar }),
    Comandos.configure({ canal }),
    Seletor.configure({ canal: seletor }),
    TarefaBloco.configure({ dados }),
    TarefaMencao.configure({ dados }),
    GrupoBloco.configure({ dados }),
    GrupoMencao.configure({ dados }),
  ];
}

export type Ferramenta = {
  id: string;
  rotulo: string;
  /** Texto do atalho, para o title do botão. */
  atalho?: string;
  icone: IconType;
  /** Botões do mesmo grupo ficam juntos; entre grupos há um separador. */
  grupo: number;
  ativa?: (e: Editor) => boolean;
  pode?: (e: Editor) => boolean;
  executar?: (e: Editor) => void;
  /** Botões que abrem um painel próprio em vez de agir direto. */
  painel?: "link" | "imagem";
};

export const BARRA: Ferramenta[] = [
  { id: "desfazer", rotulo: "Desfazer", atalho: "Ctrl+Z", icone: TbArrowBackUp, grupo: 0, pode: (e) => e.can().undo(), executar: (e) => e.chain().focus().undo().run() },
  { id: "refazer", rotulo: "Refazer", atalho: "Ctrl+Shift+Z", icone: TbArrowForwardUp, grupo: 0, pode: (e) => e.can().redo(), executar: (e) => e.chain().focus().redo().run() },

  { id: "negrito", rotulo: "Negrito", atalho: "Ctrl+B", icone: TbBold, grupo: 1, ativa: (e) => e.isActive("bold"), executar: (e) => e.chain().focus().toggleBold().run() },
  { id: "italico", rotulo: "Itálico", atalho: "Ctrl+I", icone: TbItalic, grupo: 1, ativa: (e) => e.isActive("italic"), executar: (e) => e.chain().focus().toggleItalic().run() },
  { id: "sublinhado", rotulo: "Sublinhado", atalho: "Ctrl+U", icone: TbUnderline, grupo: 1, ativa: (e) => e.isActive("underline"), executar: (e) => e.chain().focus().toggleUnderline().run() },
  { id: "tachado", rotulo: "Tachado", atalho: "Ctrl+Shift+S", icone: TbStrikethrough, grupo: 1, ativa: (e) => e.isActive("strike"), executar: (e) => e.chain().focus().toggleStrike().run() },
  { id: "codigo", rotulo: "Código em linha", atalho: "Ctrl+E", icone: TbCode, grupo: 1, ativa: (e) => e.isActive("code"), executar: (e) => e.chain().focus().toggleCode().run() },

  { id: "titulo2", rotulo: "Título grande (H2)", icone: TbH2, grupo: 2, ativa: (e) => e.isActive("heading", { level: 2 }), executar: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { id: "titulo3", rotulo: "Título médio (H3)", icone: TbH3, grupo: 2, ativa: (e) => e.isActive("heading", { level: 3 }), executar: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },

  { id: "marcadores", rotulo: "Lista com marcadores", atalho: "Ctrl+Shift+8", icone: TbList, grupo: 3, ativa: (e) => e.isActive("bulletList"), executar: (e) => e.chain().focus().toggleBulletList().run() },
  { id: "numerada", rotulo: "Lista numerada", atalho: "Ctrl+Shift+7", icone: TbListNumbers, grupo: 3, ativa: (e) => e.isActive("orderedList"), executar: (e) => e.chain().focus().toggleOrderedList().run() },
  { id: "tarefas", rotulo: "Lista de tarefas", atalho: "Ctrl+Shift+9", icone: TbListCheck, grupo: 3, ativa: (e) => e.isActive("taskList"), executar: (e) => e.chain().focus().toggleTaskList().run() },

  { id: "citacao", rotulo: "Citação", atalho: "Ctrl+Shift+B", icone: TbBlockquote, grupo: 4, ativa: (e) => e.isActive("blockquote"), executar: (e) => e.chain().focus().toggleBlockquote().run() },
  { id: "bloco-codigo", rotulo: "Bloco de código", atalho: "Ctrl+Alt+C", icone: TbCodeDots, grupo: 4, ativa: (e) => e.isActive("codeBlock"), executar: (e) => e.chain().focus().toggleCodeBlock().run() },
  { id: "divisoria", rotulo: "Linha divisória", icone: TbSeparatorHorizontal, grupo: 4, executar: (e) => e.chain().focus().setHorizontalRule().run() },

  { id: "link", rotulo: "Link", atalho: "Ctrl+K", icone: TbLink, grupo: 5, ativa: (e) => e.isActive("link"), painel: "link" },
  { id: "imagem", rotulo: "Imagem", icone: TbPhoto, grupo: 5, painel: "imagem" },
];

/** Botões do menu flutuante ao selecionar texto. */
export const MENU_FLUTUANTE = ["negrito", "italico", "link", "citacao"];
