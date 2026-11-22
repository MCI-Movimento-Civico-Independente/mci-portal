"use client";

import { useActionState } from "react";
import { salvarDescricaoAction, type EstadoForm } from "@/app/org/tarefas/acoes";
import { Botao } from "@/components/ui/Botao";
import { campo } from "./estilos";

export function FormDescricao({ id, descricao, obrigatoria }: { id: string; descricao: string; obrigatoria: boolean }) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(salvarDescricaoAction.bind(null, id), {});
  return (
    <form action={acao} className="flex flex-col gap-3">
      <label htmlFor="descricao" className="text-sm font-bold">
        Descrição {!obrigatoria && <span className="font-normal text-cinza">(opcional)</span>}
      </label>
      <textarea
        id="descricao"
        name="descricao"
        rows={5}
        maxLength={2000}
        defaultValue={descricao}
        required={obrigatoria}
        className={`${campo} py-2`}
      />
      {estado.erro && (
        <p role="alert" className="text-sm font-bold text-laranja-texto">
          {estado.erro}
        </p>
      )}
      <div className="flex items-center gap-4">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar descrição"}
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
