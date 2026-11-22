import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TbChevronLeft, TbPlus } from "react-icons/tb";
import { BotaoArquivar } from "@/components/projetos/BotaoArquivar";
import { BotaoNovoGrupo } from "@/components/projetos/FormGrupo";
import { GrupoRecolhivel } from "@/components/projetos/GrupoRecolhivel";
import { DetalheTarefa } from "@/components/tarefas/DetalheTarefa";
import { FormNovaTarefa } from "@/components/tarefas/FormNovaTarefa";
import { Modal } from "@/components/tarefas/Modal";
import { TabelaTarefas } from "@/components/tarefas/TabelaTarefas";
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
  searchParams: Promise<{ tarefa?: string; nova?: string; grupo?: string }>;
}) {
  const { id } = await params;
  const { tarefa: tarefaId, nova, grupo: grupoParam } = await searchParams;
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
  const nomeComite = comites.find((c) => c.slug === projeto.comite_slug)?.nome ?? projeto.comite_slug;
  const idsDosGrupos = new Set(grupos.map((g) => g.id));
  const feitasTotal = tarefas.filter((t) => t.status === "concluida").length;
  const pct = tarefas.length > 0 ? Math.round((feitasTotal / tarefas.length) * 100) : 0;
  const arquivado = projeto.status === "arquivado";
  const hrefNova = (grupoId?: string) => `${caminho}?nova=1${grupoId ? `&grupo=${grupoId}` : ""}`;

  const tabela = (lista: typeof tarefas) =>
    lista.length === 0 ? (
      <p className="px-2 py-3 text-[15px] text-suave">Nenhuma tarefa neste grupo.</p>
    ) : (
      <TabelaTarefas tarefas={lista} membros={membros} comites={comites} projetos={todosProjetos} grupos={grupos} hoje={hoje} qs="" caminho={caminho} />
    );
  const conta = (lista: typeof tarefas) => ({
    total: lista.length,
    feitas: lista.filter((t) => t.status === "concluida").length,
  });

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/org/projetos"
        className="rotulo inline-flex min-h-11 w-fit items-center gap-1 text-marca-texto hover:underline"
      >
        <TbChevronLeft size={14} aria-hidden="true" />
        Projetos
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="rotulo-barras text-suave">{nomeComite}</p>
          <h1 className="mt-1 font-titulo text-3xl font-black uppercase leading-none tracking-tight md:text-4xl">
            {projeto.nome}
            {arquivado && <span className="rotulo ml-3 border-2 border-borda-forte px-2 py-1 align-middle font-bold normal-case">Arquivado</span>}
          </h1>
          {projeto.descricao && <p className="mt-3 max-w-2xl text-suave">{projeto.descricao}</p>}
        </div>
        <div className="flex items-center gap-2">
          <BotaoArquivar id={projeto.id} arquivado={arquivado} />
          <Botao href={hrefNova()}>
            <TbPlus size={17} aria-hidden="true" />
            Nova tarefa
          </Botao>
        </div>
      </header>

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

      <div className="flex flex-col gap-4">
        {grupos.map((g, i) => {
          const doGrupo = tarefas.filter((t) => t.grupo_id === g.id);
          return (
            <GrupoRecolhivel key={g.id} grupo={g} {...conta(doGrupo)} hrefNovaTarefa={hrefNova(g.id)} primeiro={i === 0} ultimo={i === grupos.length - 1} podeExcluir={grupos.length > 1}>
              {tabela(doGrupo)}
            </GrupoRecolhivel>
          );
        })}
        {grupos.length === 0 && <p className="px-1 text-[15px] text-suave">Este projeto ainda não tem grupos. Adicione o primeiro abaixo.</p>}
        <BotaoNovoGrupo projetoId={id} />
      </div>

      {aberta && (
        <Modal key={aberta.id} fecharHref={caminho} rotulo={`Tarefa: ${aberta.titulo}`}>
          <DetalheTarefa
            tarefa={aberta}
            membros={membros}
            comites={comites}
            projetos={todosProjetos}
            formularios={formularios}
            grupos={todosGrupos}
            camposPersonalizados={camposPersonalizados}
            caminho={caminho}
            qs=""
            euId={sessao.conta.id}
            souAdmin={sessao.souAdmin}
          />
        </Modal>
      )}
      {!aberta && nova === "1" && (
        <Modal fecharHref={caminho} rotulo="Nova tarefa">
          <h2 className="mb-5 pr-10 font-titulo text-2xl font-black uppercase tracking-tight">Nova tarefa</h2>
          <FormNovaTarefa
            membros={membros}
            comites={comites}
            projetos={todosProjetos}
            formularios={formularios}
            grupos={todosGrupos}
            camposPersonalizados={camposPersonalizados}
            euId={sessao.conta.id}
            fecharHref={caminho}
            retorno={caminho}
            projetoInicial={id}
            grupoInicial={grupoParam && idsDosGrupos.has(grupoParam) ? grupoParam : ""}
          />
        </Modal>
      )}
    </div>
  );
}
