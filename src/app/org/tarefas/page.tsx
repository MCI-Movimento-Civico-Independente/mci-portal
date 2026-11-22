import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CartaoTarefa } from "@/components/tarefas/CartaoTarefa";
import { LinhaTarefa } from "@/components/tarefas/LinhaTarefa";
import { Botao } from "@/components/ui/Botao";
import { Card } from "@/components/ui/Card";
import type { StatusTarefa } from "@/components/ui/EtiquetaStatus";
import { getSessao } from "@/lib/auth/sessao";
import { hojeSP } from "@/lib/datas";
import { listarTarefas, type TarefaDb } from "@/lib/tarefas";

export const metadata = { title: "Tarefas · MCi" };

const COLUNAS: { status: StatusTarefa; rotulo: string }[] = [
  { status: "a_fazer", rotulo: "A fazer" },
  { status: "em_andamento", rotulo: "Em andamento" },
  { status: "em_revisao", rotulo: "Em revisão" },
  { status: "concluida", rotulo: "Concluída" },
];

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
  searchParams: Promise<{ vista?: string; quem?: string }>;
}) {
  const sessao = await getSessao();
  if (!sessao) redirect("/login?next=/org/tarefas");

  const { vista, quem } = await searchParams;
  const quadro = vista === "quadro";
  const todas = quem === "todas";
  const eu = todas ? undefined : sessao.conta.id;

  const [abertas, concluidas] = await Promise.all([
    listarTarefas({ responsavelId: eu, situacao: "abertas" }),
    listarTarefas({ responsavelId: eu, situacao: "concluidas" }),
  ]);
  const hoje = hojeSP();

  const href = (v: boolean, t: boolean) =>
    `/org/tarefas?${new URLSearchParams({ ...(v ? { vista: "quadro" } : {}), ...(t ? { quem: "todas" } : {}) })}`;

  const porStatus = (s: StatusTarefa): TarefaDb[] =>
    s === "concluida" ? concluidas : abertas.filter((t) => t.status === s);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black tracking-tighter md:text-4xl">
          {todas ? "Todas as tarefas" : "Minhas tarefas"}
        </h1>
        <Botao href="/org/tarefas/nova">
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
          {COLUNAS.map(({ status, rotulo }) => {
            const itens = porStatus(status);
            return (
              <section key={status} aria-label={rotulo} className="flex flex-col gap-3 bg-creme-claro/50 p-3">
                <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-cinza">
                  {rotulo} · {itens.length}
                </h2>
                <ul className="flex flex-col gap-3">
                  {itens.map((t) => (
                    <CartaoTarefa key={t.id} t={t} hoje={hoje} />
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
              Em aberto · {abertas.length}
            </h2>
            {abertas.length === 0 ? (
              <p className="mt-3 text-[15px]">
                Nenhuma tarefa em aberto.{" "}
                <Link href="/org/tarefas/nova" className="font-bold text-laranja-texto underline">
                  Criar tarefa
                </Link>
              </p>
            ) : (
              <ul className="mt-2">
                {abertas.map((t) => (
                  <LinhaTarefa key={t.id} t={t} hoje={hoje} />
                ))}
              </ul>
            )}
          </Card>

          {concluidas.length > 0 && (
            <Card>
              <h2 className="font-mono text-[11px] uppercase tracking-widest text-cinza">
                Concluídas · {concluidas.length}
              </h2>
              <ul className="mt-2">
                {concluidas.map((t) => (
                  <LinhaTarefa key={t.id} t={t} hoje={hoje} />
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
