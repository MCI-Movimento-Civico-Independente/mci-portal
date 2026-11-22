import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { BarraLateral } from "@/components/org/BarraLateral";
import { BarraSuperior } from "@/components/org/BarraSuperior";
import { NavegacaoInferior } from "@/components/org/NavegacaoInferior";
import { getSessao } from "@/lib/auth/sessao";

export default function OrgLayout({ children }: { children: ReactNode }) {
  // A sessão depende de cookies, então a casca inteira espera dentro do Suspense.
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <CascaOrg>{children}</CascaOrg>
    </Suspense>
  );
}

async function CascaOrg({ children }: { children: ReactNode }) {
  // O proxy já filtrou pelo token; aqui o banco é a fonte da verdade do papel.
  const sessao = await getSessao();
  if (!sessao) redirect("/login?next=/org");
  if (!sessao.podeOrg) redirect("/comunidade");

  return (
    <div className="flex min-h-dvh">
      <BarraLateral souAdmin={sessao.souAdmin} />
      <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior sessao={sessao} />
        {/* pb-24: espaço para a navegação inferior no celular */}
        <main className="flex-1 px-[18px] pb-24 pt-[18px] md:px-8 md:pb-10 md:pt-7">
          {children}
        </main>
      </div>
      <NavegacaoInferior />
    </div>
  );
}
