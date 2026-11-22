"use client";

import { useSearchParams } from "next/navigation";
import type { CampoPersonalizado } from "@/lib/campos-personalizados-tipos";
import type { FormularioView } from "@/lib/formularios-tipos";
import type { GrupoBasico } from "@/lib/grupos-tipos";
import type { ComiteBasico, ProjetoBasico } from "@/lib/organizacao";
import type { Pessoa, TarefaDb } from "@/lib/tarefas";
import { DetalheTarefa } from "./DetalheTarefa";
import { FormNovaTarefa } from "./FormNovaTarefa";
import { Modal } from "./Modal";

/**
 * Janelas "Tarefa" e "Nova tarefa". Quem manda é a URL (?tarefa=… e ?nova=1), mas ela é
 * trocada sem ir ao servidor e a tarefa vem da lista que a tela já carregou: por isso a
 * janela abre e fecha na hora. `inicial` cobre quando a página é aberta direto no link.
 */
export function JanelasTarefa({
  tarefas,
  inicial,
  membros,
  comites,
  projetos,
  formularios,
  grupos,
  camposPersonalizados,
  caminho,
  base,
  qs,
  euId,
  souAdmin,
  hoje,
  retornoNova,
}: {
  tarefas: TarefaDb[];
  inicial: TarefaDb | null;
  membros: Pessoa[];
  comites: ComiteBasico[];
  projetos: ProjetoBasico[];
  formularios: FormularioView[];
  grupos: GrupoBasico[];
  camposPersonalizados: CampoPersonalizado[];
  /** Página onde as janelas abrem (sem query). */
  caminho: string;
  /** Endereço para onde voltar ao fechar (a página com os filtros atuais). */
  base: string;
  qs: string;
  euId: string;
  souAdmin: boolean;
  hoje: string;
  /** Só na página do projeto: criar a tarefa já nele (e no grupo escolhido). */
  retornoNova?: { projetoId: string };
}) {
  const params = useSearchParams();
  const tarefaId = params.get("tarefa");
  const nova = params.get("nova") === "1";

  const achar = (id: string) => {
    for (const t of tarefas) {
      if (t.id === id) return t;
      const s = t.subtarefas.find((x) => x.id === id);
      if (s) return s;
    }
    return inicial?.id === id ? inicial : null;
  };
  const aberta = tarefaId ? achar(tarefaId) : null;

  if (aberta) {
    return (
      <Modal key={aberta.id} fecharHref={base} rotulo={`Tarefa: ${aberta.titulo}`}>
        <DetalheTarefa
          tarefa={aberta}
          membros={membros}
          comites={comites}
          projetos={projetos}
          formularios={formularios}
          grupos={grupos}
          camposPersonalizados={camposPersonalizados}
          caminho={caminho}
          qs={qs}
          euId={euId}
          souAdmin={souAdmin}
          hoje={hoje}
        />
      </Modal>
    );
  }

  if (!tarefaId && nova) {
    const grupoParam = params.get("grupo") ?? "";
    const grupoInicial = retornoNova && grupos.some((g) => g.id === grupoParam && g.projeto_id === retornoNova.projetoId) ? grupoParam : "";
    return (
      <Modal rotulo="Nova tarefa" fecharHref={base}>
        <h2 className="mb-5 pr-10 font-titulo text-2xl font-black uppercase tracking-tight">Nova tarefa</h2>
        <FormNovaTarefa
          membros={membros}
          comites={comites}
          projetos={projetos}
          formularios={formularios}
          grupos={grupos}
          camposPersonalizados={camposPersonalizados}
          euId={euId}
          fecharHref={base}
          {...(retornoNova ? { retorno: caminho, projetoInicial: retornoNova.projetoId, grupoInicial } : {})}
        />
      </Modal>
    );
  }
  return null;
}
