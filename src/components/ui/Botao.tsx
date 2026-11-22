import Link from "next/link";
import { LinkLocal } from "@/components/LinkLocal";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type VarianteBotao = "primario" | "destaque" | "secundario";

// Papel/Noite: ação principal em cor inversa (preto no papel), destaque em laranja,
// secundária só com contorno de 2px. Cantos retos e sem sombra, como no manual.
const estilos: Record<VarianteBotao, string> = {
  primario: "border-2 border-inverso bg-inverso text-sobre-inverso hover:border-marca-texto hover:bg-marca-texto hover:text-sobre-inverso",
  destaque: "border-2 border-marca bg-marca text-sobre-marca hover:border-inverso hover:bg-inverso hover:text-sobre-inverso",
  secundario: "border-2 border-inverso bg-transparent text-texto hover:bg-inverso hover:text-sobre-inverso",
};

type BaseProps = {
  variante?: VarianteBotao;
  children: ReactNode;
  className?: string;
};

type BotaoProps = BaseProps &
  (
    | ({ href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>)
    | { href: string; /** Só troca a URL, sem pedir a página ao servidor (abre janelas na hora). */ local?: boolean }
  );

/** Botão com alvo de toque mínimo de 44px. Com `href`, renderiza um link. */
export function Botao({
  variante = "primario",
  children,
  className = "",
  ...resto
}: BotaoProps) {
  const classes = `inline-flex min-h-11 min-w-11 items-center justify-center gap-2 px-5 text-sm font-bold active:translate-y-px disabled:pointer-events-none disabled:opacity-50 ${estilos[variante]} ${className}`;

  if (resto.href !== undefined) {
    if ("local" in resto && resto.local) {
      return (
        <LinkLocal href={resto.href} className={classes}>
          {children}
        </LinkLocal>
      );
    }
    return (
      <Link href={resto.href} className={classes}>
        {children}
      </Link>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- tira o href dos atributos do <button>
  const { href: _href, ...atributos } = resto as ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
  return (
    <button type="button" className={classes} {...atributos}>
      {children}
    </button>
  );
}
