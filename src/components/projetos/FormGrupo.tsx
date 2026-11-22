"use client";

import { useActionState } from "react";
import { TbPlus } from "react-icons/tb";
import { atualizarGrupoAction, criarGrupoAction, type EstadoProjeto } from "@/app/org/projetos/acoes";
import { campo } from "@/components/tarefas/estilos";
import { Botao } from "@/components/ui/Botao";
import { CORES_GRUPO, type CorGrupo } from "@/lib/grupos-tipos";

/** Escolha de cor do grupo: quadrados nas cores da marca. */
export function SeletorCor({ nome = "cor", padrao = "neutro" }: { nome?: string; padrao?: CorGrupo }) {
  return (
    <fieldset className="flex items-center gap-1">
      <legend className="sr-only">Cor do grupo</legend>
      {CORES_GRUPO.map((c) => (
        <label key={c.valor} title={c.rotulo} className="relative flex size-11 cursor-pointer items-center justify-center">
          <input type="radio" name={nome} value={c.valor} defaultChecked={c.valor === padrao} className="peer sr-only" />
          <span
            aria-hidden="true"
            className={`size-6 border-2 border-transparent peer-checked:border-texto peer-checked:outline peer-checked:outline-2 peer-checked:outline-offset-2 peer-checked:outline-texto peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-marca-texto ${c.bloco}`}
          />
          <span className="sr-only">{c.rotulo}</span>
        </label>
      ))}
    </fieldset>
  );
}

export function FormNovoGrupo({ projetoId }: { projetoId: string }) {
  const [estado, acao, pendente] = useActionState<EstadoProjeto, FormData>(criarGrupoAction.bind(null, projetoId), {});
  return (
    <form key={estado.n ?? 0} action={acao} className="flex flex-col gap-3">
      <label htmlFor="novo-grupo" className="rotulo-barras text-suave">
        Novo grupo
      </label>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <input id="novo-grupo" name="nome" required maxLength={60} placeholder="Ex.: Esta semana" className={`${campo} md:max-w-xs md:flex-1`} />
        <SeletorCor />
        <Botao type="submit" disabled={pendente}>
          <TbPlus size={17} aria-hidden="true" />
          {pendente ? "Criando…" : "Criar grupo"}
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

/** Edição do nome e da cor de um grupo, na própria linha do cabeçalho. */
export function FormEditarGrupo({
  id,
  nome,
  cor,
  aoTerminar,
}: {
  id: string;
  nome: string;
  cor: CorGrupo;
  aoTerminar: () => void;
}) {
  const [estado, acao, pendente] = useActionState<EstadoProjeto, FormData>(
    async (anterior, form) => {
      const r = await atualizarGrupoAction(id, anterior, form);
      if (r.ok) aoTerminar();
      return r;
    },
    {},
  );
  return (
    <form action={acao} className="flex min-w-0 flex-1 flex-col gap-2 py-2 md:flex-row md:items-center">
      <label htmlFor={`grupo-${id}`} className="sr-only">
        Nome do grupo
      </label>
      <input id={`grupo-${id}`} name="nome" required maxLength={60} defaultValue={nome} autoFocus className={`${campo} md:max-w-xs md:flex-1`} />
      <SeletorCor padrao={cor} />
      <div className="flex gap-2">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "…" : "Salvar"}
        </Botao>
        <Botao variante="secundario" onClick={aoTerminar}>
          Cancelar
        </Botao>
      </div>
      {estado.erro && (
        <p role="alert" className="text-xs font-bold text-marca-texto md:basis-full">
          {estado.erro}
        </p>
      )}
    </form>
  );
}
