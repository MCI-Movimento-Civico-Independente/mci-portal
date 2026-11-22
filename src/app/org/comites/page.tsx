import { CartaoComite } from "@/components/org/CartaoComite";
import { comitesComResumo } from "@/lib/organizacao";

export const metadata = { title: "Comitês · MCi" };

export default async function ComitesPage() {
  const comites = await comitesComResumo();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-3xl md:text-4xl">Comitês</h1>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {comites.map((c) => (
          <li key={c.slug}>
            <CartaoComite comite={c} />
          </li>
        ))}
      </ul>
    </div>
  );
}
