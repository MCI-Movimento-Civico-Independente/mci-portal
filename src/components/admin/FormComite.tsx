"use client";

import { Plus } from "lucide-react";
import { useActionState } from "react";
import { criarComiteAction, renomearComiteAction, type EstadoAdmin } from "@/app/org/admin/acoes";
import { campo, rotulo } from "@/components/tarefas/estilos";
import { Botao } from "@/components/ui/Botao";

export function FormNovoComite() {
  const [estado, acao, pendente] = useActionState<EstadoAdmin, FormData>(criarComiteAction, {});
  return (
    <form key={estado.n ?? 0} action={acao} className="flex flex-col gap-3">
      <label htmlFor="novo-comite" className={rotulo}>
        Novo comitê
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id="novo-comite" name="nome" required maxLength={100} placeholder="Ex.: Comitê de Finanças" className={`${campo} sm:flex-1`} />
        <Botao type="submit" disabled={pendente}>
          <Plus size={16} aria-hidden="true" />
          {pendente ? "Criando…" : "Criar comitê"}
        </Botao>
      </div>
      {estado.erro && (
        <p role="alert" className="text-sm font-bold text-laranja-texto">
          {estado.erro}
        </p>
      )}
    </form>
  );
}

export function FormRenomearComite({ slug, nome }: { slug: string; nome: string }) {
  const [estado, acao, pendente] = useActionState<EstadoAdmin, FormData>(renomearComiteAction.bind(null, slug), {});
  return (
    <form action={acao} className="min-w-0 flex-1 basis-72">
      <div className="flex gap-2">
        <label htmlFor={`nome-${slug}`} className="sr-only">
          Nome do comitê
        </label>
        <input id={`nome-${slug}`} name="nome" required maxLength={100} defaultValue={nome} className={`${campo} font-bold`} />
        <Botao type="submit" variante="secundario" disabled={pendente}>
          {pendente ? "…" : "Salvar"}
        </Botao>
      </div>
      {estado.erro && (
        <p role="alert" className="mt-1 text-xs font-bold text-laranja-texto">
          {estado.erro}
        </p>
      )}
      {estado.ok && !pendente && (
        <p role="status" className="mt-1 font-mono text-[11px] font-bold uppercase text-cinza">
          Salvo
        </p>
      )}
    </form>
  );
}
