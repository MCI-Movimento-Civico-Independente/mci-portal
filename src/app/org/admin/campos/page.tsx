import { TbArchive, TbArrowBackUp, TbChevronLeft } from "react-icons/tb";
import Link from "next/link";
import { arquivarCampoPersonalizadoAction } from "@/app/org/admin/acoes";
import { FormEditarCampo, FormNovoCampo } from "@/components/admin/FormCampoPersonalizado";
import { BotaoAcao } from "@/components/ui/BotaoAcao";
import { Card } from "@/components/ui/Card";
import { listarCamposPersonalizados } from "@/lib/campos-personalizados";
import { chaveFormulario } from "@/lib/campos-personalizados-tipos";
import { listarFormularios } from "@/lib/formularios";

export const metadata = { title: "Campos personalizados · Administração · MCi" };

export default async function CamposAdminPage() {
  const [campos, formularios] = await Promise.all([listarCamposPersonalizados(true), listarFormularios()]);
  const ativos = campos.filter((c) => !c.arquivado);
  const arquivados = campos.filter((c) => c.arquivado);
  const usadoEm = (id: string) => formularios.filter((f) => f.campos.includes(chaveFormulario(id)));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link
        href="/org/admin"
        className="inline-flex min-h-11 w-fit items-center gap-1 rotulo text-marca-texto hover:underline"
      >
        <TbChevronLeft size={14} aria-hidden="true" />
        Administração
      </Link>
      <h1 className="font-titulo font-black uppercase tracking-tight text-3xl md:text-4xl">Campos personalizados</h1>
      <p className="text-sm text-suave">
        Um campo é criado uma vez e pode entrar em vários formulários (em <Link href="/org/admin/formularios" className="font-bold text-marca-texto underline">Formulários</Link>).
        Arquivar esconde o campo de todos os formulários, mas os valores já preenchidos nas tarefas continuam guardados.
      </p>

      <Card>
        {ativos.length === 0 ? (
          <p className="text-[15px] text-suave">Nenhum campo personalizado ainda.</p>
        ) : (
          <ul>
            {ativos.map((c) => {
              const doForm = usadoEm(c.id);
              return (
                <li key={c.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 border-b border-borda py-4 last:border-b-0">
                  <FormEditarCampo campoPersonalizado={c} />
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase text-suave">
                      {doForm.length
                        ? `em ${doForm.length} ${doForm.length === 1 ? "formulário" : "formulários"}`
                        : "sem formulário"}
                    </span>
                    <BotaoAcao
                      acao={arquivarCampoPersonalizadoAction.bind(null, c.id, true)}
                      aviso={`Arquivar o campo "${c.rotulo}"? Ele some dos formulários; os valores nas tarefas continuam guardados.`}
                      perigo
                      rotulo={`Arquivar ${c.rotulo}`}
                    >
                      <TbArchive size={16} aria-hidden="true" />
                    </BotaoAcao>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <FormNovoCampo />
      </Card>

      {arquivados.length > 0 && (
        <Card>
          <h2 className="rotulo text-suave">Arquivados · {arquivados.length}</h2>
          <ul className="mt-2">
            {arquivados.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-borda py-2 last:border-b-0">
                <span className="text-[15px] font-bold text-suave line-through">{c.rotulo}</span>
                <BotaoAcao acao={arquivarCampoPersonalizadoAction.bind(null, c.id, false)} rotulo={`Reativar ${c.rotulo}`}>
                  <TbArrowBackUp size={16} aria-hidden="true" />
                  Reativar
                </BotaoAcao>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
