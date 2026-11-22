import { ArrowUpRight, UsersRound, UserCog } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Administração · MCi" };

const itens = [
  {
    href: "/org/admin/membros",
    titulo: "Membros e acessos",
    texto: "Veja todas as contas e defina quem é membro, da organização ou admin.",
    icone: UserCog,
  },
  {
    href: "/org/admin/comites",
    titulo: "Comitês",
    texto: "Crie, renomeie, reordene e exclua comitês.",
    icone: UsersRound,
  },
];

export default function AdminPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-3xl font-black tracking-tighter md:text-4xl">Administração</h1>
      <ul className="grid gap-4 md:grid-cols-2">
        {itens.map(({ href, titulo, texto, icone: Icone }) => (
          <li key={href}>
            <Link
              href={href}
              className="group relative flex min-h-[150px] flex-col gap-3 border border-linha bg-creme-claro p-5 hover:border-preto"
            >
              <Icone size={22} aria-hidden="true" />
              <span className="text-xl font-black tracking-tight">{titulo}</span>
              <span className="text-sm text-cinza">{texto}</span>
              <ArrowUpRight size={18} aria-hidden="true" className="absolute right-4 top-4 group-hover:text-laranja-texto" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
