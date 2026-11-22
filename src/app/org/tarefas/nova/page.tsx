import { redirect } from "next/navigation";

// A criação agora abre numa janela sobre a lista; este endereço só redireciona.
export default function NovaTarefaPage() {
  redirect("/org/tarefas?nova=1");
}
