import { Suspense } from "react";
import { TbPlus } from "react-icons/tb";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CartaoTarefa } from "@/components/tarefas/CartaoTarefa";
import { JanelasTarefa } from "@/components/tarefas/JanelasTarefa";
import { TabelaTarefas } from "@/components/tarefas/TabelaTarefas";
import { Botao } from "@/components/ui/Botao";
import { Card } from "@/components/ui/Card";
import { getSessao } from "@/lib/auth/sessao";
import { hojeSP } from "@/lib/datas";
import { listarCamposPersonalizados } from "@/lib/campos-personalizados";
import { listarFormularios } from "@/lib/formularios";
import { listarGrupos } from "@/lib/grupos";
import { comitesBasicos, projetosBasicos } from "@/lib/organizacao";
import { listarTarefas, membrosOrg, tarefaPorId, type TarefaDb } from "@/lib/tarefas";
import { STATUS_OPCOES } from "@/lib/tarefas-campos";

export const metadata = { title: "Tarefas · MCi" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Aba({ href, ativa, children }: { href: string; ativa: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={ativa ? "page" : undefined}
      className={`rotulo inline-flex min-h-11 items-center border-2 px-4 font-bold ${
        ativa
          ? "border-inverso bg-inverso text-sobre-inverso"
          : "border-borda-forte text-texto hover:border-inverso hover:bg-inverso hover:text-sobre-inverso"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function TarefasPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; quem?: string; tarefa?: string; nova?: string; comite?: string; projeto?: string }>;
}) {
  const sessao = await getSessao();
  if (!sessao) redirect("/login?next=/org/tarefas");

  const { vista, quem, tarefa: tarefaId, comite: comiteParam, projeto: projetoParam } = await searchParams;
  const quadro = vista === "quadro";
  const todas = quem === "todas";

  const [membros, comites, projetos, formularios, camposPersonalizados, grupos] = await Promise.all([
    membrosOrg(),
    comitesBasicos(),
    projetosBasicos(),
    listarFormularios(),
    listarCamposPersonalizados(),
    listarGrupos(),
  ]);
  // Só aceita filtros que existem de verdade.
  const comite = comites.find((c) => c.slug === comiteParam)?.slug;
  const projeto = projetos.find((p) => p.id === projetoParam)?.id;

  // Query que a janela da tarefa conserva ao abrir e ao fechar.
  const montarQs = (v: boolean, t: boolean) =>
    new URLSearchParams({
      ...(v ? { vista: "quadro" } : {}),
      ...(t ? { quem: "todas" } : {}),
      ...(comite ? { comite } : {}),
      ...(projeto ? { projeto } : {}),
    }).toString();
  const qs = montarQs(quadro, todas);
  const base = `/org/tarefas${qs ? `?${qs}` : ""}`;
  const semFiltrosQs = new URLSearchParams({ ...(quadro ? { vista: "quadro" } : {}), ...(todas ? { quem: "todas" } : {}) }).toString();
  const semFiltros = `/org/tarefas${semFiltrosQs ? `?${semFiltrosQs}` : ""}`;
  const href = (v: boolean, t: boolean) => {
    const p = montarQs(v, t);
    return `/org/tarefas${p ? `?${p}` : ""}`;
  };

  const [tarefas, aberta] = await Promise.all([
    listarTarefas({ executorId: todas ? undefined : sessao.conta.id, comite, projetoId: projeto }),
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
        <h1 className="font-titulo font-black uppercase tracking-tight text-3xl md:text-4xl">
          {todas ? "Todas as tarefas" : "Minhas tarefas"}
        </h1>
        <Botao href={novaTarefaHref} local>
          <TbPlus size={16} aria-hidden="true" />
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

      <form method="get" action="/org/tarefas" className="flex flex-wrap items-end gap-3">
        {quadro && <input type="hidden" name="vista" value="quadro" />}
        {todas && <input type="hidden" name="quem" value="todas" />}
        <label className="flex flex-col gap-1 text-xs font-bold">
          Comitê
          <select name="comite" defaultValue={comite ?? ""} className="min-h-11 w-64 max-w-full rounded-lg border border-borda bg-superficie px-2 text-sm font-medium hover:border-borda-forte">
            <option value="">Todos os comitês</option>
            {comites.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-bold">
          Projeto
          <select name="projeto" defaultValue={projeto ?? ""} className="min-h-11 w-64 max-w-full rounded-lg border border-borda bg-superficie px-2 text-sm font-medium hover:border-borda-forte">
            <option value="">Todos os projetos</option>
            {projetos
              .filter((p) => p.status === "ativo" || p.id === projeto)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
          </select>
        </label>
        <Botao type="submit" variante="secundario">
          Filtrar
        </Botao>
        {(comite || projeto) && (
          <Link href={semFiltros} className="inline-flex min-h-11 items-center px-2 text-sm font-bold text-marca-texto underline">
            Limpar filtros
          </Link>
        )}
      </form>

      {quadro ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STATUS_OPCOES.map(({ valor, rotulo }) => {
            const itens: TarefaDb[] = tarefas.filter((t) => t.status === valor);
            return (
              <section key={valor} aria-label={rotulo} className="flex flex-col gap-3 rounded-2xl bg-sutil p-3">
                <h2 className="rotulo font-bold tracking-widest text-suave">
                  {rotulo} · {itens.length}
                </h2>
                <ul className="flex flex-col gap-3">
                  {itens.map((t) => (
                    <CartaoTarefa key={t.id} t={t} membros={membros} hoje={hoje} qs={qs} />
                  ))}
                </ul>
                {itens.length === 0 && <p className="px-1 text-sm text-suave">Nada por aqui.</p>}
              </section>
            );
          })}
        </div>
      ) : (
        <>
          <Card className="p-4 md:p-4">
            <h2 className="rotulo-barras text-suave">
              Em aberto · {emAberto.length}
            </h2>
            {emAberto.length === 0 ? (
              <p className="mt-3 text-[15px]">
                Nenhuma tarefa em aberto.{" "}
                <Link href={novaTarefaHref} className="font-bold text-marca-texto underline">
                  Criar tarefa
                </Link>
              </p>
            ) : (
              <div className="mt-3">
                <TabelaTarefas tarefas={emAberto} membros={membros} comites={comites} projetos={projetos} hoje={hoje} qs={qs} />
              </div>
            )}
          </Card>

          {concluidas.length > 0 && (
            <Card className="p-4 md:p-4">
              <h2 className="rotulo-barras text-suave">
                Concluídas · {concluidas.length}
              </h2>
              <div className="mt-3">
                <TabelaTarefas tarefas={concluidas} membros={membros} comites={comites} projetos={projetos} hoje={hoje} qs={qs} />
              </div>
            </Card>
          )}
        </>
      )}

      <Suspense fallback={null}>
        <JanelasTarefa
          tarefas={tarefas}
          inicial={aberta}
          membros={membros}
          comites={comites}
          projetos={projetos}
          formularios={formularios}
          grupos={grupos}
          camposPersonalizados={camposPersonalizados}
          caminho="/org/tarefas"
          base={base}
          qs={qs}
          euId={sessao.conta.id}
          souAdmin={sessao.conta.papel === "admin"}
          hoje={hoje}
        />
      </Suspense>
    </div>
  );
}
