// Pergunta "sim ou não" que qualquer parte da tela pode fazer. Fora da árvore do React: quem
// pergunta pode sumir da tela (filtro, aba) enquanto a janela está aberta.

type Pergunta = { mensagem: string; responder: (sim: boolean) => void };

let atual: Pergunta | null = null;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

export function ouvirConfirmacao(f: () => void) {
  ouvintes.add(f);
  return () => void ouvintes.delete(f);
}
export const lerConfirmacao = () => atual;

export function confirmar(mensagem: string): Promise<boolean> {
  atual?.responder(false);
  return new Promise((resolver) => {
    const pergunta: Pergunta = {
      mensagem,
      responder: (sim) => {
        if (atual !== pergunta) return;
        atual = null;
        avisar();
        resolver(sim);
      },
    };
    atual = pergunta;
    avisar();
  });
}

/** Chama a ação; se o servidor pedir confirmação, pergunta e repete. Null: a pessoa desistiu. */
export async function comConfirmacao<T extends { confirmar?: string }>(acao: (forcar: boolean) => Promise<T>): Promise<T | null> {
  const r = await acao(false);
  if (!r.confirmar) return r;
  return (await confirmar(r.confirmar)) ? acao(true) : null;
}
