"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { registrarEvento } from "@/lib/atividade";
import { getSessao } from "@/lib/auth/sessao";
import { listarFormularios } from "@/lib/formularios";
import { resolverFormulario } from "@/lib/formularios-tipos";
import { listarGrupos } from "@/lib/grupos";
import { projetoPorId } from "@/lib/organizacao";
import { criarTarefa, tarefaPorId } from "@/lib/tarefas";
import { criarDependencia, listarDependencias, removerDependencia } from "@/lib/vinculos/dependencias";
import { mencoesDe, type Mencao } from "@/lib/vinculos/servidor";
import { codigo, type Dependencia } from "@/lib/vinculos/tipos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FALHOU = "Algo deu errado. Tente de novo em alguns minutos.";

// Server Actions são endpoints públicos: cada uma confere sessão e papel de novo.
async function exigirOrg() {
  const sessao = await getSessao();
  if (!sessao) redirect("/login?next=/org/tarefas");
  if (!sessao.podeOrg) redirect("/comunidade");
  return sessao;
}

export async function carregarVinculosDaTarefaAction(
  tarefaId: string,
): Promise<{ dependencias: Dependencia[]; mencoes: Mencao[] } | { erro: string }> {
  const sessao = await exigirOrg();
  if (!UUID.test(tarefaId)) return { erro: "Tarefa inválida." };
  try {
    const quem = { contaId: sessao.conta.id, podeOrg: sessao.podeOrg };
    const [dependencias, mencoes] = await Promise.all([listarDependencias(tarefaId), mencoesDe("tarefa", tarefaId, quem)]);
    return { dependencias, mencoes };
  } catch (erro) {
    console.error("Falha ao carregar os vínculos da tarefa:", erro);
    return { erro: "Não deu para carregar as dependências e menções." };
  }
}

export async function adicionarDependenciaAction(tarefaId: string, dependeDeId: string): Promise<{ erro?: string; aviso?: string }> {
  const sessao = await exigirOrg();
  if (!UUID.test(tarefaId) || !UUID.test(dependeDeId)) return { erro: "Pedido inválido." };
  if (tarefaId === dependeDeId) return { erro: "Uma tarefa não pode depender dela mesma." };
  try {
    const [tarefa, outra] = await Promise.all([tarefaPorId(tarefaId), tarefaPorId(dependeDeId)]);
    if (!tarefa || !outra) return { erro: "Tarefa não encontrada." };
    const r = await criarDependencia(tarefaId, dependeDeId, sessao.conta.id);
    if (r === "ciclo") {
      return { erro: `Isso criaria um ciclo: ${codigo(outra.numero)} já depende de ${codigo(tarefa.numero)}, direta ou indiretamente.` };
    }
    if (r === "repetida") return { erro: "Essa dependência já existe." };
    if (r === "nao_achou") return { erro: "Tarefa não encontrada." };
    await registrarEvento({
      tarefa_id: tarefaId,
      autor_id: sessao.conta.id,
      tipo: "campo",
      campo: "Dependência",
      para: `${codigo(outra.numero)} ${outra.titulo}`,
    });
    revalidatePath("/org", "layout");
    return { aviso: `${codigo(tarefa.numero)} agora depende de ${codigo(outra.numero)}.` };
  } catch (erro) {
    console.error("Falha ao criar a dependência:", erro);
    return { erro: FALHOU };
  }
}

export async function removerDependenciaAction(tarefaId: string, dependeDeId: string): Promise<{ erro?: string }> {
  const sessao = await exigirOrg();
  if (!UUID.test(tarefaId) || !UUID.test(dependeDeId)) return { erro: "Pedido inválido." };
  try {
    const outra = await tarefaPorId(dependeDeId);
    if (await removerDependencia(tarefaId, dependeDeId)) {
      await registrarEvento({
        tarefa_id: tarefaId,
        autor_id: sessao.conta.id,
        tipo: "campo",
        campo: "Dependência",
        de: outra ? `${codigo(outra.numero)} ${outra.titulo}` : "tarefa removida",
      });
    }
    revalidatePath("/org", "layout");
    return {};
  } catch (erro) {
    console.error("Falha ao remover a dependência:", erro);
    return { erro: FALHOU };
  }
}

/** "Criar tarefa 'x'" no seletor da página: entra no grupo escolhido, com os campos padrão. */
export async function criarTarefaNoQuadroAction(projetoId: string, grupoId: string, titulo: string): Promise<{ erro?: string; id?: string }> {
  const sessao = await exigirOrg();
  const nome = typeof titulo === "string" ? titulo.trim() : "";
  if (!UUID.test(projetoId) || !UUID.test(grupoId)) return { erro: "Pedido inválido." };
  if (!nome) return { erro: "Dê um assunto para a tarefa." };
  if (nome.length > 200) return { erro: "O assunto pode ter no máximo 200 caracteres." };
  try {
    const [projeto, grupos, formularios] = await Promise.all([projetoPorId(projetoId), listarGrupos(projetoId), listarFormularios()]);
    if (!projeto || projeto.status !== "ativo") return { erro: "Projeto inválido ou arquivado." };
    if (!grupos.some((g) => g.id === grupoId)) return { erro: "O grupo precisa ser do projeto." };
    const id = await criarTarefa(sessao.conta.id, {
      titulo: nome,
      descricao: null,
      comite_slug: projeto.comite_slug,
      formulario_id: resolverFormulario(formularios, projeto.comite_slug)?.id ?? null,
      projeto_id: projetoId,
      grupo_id: grupoId,
      prioridade: null,
      solicitante_id: sessao.conta.id,
      responsavel_id: null,
      data_inicio: null,
      prazo: null,
    });
    await registrarEvento({ tarefa_id: id, autor_id: sessao.conta.id, tipo: "criada" });
    revalidatePath("/org", "layout");
    return { id };
  } catch (erro) {
    console.error("Falha ao criar a tarefa pela página:", erro);
    return { erro: FALHOU };
  }
}
