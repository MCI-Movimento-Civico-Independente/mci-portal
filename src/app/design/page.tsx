import type { Metadata } from "next";
import { TbBell, TbPlus, TbSearch } from "react-icons/tb";
import { BarraLateral } from "@/components/org/BarraLateral";
import { BarraSuperior } from "@/components/org/BarraSuperior";
import { CartaoComite } from "@/components/org/CartaoComite";
import { CartaoProjeto } from "@/components/projetos/CartaoProjeto";
import { GrupoRecolhivel } from "@/components/projetos/GrupoRecolhivel";
import { InicioView } from "@/components/org/InicioView";
import { NavegacaoInferior } from "@/components/org/NavegacaoInferior";
import { Atividade } from "@/components/tarefas/Atividade";
import { CartaoTarefa } from "@/components/tarefas/CartaoTarefa";
import { campo, rotulo } from "@/components/tarefas/estilos";
import { TabelaTarefas } from "@/components/tarefas/TabelaTarefas";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Botao } from "@/components/ui/Botao";
import { Card } from "@/components/ui/Card";
import { EtiquetaStatus } from "@/components/ui/EtiquetaStatus";
import { Logo } from "@/components/ui/Logo";
import type { Sessao } from "@/lib/auth/sessao";
import type { TarefaDb } from "@/lib/tarefas";
import { PRIORIDADE_OPCOES, STATUS_OPCOES } from "@/lib/tarefas-campos";

export const metadata: Metadata = { title: "Design · MCi", robots: { index: false } };

// Dados de exemplo: esta página não consulta o banco.
const pessoa = (id: string, nome: string) => ({ id, nome });
const vitor = pessoa("p1", "Vitor Moraes");
const ana = pessoa("p2", "Ana Souza");
const rafa = pessoa("p3", "Rafaela");
const caio = pessoa("p4", "Caio Henrique de Lima");

function tarefa(p: Partial<TarefaDb> & Pick<TarefaDb, "id" | "titulo">): TarefaDb {
  return {
    descricao: null,
    status: "a_fazer",
    prioridade: null,
    data_inicio: null,
    prazo: null,
    pai_id: null,
    comite_slug: "ti",
    formulario_id: null,
    projeto_id: null,
    grupo_id: null,
    solicitante_id: vitor.id,
    responsavel_id: vitor.id,
    executores_extra: [],
    criado_em: "2026-11-20T12:00:00Z",
    ordem: 1,
    concluida_em: null,
    campos: {},
    projeto: { id: "pr1", nome: "Bot Carcará" },
    solicitante: vitor,
    responsavel: vitor,
    subtarefas: [],
    paiTitulo: null,
    ...p,
  };
}

const sub = (id: string, titulo: string, status: TarefaDb["status"]) =>
  tarefa({ id, titulo, status, pai_id: "t1", paiTitulo: "Revisar o fluxo de cadastro", responsavel: ana, responsavel_id: ana.id, projeto: null });

const TAREFAS: TarefaDb[] = [
  tarefa({
    id: "t1",
    titulo: "Revisar o fluxo de cadastro do Carcará",
    status: "em_andamento",
    prioridade: "alta",
    projeto_id: "pr1",
    data_inicio: "2026-11-20",
    prazo: "2026-11-24",
    executores_extra: [ana.id, rafa.id],
    subtarefas: [sub("s1", "Testar o login pelo Telegram", "concluida"), sub("s2", "Revisar mensagens de erro", "a_fazer")],
  }),
  tarefa({
    id: "t2",
    titulo: "Publicar a tela Meu perfil no Mini App",
    status: "a_fazer",
    prioridade: "media",
    prazo: "2026-11-27",
    responsavel: ana,
    responsavel_id: ana.id,
    executores_extra: [caio.id],
  }),
  tarefa({
    id: "t3",
    titulo: "Definir os ícones das conquistas",
    status: "em_revisao",
    prioridade: "urgente",
    comite_slug: "midia",
    prazo: "2026-11-21",
  }),
  tarefa({ id: "t4", titulo: "Escrever o texto da página Como funciona", status: "concluida", comite_slug: "conteudo", prazo: "2026-11-18" }),
];

const COMITES = [
  { slug: "ti", nome: "Comitê de TI" },
  { slug: "midia", nome: "Comitê de Mídia" },
  { slug: "conteudo", nome: "Comitê de Conteúdo" },
];
const PROJETOS = [{ id: "pr1", nome: "Bot Carcará", comite_slug: "ti", status: "ativo" as const }];

const CORES: { nome: string; classe: string; texto?: string }[] = [
  { nome: "fundo", classe: "bg-fundo" },
  { nome: "superficie", classe: "bg-superficie" },
  { nome: "sutil", classe: "bg-sutil" },
  { nome: "borda", classe: "bg-borda" },
  { nome: "texto", classe: "bg-texto", texto: "text-fundo" },
  { nome: "suave", classe: "bg-suave", texto: "text-fundo" },
  { nome: "bloco", classe: "bg-bloco", texto: "text-sobre-bloco" },
  { nome: "marca", classe: "bg-marca", texto: "text-sobre-marca" },
  { nome: "ouro", classe: "bg-ouro", texto: "text-sobre-ouro" },
  { nome: "verde", classe: "bg-verde", texto: "text-sobre-verde" },
  { nome: "absurdo", classe: "bg-absurdo", texto: "text-sobre-absurdo" },
  { nome: "roxo", classe: "bg-roxo", texto: "text-sobre-roxo" },
];

const SESSAO: Sessao = {
  conta: { id: "p1", nome: "Vitor Moraes", papel: "admin", auth_user_id: null },
  nome: "Vitor Moraes",
  primeiroNome: "Vitor",
  inicial: "V",
  xp: 740,
  nivel: { numero: 4, nome: "Fiscal", proximo: "Articulador", xpFaltando: 260, progresso: 0.65 },
  temGoogle: false,
  podeOrg: true,
  souAdmin: true,
};

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="border-b border-borda pb-2 rotulo text-suave">{titulo}</h2>
      {children}
    </section>
  );
}

export default function DesignPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-12 px-[18px] py-10 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Logo className="text-5xl" />
          <div>
            <h1 className="font-titulo font-black uppercase tracking-tight text-3xl leading-none md:text-4xl">Guia de design</h1>
            <p className="mt-1 text-sm text-suave">Componentes do portal nos temas Papel e Noite.</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <Secao titulo="Casco do app e página Início">
        <div className="relative isolate flex overflow-hidden rounded-3xl border border-borda bg-fundo shadow-flutuante">
          <BarraLateral souAdmin />
          <div className="flex min-w-0 flex-1 flex-col">
            <BarraSuperior sessao={SESSAO} />
            <div className="px-[18px] pb-24 pt-[18px] md:px-8 md:pb-10 md:pt-7">
              <InicioView
                primeiroNome="Vitor"
                nivel={SESSAO.nivel}
                abertas={TAREFAS.filter((t) => t.status !== "concluida")}
                comites={COMITES.map((c, i) => ({ ...c, projetosAtivos: 2 - (i % 2), tarefasAbertas: 7 - i * 2 }))}
                hoje="2026-11-22"
              />
            </div>
          </div>
          <NavegacaoInferior />
        </div>
      </Secao>

      <Secao titulo="Paleta (muda com o tema)">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {CORES.map((c) => (
            <li key={c.nome} className="overflow-hidden rounded-xl border border-borda shadow-suave">
              <div className={`flex h-16 items-end p-2 text-xs font-semibold ${c.classe} ${c.texto ?? "text-texto"}`}>Aa</div>
              <p className="bg-superficie px-2 py-1.5 text-xs font-medium">{c.nome}</p>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao titulo="Tipografia (as cinco famílias do manual)">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <p className="font-impacto text-6xl uppercase leading-[0.9]">Pensar agir fiscalizar</p>
            <p className="rotulo text-suave">Anton · títulos de impacto e números · sempre em caixa alta</p>
            <p className="font-titulo text-4xl font-black uppercase leading-none tracking-tight">
              Boa noite, <span className="font-serif text-[1.15em] font-normal normal-case italic">Vitor.</span>
            </p>
            <p className="rotulo text-suave">Inter Tight 900 · títulos do portal · Instrument Serif itálico: 1 ou 2 palavras de destaque</p>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-base">
              Toda semana a comunidade avalia as notícias que importam. <strong className="font-semibold">Títulos de item em peso 600.</strong>
            </p>
            <p className="rotulo text-suave">Inter · texto corrido, notícias e tarefas</p>
            <p className="rotulo-barras text-base">Absurdo ou excelente?</p>
            <p className="rotulo text-suave">IBM Plex Mono · rótulos, datas, status e XP · sobretítulo com // antes de cada seção</p>
          </div>
        </div>
      </Secao>

      <Secao titulo="Botões">
        <div className="flex flex-wrap items-center gap-3">
          <Botao>
            <TbPlus size={17} aria-hidden="true" /> Ação principal
          </Botao>
          <Botao variante="destaque">Destaque</Botao>
          <Botao variante="secundario">Secundária</Botao>
          <Botao disabled>Desabilitado</Botao>
          <button
            type="button"
            aria-label="Notificações"
            className="flex size-11 items-center justify-center rounded-xl border border-borda bg-superficie text-suave shadow-suave hover:border-borda-forte hover:text-texto"
          >
            <TbBell size={19} aria-hidden="true" />
          </button>
        </div>
      </Secao>

      <Secao titulo="Etiquetas">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_OPCOES.map((o) => (
            <EtiquetaStatus key={o.valor} status={o.valor as TarefaDb["status"]} />
          ))}
          {PRIORIDADE_OPCOES.slice(1).map((o) => (
            <span key={o.valor} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${o.classes}`}>
              {o.rotulo}
            </span>
          ))}
        </div>
      </Secao>

      <Secao titulo="Campos">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="d-texto" className={rotulo}>
              Assunto
            </label>
            <input id="d-texto" placeholder="Ex.: Revisar o texto do guia" className={campo} />
          </div>
          <div>
            <label htmlFor="d-lista" className={rotulo}>
              Comitê
            </label>
            <select id="d-lista" className={campo} defaultValue="ti">
              {COMITES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="d-busca" className={rotulo}>
              Busca
            </label>
            <div className="relative">
              <TbSearch size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-suave" />
              <input id="d-busca" type="search" placeholder="Buscar tarefas" className={`${campo} pl-10 shadow-suave`} />
            </div>
          </div>
        </div>
      </Secao>

      <Secao titulo="Cartões de comitê (alternam preto, laranja e amarelo)">
        <div className="grid gap-4 md:grid-cols-3">
          <CartaoComite indice={0} comite={{ ...COMITES[0], projetosAtivos: 3, tarefasAbertas: 12 }} />
          <CartaoComite indice={1} comite={{ ...COMITES[1], projetosAtivos: 1, tarefasAbertas: 4 }} />
          <CartaoComite indice={2} comite={{ ...COMITES[2], projetosAtivos: 2, tarefasAbertas: 7 }} selecionado />
        </div>
      </Secao>

      <Secao titulo="Cartões de projeto e card padrão">
        <div className="grid gap-4 md:grid-cols-3">
          <CartaoProjeto
            nomeComite="Comitê de TI"
            projeto={{ id: "pr1", nome: "Bot Carcará", comite_slug: "ti", status: "ativo", descricao: "Cadastro, votação do radar e níveis de XP.", criado_em: "2026-11-01T12:00:00Z", tarefasAbertas: 5, tarefasTotal: 12 }}
          />
          <CartaoProjeto
            nomeComite="Comitê de Mídia"
            projeto={{ id: "pr2", nome: "Cartilha de atuação cidadã", comite_slug: "midia", status: "arquivado", descricao: null, criado_em: "2026-10-01T12:00:00Z", tarefasAbertas: 0, tarefasTotal: 6 }}
          />
          <Card>
            <p className="rotulo text-suave">Enviada por membro · há 2h</p>
            <h3 className="mt-2 text-lg font-semibold">Card padrão: superfície, borda de 2px, cantos retos</h3>
            <p className="rotulo mt-3 text-marca-texto">Abrir →</p>
          </Card>
        </div>
      </Secao>

      <Secao titulo="Grupos do projeto (clique no cabeçalho para comprimir e expandir)">
        <div className="flex flex-col gap-4">
          <GrupoRecolhivel
            grupo={{ id: "g1", projeto_id: "pr1", nome: "Esta semana", cor: "#d54a24", ordem: 1 }}
            total={2}
            feitas={1}
            hrefNovaTarefa="#"
            primeiro
          >
            <TabelaTarefas tarefas={TAREFAS.slice(0, 2)} membros={[vitor, ana, rafa, caio]} comites={COMITES} projetos={PROJETOS} grupos={[{ id: "g1", projeto_id: "pr1", nome: "Esta semana", cor: "#d54a24", ordem: 1 }]} hoje="2026-11-22" qs="" />
          </GrupoRecolhivel>
          <GrupoRecolhivel grupo={{ id: "g2", projeto_id: "pr1", nome: "Backlog", cor: "#cfbe48", ordem: 2 }} total={0} feitas={0} hrefNovaTarefa="#" ultimo>
            <p className="px-2 py-3 text-[15px] text-suave">Nenhuma tarefa neste grupo.</p>
          </GrupoRecolhivel>
        </div>
      </Secao>

      <Secao titulo="Lista de tarefas (sem caixa de marcação: o status conclui)">
        <Card className="p-3 md:p-4">
          <TabelaTarefas tarefas={TAREFAS} membros={[vitor, ana, rafa, caio]} comites={COMITES} projetos={PROJETOS} hoje="2026-11-22" qs="" />
        </Card>
      </Secao>

      <Secao titulo="Quadro">
        <div className="grid gap-4 md:grid-cols-3">
          {(["a_fazer", "em_andamento", "em_revisao"] as const).map((st) => (
            <div key={st} className="flex flex-col gap-3 rounded-2xl bg-sutil p-3">
              <h3 className="rotulo text-suave">
                {STATUS_OPCOES.find((o) => o.valor === st)?.rotulo}
              </h3>
              <ul className="flex flex-col gap-3">
                {TAREFAS.filter((t) => t.status === st).map((t) => (
                  <CartaoTarefa key={t.id} t={t} membros={[vitor, ana, rafa, caio]} hoje="2026-11-22" qs="" />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Atividade (comentários e histórico)">
        <Card>
          <Atividade
            tarefaId="t1"
            euId="p1"
            souAdmin={false}
            comentarios={[
              {
                id: "c1",
                doc: {
                  type: "doc",
                  content: [
                    { type: "paragraph", content: [{ type: "text", text: "Subi o ajuste do fluxo. " }, { type: "text", text: "Falta revisar", marks: [{ type: "bold" }] }, { type: "text", text: " as mensagens de erro:" }] },
                    { type: "taskList", content: [{ type: "taskItem", attrs: { checked: true }, content: [{ type: "paragraph", content: [{ type: "text", text: "login pelo Telegram" }] }] }, { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "erro de rede" }] }] }] },
                    { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "Pensar. Agir. Fiscalizar." }] }] },
                  ],
                },
                relativo: "há 5 min",
                quando: "22/11/26, 14:30",
                editado: true,
                autor: "Ana Souza",
                autorId: "p2",
                nivel: "Nível 3 · Articulador",
              },
              {
                id: "c2",
                doc: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Combinado. Reviso hoje à noite." }] }] },
                relativo: "há 2 h",
                quando: "22/11/26, 15:02",
                editado: false,
                autor: "Vitor Moraes",
                autorId: "p1",
                nivel: "Nível 4 · Fiscal",
              },
            ]}
            historico={[
              { id: "e1", quando: "22/11/26, 14:10", autor: "Vitor Moraes", frase: "alterou Status: A fazer → Em andamento" },
              { id: "e2", quando: "20/11/26, 09:00", autor: "Vitor Moraes", frase: "criou a tarefa" },
            ]}
          />
        </Card>
      </Secao>
    </main>
  );
}
