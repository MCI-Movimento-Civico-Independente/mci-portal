import {
  Calendar,
  CheckSquare,
  FileText,
  Home,
  SquareKanban,
  MoreHorizontal,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

export type ItemNav = {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** Prefixos extras de rota que também deixam o item ativo. */
  tambem?: string[];
};

export const itensLaterais: ItemNav[] = [
  { href: "/org", rotulo: "Início", icone: Home },
  { href: "/org/tarefas", rotulo: "Minhas tarefas", icone: CheckSquare },
  { href: "/org/projetos", rotulo: "Projetos", icone: SquareKanban },
  { href: "/org/comites", rotulo: "Comitês", icone: UsersRound },
  { href: "/org/calendario", rotulo: "Calendário", icone: Calendar },
  { href: "/org/documentos", rotulo: "Documentos", icone: FileText },
  { href: "/org/membros", rotulo: "Membros", icone: Users },
];

export const itensInferiores: ItemNav[] = [
  { href: "/org", rotulo: "Início", icone: Home },
  { href: "/org/tarefas", rotulo: "Tarefas", icone: CheckSquare },
  { href: "/org/projetos", rotulo: "Projetos", icone: SquareKanban },
  { href: "/org/calendario", rotulo: "Agenda", icone: Calendar },
  {
    href: "/org/comites",
    rotulo: "Mais",
    icone: MoreHorizontal,
    tambem: ["/org/documentos", "/org/membros"],
  },
];

export function estaAtivo(pathname: string, item: ItemNav) {
  if (item.href === "/org") return pathname === "/org";
  return [item.href, ...(item.tambem ?? [])].some(
    (prefixo) => pathname === prefixo || pathname.startsWith(`${prefixo}/`),
  );
}
