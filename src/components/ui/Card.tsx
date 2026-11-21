import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`border border-linha bg-creme-claro p-5 md:p-6 ${className}`}
      {...props}
    />
  );
}
