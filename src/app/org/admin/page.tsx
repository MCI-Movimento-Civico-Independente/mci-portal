import { TbArrowUpRight, TbClipboardList, TbPlaylistAdd, TbUserCog, TbUsersGroup } from "react-icons/tb";
import Link from "next/link";

export const metadata = { title: "Administração · MCi" };

const itens = [
  {
    href: "/org/admin/membros",
    titulo: "Membros e acessos",
    texto: "Veja todas as contas e defina quem é membro, da organização ou admin.",
    icone: TbUserCog,
  },
  {
    href: "/org/admin/formularios",
    titulo: "Formulários",
    texto: "Defina quais campos cada formulário tem e qual é o padrão de cada comitê.",
    icone: TbClipboardList,
  },
  {
    href: "/org/admin/campos",
    titulo: "Campos personalizados",
    texto: "Crie campos de texto, número, data, lista e caixa de marcação para usar nos formulários.",
    icone: TbPlaylistAdd,
  },
  {
    href: "/org/admin/comites",
    titulo: "Comitês",
    texto: "Crie, renomeie, reordene e exclua comitês.",
    icone: TbUsersGroup,
  },
];

export default function AdminPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="font-titulo font-black uppercase tracking-tight text-3xl md:text-4xl">Administração</h1>
      <ul className="grid gap-4 md:grid-cols-2">
        {itens.map(({ href, titulo, texto, icone: Icone }) => (
          <li key={href}>
            <Link
              href={href}
              className="group relative flex min-h-[150px] flex-col gap-3 rounded-lg border border-borda bg-superficie p-5 hover:border-borda-forte"
            >
              <Icone size={22} aria-hidden="true" />
              <span className="text-xl font-semibold">{titulo}</span>
              <span className="text-sm text-suave">{texto}</span>
              <TbArrowUpRight size={18} aria-hidden="true" className="absolute right-4 top-4 group-hover:text-marca-texto" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
