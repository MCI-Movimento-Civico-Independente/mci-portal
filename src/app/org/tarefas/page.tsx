import { Plus } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CartaoTarefa } from "@/components/tarefas/CartaoTarefa";
import { DetalheTarefa } from "@/components/tarefas/DetalheTarefa";
import { FormNovaTarefa } from "@/components/tarefas/FormNovaTarefa";
import { Modal } from "@/components/tarefas/Modal";
import { TabelaTarefas } from "@/components/tarefas/TabelaTarefas";
import { Botao } from "@/components/ui/Botao";
import { Card } from "@/components/ui/Card";
import { getSessao } from "@/lib/auth/sessao";
import { hojeSP } from "@/lib/datas";
import { listarTarefas, membrosOrg, tarefaPorId, type TarefaDb } from "@/lib/tarefas";
import { STATUS_OPCOES } from "@/lib/tarefas-campos";

export const metadata = { title: "Tarefas · MCi" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Aba({ href, ativa, children }: { href: string; ativa: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={ativa ? "page" : undefined}
      className={`inline-flex min-h-11 items-center border px-4 text-sm font-bold ${
        ativa ? "border-preto bg-preto text-creme-claro" : "border-linha bg-creme-claro hover:border-preto"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; quem?: string; tarefa?: string; nova?: string }>;
}) {
  const sessao = await getSessao();
  if (!sessao) redirect("/login?next=/org/tarefas");

  const { vista, quem, tarefa: tarefaId, nova } = await searchParams;
  const quadro = vista === "quadro";
  const todas = quem === "todas";

  // Query que a janela da tarefa conserva ao abrir e ao fechar.
  const qs = new URLSearchParams({ ...(quadro ? { vista: "quadro" } : {}), ...(todas ? { quem: "todas" } : {}) }).toString();
  const base = `/org/tarefas${qs ? `?${qs}` : ""}`;
  const href = (v: boolean, t: boolean) => {
    const p = new URLSearchParams({ ...(v ? { vista: "quadro" } : {}), ...(t ? { quem: "todas" } : {}) }).toString();
    return `/org/tarefas${p ? `?${p}` : ""}`;
  };

  const [tarefas, membros, aberta] = await Promise.all([
    listarTarefas({ executorId: todas ? undefined : sessao.conta.id }),
    membrosOrg(),
    tarefaId && UUID.test(tarefaId) ? tarefaPorId(tarefaId) : Promise.resolve(null),
  ]);
  if (tarefaId && !aberta) notFound();
  const hoje = hojeSP();

  const emAberto = tarefas.filter((t) => t.status !== "concluida");
  const concluidas = tarefas.filter((t) => t.status === "concluida");
  const novaTarefaHref = `/org/tarefas?${qs ? `${qs}&` : ""}nova=1`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black tracking-tighter md:text-4xl">
          {todas ? "Todas as tarefas" : "Minhas tarefas"}
        </h1>
        <Botao href={novaTarefaHref}>
          <Plus size={16} aria-hidden="true" />
          Nova tarefa
        </Botao>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <nav aria-label="Quem" className="flex gap-2">
          <Aba href={href(quadro, false)} ativa={!todas}>
            Minhas
          </Aba>
          <Aba href={href(quadro, true)} ativa={todas}>
            Todas
          </Aba>
        </nav>
        <nav aria-label="Visualização" className="flex gap-2">
          <Aba href={href(false, todas)} ativa={!quadro}>
            Lista
          </Aba>
          <Aba href={href(true, todas)} ativa={quadro}>
            Quadro
          </Aba>
        </nav>
      </div>

      {quadro ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STATUS_OPCOES.map(({ valor, rotulo }) => {
            const itens: TarefaDb[] = tarefas.filter((t) => t.status === valor);
            return (
              <section key={valor} aria-label={rotulo} className="flex flex-col gap-3 bg-creme-claro/50 p-3">
                <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-cinza">
                  {rotulo} · {itens.length}
                </h2>
                <ul className="flex flex-col gap-3">
                  {itens.map((t) => (
                    <CartaoTarefa key={t.id} t={t} membros={membros} hoje={hoje} qs={qs} />
                  ))}
                </ul>
                {itens.length === 0 && <p className="px-1 text-sm text-cinza">Nada por aqui.</p>}
              </section>
            );
          })}
        </div>
      ) : (
        <>
          <Card>
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-cinza">
              Em aberto · {emAberto.length}
            </h2>
            {emAberto.length === 0 ? (
              <p className="mt-3 text-[15px]">
                Nenhuma tarefa em aberto.{" "}
                <Link href={novaTarefaHref} className="font-bold text-laranja-texto underline">
                  Criar tarefa
                </Link>
              </p>
            ) : (
              <div className="mt-3">
                <TabelaTarefas tarefas={emAberto} membros={membros} hoje={hoje} qs={qs} />
              </div>
            )}
          </Card>

          {concluidas.length > 0 && (
            <Card>
              <h2 className="font-mono text-[11px] uppercase tracking-widest text-cinza">
                Concluídas · {concluidas.length}
              </h2>
              <div className="mt-3">
                <TabelaTarefas tarefas={concluidas} membros={membros} hoje={hoje} qs={qs} />
              </div>
            </Card>
          )}
        </>
      )}

      {aberta && (
        <Modal key={aberta.id} fecharHref={base} rotulo={`Tarefa: ${aberta.titulo}`}>
          <DetalheTarefa tarefa={aberta} membros={membros} qs={qs} />
        </Modal>
      )}
      {!aberta && nova === "1" && (
        <Modal fecharHref={base} rotulo="Nova tarefa">
          <h2 className="mb-5 pr-10 text-2xl font-black tracking-tighter">Nova tarefa</h2>
          <FormNovaTarefa membros={membros} euId={sessao.conta.id} fecharHref={base} />
        </Modal>
      )}
    </div>
  );
}
