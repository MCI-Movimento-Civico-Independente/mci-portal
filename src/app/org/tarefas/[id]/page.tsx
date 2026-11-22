import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BotaoExcluir } from "@/components/tarefas/BotaoExcluir";
import { SeletorStatus } from "@/components/tarefas/ControlesTarefa";
import { FormEditarTarefa } from "@/components/tarefas/FormEditarTarefa";
import { LinhaTarefa } from "@/components/tarefas/LinhaTarefa";
import { NovaSubtarefa } from "@/components/tarefas/NovaSubtarefa";
import { Card } from "@/components/ui/Card";
import { getSessao } from "@/lib/auth/sessao";
import { hojeSP } from "@/lib/datas";
import { membrosOrg, tarefaPorId } from "@/lib/tarefas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function TarefaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await getSessao();
  if (!sessao) redirect(`/login?next=/org/tarefas/${encodeURIComponent(id)}`);
  if (!UUID.test(id)) notFound();

  const [detalhe, membros] = await Promise.all([tarefaPorId(id), membrosOrg()]);
  if (!detalhe) notFound();
  const { tarefa, subtarefas } = detalhe;
  const ehSub = tarefa.pai_id !== null;
  const hoje = hojeSP();
  const feitas = subtarefas.filter((s) => s.status === "concluida").length;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link
        href={ehSub ? `/org/tarefas/${tarefa.pai_id}` : "/org/tarefas"}
        className="inline-flex min-h-11 w-fit items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-laranja-texto hover:underline"
      >
        <ChevronLeft size={14} aria-hidden="true" />
        {ehSub ? `Subtarefa de ${tarefa.paiTitulo ?? "tarefa"}` : "Tarefas"}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="min-w-0 flex-1 text-2xl font-black leading-tight tracking-tighter md:text-3xl">
          {tarefa.titulo}
        </h1>
        <div className="flex items-center gap-2">
          <SeletorStatus id={tarefa.id} status={tarefa.status} />
          <BotaoExcluir
            id={tarefa.id}
            aviso={
              ehSub
                ? "Excluir esta subtarefa?"
                : subtarefas.length > 0
                  ? `Excluir esta tarefa e as ${subtarefas.length} subtarefas dela? Não dá para desfazer.`
                  : "Excluir esta tarefa? Não dá para desfazer."
            }
          />
        </div>
      </div>

      <Card>
        <FormEditarTarefa tarefa={tarefa} membros={membros} />
      </Card>

      {!ehSub && (
        <Card>
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-extrabold tracking-tight">Subtarefas</h2>
            {subtarefas.length > 0 && (
              <span className="font-mono text-[11px] font-bold uppercase text-cinza">
                {feitas} de {subtarefas.length} concluídas
              </span>
            )}
          </div>
          {subtarefas.length > 0 && (
            <div
              role="progressbar"
              aria-label="Subtarefas concluídas"
              aria-valuenow={Math.round((feitas / subtarefas.length) * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              className="mt-3 h-2 bg-preto/15"
            >
              <div className="h-full bg-preto" style={{ width: `${(feitas / subtarefas.length) * 100}%` }} />
            </div>
          )}
          {subtarefas.length === 0 ? (
            <p className="mt-3 text-[15px] text-cinza">Divida o trabalho em partes menores, cada uma com seu responsável e prazo.</p>
          ) : (
            <ul className="mt-3 border-t border-linha">
              {subtarefas.map((s) => (
                <LinhaTarefa key={s.id} t={{ ...s, paiTitulo: null }} hoje={hoje} />
              ))}
            </ul>
          )}
          <NovaSubtarefa paiId={tarefa.id} membros={membros} responsavelPadrao={tarefa.responsavel_id} />
        </Card>
      )}
    </div>
  );
}
