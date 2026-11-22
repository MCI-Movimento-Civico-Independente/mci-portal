import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CAMPOS } from "@/lib/tarefas-campos";
import { hojeSP } from "@/lib/datas";
import type { Pessoa, TarefaDb } from "@/lib/tarefas";
import { BotaoExcluir } from "./BotaoExcluir";
import { CampoEditavel, CelulaTitulo } from "./Celulas";
import { FormDescricao } from "./FormDescricao";
import { NovaSubtarefa } from "./NovaSubtarefa";
import { SubtarefasLista } from "./SubtarefasLista";

/** Conteúdo da janela da tarefa: campos editáveis, descrição e subtarefas. */
export function DetalheTarefa({
  tarefa,
  membros,
  qs,
}: {
  tarefa: TarefaDb;
  membros: Pessoa[];
  qs: string;
}) {
  const ehSub = tarefa.pai_id !== null;
  const hoje = hojeSP();
  const feitas = tarefa.subtarefas.filter((s) => s.status === "concluida").length;
  const total = tarefa.subtarefas.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="pr-10">
        {ehSub ? (
          <Link
            href={`/org/tarefas?${qs ? `${qs}&` : ""}tarefa=${tarefa.pai_id}`}
            scroll={false}
            className="inline-flex min-h-11 items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-laranja-texto hover:underline"
          >
            <ChevronLeft size={14} aria-hidden="true" />
            Subtarefa de {tarefa.paiTitulo ?? "tarefa"}
          </Link>
        ) : (
          <p className="font-mono text-[11px] uppercase tracking-widest text-cinza">Tarefa</p>
        )}
        <div className="mt-1">
          <CelulaTitulo id={tarefa.id} valor={tarefa.titulo} grande />
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {CAMPOS.filter((c) => c.chave !== "titulo").map((c) => (
          <div key={c.chave} className="grid grid-cols-[110px_1fr] items-center">
            <dt className="font-mono text-[11px] uppercase tracking-widest text-cinza">{c.rotulo}</dt>
            <dd>
              <CampoEditavel campo={c} tarefa={tarefa} membros={membros} hoje={hoje} />
            </dd>
          </div>
        ))}
      </dl>

      <FormDescricao id={tarefa.id} descricao={tarefa.descricao ?? ""} obrigatoria={!ehSub} />

      {!ehSub && (
        <section aria-labelledby="titulo-subtarefas">
          <div className="flex items-baseline justify-between">
            <h2 id="titulo-subtarefas" className="text-xl font-extrabold tracking-tight">
              Subtarefas
            </h2>
            {total > 0 && (
              <span className="font-mono text-[11px] font-bold uppercase text-cinza">
                {feitas} de {total} concluídas
              </span>
            )}
          </div>
          {total > 0 && (
            <div
              role="progressbar"
              aria-label="Subtarefas concluídas"
              aria-valuenow={Math.round((feitas / total) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-3 h-2 bg-preto/15"
            >
              <div className="h-full bg-preto" style={{ width: `${(feitas / total) * 100}%` }} />
            </div>
          )}
          {total === 0 ? (
            <p className="mt-3 text-[15px] text-cinza">
              Divida o trabalho em partes menores, cada uma com seu executor e entrega.
            </p>
          ) : (
            <SubtarefasLista subtarefas={tarefa.subtarefas} membros={membros} hoje={hoje} />
          )}
          <NovaSubtarefa paiId={tarefa.id} membros={membros} responsavelPadrao={tarefa.responsavel_id} />
        </section>
      )}

      <div className="flex justify-end border-t border-linha pt-3">
        <BotaoExcluir
          id={tarefa.id}
          aviso={
            ehSub
              ? "Excluir esta subtarefa?"
              : total > 0
                ? `Excluir esta tarefa e as ${total} subtarefas dela? Não dá para desfazer.`
                : "Excluir esta tarefa? Não dá para desfazer."
          }
        />
      </div>
    </div>
  );
}
