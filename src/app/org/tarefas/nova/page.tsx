import { redirect } from "next/navigation";
import { FormNovaTarefa } from "@/components/tarefas/FormNovaTarefa";
import { getSessao } from "@/lib/auth/sessao";
import { membrosOrg } from "@/lib/tarefas";

export const metadata = { title: "Nova tarefa · MCi" };

export default async function NovaTarefaPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/login?next=/org/tarefas/nova");
  const membros = await membrosOrg();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-black tracking-tighter md:text-4xl">Nova tarefa</h1>
      <FormNovaTarefa membros={membros} euId={sessao.conta.id} />
    </div>
  );
}
