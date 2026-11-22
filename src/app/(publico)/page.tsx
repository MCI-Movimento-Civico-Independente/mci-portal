import Link from "next/link";
import { TbArrowUpRight } from "react-icons/tb";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Botao } from "@/components/ui/Botao";
import { Logo } from "@/components/ui/Logo";

export default function PortalPage() {
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-4xl flex-col justify-center gap-10 px-[18px] py-16">
      <div className="fixed right-5 top-5 z-10">
        <ThemeToggle />
      </div>
      <Logo className="self-start text-7xl md:text-8xl" />
      <div className="flex flex-col gap-5">
        <p className="rotulo text-marca-texto">
          Movimento Cívico Independente
        </p>
        <h1 className="font-titulo font-black uppercase tracking-tight text-5xl leading-[1.05] md:text-7xl">
          Pensar. Agir. <span className="font-serif text-[1.15em] font-normal normal-case italic text-marca-texto">Fiscalizar.</span>
        </h1>
        <p className="max-w-xl text-lg text-suave">
          Ação ética, pensamento livre, futuro coletivo. O portal do MCI está em construção.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Botao href="/org">
          Área da organização
          <TbArrowUpRight size={17} aria-hidden="true" />
        </Botao>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-semibold text-suave hover:bg-sutil hover:text-texto"
        >
          Entrar
        </Link>
      </div>
    </main>
  );
}
