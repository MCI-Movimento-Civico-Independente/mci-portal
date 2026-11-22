import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { listarComentarios, listarHistorico, type Evento } from "@/lib/atividade";
import { formatarDataHora, hojeSP } from "@/lib/datas";
import {
  chaveFormulario,
  valorComoTexto,
  type CampoPersonalizado,
} from "@/lib/campos-personalizados-tipos";
import { resolverFormulario, type FormularioView } from "@/lib/formularios-tipos";
import type { ComiteBasico, ProjetoBasico } from "@/lib/organizacao";
import type { Pessoa, TarefaDb } from "@/lib/tarefas";
import { CAMPOS } from "@/lib/tarefas-campos";
import { Atividade } from "./Atividade";
import { BotaoExcluir } from "./BotaoExcluir";
import { CampoPersonalizadoInline } from "./CampoPersonalizado";
import { CampoEditavel, CelulaTitulo } from "./Celulas";
import { FormDescricao } from "./FormDescricao";
import { NovaSubtarefa } from "./NovaSubtarefa";
import { SubtarefasLista } from "./SubtarefasLista";

function fraseDoEvento(e: Evento): string {
  switch (e.tipo) {
    case "criada":
      return "criou a tarefa";
    case "descricao":
      return "editou a descrição";
    case "subtarefa_adicionada":
      return `adicionou a subtarefa "${e.para_texto ?? ""}"`;
    case "subtarefa_removida":
      return `removeu a subtarefa "${e.de_texto ?? ""}"`;
    case "campo":
      if (!e.de_texto) return `definiu ${e.campo} como ${e.para_texto}`;
      if (!e.para_texto) return `removeu ${e.campo} (era ${e.de_texto})`;
      return `alterou ${e.campo}: ${e.de_texto} → ${e.para_texto}`;
  }
}

/** Conteúdo da janela da tarefa: campos editáveis, descrição, subtarefas e atividade. */
export async function DetalheTarefa({
  tarefa,
  membros,
  comites,
  projetos,
  formularios,
  camposPersonalizados,
  qs,
  euId,
  souAdmin,
}: {
  tarefa: TarefaDb;
  membros: Pessoa[];
  comites: ComiteBasico[];
  projetos: ProjetoBasico[];
  formularios: FormularioView[];
  camposPersonalizados: CampoPersonalizado[];
  qs: string;
  euId: string;
  souAdmin: boolean;
}) {
  const [comentarios, historico] = await Promise.all([listarComentarios(tarefa.id), listarHistorico(tarefa.id)]);
  const ehSub = tarefa.pai_id !== null;
  const hoje = hojeSP();
  const feitas = tarefa.subtarefas.filter((s) => s.status === "concluida").length;
  const total = tarefa.subtarefas.length;
  // O formulário da tarefa decide quais campos aparecem (os fixos aparecem sempre).
  // Tarefa sem formulário usa o do comitê ou o Padrão geral; a subtarefa usa o Padrão geral.
  const formulario = ehSub
    ? resolverFormulario(formularios, null)
    : (formularios.find((f) => f.id === tarefa.formulario_id) ?? resolverFormulario(formularios, tarefa.comite_slug));
  const incluidos = new Set(formulario?.campos ?? []);
  // Subtarefa segue o comitê, o projeto e o formulário da tarefa original.
  const semHerdados = (chave: string) => !(ehSub && (chave === "comite_slug" || chave === "projeto_id" || chave === "formulario_id"));
  const personalizados = camposPersonalizados.filter((c) => incluidos.has(chaveFormulario(c.id)));
  const campos = CAMPOS.filter((c) => c.chave !== "titulo" && semHerdados(c.chave) && (c.fixo || incluidos.has(c.chave)));

  return (
    <div className="flex flex-col gap-6">
      <div className="pr-10">
        {ehSub ? (
          <Link
            href={`/org/tarefas?${qs ? `${qs}&` : ""}tarefa=${tarefa.pai_id}`}
            scroll={false}
            className="inline-flex min-h-11 items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-laranja-texto hover:underline"
          >
            <ChevronLeft size={14} aria-hidden="true" />
            Subtarefa de {tarefa.paiTitulo ?? "tarefa"}
          </Link>
        ) : (
          <p className="font-mono text-[11px] uppercase tracking-widest text-cinza">Tarefa</p>
        )}
        <div className="mt-1">
          <CelulaTitulo id={tarefa.id} valor={tarefa.titulo} grande />
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {campos.map((c) => (
          <div key={c.chave} className="grid grid-cols-[110px_1fr] items-center">
            <dt className="font-mono text-[11px] uppercase tracking-widest text-cinza">{c.rotulo}</dt>
            <dd>
              <CampoEditavel
                campo={c}
                tarefa={{ ...tarefa, formulario_id: tarefa.formulario_id ?? formulario?.id ?? null }}
                membros={membros}
                comites={comites}
                projetos={projetos}
                formularios={formularios}
                hoje={hoje}
              />
            </dd>
          </div>
        ))}
        {personalizados.map((c) => (
          <div
            key={c.id}
            className={`grid grid-cols-[110px_1fr] items-start ${c.tipo === "texto_longo" ? "sm:col-span-2" : "items-center"}`}
          >
            <dt className="pt-3 font-mono text-[11px] uppercase tracking-widest text-cinza">
              {c.rotulo}
              {c.obrigatorio && <span aria-hidden="true"> *</span>}
            </dt>
            <dd>
              <CampoPersonalizadoInline tarefaId={tarefa.id} campo={c} valor={valorComoTexto(tarefa.campos?.[c.id])} />
            </dd>
          </div>
        ))}
      </dl>

      <FormDescricao id={tarefa.id} descricao={tarefa.descricao ?? ""} obrigatoria={!ehSub} />

      {!ehSub && (
        <section aria-labelledby="titulo-subtarefas">
          <div className="flex items-baseline justify-between">
            <h2 id="titulo-subtarefas" className="text-xl font-extrabold tracking-tight">
              Subtarefas
            </h2>
            {total > 0 && (
              <span className="font-mono text-[11px] font-bold uppercase text-cinza">
                {feitas} de {total} concluídas
              </span>
            )}
          </div>
          {total > 0 && (
            <div
              role="progressbar"
              aria-label="Subtarefas concluídas"
              aria-valuenow={Math.round((feitas / total) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-3 h-2 bg-preto/15"
            >
              <div className="h-full bg-preto" style={{ width: `${(feitas / total) * 100}%` }} />
            </div>
          )}
          {total === 0 ? (
            <p className="mt-3 text-[15px] text-cinza">
              Divida o trabalho em partes menores, cada uma com seu executor e entrega.
            </p>
          ) : (
            <SubtarefasLista subtarefas={tarefa.subtarefas} membros={membros} hoje={hoje} />
          )}
          <NovaSubtarefa paiId={tarefa.id} membros={membros} responsavelPadrao={tarefa.responsavel_id} />
        </section>
      )}

      <Atividade
        tarefaId={tarefa.id}
        euId={euId}
        souAdmin={souAdmin}
        comentarios={comentarios.map((c) => ({
          id: c.id,
          texto: c.texto,
          quando: formatarDataHora(c.criado_em),
          autor: c.autor?.nome?.trim() || "Membro removido",
          autorId: c.autor_id,
        }))}
        historico={historico.map((e) => ({
          id: e.id,
          quando: formatarDataHora(e.criado_em),
          autor: e.autor?.nome?.trim() || "Membro removido",
          frase: fraseDoEvento(e),
        }))}
      />

      <div className="flex justify-end border-t border-linha pt-3">
        <BotaoExcluir
          id={tarefa.id}
          aviso={
            ehSub
              ? "Excluir esta subtarefa?"
              : total > 0
                ? `Excluir esta tarefa e as ${total} subtarefas dela? Não dá para desfazer.`
                : "Excluir esta tarefa? Não dá para desfazer."
          }
        />
      </div>
    </div>
  );
}
