import Link from "next/link";
import { TbPlus } from "react-icons/tb";
import { CartaoComite } from "@/components/org/CartaoComite";
import { CartaoProjeto } from "@/components/projetos/CartaoProjeto";
import { FormNovoProjeto } from "@/components/projetos/FormNovoProjeto";
import { comitesComResumo, projetosComResumo } from "@/lib/organizacao";

export const metadata = { title: "Projetos · MCI" };

export default async function ProjetosPage({ searchParams }: { searchParams: Promise<{ comite?: string }> }) {
  const { comite: comiteParam } = await searchParams;
  const [comites, todos] = await Promise.all([comitesComResumo(), projetosComResumo()]);
  const selecionado = comites.find((c) => c.slug === comiteParam);
  const nomeDo = new Map(comites.map((c) => [c.slug, c.nome]));

  // Ativos primeiro; dentro de cada grupo, por nome (a consulta já vem ordenada).
  const projetos = todos
    .filter((p) => !selecionado || p.comite_slug === selecionado.slug)
    .sort((a, b) => Number(a.status === "arquivado") - Number(b.status === "arquivado"));
  const ativos = projetos.filter((p) => p.status === "ativo").length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="rotulo-barras text-suave">Por comitê</p>
          <h1 className="mt-1 font-titulo text-3xl font-black uppercase leading-none tracking-tight md:text-4xl">Projetos</h1>
        </div>
        <p className="rotulo text-suave">
          {todos.filter((p) => p.status === "ativo").length} ativos · {todos.length} no total
        </p>
      </div>

      <section aria-label="Comitês">
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {comites.map((c, i) => (
            <li key={c.slug}>
              <CartaoComite
                comite={c}
                indice={i}
                href={selecionado?.slug === c.slug ? "/org/projetos" : `/org/projetos?comite=${c.slug}`}
                selecionado={selecionado?.slug === c.slug}
              />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="titulo-lista" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-borda pb-3">
          <h2 id="titulo-lista" className="font-titulo text-xl font-extrabold uppercase tracking-tight">
            {selecionado ? selecionado.nome : "Todos os projetos"}
            <span className="rotulo ml-3 font-normal text-suave">
              {ativos} {ativos === 1 ? "ativo" : "ativos"}
            </span>
          </h2>
          {selecionado && (
            <div className="flex flex-wrap items-center gap-x-5">
              <Link
                href={`/org/tarefas?quem=todas&comite=${selecionado.slug}`}
                className="rotulo inline-flex min-h-11 items-center text-marca-texto underline hover:text-texto"
              >
                Tarefas do comitê
              </Link>
              <Link href="/org/projetos" className="rotulo inline-flex min-h-11 items-center text-marca-texto underline hover:text-texto">
                Ver todos
              </Link>
            </div>
          )}
        </div>

        {projetos.length === 0 ? (
          <p className="text-[15px] text-suave">Nenhum projeto por aqui ainda. Crie o primeiro abaixo.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projetos.map((p) => (
              <li key={p.id}>
                <CartaoProjeto projeto={p} nomeComite={nomeDo.get(p.comite_slug) ?? p.comite_slug} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="group border-2 border-borda bg-superficie">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-5 py-2 text-sm font-bold hover:bg-sutil">
          <TbPlus size={17} aria-hidden="true" className="transition-transform group-open:rotate-45" />
          Novo projeto
        </summary>
        <div className="border-t-2 border-borda p-5 md:p-6">
          <FormNovoProjeto comites={comites} comiteFixo={selecionado?.slug} />
        </div>
      </details>
    </div>
  );
}
