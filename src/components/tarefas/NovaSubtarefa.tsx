"use client";

import { TbPlus } from "react-icons/tb";
import { useActionState } from "react";
import { criarSubtarefaAction, type EstadoForm } from "@/app/org/tarefas/acoes";
import { Botao } from "@/components/ui/Botao";
import type { Pessoa } from "@/lib/tarefas";
import { campo } from "./estilos";

/** Adição rápida de subtarefa: o formulário recomeça vazio depois de salvar. */
export function NovaSubtarefa({
  paiId,
  membros,
  responsavelPadrao,
}: {
  paiId: string;
  membros: Pessoa[];
  responsavelPadrao: string | null;
}) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(
    criarSubtarefaAction.bind(null, paiId),
    {},
  );

  return (
    <form key={estado.n ?? 0} action={acao} className="mt-4 flex flex-col gap-3 border-t border-borda pt-4">
      <label htmlFor="sub-titulo" className="text-sm font-bold">
        Nova subtarefa
      </label>
      <div className="flex flex-col gap-2 md:flex-row">
        <input
          id="sub-titulo"
          name="titulo"
          required
          maxLength={200}
          placeholder="O que precisa ser feito"
          className={`${campo} md:flex-1`}
        />
        <select name="responsavel_id" aria-label="Executor" defaultValue={responsavelPadrao ?? ""} className={`${campo} md:w-44`}>
          <option value="">Ninguém</option>
          {membros.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
        <input name="prazo" type="date" aria-label="Entrega" className={`${campo} md:w-40`} />
        <Botao type="submit" disabled={pendente}>
          <TbPlus size={16} aria-hidden="true" />
          {pendente ? "Adicionando…" : "Adicionar"}
        </Botao>
      </div>
      {estado.erro && (
        <p role="alert" className="text-sm font-bold text-marca-texto">
          {estado.erro}
        </p>
      )}
    </form>
  );
}
