import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { TbPlus } from "react-icons/tb";
import { BotaoArquivar } from "@/components/projetos/BotaoArquivar";
import { QuadroGrupos } from "@/components/projetos/QuadroGrupos";
import { JanelasTarefa } from "@/components/tarefas/JanelasTarefa";
import { Botao } from "@/components/ui/Botao";
import { Card } from "@/components/ui/Card";
import { listarCamposPersonalizados } from "@/lib/campos-personalizados";
import { getSessao } from "@/lib/auth/sessao";
import { hojeSP } from "@/lib/datas";
import { listarFormularios } from "@/lib/formularios";
import { listarGrupos } from "@/lib/grupos";
import { comitesBasicos, projetoPorId, projetosBasicos } from "@/lib/organizacao";
import { listarTarefas, membrosOrg, tarefaPorId } from "@/lib/tarefas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ProjetoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tarefa?: string }>;
}) {
  const { id } = await params;
  const { tarefa: tarefaId } = await searchParams;
  const sessao = await getSessao();
  if (!sessao) redirect(`/login?next=/org/projetos/${encodeURIComponent(id)}`);
  if (!UUID.test(id)) notFound();

  const [projeto, comites, todosProjetos, todosGrupos, tarefas, membros, formularios, camposPersonalizados, aberta] =
    await Promise.all([
      projetoPorId(id),
      comitesBasicos(),
      projetosBasicos(),
      listarGrupos(),
      listarTarefas({ projetoId: id }),
      membrosOrg(),
      listarFormularios(),
      listarCamposPersonalizados(),
      tarefaId && UUID.test(tarefaId) ? tarefaPorId(tarefaId) : Promise.resolve(null),
    ]);
  if (!projeto) notFound();
  if (tarefaId && !aberta) notFound();

  const caminho = `/org/projetos/${id}`;
  const grupos = todosGrupos.filter((g) => g.projeto_id === id);
  const hoje = hojeSP();
  const feitasTotal = tarefas.filter((t) => t.status === "concluida").length;
  const pct = tarefas.length > 0 ? Math.round((feitasTotal / tarefas.length) * 100) : 0;
  const arquivado = projeto.status === "arquivado";
  const hrefNova = (grupoId?: string) => `${caminho}?nova=1${grupoId ? `&grupo=${grupoId}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="min-w-0 max-w-2xl flex-1 text-suave">{projeto.descricao}</p>
        <div className="flex items-center gap-2">
          <BotaoArquivar id={projeto.id} arquivado={arquivado} />
          <Botao href={hrefNova()} local>
            <TbPlus size={17} aria-hidden="true" />
            Nova tarefa
          </Botao>
        </div>
      </div>

      <Card className="p-4 md:p-5">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <p className="flex items-end gap-3">
            <span className="font-impacto text-5xl leading-[0.85]">{pct}%</span>
            <span className="rotulo pb-0.5 text-suave">concluído</span>
          </p>
          <p className="rotulo text-suave">
            {tarefas.length - feitasTotal} em aberto · {feitasTotal} concluídas · {tarefas.length} no total · {grupos.length}{" "}
            {grupos.length === 1 ? "grupo" : "grupos"}
          </p>
        </div>
        <div role="progressbar" aria-label="Tarefas concluídas" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="mt-4 h-2.5 bg-sutil">
          <div className="h-full bg-ouro" style={{ width: `${pct}%` }} />
        </div>
      </Card>

      <QuadroGrupos
        projetoId={id}
        grupos={grupos}
        tarefas={tarefas}
        membros={membros}
        comites={comites}
        projetos={todosProjetos}
        hoje={hoje}
        caminho={caminho}
      />

      <Suspense fallback={null}>
        <JanelasTarefa
          tarefas={tarefas}
          inicial={aberta}
          membros={membros}
          comites={comites}
          projetos={todosProjetos}
          formularios={formularios}
          grupos={todosGrupos}
          camposPersonalizados={camposPersonalizados}
          caminho={caminho}
          base={caminho}
          qs=""
          euId={sessao.conta.id}
          souAdmin={sessao.souAdmin}
          hoje={hoje}
          retornoNova={{ projetoId: id }}
        />
      </Suspense>
    </div>
  );
}
