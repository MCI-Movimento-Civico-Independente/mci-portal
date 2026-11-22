"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { TbDeviceDesktop, TbMoon, TbSun } from "react-icons/tb";

const OPCOES = [
  { valor: "light", rotulo: "Papel", Icone: TbSun },
  { valor: "dark", rotulo: "Noite", Icone: TbMoon },
  { valor: "system", rotulo: "Sistema", Icone: TbDeviceDesktop },
] as const;

const semAssinatura = () => () => {};

/**
 * Escolha de tema (claro, escuro, sistema). Só mostra a seleção depois de montar no
 * navegador: no servidor o tema ainda não é conhecido e isso evitaria divergência na hidratação.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const montado = useSyncExternalStore(semAssinatura, () => true, () => false);

  return (
    <div
      role="radiogroup"
      aria-label="Tema da interface"
      className="inline-flex border-2 border-borda bg-sutil p-0.5"
    >
      {OPCOES.map(({ valor, rotulo, Icone }) => {
        const ativo = montado && theme === valor;
        return (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            aria-label={rotulo}
            title={rotulo}
            onClick={() => setTheme(valor)}
            className={`flex size-9 items-center justify-center text-suave hover:text-texto ${
              ativo ? "bg-inverso text-sobre-inverso hover:text-sobre-inverso" : ""
            }`}
          >
            <Icone size={18} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
