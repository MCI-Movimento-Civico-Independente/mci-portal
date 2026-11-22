import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { comitesComResumo } from "@/lib/organizacao";

export const metadata = { title: "Comitês · MCi" };

export default async function ComitesPage() {
  const comites = await comitesComResumo();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-black tracking-tighter md:text-4xl">Comitês</h1>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {comites.map((c, i) => (
          <li key={c.slug}>
            <Link
              href={`/org/comites/${c.slug}`}
              className={`relative flex min-h-[160px] flex-col justify-between p-5 hover:brightness-110 ${
                i % 2 === 0 ? "bg-preto text-creme" : "bg-laranja text-preto"
              }`}
            >
              <ArrowUpRight size={18} aria-hidden="true" className="absolute right-4 top-4" />
              <span className="pr-8 text-xl font-black uppercase leading-tight tracking-tight">{c.nome}</span>
              <span className="font-mono text-[11px] tracking-wide">
                {c.projetosAtivos} {c.projetosAtivos === 1 ? "projeto ativo" : "projetos ativos"} · {c.tarefasAbertas}{" "}
                {c.tarefasAbertas === 1 ? "tarefa em aberto" : "tarefas em aberto"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
