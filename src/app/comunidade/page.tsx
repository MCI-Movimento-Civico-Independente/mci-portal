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
        <p role="status" className="border-l-4 border-amarelo bg-creme-claro p-3 text-sm font-bold">
          {AVISOS[aviso]}
        </p>
      )}
      <h1 className="text-4xl font-black uppercase leading-none tracking-tighter md:text-5xl">
        Olá,{" "}
        <span className="font-serif font-normal normal-case italic">{sessao.primeiroNome}.</span>
      </h1>
      <Card>
        <p className="font-mono text-[11px] uppercase tracking-widest text-cinza">Seu perfil</p>
        <dl className="mt-4 grid grid-cols-3 gap-4">
          <div>
            <dt className="font-mono text-[11px] uppercase text-cinza">Nível</dt>
            <dd className="text-3xl font-black">{sessao.nivel.numero}</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] uppercase text-cinza">Título</dt>
            <dd className="text-xl font-black uppercase">{sessao.nivel.nome}</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] uppercase text-cinza">XP</dt>
            <dd className="text-3xl font-black">{sessao.xp}</dd>
          </div>
        </dl>
        {sessao.nivel.proximo && (
          <p className="mt-4 text-sm">
            Faltam {sessao.nivel.xpFaltando} de XP para {sessao.nivel.proximo}.
          </p>
        )}
      </Card>
      <p className="text-sm text-cinza">Página provisória da comunidade.</p>
    </div>
  );
}
