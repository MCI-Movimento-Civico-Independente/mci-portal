import type { AvisoXp } from "@/lib/xp-tipos";

// Fila de avisos fora da árvore do React: quem concluiu pode sumir da tela (filtro, janela
// fechada) antes de a resposta chegar, e o aviso aparece mesmo assim.

export type ItemAviso = { id: number; linhas: string[]; destaque: boolean };

const VAZIA: ItemAviso[] = [];
let fila: ItemAviso[] = VAZIA;
let proximo = 1;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

export function ouvirAvisos(f: () => void) {
  ouvintes.add(f);
  return () => void ouvintes.delete(f);
}
export const lerAvisos = () => fila;
export const lerAvisosNoServidor = () => VAZIA;

export function fecharAviso(id: number) {
  fila = fila.filter((a) => a.id !== id);
  avisar();
}

function frases(a: AvisoXp): string[] {
  const linhas: string[] = [];
  if (a.xp > 0) linhas.push(a.voce ? `+${a.xp} XP` : `+${a.xp} XP para ${a.nome}`);
  if (a.limite) linhas.push(`Limite de XP de tarefas de hoje atingido${a.voce ? "" : ` (${a.nome})`}`);
  if (a.nivel !== null) linhas.push(a.voce ? `Você subiu para o nível ${a.nivel}!` : `${a.nome} subiu para o nível ${a.nivel}!`);
  for (const c of a.conquistas) linhas.push(`Nova conquista${a.voce ? "" : ` de ${a.nome}`}: ${c}`);
  if (a.falhou) linhas.push(`Não deu para registrar o XP${a.voce ? "" : ` de ${a.nome}`}. Reabra e conclua de novo.`);
  return linhas;
}

export function anunciarXp(avisos: AvisoXp[] | undefined) {
  if (!avisos?.length) return;
  const destaque = avisos.some((a) => a.nivel !== null || a.conquistas.length > 0);
  const item: ItemAviso = { id: proximo++, linhas: avisos.flatMap(frases), destaque };
  fila = [...fila, item].slice(-4);
  avisar();
  // Nível novo e conquista ficam até a pessoa fechar; o resto some sozinho.
  if (!destaque) window.setTimeout(() => fecharAviso(item.id), 6000);
}
