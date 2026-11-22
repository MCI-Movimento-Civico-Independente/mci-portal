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
    <div className="sticky top-0 z-10">
      {/* Celular: barra preta com logo, busca e avatar (o tema fica no menu do avatar). */}
      <header className="flex h-[72px] items-center justify-between bg-bloco px-[18px] text-sobre-bloco md:hidden">
        <Link href="/org" aria-label="MCI, início">
          <Logo className="text-[32px]" />
        </Link>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Buscar" className="flex size-11 items-center justify-center hover:text-ouro">
            <TbSearch size={20} aria-hidden="true" />
          </button>
          {menu}
        </div>
      </header>

      {/* Desktop: busca, nova tarefa, notificações, tema e avatar. */}
      <header className="hidden items-center gap-4 border-b-2 border-borda bg-fundo px-8 py-3 md:flex">
        <label className="relative block max-w-[520px] flex-1">
          <span className="sr-only">Buscar tarefas, projetos, pessoas</span>
          <TbSearch size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-suave" />
          <input
            type="search"
            placeholder="Buscar tarefas, projetos, pessoas"
            className="min-h-11 w-full border-2 border-borda-forte bg-superficie pl-10 pr-4 text-sm placeholder:text-suave hover:border-texto focus-visible:border-marca-texto"
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
            className="relative flex size-11 items-center justify-center border-2 border-borda-forte bg-superficie hover:border-texto"
          >
            <TbBell size={19} aria-hidden="true" />
            <span aria-hidden="true" className="absolute right-2 top-2 size-2 rounded-full bg-marca" />
          </button>
          <ThemeToggle />
          <div className="flex items-center gap-3">
            {menu}
            <div className="leading-tight">
              <p className="text-sm font-bold">{sessao.primeiroNome}</p>
              <p className="rotulo text-[10px] text-suave">
                Nível {sessao.nivel.numero} · {sessao.nivel.nome}
              </p>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
