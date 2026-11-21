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
      <header className="flex h-[72px] items-center justify-between bg-preto px-[18px] md:px-8">
        <Link href="/comunidade" aria-label="MCi, comunidade">
          <Logo tom="claro" className="text-[32px]" />
        </Link>
        <MenuAvatar
          inicial={sessao.inicial}
          nome={sessao.nome}
          podeOrg={sessao.podeOrg}
          temGoogle={sessao.temGoogle}
        />
      </header>
      <main className="mx-auto max-w-3xl px-[18px] py-8 md:py-12">{children}</main>
    </div>
  );
}
