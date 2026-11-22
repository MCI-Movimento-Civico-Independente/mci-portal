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
    <aside className="hidden w-[248px] shrink-0 bg-bloco text-sobre-bloco md:flex">
      <div className="sticky top-0 flex h-dvh w-full flex-col gap-8 px-[18px] pb-[18px] pt-6">
        <Link href="/org" aria-label="MCI, início" className="flex items-baseline gap-2 px-2">
          <Logo className="text-[32px]" />
          <span className="rotulo text-[10px] text-sobre-bloco/70">Organização</span>
        </Link>

        <nav aria-label="Principal" className="flex flex-col gap-0.5">
          {itens.map((item) => {
            const ativo = estaAtivo(pathname, item);
            const Icone = item.icone;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 px-3.5 text-[15px] ${
                  ativo
                    ? "bg-ouro font-bold text-sobre-ouro"
                    : "font-medium text-sobre-bloco hover:bg-sobre-bloco/15"
                }`}
              >
                <Icone size={18} aria-hidden="true" />
                {item.rotulo}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <ThemeToggle />
          <Link
            href="/"
            className="rotulo flex min-h-11 items-center gap-3 border-2 border-sobre-bloco/30 px-3.5 text-sobre-bloco hover:border-sobre-bloco hover:bg-sobre-bloco hover:text-bloco"
          >
            <TbChevronLeft size={16} aria-hidden="true" />
            Voltar ao portal
          </Link>
        </div>
      </div>
    </aside>
  );
}
