import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type VarianteBotao = "primario" | "destaque" | "secundario";

const estilos: Record<VarianteBotao, string> = {
  // Ação principal: laranja da marca.
  primario: "bg-marca text-sobre-marca shadow-suave hover:bg-marca-texto hover:shadow-elevado",
  // Ação forte, neutra: inverte com o tema (grafite no claro, claro no escuro).
  destaque: "bg-inverso text-sobre-inverso shadow-suave hover:opacity-90 hover:shadow-elevado",
  // Ação secundária: contorno.
  secundario:
    "border border-borda-forte bg-superficie text-texto shadow-suave hover:border-texto hover:bg-sutil",
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
  const classes = `inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 ${estilos[variante]} ${className}`;

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
