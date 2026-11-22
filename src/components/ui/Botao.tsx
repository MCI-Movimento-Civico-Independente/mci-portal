import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type VarianteBotao = "primario" | "destaque" | "secundario";

const estilos: Record<VarianteBotao, string> = {
  primario:
    "bg-preto text-creme-claro border-preto hover:bg-laranja-texto hover:border-laranja-texto",
  destaque: "bg-laranja text-preto border-laranja hover:bg-preto hover:border-preto hover:text-creme-claro",
  secundario:
    "bg-transparent text-preto border-preto border-2 hover:bg-preto hover:text-creme-claro",
};

type BaseProps = {
  variante?: VarianteBotao;
  children: ReactNode;
  className?: string;
};

type BotaoProps = BaseProps &
  (
    | ({ href?: undefined } & ButtonHTMLAttributes<HTMLButtonElement>)
    | { href: string }
  );

/** Botão com alvo de toque mínimo de 44px. Com `href`, renderiza um link. */
export function Botao({
  variante = "primario",
  children,
  className = "",
  ...resto
}: BotaoProps) {
  const classes = `inline-flex min-h-11 min-w-11 items-center justify-center gap-2 border px-5 text-sm font-bold active:translate-y-px disabled:pointer-events-none disabled:opacity-60 ${estilos[variante]} ${className}`;

  if (resto.href !== undefined) {
    return (
      <Link href={resto.href} className={classes}>
        {children}
      </Link>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- tira o href dos atributos do <button>
  const { href: _href, ...atributos } = resto;
  return (
    <button type="button" className={classes} {...atributos}>
      {children}
    </button>
  );
}
