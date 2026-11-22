import { FormNovoProjeto } from "@/components/projetos/FormNovoProjeto";
import { ListaProjetos } from "@/components/projetos/ListaProjetos";
import { Card } from "@/components/ui/Card";
import { comitesBasicos, projetosComResumo } from "@/lib/organizacao";

export const metadata = { title: "Projetos · MCi" };

export default async function ProjetosPage() {
  const [comites, projetos] = await Promise.all([comitesBasicos(), projetosComResumo()]);
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="font-serif text-3xl md:text-4xl">Projetos</h1>
      {comites.map((c) => {
        const doComite = projetos.filter((p) => p.comite_slug === c.slug);
        return (
          <Card key={c.slug}>
            <h2 className="mb-2 text-[11px] uppercase tracking-widest text-suave">{c.nome}</h2>
            <ListaProjetos projetos={doComite} />
          </Card>
        );
      })}
      <Card>
        <FormNovoProjeto comites={comites} />
      </Card>
    </div>
  );
}
