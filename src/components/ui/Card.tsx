import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-borda bg-superficie p-5 shadow-suave md:p-6 ${className}`}
      {...props}
    />
  );
}
