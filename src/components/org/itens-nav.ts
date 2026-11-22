import { TbCalendar, TbDots, TbFileText, TbHome, TbLayoutKanban, TbSettings, TbSquareCheck, TbUsers } from "react-icons/tb";
import type { IconType } from "react-icons";

export type ItemNav = {
  href: string;
  rotulo: string;
  icone: IconType;
  /** Prefixos extras de rota que também deixam o item ativo. */
  tambem?: string[];
};

export const itensLaterais: ItemNav[] = [
  { href: "/org", rotulo: "Início", icone: TbHome },
  { href: "/org/tarefas", rotulo: "Minhas tarefas", icone: TbSquareCheck },
  { href: "/org/projetos", rotulo: "Projetos", icone: TbLayoutKanban },
  { href: "/org/calendario", rotulo: "Calendário", icone: TbCalendar },
  { href: "/org/documentos", rotulo: "Documentos", icone: TbFileText },
  { href: "/org/membros", rotulo: "Membros", icone: TbUsers },
];

export const itemAdmin: ItemNav = { href: "/org/admin", rotulo: "Administração", icone: TbSettings };

export const itensInferiores: ItemNav[] = [
  { href: "/org", rotulo: "Início", icone: TbHome },
  { href: "/org/tarefas", rotulo: "Tarefas", icone: TbSquareCheck },
  { href: "/org/projetos", rotulo: "Projetos", icone: TbLayoutKanban },
  { href: "/org/calendario", rotulo: "Agenda", icone: TbCalendar },
  {
    href: "/org/documentos",
    rotulo: "Mais",
    icone: TbDots,
    tambem: ["/org/membros"],
  },
];

export function estaAtivo(pathname: string, item: ItemNav) {
  if (item.href === "/org") return pathname === "/org";
  return [item.href, ...(item.tambem ?? [])].some(
    (prefixo) => pathname === prefixo || pathname.startsWith(`${prefixo}/`),
  );
}
