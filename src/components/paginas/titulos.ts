import { renomearAbaAction } from "@/app/org/projetos/acoes-abas";

// O título da página é o nome da aba. Este estado, fora do React, liga os dois: editar um
// muda o outro na hora, e o salvamento continua mesmo se a pessoa trocar de aba.

let valores: Record<string, string> = {};
/** Último nome que o servidor confirmou (para voltar atrás). */
const confirmados: Record<string, string> = {};
const esperando = new Map<string, number>();
const enviando = new Set<string>();
const ouvintes = new Set<() => void>();
let erro: string | null = null;

const avisar = () => ouvintes.forEach((f) => f());
function definir(id: string, titulo: string) {
  if (valores[id] === titulo) return;
  valores = { ...valores, [id]: titulo };
  avisar();
}

export function ouvirTitulos(f: () => void) {
  ouvintes.add(f);
  return () => void ouvintes.delete(f);
}
export const lerTitulos = () => valores;
export const lerErroDeTitulo = () => erro;

/** Nome vindo do servidor. Não passa por cima do que a pessoa está digitando. */
export function tituloDoServidor(id: string, titulo: string) {
  if (esperando.has(id) || enviando.has(id)) return;
  confirmados[id] = titulo;
  definir(id, titulo);
}

async function salvar(id: string) {
  window.clearTimeout(esperando.get(id));
  esperando.delete(id);
  const titulo = valores[id]?.trim();
  if (!titulo || titulo === confirmados[id]) return;
  enviando.add(id);
  let falha: string | null = null;
  try {
    falha = (await renomearAbaAction(id, titulo)).erro ?? null;
  } catch {
    falha = "Não deu para renomear a página.";
  }
  enviando.delete(id);
  if (!falha) confirmados[id] = titulo;
  else if (!esperando.has(id) && confirmados[id] !== undefined) definir(id, confirmados[id]);
  erro = falha;
  avisar();
}

export function renomear(id: string, titulo: string, atrasoMs = 0) {
  erro = null;
  definir(id, titulo);
  window.clearTimeout(esperando.get(id));
  esperando.set(id, window.setTimeout(() => void salvar(id), atrasoMs));
}

/** Ao sair do campo: salva na hora; nome vazio volta ao anterior. */
export function concluirTitulo(id: string) {
  if (valores[id] !== undefined && !valores[id].trim() && confirmados[id] !== undefined) {
    window.clearTimeout(esperando.get(id));
    esperando.delete(id);
    definir(id, confirmados[id]);
  } else if (esperando.has(id)) {
    void salvar(id);
  }
}
