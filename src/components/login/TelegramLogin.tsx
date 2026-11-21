"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, unknown>) => void;
  }
}

const MENSAGENS: Record<string, string> = {
  expirado: "O login expirou. Tente de novo.",
  hash_invalido: "Não foi possível validar o login do Telegram.",
  configuracao: "O login pelo Telegram ainda não está configurado.",
};

/** Carrega o Telegram Login Widget e envia o resultado para /api/auth/telegram. */
export function TelegramLogin({ bot, next }: { bot: string; next?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    window.onTelegramAuth = async (user) => {
      setErro(null);
      setEntrando(true);
      try {
        const resposta = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user, next }),
        });
        const json = await resposta.json().catch(() => ({}));
        if (resposta.ok && json.redirect) {
          window.location.assign(json.redirect);
          return;
        }
        setErro(MENSAGENS[json.erro] ?? "Não foi possível entrar. Tente de novo.");
      } catch {
        setErro("Sem conexão. Tente de novo.");
      }
      setEntrando(false);
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", bot);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "0");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    el.appendChild(script);

    return () => {
      el.replaceChildren();
      delete window.onTelegramAuth;
    };
  }, [bot, next]);

  return (
    <div>
      <div ref={ref} className="flex min-h-11 items-center" aria-busy={entrando} />
      {entrando && <p className="mt-2 font-mono text-xs text-cinza">Entrando…</p>}
      {erro && (
        <p role="alert" className="mt-3 text-sm font-bold text-laranja-texto">
          {erro}
        </p>
      )}
    </div>
  );
}
