import { Botao } from "@/components/ui/Botao";
import { Logo } from "@/components/ui/Logo";

export default function PortalPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-8 px-[18px] py-16">
      <Logo className="self-start text-[88px]" />
      <p className="font-mono text-xs uppercase tracking-widest text-cinza">
        Portal MCi · em construção
      </p>
      <h1 className="text-4xl font-black uppercase leading-none tracking-tighter md:text-6xl">
        Fluxo <span className="font-serif font-normal normal-case italic">cívico</span>
        -apartidário
      </h1>
      <div>
        <Botao href="/org">Área da organização</Botao>
      </div>
    </main>
  );
}
