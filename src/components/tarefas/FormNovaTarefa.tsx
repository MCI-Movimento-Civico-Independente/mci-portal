"use client";

import { useActionState } from "react";
import { criarTarefaAction, type EstadoForm } from "@/app/org/tarefas/acoes";
import { Botao } from "@/components/ui/Botao";
import type { ComiteBasico, ProjetoBasico } from "@/lib/organizacao";
import type { Pessoa } from "@/lib/tarefas";
import { PRIORIDADE_OPCOES } from "@/lib/tarefas-campos";
import { campo, rotulo } from "./estilos";

export function FormNovaTarefa({
  membros,
  comites,
  projetos,
  euId,
  fecharHref,
}: {
  membros: Pessoa[];
  comites: ComiteBasico[];
  projetos: ProjetoBasico[];
  euId: string;
  fecharHref: string;
}) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(criarTarefaAction, {});
  const opcional = <span className="font-normal text-cinza">(opcional)</span>;

  return (
    <form action={acao} className="flex flex-col gap-5">
      <div>
        <label htmlFor="titulo" className={rotulo}>
          Assunto
        </label>
        <input
          id="titulo"
          name="titulo"
          required
          maxLength={200}
          autoFocus
          placeholder="Ex.: Revisar o texto do guia"
          className={campo}
        />
      </div>

      <div>
        <label htmlFor="descricao" className={rotulo}>
          Descrição
        </label>
        <textarea
          id="descricao"
          name="descricao"
          required
          rows={5}
          maxLength={2000}
          placeholder="O que precisa ser feito e qual o resultado esperado"
          className={`${campo} py-2`}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="comite_slug" className={rotulo}>
            Comitê {opcional}
          </label>
          <select id="comite_slug" name="comite_slug" defaultValue="" className={campo}>
            <option value="">Sem comitê</option>
            {comites.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="projeto_id" className={rotulo}>
            Projeto {opcional}
          </label>
          <select id="projeto_id" name="projeto_id" defaultValue="" className={campo}>
            <option value="">Sem projeto</option>
            {comites.map((c) => {
              const doComite = projetos.filter((p) => p.comite_slug === c.slug && p.status === "ativo");
              return doComite.length === 0 ? null : (
                <optgroup key={c.slug} label={c.nome}>
                  {doComite.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          <p className="mt-1 text-xs text-cinza">Escolher um projeto define o comitê dele.</p>
        </div>
        <div>
          <label htmlFor="solicitante_id" className={rotulo}>
            Solicitante {opcional}
          </label>
          <select id="solicitante_id" name="solicitante_id" defaultValue={euId} className={campo}>
            <option value="">Ninguém</option>
            {membros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
                {m.id === euId ? " (eu)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="responsavel_id" className={rotulo}>
            Executor {opcional}
          </label>
          <select id="responsavel_id" name="responsavel_id" defaultValue={euId} className={campo}>
            <option value="">Ninguém</option>
            {membros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
                {m.id === euId ? " (eu)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="prioridade" className={rotulo}>
            Prioridade {opcional}
          </label>
          <select id="prioridade" name="prioridade" defaultValue="" className={campo}>
            {PRIORIDADE_OPCOES.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.valor ? o.rotulo : "Não definida"}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="data_inicio" className={rotulo}>
              De quando {opcional}
            </label>
            <input id="data_inicio" name="data_inicio" type="date" className={campo} />
          </div>
          <div>
            <label htmlFor="prazo" className={rotulo}>
              Até quando {opcional}
            </label>
            <input id="prazo" name="prazo" type="date" className={campo} />
          </div>
        </div>
      </div>

      {estado.erro && (
        <p role="alert" className="border-l-4 border-laranja-texto bg-creme-claro p-3 text-sm font-bold">
          {estado.erro}
        </p>
      )}

      <div className="flex gap-3">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Criando…" : "Criar tarefa"}
        </Botao>
        <Botao href={fecharHref} variante="secundario">
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
