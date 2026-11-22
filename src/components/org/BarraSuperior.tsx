import Link from "next/link";
import { TbBell, TbPlus, TbSearch } from "react-icons/tb";
import { MenuAvatar } from "@/components/MenuAvatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Botao } from "@/components/ui/Botao";
import { Logo } from "@/components/ui/Logo";
import type { Sessao } from "@/lib/auth/sessao";

export function BarraSuperior({ sessao }: { sessao: Sessao }) {
  const menu = (
    <MenuAvatar
      inicial={sessao.inicial}
      nome={sessao.nome}
      podeOrg={sessao.podeOrg}
      souAdmin={sessao.souAdmin}
      temGoogle={sessao.temGoogle}
    />
  );

  return (
    <div className="sticky top-0 z-10 border-b border-borda bg-fundo/80 backdrop-blur-md">
      {/* Celular: logo, busca e avatar (o tema fica no menu do avatar). */}
      <header className="flex h-16 items-center justify-between px-[18px] md:hidden">
        <Link href="/org" aria-label="MCI, início">
          <Logo className="text-3xl" />
        </Link>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Buscar"
            className="flex size-11 items-center justify-center rounded-lg text-suave hover:bg-sutil hover:text-texto"
          >
            <TbSearch size={20} aria-hidden="true" />
          </button>
          {menu}
        </div>
      </header>

      {/* Desktop: busca, nova tarefa, notificações, tema e avatar. */}
      <header className="hidden items-center gap-4 px-8 py-3 md:flex">
        <label className="relative block max-w-[520px] flex-1">
          <span className="sr-only">Buscar tarefas, projetos, pessoas</span>
          <TbSearch
            size={17}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-suave"
          />
          <input
            type="search"
            placeholder="Buscar tarefas, projetos…"
            className="min-h-11 w-full rounded-xl border border-borda bg-superficie pl-10 pr-4 text-sm shadow-suave placeholder:text-suave hover:border-borda-forte focus-visible:border-marca"
          />
        </label>

        <div className="ml-auto flex items-center gap-3">
          <Botao href="/org/tarefas?nova=1">
            <TbPlus size={17} aria-hidden="true" />
            Nova tarefa
          </Botao>
          <button
            type="button"
            aria-label="Notificações"
            className="relative flex size-11 items-center justify-center rounded-xl border border-borda bg-superficie text-suave shadow-suave hover:border-borda-forte hover:text-texto"
          >
            <TbBell size={19} aria-hidden="true" />
            <span aria-hidden="true" className="absolute right-2.5 top-2.5 size-2 rounded-full bg-marca ring-2 ring-superficie" />
          </button>
          <ThemeToggle />
          <div className="flex items-center gap-3">
            {menu}
            <div className="leading-tight">
              <p className="text-sm font-semibold">{sessao.primeiroNome}</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-suave">
                Nível {sessao.nivel.numero} · {sessao.nivel.nome}
              </p>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
