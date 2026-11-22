import { CartaoComite } from "@/components/org/CartaoComite";
import { comitesComResumo } from "@/lib/organizacao";

export const metadata = { title: "Comitês · MCi" };

export default async function ComitesPage() {
  const comites = await comitesComResumo();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="rotulo-barras text-suave">Organização</p>
        <h1 className="mt-1 font-titulo text-3xl font-black uppercase leading-none tracking-tight md:text-4xl">Comitês</h1>
      </div>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {comites.map((c, i) => (
          <li key={c.slug}>
            <CartaoComite comite={c} indice={i} />
          </li>
        ))}
      </ul>
    </div>
  );
}
