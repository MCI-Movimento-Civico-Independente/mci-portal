"use client";

import { useActionState } from "react";
import { atualizarTarefaAction, type EstadoForm } from "@/app/org/tarefas/acoes";
import { Botao } from "@/components/ui/Botao";
import type { Pessoa, TarefaDb } from "@/lib/tarefas";
import { campo, rotulo } from "./estilos";

export function FormEditarTarefa({ tarefa, membros }: { tarefa: TarefaDb; membros: Pessoa[] }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(
    atualizarTarefaAction.bind(null, tarefa.id),
    {},
  );
  const ehSub = tarefa.pai_id !== null;

  return (
    <form action={acao} className="flex flex-col gap-5">
      <div>
        <label htmlFor="titulo" className={rotulo}>
          Assunto
        </label>
        <input id="titulo" name="titulo" required maxLength={200} defaultValue={tarefa.titulo} className={campo} />
      </div>

      <div>
        <label htmlFor="descricao" className={rotulo}>
          Descrição {ehSub && <span className="font-normal text-cinza">(opcional)</span>}
        </label>
        <textarea
          id="descricao"
          name="descricao"
          required={!ehSub}
          rows={6}
          maxLength={2000}
          defaultValue={tarefa.descricao ?? ""}
          className={`${campo} py-2`}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="responsavel" className={rotulo}>
            Atribuído a
          </label>
          <select id="responsavel" name="responsavel" defaultValue={tarefa.responsavel_id ?? ""} className={campo}>
            <option value="">Ninguém</option>
            {membros.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="prazo" className={rotulo}>
            Para quando
          </label>
          <input id="prazo" name="prazo" type="date" defaultValue={tarefa.prazo ?? ""} className={campo} />
        </div>
      </div>

      {estado.erro && (
        <p role="alert" className="border-l-4 border-laranja-texto bg-creme-claro p-3 text-sm font-bold">
          {estado.erro}
        </p>
      )}

      <div className="flex items-center gap-4">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar alterações"}
        </Botao>
        {estado.ok && !pendente && (
          <span role="status" className="font-mono text-xs font-bold uppercase text-cinza">
            Salvo
          </span>
        )}
      </div>
    </form>
  );
}
