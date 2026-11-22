"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { estaAtivo, itensInferiores } from "./itens-nav";

export function NavegacaoInferior() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-borda bg-superficie/95 shadow-flutuante backdrop-blur md:hidden"
    >
      {itensInferiores.map((item) => {
        const ativo = estaAtivo(pathname, item);
        const Icone = item.icone;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={ativo ? "page" : undefined}
            className={`flex min-h-[68px] flex-col items-center justify-center gap-1 text-xs font-medium ${
              ativo ? "text-marca-texto" : "text-suave hover:text-texto"
            }`}
          >
            <span
              className={`flex h-7 w-12 items-center justify-center rounded-full ${ativo ? "bg-marca-suave" : ""}`}
            >
              <Icone size={20} aria-hidden="true" />
            </span>
            {item.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}
