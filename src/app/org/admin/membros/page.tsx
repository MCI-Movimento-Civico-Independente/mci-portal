import { TbChevronLeft } from "react-icons/tb";
import Link from "next/link";
import { SeletorPapel } from "@/components/admin/SeletorPapel";
import { Botao } from "@/components/ui/Botao";
import { Card } from "@/components/ui/Card";
import { listarContas } from "@/lib/admin";
import { getSessao } from "@/lib/auth/sessao";

export const metadata = { title: "Membros e acessos · MCi" };

const ROTULO_PROVEDOR: Record<string, string> = { telegram: "Telegram", google: "Google" };

export default async function MembrosAdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const [contas, sessao] = await Promise.all([listarContas(q), getSessao()]);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link
        href="/org/admin"
        className="inline-flex min-h-11 w-fit items-center gap-1 rotulo text-marca-texto hover:underline"
      >
        <TbChevronLeft size={14} aria-hidden="true" />
        Administração
      </Link>
      <h1 className="font-titulo font-black uppercase tracking-tight text-3xl md:text-4xl">Membros e acessos</h1>

      <p className="text-sm text-suave">
        <strong>Membro</strong> usa só a comunidade. <strong>Organização</strong> também entra na área de tarefas,
        projetos e comitês. <strong>Admin</strong> ainda gerencia acessos e comitês. A mudança vale na hora, na próxima
        página que a pessoa abrir.
      </p>

      <form method="get" className="flex gap-2">
        <label htmlFor="busca" className="sr-only">
          Buscar por nome
        </label>
        <input
          id="busca"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nome"
          className="min-h-11 w-full max-w-sm rounded-lg border border-borda bg-superficie px-3 text-sm hover:border-borda-forte"
        />
        <Botao type="submit" variante="secundario">
          Buscar
        </Botao>
        {q && (
          <Link href="/org/admin/membros" className="inline-flex min-h-11 items-center px-2 text-sm font-bold text-marca-texto underline">
            Limpar
          </Link>
        )}
      </form>

      <Card>
        <h2 className="rotulo text-suave">
          {contas.length} {contas.length === 1 ? "conta" : "contas"}
          {contas.length === 100 && " (mostrando as 100 primeiras; refine a busca)"}
        </h2>
        {contas.length === 0 ? (
          <p className="mt-3 text-[15px]">Nenhuma conta encontrada.</p>
        ) : (
          <ul className="mt-2">
            {contas.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-borda py-3 last:border-b-0">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="truncate text-[15px] font-bold">
                    {c.nome}
                    {c.id === sessao?.conta.id && <span className="ml-2 text-[11px] font-normal text-suave">(você)</span>}
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] uppercase text-suave">
                    <span>{c.nivel ? `Nível ${c.nivel.numero} · ${c.nivel.nome} · ${c.xp} XP` : "Sem nível"}</span>
                    <span>{c.provedores.map((p) => ROTULO_PROVEDOR[p] ?? p).join(" + ") || "Sem login vinculado"}</span>
                  </p>
                </div>
                <SeletorPapel contaId={c.id} papel={c.papel} nome={c.nome} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
