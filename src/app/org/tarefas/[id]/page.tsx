import { notFound, redirect } from "next/navigation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A tarefa agora abre numa janela sobre a lista; este endereço só redireciona.
export default async function TarefaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  redirect(`/org/tarefas?tarefa=${id}`);
}
