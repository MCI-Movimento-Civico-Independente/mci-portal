import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MenuAvatar } from "@/components/MenuAvatar";
import { Logo } from "@/components/ui/Logo";
import { getSessao } from "@/lib/auth/sessao";

export default function ComunidadeLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <CascaComunidade>{children}</CascaComunidade>
    </Suspense>
  );
}

async function CascaComunidade({ children }: { children: ReactNode }) {
  const sessao = await getSessao();
  if (!sessao) redirect("/login?next=/comunidade");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-borda bg-fundo/80 px-[18px] backdrop-blur-md md:px-8">
        <Link href="/comunidade" aria-label="MCi, comunidade">
          <Logo className="text-3xl" />
        </Link>
        <MenuAvatar
          inicial={sessao.inicial}
          nome={sessao.nome}
          podeOrg={sessao.podeOrg}
          souAdmin={sessao.souAdmin}
          temGoogle={sessao.temGoogle}
        />
      </header>
      <main className="mx-auto max-w-3xl px-[18px] py-8 md:py-12">{children}</main>
    </div>
  );
}
