import { Bell, Plus, Search } from "lucide-react";
import Link from "next/link";
import { MenuAvatar } from "@/components/MenuAvatar";
import { Botao } from "@/components/ui/Botao";
import { Logo } from "@/components/ui/Logo";
import type { Sessao } from "@/lib/auth/sessao";

export function BarraSuperior({ sessao }: { sessao: Sessao }) {
  const menu = (
    <MenuAvatar
      inicial={sessao.inicial}
      nome={sessao.nome}
      podeOrg={sessao.podeOrg}
      temGoogle={sessao.temGoogle}
    />
  );

  return (
    <>
      {/* Celular: barra preta com logo, busca e avatar. */}
      <header className="flex h-[72px] items-center justify-between bg-preto px-[18px] md:hidden">
        <Link href="/org" aria-label="MCi, início">
          <Logo tom="claro" className="text-[32px]" />
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Buscar"
            className="flex size-11 items-center justify-center text-creme hover:text-amarelo"
          >
            <Search size={20} aria-hidden="true" />
          </button>
          {menu}
        </div>
      </header>

      {/* Desktop: busca, nova tarefa, notificações e avatar. */}
      <header className="hidden items-center gap-4 border-b border-linha px-8 py-4 md:flex">
        <label className="relative block max-w-[520px] flex-1">
          <span className="sr-only">Buscar tarefas, projetos, pessoas</span>
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-cinza"
          />
          <input
            type="search"
            placeholder="Buscar tarefas, projetos, pessoas"
            className="min-h-11 w-full border border-linha bg-creme-claro pl-11 pr-4 text-sm placeholder:text-cinza"
          />
        </label>

        <div className="ml-auto flex items-center gap-3">
          <Botao href="/org/tarefas?nova=1">
            <Plus size={16} aria-hidden="true" />
            Nova tarefa
          </Botao>
          <button
            type="button"
            aria-label="Notificações"
            className="relative flex size-11 items-center justify-center border border-linha bg-creme-claro hover:border-preto"
          >
            <Bell size={18} aria-hidden="true" />
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 size-2 rounded-full bg-laranja"
            />
          </button>
          <div className="flex items-center gap-3">
            {menu}
            <div className="leading-tight">
              <p className="text-sm font-bold">{sessao.primeiroNome}</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-cinza">
                Nível {sessao.nivel.numero} · {sessao.nivel.nome}
              </p>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
