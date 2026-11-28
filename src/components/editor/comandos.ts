import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { exitSuggestion, type SuggestionProps } from "@tiptap/suggestion";

/** Estado do menu "/" entre o plugin do editor e o componente que o desenha. */
export type EstadoComandos = {
  consulta: string;
  trecho: { from: number; to: number };
  onde: () => DOMRect | null;
} | null;

export function criarCanalDeComandos() {
  let estado: EstadoComandos = null;
  let teclado: ((e: KeyboardEvent) => boolean) | null = null;
  let abaPedida: "tarefas" | "grupos" | null = null;
  const ouvintes = new Set<() => void>();
  return {
    /** Qual aba o seletor "{" deve abrir da próxima vez ("/Grupo" pede a de grupos). */
    pedirAba(aba: "tarefas" | "grupos") {
      abaPedida = aba;
    },
    abaPedida: () => abaPedida ?? "tarefas",
    assinar(f: () => void) {
      ouvintes.add(f);
      return () => void ouvintes.delete(f);
    },
    ler: () => estado,
    definir(novo: EstadoComandos) {
      if (!novo) abaPedida = null;
      estado = novo;
      ouvintes.forEach((f) => f());
    },
    /** O componente do menu se registra para responder às teclas. Devolve a função que desfaz. */
    atenderTeclado(f: (e: KeyboardEvent) => boolean) {
      teclado = f;
      return () => {
        teclado = null;
      };
    },
    /** True se o menu usou a tecla. */
    tecla: (e: KeyboardEvent) => teclado?.(e) ?? false,
  };
}
export type CanalDeComandos = ReturnType<typeof criarCanalDeComandos>;

type Opcoes = { canal: CanalDeComandos | null };

/**
 * Um caractere que abre uma lista junto do cursor, no começo de um bloco ou depois de um espaço.
 * "@" fica reservado para a próxima etapa (pessoas).
 */
function criarGatilho(nome: string, caractere: string, prefixos: string[], maximo: number) {
  const chave = new PluginKey(nome);
  return Extension.create<Opcoes>({
    name: nome,
    // Acima das listas, tabelas e alternantes, para Enter e Tab irem para a lista aberta.
    priority: 1000,
    addOptions() {
      return { canal: null };
    },
    onBlur() {
      exitSuggestion(this.editor.view, chave);
    },
    addProseMirrorPlugins() {
      const canal = this.options.canal;
      if (!canal) return [];
      const publicar = (p: SuggestionProps) => canal.definir({ consulta: p.query, trecho: p.range, onde: () => p.clientRect?.() ?? null });
      return [
        Suggestion({
          pluginKey: chave,
          editor: this.editor,
          char: caractere,
          allowedPrefixes: prefixos,
          // "/2 colunas" e os títulos das tarefas têm espaço; a lista se esconde quando não faz sentido.
          allowSpaces: true,
          allow: ({ state, range }) =>
            // O título de um alternante só aceita texto.
            range.to - range.from <= maximo && state.doc.resolve(range.from).parent.type.name !== "detailsSummary",
          render: () => ({
            onStart: publicar,
            onUpdate: publicar,
            onKeyDown: ({ event }) => event.key !== "Escape" && canal.tecla(event),
            onExit: () => canal.definir(null),
          }),
        }),
      ];
    },
  });
}

/** Menu "/". */
export const Comandos = criarGatilho("comandos", "/", [" "], 40);
/** Seletor de tarefas e grupos "{". */
export const Seletor = criarGatilho("seletorDeVinculo", "{", [" ", "("], 120);
