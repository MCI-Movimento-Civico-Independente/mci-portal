import type { HTMLAttributes } from "react";

/** Card padrão do manual: superfície, borda de 2px, cantos retos. */
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`border-2 border-borda bg-superficie p-5 md:p-6 ${className}`} {...props} />;
}
