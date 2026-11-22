import { Suspense } from "react";
import { TelegramLogin } from "@/components/login/TelegramLogin";
import { Botao } from "@/components/ui/Botao";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/ui/Logo";
import { nextSeguro } from "@/lib/auth/destino";
import { oidcConfigurado } from "@/lib/auth/telegram-oidc";

export const metadata = { title: "Entrar · MCi" };

const ERROS: Record<string, string> = {
  google: "Não foi possível entrar com o Google. Tente de novo.",
  falha: "Algo deu errado ao entrar. Tente de novo.",
  telegram: "Não foi possível entrar com o Telegram. Tente de novo.",
  config: "O portal está com a configuração do Supabase incompleta. Avise a equipe técnica.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-[18px] py-12">
      <div className="fixed right-5 top-5 z-10">
        <ThemeToggle />
      </div>
      <Logo className="self-start text-6xl" />
      <div>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl">
          Entrar <span className="italic text-marca-texto">no portal</span>
        </h1>
        <p className="mt-3 text-suave">Pensar. Agir. Transformar.</p>
      </div>
      <Suspense fallback={<div className="min-h-40" />}>
        <Formas searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Formas({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const next = nextSeguro(params.next) ?? undefined;
  const bot = process.env.TELEGRAM_BOT_USERNAME;

  return (
    <div className="flex flex-col gap-5">
      {params.erro && (
        <p role="alert" className="rounded-lg border border-marca/30 bg-marca-suave p-3 text-sm font-medium text-marca-texto">
          {ERROS[params.erro] ?? ERROS.falha}
        </p>
      )}

      <Card>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-suave">Forma principal</p>
        <p className="mb-4 mt-2 text-sm">
          Use a mesma conta do Telegram que você usa no grupo do MCi.
        </p>
        {oidcConfigurado() ? (
          <form action="/auth/telegram/iniciar" method="post">
            {next && <input type="hidden" name="next" value={next} />}
            <Botao type="submit" className="w-full">
              Entrar com Telegram
            </Botao>
          </form>
        ) : bot ? (
          <TelegramLogin bot={bot} next={next} />
        ) : (
          <p className="text-sm font-bold text-marca-texto">
            Login pelo Telegram indisponível: falta configurar o bot.
          </p>
        )}
      </Card>

      <form action="/auth/google" method="post">
        <input type="hidden" name="modo" value="login" />
        {next && <input type="hidden" name="next" value={next} />}
        <Botao variante="secundario" type="submit" className="w-full">
          Entrar com Google
        </Botao>
      </form>
    </div>
  );
}
