"use client";

import { ThemeProvider as NextThemes } from "next-themes";
import type { ReactNode } from "react";

/** Tema claro, escuro ou do sistema. A escolha fica salva no navegador. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="mci-tema">
      {children}
    </NextThemes>
  );
}
