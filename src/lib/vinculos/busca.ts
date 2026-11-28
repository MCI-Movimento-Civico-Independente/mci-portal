import "server-only";
import { podeVerProjeto, type Quem } from "@/lib/auth/projetos";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StatusTarefa } from "@/lib/tarefas-campos";
import { lerCodigo } from "./tipos";

export type TarefaBuscada = {
  id: string;
  numero: number;
  titulo: string;
  status: StatusTarefa;
  grupo: string | null;
  projeto: string | null;
  executor: string | null;
};
export type GrupoBuscado = { id: string; nome: string; cor: string; projeto: string | null };

const MAXIMO = 50;
/** Protege o texto digitado dentro do ILIKE. */
const literal = (t: string) => t.replace(/[\\%_]/g, "\\$&");

/**
 * Tarefas (de primeiro nível) e grupos para o seletor: os do projeto, ou, com `outros`, os dos
 * demais projetos. Busca por título ou código.
 */
export async function buscarVinculaveis(
  pedido: { projetoId: string | null; outros: boolean; q: string },
  quem: Quem,
): Promise<{ tarefas: TarefaBuscada[]; grupos: GrupoBuscado[] }> {
  const db = createAdminClient();
  const q = pedido.q.trim().slice(0, 100);
  const numero = lerCodigo(q);

  let tarefas = db
    .from("tarefas")
    .select("id, numero, titulo, status, projeto_id, grupo:projeto_grupos!grupo_id(nome), projeto:projetos!projeto_id(nome), responsavel:contas!responsavel_id(nome)")
    .is("pai_id", null)
    .order("numero", { ascending: false })
    .limit(MAXIMO);
  let grupos = db.from("projeto_grupos").select("id, nome, cor, projeto_id, projeto:projetos!projeto_id(nome)").order("ordem").limit(MAXIMO);
  if (pedido.projetoId) {
    if (pedido.outros) {
      tarefas = tarefas.or(`projeto_id.is.null,projeto_id.neq.${pedido.projetoId}`);
      grupos = grupos.neq("projeto_id", pedido.projetoId);
    } else {
      tarefas = tarefas.eq("projeto_id", pedido.projetoId);
      grupos = grupos.eq("projeto_id", pedido.projetoId);
    }
  }
  if (numero !== null) tarefas = tarefas.eq("numero", numero);
  else if (q) tarefas = tarefas.ilike("titulo", `%${literal(q)}%`);
  if (q) grupos = grupos.ilike("nome", `%${literal(q)}%`);

  const [t, g] = await Promise.all([tarefas, grupos]);
  if (t.error) throw t.error;
  if (g.error) throw g.error;
  type Nome = { nome: string | null } | null;
  type LinhaT = { id: string; numero: number; titulo: string; status: StatusTarefa; projeto_id: string | null; grupo: Nome; projeto: Nome; responsavel: Nome };
  type LinhaG = { id: string; nome: string; cor: string; projeto_id: string; projeto: Nome };
  return {
    tarefas: (t.data as unknown as LinhaT[])
      .filter((l) => podeVerProjeto(quem, l.projeto_id))
      .map((l) => ({
        id: l.id,
        numero: Number(l.numero),
        titulo: l.titulo,
        status: l.status,
        grupo: l.grupo?.nome ?? null,
        projeto: l.projeto?.nome ?? null,
        executor: l.responsavel?.nome ?? null,
      })),
    grupos: (g.data as unknown as LinhaG[])
      .filter((l) => podeVerProjeto(quem, l.projeto_id))
      .map((l) => ({ id: l.id, nome: l.nome, cor: l.cor, projeto: l.projeto?.nome ?? null })),
  };
}
