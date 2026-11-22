type LogoProps = {
  className?: string;
};

/**
 * Assinatura do portal: "MCi" com o ponto laranja (Inter Tight 900). A cor das letras
 * é a do texto ao redor (currentColor), então funciona sobre fundo claro e escuro.
 * Usa o i sem ponto (ı) e desenha o ponto por cima.
 */
export function Logo({ className = "" }: LogoProps) {
  return (
    <span
      role="img"
      aria-label="MCI"
      className={`inline-block font-titulo font-black leading-none tracking-tighter ${className}`}
    >
      <span aria-hidden="true">MC</span>
      <span aria-hidden="true" className="relative inline-block">
        ı
        <span className="absolute left-1/2 top-[0.02em] size-[0.22em] -translate-x-1/2 rounded-full bg-marca" />
      </span>
    </span>
  );
}
