"use client";

import { LinkLocal } from "@/components/LinkLocal";
import { TbChevronLeft } from "react-icons/tb";
import {
  chaveFormulario,
  valorComoTexto,
  type CampoPersonalizado,
} from "@/lib/campos-personalizados-tipos";
import { resolverFormulario, type FormularioView } from "@/lib/formularios-tipos";
import type { GrupoBasico } from "@/lib/grupos-tipos";
import type { ComiteBasico, ProjetoBasico } from "@/lib/organizacao";
import type { Pessoa, TarefaDb } from "@/lib/tarefas";
import { CAMPOS } from "@/lib/tarefas-campos";
import { AtividadeCarregavel } from "./AtividadeCarregavel";
import { BotaoExcluir } from "./BotaoExcluir";
import { CampoPersonalizadoInline } from "./CampoPersonalizado";
import { CampoEditavel, CelulaTitulo } from "./Celulas";
import { FormDescricao } from "./FormDescricao";
import { NovaSubtarefa } from "./NovaSubtarefa";
import { SubtarefasLista } from "./SubtarefasLista";

/** Conteúdo da janela da tarefa: campos editáveis, descrição, subtarefas e atividade. */
export function DetalheTarefa({
  tarefa,
  membros,
  comites,
  projetos,
  formularios,
  grupos,
  camposPersonalizados,
  caminho = "/org/tarefas",
  qs,
  euId,
  souAdmin,
  hoje,
}: {
  tarefa: TarefaDb;
  membros: Pessoa[];
  comites: ComiteBasico[];
  projetos: ProjetoBasico[];
  formularios: FormularioView[];
  grupos: GrupoBasico[];
  camposPersonalizados: CampoPersonalizado[];
  /** Página onde a janela abre (lista de tarefas ou página do projeto). */
  caminho?: string;
  qs: string;
  euId: string;
  souAdmin: boolean;
  hoje: string;
}) {
  const ehSub = tarefa.pai_id !== null;
  const feitas = tarefa.subtarefas.filter((s) => s.status === "concluida").length;
  const total = tarefa.subtarefas.length;
  // O formulário da tarefa decide quais campos aparecem (os fixos aparecem sempre).
  // Tarefa sem formulário usa o do comitê ou o Padrão geral; a subtarefa usa o Padrão geral.
  const formulario = ehSub
    ? resolverFormulario(formularios, null)
    : (formularios.find((f) => f.id === tarefa.formulario_id) ?? resolverFormulario(formularios, tarefa.comite_slug));
  const incluidos = new Set(formulario?.campos ?? []);
  // Subtarefa segue o comitê, o projeto e o formulário da tarefa original.
  const semHerdados = (chave: string) => !(ehSub && (chave === "comite_slug" || chave === "projeto_id" || chave === "formulario_id" || chave === "grupo_id"));
  const personalizados = camposPersonalizados.filter((c) => incluidos.has(chaveFormulario(c.id)));
  const campos = CAMPOS.filter((c) => c.chave !== "titulo" && semHerdados(c.chave) && (c.chave !== "grupo_id" || (!!tarefa.projeto_id && grupos.some((g) => g.projeto_id === tarefa.projeto_id))) && (c.fixo || incluidos.has(c.chave)));

  // Início e entrega viram um campo só ("Período"), com calendário.
  const ehData = (chave: string) => chave === "data_inicio" || chave === "prazo";
  const primeiraData = campos.findIndex((c) => ehData(c.chave));
  const camposTela = campos.flatMap((c, i) =>
    !ehData(c.chave) ? [c] : i === primeiraData ? [{ ...c, chave: "data_inicio" as const, rotulo: "Período" }] : [],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="pr-10">
        {ehSub ? (
          <LinkLocal
            href={`${caminho}?${qs ? `${qs}&` : ""}tarefa=${tarefa.pai_id}`}
            className="inline-flex min-h-11 items-center gap-1 rotulo text-marca-texto hover:underline"
          >
            <TbChevronLeft size={14} aria-hidden="true" />
            Subtarefa de {tarefa.paiTitulo ?? "tarefa"}
          </LinkLocal>
        ) : (
          <p className="rotulo text-suave">Tarefa</p>
        )}
        <div className="mt-1">
          <CelulaTitulo id={tarefa.id} valor={tarefa.titulo} grande />
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {camposTela.map((c) => (
          <div key={c.chave} className="grid grid-cols-[110px_1fr] items-center">
            <dt className="rotulo text-suave">{c.rotulo}</dt>
            <dd>
              <CampoEditavel
                campo={c}
                tarefa={{ ...tarefa, formulario_id: tarefa.formulario_id ?? formulario?.id ?? null }}
                membros={membros}
                comites={comites}
                projetos={projetos}
                formularios={formularios}
                grupos={grupos}
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
            <dt className="pt-3 rotulo text-suave">
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
            <h2 id="titulo-subtarefas" className="text-xl font-semibold">
              Subtarefas
            </h2>
            {total > 0 && (
              <span className="rotulo font-bold text-suave">
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
              className="mt-3 h-2 overflow-hidden rounded-full bg-sutil"
            >
              <div className="h-full rounded-full bg-marca" style={{ width: `${(feitas / total) * 100}%` }} />
            </div>
          )}
          {total === 0 ? (
            <p className="mt-3 text-[15px] text-suave">
              Divida o trabalho em partes menores, cada uma com seu executor e entrega.
            </p>
          ) : (
            <SubtarefasLista paiId={tarefa.id} subtarefas={tarefa.subtarefas} membros={membros} hoje={hoje} />
          )}
          <NovaSubtarefa paiId={tarefa.id} membros={membros} responsavelPadrao={tarefa.responsavel_id} />
        </section>
      )}

      <AtividadeCarregavel tarefaId={tarefa.id} euId={euId} souAdmin={souAdmin} versao={tarefa} />

      <div className="flex justify-end border-t border-borda pt-3">
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
