"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { estaAtivo, itensInferiores } from "./itens-nav";

export function NavegacaoInferior() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 bg-preto md:hidden"
    >
      {itensInferiores.map((item) => {
        const ativo = estaAtivo(pathname, item);
        const Icone = item.icone;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            className={`flex min-h-[72px] flex-col items-center justify-center gap-1.5 text-xs font-semibold ${
              ativo ? "text-amarelo" : "text-creme"
            }`}
          >
            <Icone size={20} aria-hidden="true" />
            {item.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
