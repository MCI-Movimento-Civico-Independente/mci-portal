import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AbasProjeto } from "@/components/paginas/AbasProjeto";
import { getSessao } from "@/lib/auth/sessao";
import { comitesBasicos, projetoPorId } from "@/lib/organizacao";
import { listarAbas } from "@/lib/paginas/paginas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cabeçalho e abas do projeto; embaixo vem o quadro ou a página escolhida. */
export default async function ProjetoLayout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await getSessao();
  if (!sessao) redirect(`/login?next=/org/projetos/${encodeURIComponent(id)}`);
  if (!sessao.podeOrg) redirect("/comunidade");
  if (!UUID.test(id)) notFound();

  const [projeto, comites, abas] = await Promise.all([projetoPorId(id), comitesBasicos(), listarAbas(id)]);
  if (!projeto) notFound();
  const nomeComite = comites.find((c) => c.slug === projeto.comite_slug)?.nome ?? projeto.comite_slug;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="rotulo flex flex-wrap items-center gap-x-2 text-suave">
          <Link href="/org/projetos" className="inline-flex min-h-11 items-center text-marca-texto hover:underline">
            Projetos
          </Link>
          <span aria-hidden="true">/</span>
          <span>{nomeComite}</span>
        </p>
        <h1 className="mb-3 font-titulo text-3xl font-black uppercase leading-none tracking-tight md:text-4xl">
          {projeto.nome}
          {projeto.status === "arquivado" && (
            <span className="rotulo ml-3 border-2 border-borda-forte px-2 py-1 align-middle font-bold normal-case">Arquivado</span>
          )}
        </h1>
        <AbasProjeto projetoId={id} abas={abas.map((a) => ({ id: a.id, titulo: a.titulo }))} />
      </header>
      {children}
    </div>
  );
}
