"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { TbFile, TbLock, TbLockOpen, TbPlus, TbX } from "react-icons/tb";
import { adicionarDependenciaAction, carregarVinculosDaTarefaAction, removerDependenciaAction } from "@/app/org/tarefas/acoes-vinculos";
import { STATUS_OPCOES } from "@/lib/tarefas-campos";
import { codigo, rotuloDoStatus } from "@/lib/vinculos/tipos";
import { BuscaDeTarefa } from "./BuscaDeTarefa";

type Dados = Awaited<ReturnType<typeof carregarVinculosDaTarefaAction>>;

/** Seções "Dependências" e "Mencionada em" da janela da tarefa. */
export function VinculosDaTarefa({ tarefaId, projetoId, versao }: { tarefaId: string; projetoId: string | null; versao: unknown }) {
  const [carregado, setCarregado] = useState<{ id: string; dados: Dados } | null>(null);
  const [escolhendo, setEscolhendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  // Recarrega quando a tarefa muda (a lista da página é atualizada depois de cada ação).
  useEffect(() => {
    let ativo = true;
    carregarVinculosDaTarefaAction(tarefaId).then((dados) => ativo && setCarregado({ id: tarefaId, dados }));
    return () => {
      ativo = false;
    };
  }, [tarefaId, versao]);

  const dados = carregado?.id === tarefaId ? carregado.dados : null;
  const agir = (acao: () => Promise<{ erro?: string }>) => {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if (r.erro) return setErro(r.erro);
      setEscolhendo(false);
      const novos = await carregarVinculosDaTarefaAction(tarefaId);
      setCarregado({ id: tarefaId, dados: novos });
    });
  };

  if (!dados) return <div className="h-16 animate-pulse bg-sutil" aria-busy="true" />;
  if ("erro" in dados) return <p className="text-sm font-bold text-marca-texto">{dados.erro}</p>;

  return (
    <>
      <section aria-labelledby="titulo-dependencias" className="flex flex-col gap-2">
        <h2 id="titulo-dependencias" className="rotulo font-bold">
          Dependências
        </h2>
        {dados.dependencias.map((d) => {
          const aberta = d.status !== "concluida";
          const Icone = aberta ? TbLock : TbLockOpen;
          return (
            <div key={d.id} className={`flex items-center gap-3 border bg-menu py-1 pl-3 pr-1 ${aberta ? "border-marca" : "border-borda"}`}>
              <Icone size={17} aria-hidden="true" className={aberta ? "text-marca-texto" : "text-suave"} />
              <p className="min-w-0 flex-1 text-sm">
                <strong>{aberta ? "Bloqueada por" : "Dependia de"}</strong> {codigo(d.numero)} {d.titulo}
              </p>
              <span className={`rotulo border px-1.5 py-0.5 text-[10px] font-bold ${STATUS_OPCOES.find((o) => o.valor === d.status)?.classes}`}>
                {rotuloDoStatus(d.status)}
              </span>
              <button
                type="button"
                disabled={pendente}
                aria-label={`Remover a dependência de ${codigo(d.numero)}`}
                onClick={() => agir(() => removerDependenciaAction(tarefaId, d.id))}
                className="flex size-9 items-center justify-center hover:bg-inverso hover:text-sobre-inverso"
              >
                <TbX size={15} aria-hidden="true" />
              </button>
            </div>
          );
        })}
        {escolhendo ? (
          <div className="border border-texto bg-superficie p-3">
            <BuscaDeTarefa
              autoFoco
              rotulo="Esta tarefa depende de"
              projetoId={projetoId}
              ignorar={[tarefaId, ...dados.dependencias.map((d) => d.id)]}
              aoEscolher={(t) => agir(() => adicionarDependenciaAction(tarefaId, t.id))}
            />
            <button type="button" onClick={() => setEscolhendo(false)} className="min-h-9 text-xs text-suave hover:text-marca-texto">
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEscolhendo(true)}
            className="inline-flex min-h-11 items-center gap-2 self-start border border-dashed border-borda-forte px-3 text-sm hover:border-texto"
          >
            <TbPlus size={15} aria-hidden="true" />
            Adicionar dependência
          </button>
        )}
        {erro && (
          <p role="alert" className="text-sm font-bold text-marca-texto">
            {erro}
          </p>
        )}
      </section>

      {dados.mencoes.length > 0 && (
        <section aria-labelledby="titulo-mencoes" className="flex flex-col gap-2">
          <h2 id="titulo-mencoes" className="rotulo font-bold">
            Mencionada em
          </h2>
          <ul className="flex flex-col gap-2">
            {dados.mencoes.map((m) => (
              <li key={`${m.abaId}-${m.blocoId}`}>
                <Link
                  href={`/org/projetos/${m.projetoId}/${m.abaId}?ref=tarefa:${tarefaId}:${m.blocoId}`}
                  className="flex items-center gap-3 border border-borda bg-menu p-3 hover:border-texto"
                >
                  <TbFile size={17} aria-hidden="true" className="shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{m.pagina}</span>
                    <span className="block truncate text-[13px] text-suave">{m.trecho}</span>
                  </span>
                  <span className="rotulo text-[10px] text-suave">Abrir</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
