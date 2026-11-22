import { TbChevronLeft } from "react-icons/tb";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormNovoProjeto } from "@/components/projetos/FormNovoProjeto";
import { ListaProjetos } from "@/components/projetos/ListaProjetos";
import { Botao } from "@/components/ui/Botao";
import { Card } from "@/components/ui/Card";
import { comitesBasicos, projetosComResumo } from "@/lib/organizacao";

export default async function ComitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const comites = await comitesBasicos();
  const comite = comites.find((c) => c.slug === slug);
  if (!comite) notFound();
  const projetos = await projetosComResumo(slug);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link
        href="/org/comites"
        className="inline-flex min-h-11 w-fit items-center gap-1 rotulo text-marca-texto hover:underline"
      >
        <TbChevronLeft size={14} aria-hidden="true" />
        Comitês
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-titulo font-black uppercase tracking-tight min-w-0 flex-1 text-2xl leading-tight md:text-3xl">{comite.nome}</h1>
        <Botao href={`/org/tarefas?quem=todas&comite=${comite.slug}`} variante="secundario">
          Ver tarefas do comitê
        </Botao>
      </div>

      <Card>
        <h2 className="mb-2 text-xl font-semibold">Projetos</h2>
        <ListaProjetos projetos={projetos} />
      </Card>
      <Card>
        <FormNovoProjeto comites={comites} comiteFixo={comite.slug} />
      </Card>
    </div>
  );
}
