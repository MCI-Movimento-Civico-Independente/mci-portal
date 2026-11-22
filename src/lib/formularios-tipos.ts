// Tipos e resolução de formulários. Sem "server-only": o formulário de nova tarefa
// (client) usa a mesma regra do servidor para escolher o formulário.

export type FormularioView = {
  id: string;
  nome: string;
  padrao: boolean;
  descricao: string | null;
  /** Chaves dos campos configuráveis que o formulário inclui. */
  campos: string[];
  /** Slugs dos comitês para os quais este é o formulário padrão. */
  comites: string[];
};

/** Formulário de um comitê: o dele, ou o Padrão geral. */
export function resolverFormulario(
  formularios: FormularioView[],
  comiteSlug: string | null | undefined,
): FormularioView | undefined {
  const doComite = comiteSlug ? formularios.find((f) => f.comites.includes(comiteSlug)) : undefined;
  return doComite ?? formularios.find((f) => f.padrao);
}
