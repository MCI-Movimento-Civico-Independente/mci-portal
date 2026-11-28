/** O que a tela avisa depois de uma conclusão, por pessoa. */
export type AvisoXp = {
  /** É a própria pessoa que está usando o portal. */
  voce: boolean;
  nome: string;
  xp: number;
  limite: boolean;
  /** Novo nível, quando subiu. */
  nivel: number | null;
  conquistas: string[];
  /** Algum registro de XP não foi gravado (concluir de novo tenta outra vez sem duplicar). */
  falhou: boolean;
};
