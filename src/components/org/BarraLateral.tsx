"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TbChevronLeft } from "react-icons/tb";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/ui/Logo";
import { estaAtivo, itemAdmin, itensLaterais } from "./itens-nav";

export function BarraLateral({ souAdmin = false }: { souAdmin?: boolean }) {
  const pathname = usePathname();
  const itens = souAdmin ? [...itensLaterais, itemAdmin] : itensLaterais;

  return (
    <aside className="hidden w-64 shrink-0 border-r border-borda bg-superficie md:flex">
      <div className="sticky top-0 flex h-dvh w-full flex-col gap-8 px-4 pb-4 pt-6">
        <Link href="/org" aria-label="MCI, início" className="flex items-center gap-3 rounded-lg px-2">
          <Logo className="text-4xl" />
          <span className="rounded-full bg-sutil px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-suave">
            Organização
          </span>
        </Link>

        <nav aria-label="Principal" className="flex flex-col gap-1">
          {itens.map((item) => {
            const ativo = estaAtivo(pathname, item);
            const Icone = item.icone;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] ${
                  ativo
                    ? "bg-marca-suave font-semibold text-marca-texto"
                    : "font-medium text-suave hover:bg-sutil hover:text-texto"
                }`}
              >
                <Icone size={19} aria-hidden="true" className={ativo ? "" : "group-hover:text-marca-texto"} />
                {item.rotulo}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <ThemeToggle />
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2 rounded-xl border border-borda px-3 text-sm font-medium text-suave hover:bg-sutil hover:text-texto"
          >
            <TbChevronLeft size={16} aria-hidden="true" />
            Voltar ao portal
          </Link>
        </div>
      </div>
    </aside>
  );
}
