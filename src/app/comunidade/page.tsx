import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { getSessao } from "@/lib/auth/sessao";

export const metadata = { title: "Comunidade · MCi" };

const AVISOS: Record<string, string> = {
  google_vinculado: "Google vinculado à sua conta.",
  google_outra_conta: "Esse Google já está vinculado a outra conta MCI.",
};

export default async function ComunidadePage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const sessao = await getSessao();
  if (!sessao) redirect("/login?next=/comunidade");
  const { aviso } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      {aviso && AVISOS[aviso] && (
        <p role="status" className="rounded-lg border border-ouro/40 bg-ouro-suave p-3 text-sm font-medium text-ouro-texto">
          {AVISOS[aviso]}
        </p>
      )}
      <h1 className="font-serif text-4xl leading-none md:text-5xl">
        Olá,{" "}
        <span className="font-serif font-normal normal-case italic">{sessao.primeiroNome}.</span>
      </h1>
      <Card>
        <p className="text-[11px] uppercase tracking-widest text-suave">Seu perfil</p>
        <dl className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <dt className="text-[11px] uppercase text-suave">Nível</dt>
            <dd className="font-serif text-4xl">{sessao.nivel.numero}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase text-suave">Título</dt>
            <dd className="text-xl font-semibold">{sessao.nivel.nome}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase text-suave">XP</dt>
            <dd className="font-serif text-4xl">{sessao.xp}</dd>
          </div>
        </dl>
        {sessao.nivel.proximo && (
          <p className="mt-4 text-sm">
            Faltam {sessao.nivel.xpFaltando} de XP para {sessao.nivel.proximo}.
          </p>
        )}
      </Card>
      <p className="text-sm text-suave">Página provisória da comunidade.</p>
    </div>
  );
}
