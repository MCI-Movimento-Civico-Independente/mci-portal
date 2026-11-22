"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

type Props = {
  inicial: string;
  nome: string;
  podeOrg: boolean;
  souAdmin?: boolean;
  temGoogle: boolean;
};

const item =
  "flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-medium hover:bg-sutil";

/** Avatar com menu: Organização (só com papel), Administração, Comunidade, tema, Vincular Google, Sair. */
export function MenuAvatar({ inicial, nome, podeOrg, souAdmin = false, temGoogle }: Props) {
  const pathname = usePathname();
  // Guarda a rota em que o menu foi aberto: ao navegar, ele fecha sozinho.
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberto = abertoEm === pathname;
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAbertoEm(null);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbertoEm(null);
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        aria-label={`Menu de ${nome}`}
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={() => setAbertoEm(aberto ? null : pathname)}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-marca text-base font-semibold text-sobre-marca shadow-suave ring-2 ring-superficie hover:bg-marca-texto hover:shadow-elevado"
      >
        {inicial}
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border border-borda bg-superficie p-1.5 text-texto shadow-flutuante"
        >
          <p className="truncate px-3 pb-2 pt-2 text-sm font-semibold">{nome}</p>
          <div className="border-t border-borda pt-1.5">
            {podeOrg && (
              <Link role="menuitem" href="/org" className={item}>
                Organização
              </Link>
            )}
            {souAdmin && (
              <Link role="menuitem" href="/org/admin" className={item}>
                Administração
              </Link>
            )}
            <Link role="menuitem" href="/comunidade" className={item}>
              Comunidade
            </Link>
            {!temGoogle && (
              <form action="/auth/google" method="post">
                <input type="hidden" name="modo" value="vincular" />
                <button role="menuitem" type="submit" className={item}>
                  Vincular Google
                </button>
              </form>
            )}
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-borda px-3 py-2">
            <span className="text-sm font-medium text-suave">Tema</span>
            <ThemeToggle compacto />
          </div>
          <form action="/auth/sair" method="post" className="border-t border-borda pt-1.5">
            <button role="menuitem" type="submit" className={`${item} text-marca-texto`}>
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
