"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Props = {
  inicial: string;
  nome: string;
  podeOrg: boolean;
  souAdmin?: boolean;
  temGoogle: boolean;
};

const item = "flex min-h-11 w-full items-center px-4 text-left text-sm font-bold hover:bg-creme";

/** Avatar com menu: Organização (só com papel), Comunidade, Vincular Google, Sair. */
export function MenuAvatar({ inicial, nome, podeOrg, souAdmin = false, temGoogle }: Props) {
  const pathname = usePathname();
  // Guarda a rota em que o menu foi aberto: ao navegar, ele fecha sozinho.
  const [abertoEm, setAbertoEm] = useState<string | null>(null);
  const aberto = abertoEm === pathname;
  const raiz = useRef<HTMLDivElement>(null);
  const setAberto = (valor: boolean) => setAbertoEm(valor ? pathname : null);

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
        onClick={() => setAberto(!aberto)}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-laranja text-lg font-extrabold text-preto hover:bg-laranja-texto hover:text-creme-claro"
      >
        {inicial}
      </button>

      {aberto && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-60 border border-preto bg-creme-claro text-preto"
        >
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
          <form action="/auth/sair" method="post" className="border-t border-linha">
            <button role="menuitem" type="submit" className={`${item} text-laranja-texto`}>
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
