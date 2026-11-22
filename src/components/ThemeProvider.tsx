"use client";

import { ThemeProvider as NextThemes } from "next-themes";
import type { ReactNode } from "react";

/** Papel (claro, padrão do portal), Noite (escuro) ou o do sistema. A escolha fica salva no navegador. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange storageKey="mci-tema">
      {children}
    </NextThemes>
  );
}
