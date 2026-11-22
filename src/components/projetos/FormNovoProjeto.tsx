"use client";

import { TbPlus } from "react-icons/tb";
import { useActionState } from "react";
import { criarProjetoAction, type EstadoProjeto } from "@/app/org/projetos/acoes";
import { campo, rotulo } from "@/components/tarefas/estilos";
import { Botao } from "@/components/ui/Botao";
import type { ComiteBasico } from "@/lib/organizacao";

/** Criação de projeto. Com `comiteFixo`, o comitê já vem escolhido e some do formulário. */
export function FormNovoProjeto({ comites, comiteFixo }: { comites: ComiteBasico[]; comiteFixo?: string }) {
  const [estado, acao, pendente] = useActionState<EstadoProjeto, FormData>(criarProjetoAction, {});

  return (
    <form key={estado.n ?? 0} action={acao} className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Novo projeto</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {comiteFixo ? (
          <input type="hidden" name="comite" value={comiteFixo} />
        ) : (
          <div>
            <label htmlFor="comite" className={rotulo}>
              Comitê
            </label>
            <select id="comite" name="comite" required defaultValue="" className={campo}>
              <option value="" disabled>
                Escolha o comitê
              </option>
              {comites.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={comiteFixo ? "md:col-span-2" : ""}>
          <label htmlFor="nome" className={rotulo}>
            Nome
          </label>
          <input id="nome" name="nome" required maxLength={120} placeholder="Ex.: Bot Carcará" className={campo} />
        </div>
      </div>
      <div>
        <label htmlFor="descricao-projeto" className={rotulo}>
          Descrição <span className="font-normal text-suave">(opcional)</span>
        </label>
        <textarea id="descricao-projeto" name="descricao" rows={2} maxLength={1000} className={`${campo} py-2`} />
      </div>
      {estado.erro && (
        <p role="alert" className="text-sm font-bold text-marca-texto">
          {estado.erro}
        </p>
      )}
      <div>
        <Botao type="submit" disabled={pendente}>
          <TbPlus size={16} aria-hidden="true" />
          {pendente ? "Criando…" : "Criar projeto"}
        </Botao>
      </div>
    </form>
  );
}
