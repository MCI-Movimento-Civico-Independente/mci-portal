"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { TbPlus } from "react-icons/tb";
import { atualizarGrupoAction, criarGrupoAction, mudarCorGrupoAction, type EstadoProjeto } from "@/app/org/projetos/acoes";
import { campo } from "@/components/tarefas/estilos";
import { Botao } from "@/components/ui/Botao";
import { CORES_GRUPO, corDoGrupo } from "@/lib/grupos-tipos";

/** Botão discreto: cria "Novo grupo" na hora; nome e cor se mudam depois, no cabeçalho dele. */
export function BotaoNovoGrupo({ projetoId }: { projetoId: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button
      type="button"
      disabled={pendente}
      onClick={() => iniciar(() => criarGrupoAction(projetoId))}
      className="rotulo inline-flex min-h-11 items-center gap-1.5 self-start px-3 font-bold text-suave hover:bg-sutil hover:text-texto disabled:opacity-60"
    >
      <TbPlus size={15} aria-hidden="true" />
      {pendente ? "Adicionando…" : "Adicionar novo grupo"}
    </button>
  );
}

/** Quadradinho de cor do grupo: abre a paleta e salva ao escolher. */
export function PaletaCor({ id, cor, nome }: { id: string; cor: string; nome: string }) {
  const [aberta, setAberta] = useState(false);
  const [pendente, iniciar] = useTransition();
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberta) return;
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberta(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAberta(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberta]);

  const atual = corDoGrupo(cor);
  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        aria-label={`Cor do grupo ${nome}`}
        aria-haspopup="true"
        aria-expanded={aberta}
        disabled={pendente}
        onClick={() => setAberta((v) => !v)}
        className="flex h-11 w-6 items-center justify-center hover:bg-sutil"
      >
        <span aria-hidden="true" className="h-6 w-3 border border-borda-forte" style={{ backgroundColor: atual }} />
      </button>
      {aberta && (
        <div
          role="group"
          aria-label="Escolha a cor"
          className="absolute left-0 top-full z-20 mt-1 grid w-max grid-cols-5 gap-1.5 border-2 border-inverso bg-superficie p-2.5"
        >
          {CORES_GRUPO.map((c) => (
            <button
              key={c.valor}
              type="button"
              title={c.rotulo}
              aria-label={c.rotulo}
              aria-pressed={c.valor.toLowerCase() === atual.toLowerCase()}
              onClick={() => {
                setAberta(false);
                iniciar(() => mudarCorGrupoAction(id, c.valor));
              }}
              className="size-9 border-2 border-transparent hover:scale-110 aria-pressed:border-texto aria-pressed:outline aria-pressed:outline-2 aria-pressed:outline-offset-1 aria-pressed:outline-texto"
              style={{ backgroundColor: c.valor }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Renomear um grupo, na própria linha do cabeçalho. */
export function FormEditarGrupo({ id, nome, aoTerminar }: { id: string; nome: string; aoTerminar: () => void }) {
  const [estado, acao, pendente] = useActionState<EstadoProjeto, FormData>(
    async (anterior, form) => {
      const r = await atualizarGrupoAction(id, anterior, form);
      if (r.ok) aoTerminar();
      return r;
    },
    {},
  );
  return (
    <form action={acao} className="flex min-w-0 flex-1 flex-wrap items-center gap-2 py-2">
      <label htmlFor={`grupo-${id}`} className="sr-only">
        Nome do grupo
      </label>
      <input
        id={`grupo-${id}`}
        name="nome"
        required
        maxLength={60}
        defaultValue={nome}
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => e.key === "Escape" && aoTerminar()}
        className={`${campo} max-w-xs flex-1`}
      />
      <Botao type="submit" disabled={pendente}>
        {pendente ? "…" : "Salvar"}
      </Botao>
      <Botao variante="secundario" onClick={aoTerminar}>
        Cancelar
      </Botao>
      {estado.erro && (
        <p role="alert" className="basis-full text-xs font-bold text-marca-texto">
          {estado.erro}
        </p>
      )}
    </form>
  );
}
