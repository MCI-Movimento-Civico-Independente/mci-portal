import { redirect } from "next/navigation";
import { InicioView } from "@/components/org/InicioView";
import { getSessao } from "@/lib/auth/sessao";
import { hojeSP } from "@/lib/datas";
import { comitesComResumo } from "@/lib/organizacao";
import { tarefasAbertasDe } from "@/lib/tarefas";

export default async function InicioPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/login?next=/org");
  const [abertas, comites] = await Promise.all([tarefasAbertasDe(sessao.conta.id), comitesComResumo()]);

  return (
    <InicioView
      primeiroNome={sessao.primeiroNome}
      nivel={sessao.nivel}
      abertas={abertas}
      comites={comites}
      hoje={hojeSP()}
    />
  );
}
