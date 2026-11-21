import { Suspense } from "react";
import { TelegramLogin } from "@/components/login/TelegramLogin";
import { Botao } from "@/components/ui/Botao";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/ui/Logo";
import { nextSeguro } from "@/lib/auth/destino";

export const metadata = { title: "Entrar · MCi" };

const ERROS: Record<string, string> = {
  google: "Não foi possível entrar com o Google. Tente de novo.",
  falha: "Algo deu errado ao entrar. Tente de novo.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-[18px] py-12">
      <Logo className="self-start text-[56px]" />
      <h1 className="text-4xl font-black uppercase leading-none tracking-tighter">
        Entrar <span className="font-serif font-normal normal-case italic">no portal</span>
      </h1>
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
        <p role="alert" className="border-l-4 border-laranja-texto bg-creme-claro p-3 text-sm font-bold">
          {ERROS[params.erro] ?? ERROS.falha}
        </p>
      )}

      <Card>
        <p className="font-mono text-[11px] uppercase tracking-widest text-cinza">
          Forma principal
        </p>
        <p className="mb-4 mt-2 text-sm">
          Use a mesma conta do Telegram que você usa no grupo do MCi.
        </p>
        {bot ? (
          <TelegramLogin bot={bot} next={next} />
        ) : (
          <p className="text-sm font-bold text-laranja-texto">
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
