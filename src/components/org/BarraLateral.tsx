"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { estaAtivo, itensLaterais } from "./itens-nav";

export function BarraLateral() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[248px] shrink-0 flex-col bg-preto text-creme md:flex">
      <div className="sticky top-0 flex h-dvh flex-col px-[18px] pb-[18px] pt-6">
        <Link href="/org" className="mb-6 flex items-baseline gap-2 px-2">
          <Logo tom="claro" className="text-[32px]" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-creme/70">
            Organização
          </span>
        </Link>

        <nav aria-label="Principal" className="flex flex-col gap-0.5">
          {itensLaterais.map((item) => {
            const ativo = estaAtivo(pathname, item);
            const Icone = item.icone;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 px-3.5 text-[15px] font-medium ${
                  ativo ? "bg-amarelo font-bold text-preto" : "text-creme"
                }`}
              >
                <Icone size={18} aria-hidden="true" />
                {item.rotulo}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/"
          className="mt-auto flex min-h-11 items-center gap-3 border border-creme/30 px-3.5 font-mono text-[11px] uppercase tracking-widest text-creme"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Voltar ao portal
        </Link>
      </div>
    </aside>
  );
}
