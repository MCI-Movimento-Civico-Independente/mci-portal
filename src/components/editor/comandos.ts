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
  const ouvintes = new Set<() => void>();
  return {
    assinar(f: () => void) {
      ouvintes.add(f);
      return () => void ouvintes.delete(f);
    },
    ler: () => estado,
    definir(novo: EstadoComandos) {
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

const CHAVE = new PluginKey("comandos");

/** Menu "/": abre no início de um bloco ou depois de um espaço. */
export const Comandos = Extension.create<{ canal: CanalDeComandos | null }>({
  name: "comandos",
  // Acima das listas e alternantes, para o Enter escolher o comando.
  priority: 1000,
  addOptions() {
    return { canal: null };
  },
  onBlur() {
    exitSuggestion(this.editor.view, CHAVE);
  },
  addProseMirrorPlugins() {
    const canal = this.options.canal;
    if (!canal) return [];
    const publicar = (p: SuggestionProps) => canal.definir({ consulta: p.query, trecho: p.range, onde: () => p.clientRect?.() ?? null });
    return [
      Suggestion({
        pluginKey: CHAVE,
        editor: this.editor,
        char: "/",
        // O título de um alternante só aceita texto.
        allow: ({ state, range }) => state.doc.resolve(range.from).parent.type.name !== "detailsSummary",
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
