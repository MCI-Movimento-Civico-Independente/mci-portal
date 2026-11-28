// Quem pode ver o quê entre projetos. Sem "server-only": é uma regra pura, usada no servidor.

export type Quem = { contaId: string; podeOrg: boolean };

/**
 * Quem é da organização vê todos os projetos (e as tarefas sem projeto). Se um dia houver
 * projetos restritos, a regra entra aqui e vale para anexos, blocos, menções e dependências.
 */
export const podeVerProjeto = (quem: Quem, projetoId: string | null) => quem.podeOrg && projetoId !== undefined;
