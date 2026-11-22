type LogoProps = {
  className?: string;
};

/** Logo "MCI" em DM Serif Display, cortado pela barra laranja da marca. */
export function Logo({ className = "" }: LogoProps) {
  return (
    <span
      role="img"
      aria-label="MCI"
      className={`relative inline-block font-serif leading-none tracking-tight text-texto ${className}`}
    >
      <span aria-hidden="true">MCI</span>
      <span
        aria-hidden="true"
        className="absolute -inset-x-[0.04em] top-[56%] h-[0.075em] -translate-y-1/2 rounded-full bg-marca"
      />
    </span>
  );
}
