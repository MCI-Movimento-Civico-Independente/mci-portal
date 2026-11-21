type LogoProps = {
  /** Cor das letras. O ponto do i é sempre laranja. */
  tom?: "claro" | "escuro";
  className?: string;
};

/** Logo "MCi": usa o i sem ponto (ı) e desenha o ponto laranja por cima. */
export function Logo({ tom = "escuro", className = "" }: LogoProps) {
  return (
    <span
      role="img"
      aria-label="MCi"
      className={`inline-block font-sans font-black leading-none tracking-tighter ${
        tom === "claro" ? "text-creme" : "text-preto"
      } ${className}`}
    >
      <span aria-hidden="true">MC</span>
      {/* O ponto fica preso ao próprio "ı", centralizado sobre a haste. */}
      <span aria-hidden="true" className="relative inline-block">
        ı
        <span className="absolute left-1/2 top-[0.04em] size-[0.2em] -translate-x-1/2 rounded-full bg-laranja" />
      </span>
    </span>
  );
}
