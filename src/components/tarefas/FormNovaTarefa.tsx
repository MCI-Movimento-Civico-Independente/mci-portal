"use client";

import { useActionState } from "react";
import { criarTarefaAction, type EstadoForm } from "@/app/org/tarefas/acoes";
import { Botao } from "@/components/ui/Botao";
import type { Pessoa } from "@/lib/tarefas";
import { campo, rotulo } from "./estilos";

export function FormNovaTarefa({ membros, euId }: { membros: Pessoa[]; euId: string }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(criarTarefaAction, {});

  return (
    <form action={acao} className="flex max-w-2xl flex-col gap-5">
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
          rows={6}
          maxLength={2000}
          placeholder="O que precisa ser feito e qual o resultado esperado"
          className={`${campo} py-2`}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="responsavel" className={rotulo}>
            Atribuído a <span className="font-normal text-cinza">(opcional)</span>
          </label>
          <select id="responsavel" name="responsavel" defaultValue={euId} className={campo}>
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
          <label htmlFor="prazo" className={rotulo}>
            Para quando <span className="font-normal text-cinza">(opcional)</span>
          </label>
          <input id="prazo" name="prazo" type="date" className={campo} />
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
        <Botao href="/org/tarefas" variante="secundario">
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
