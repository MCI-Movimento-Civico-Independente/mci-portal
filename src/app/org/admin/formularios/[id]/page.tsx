import { ChevronLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { excluirFormularioAction } from "@/app/org/admin/acoes";
import { FormEditarFormulario } from "@/components/admin/FormFormulario";
import { BotaoAcao } from "@/components/ui/BotaoAcao";
import { Card } from "@/components/ui/Card";
import { listarFormularios } from "@/lib/formularios";
import { comitesBasicos } from "@/lib/organizacao";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function FormularioAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [formularios, comites] = await Promise.all([listarFormularios(), comitesBasicos()]);
  const formulario = formularios.find((f) => f.id === id);
  if (!formulario) notFound();

  const formularioDoComite: Record<string, string | undefined> = {};
  for (const f of formularios) for (const slug of f.comites) formularioDoComite[slug] = f.nome;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link
        href="/org/admin/formularios"
        className="inline-flex min-h-11 w-fit items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-laranja-texto hover:underline"
      >
        <ChevronLeft size={14} aria-hidden="true" />
        Formulários
      </Link>
      <h1 className="text-2xl font-black tracking-tighter md:text-3xl">{formulario.nome}</h1>

      <Card>
        <FormEditarFormulario formulario={formulario} comites={comites} formularioDoComite={formularioDoComite} />
      </Card>

      {!formulario.padrao && (
        <div className="flex justify-end">
          <BotaoAcao
            acao={excluirFormularioAction.bind(null, formulario.id)}
            aviso={`Excluir o formulário "${formulario.nome}"? Os comitês e as tarefas que o usam passam para o Padrão geral.`}
            perigo
          >
            <Trash2 size={16} aria-hidden="true" />
            Excluir formulário
          </BotaoAcao>
        </div>
      )}
    </div>
  );
}
