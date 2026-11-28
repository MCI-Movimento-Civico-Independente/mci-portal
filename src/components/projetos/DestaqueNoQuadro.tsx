"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** "?destaque=<grupo>": rola o quadro até o grupo e o destaca por 2 segundos. */
export function DestaqueNoQuadro() {
  const grupo = useSearchParams().get("destaque");
  useEffect(() => {
    if (!grupo) return;
    let fim = 0;
    // Espera a tela assentar (o quadro pode ter acabado de aparecer).
    const inicio = window.setTimeout(() => {
      const secao = document.getElementById(`secao-grupo-${grupo}`);
      if (!secao) return;
      secao.scrollIntoView({ behavior: "smooth", block: "start" });
      secao.classList.add("destacado");
      fim = window.setTimeout(() => {
        secao.classList.remove("destacado");
        const url = new URL(window.location.href);
        url.searchParams.delete("destaque");
        window.history.replaceState(null, "", url);
      }, 2000);
    }, 100);
    return () => {
      window.clearTimeout(inicio);
      window.clearTimeout(fim);
      document.getElementById(`secao-grupo-${grupo}`)?.classList.remove("destacado");
    };
  }, [grupo]);
  return null;
}
