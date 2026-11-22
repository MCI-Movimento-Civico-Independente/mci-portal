import type { Metadata } from "next";
import { TbBell, TbPlus, TbSearch } from "react-icons/tb";
import { BarraLateral } from "@/components/org/BarraLateral";
import { BarraSuperior } from "@/components/org/BarraSuperior";
import { CartaoComite } from "@/components/org/CartaoComite";
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
    solicitante_id: vitor.id,
    responsavel_id: vitor.id,
    criado_em: "2026-11-20T12:00:00Z",
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
  { nome: "marca", classe: "bg-marca", texto: "text-sobre-marca" },
  { nome: "marca-suave", classe: "bg-marca-suave", texto: "text-marca-texto" },
  { nome: "ouro", classe: "bg-ouro", texto: "text-sobre-ouro" },
  { nome: "ouro-suave", classe: "bg-ouro-suave", texto: "text-ouro-texto" },
  { nome: "verde", classe: "bg-verde", texto: "text-fundo" },
  { nome: "verde-suave", classe: "bg-verde-suave", texto: "text-verde-texto" },
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
      <h2 className="border-b border-borda pb-2 text-xs font-semibold uppercase tracking-widest text-suave">{titulo}</h2>
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
            <h1 className="font-serif text-3xl leading-none md:text-4xl">Guia de design</h1>
            <p className="mt-1 text-sm text-suave">Componentes do portal nos temas claro e escuro.</p>
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

      <Secao titulo="Tipografia">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="font-serif text-6xl leading-none">Pensar.</p>
            <p className="mt-1 font-serif text-6xl italic leading-none text-marca-texto">Agir.</p>
            <p className="mt-3 text-xs text-suave">DM Serif Display · títulos e destaques</p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-2xl font-semibold">Subtítulo em Space Grotesk semibold</p>
            <p className="text-base">Texto corrido em Space Grotesk regular, 15 a 17 px, para tarefas, descrições e documentos da equipe.</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-suave">Rótulos e metadados</p>
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

      <Secao titulo="Cartões">
        <div className="grid gap-4 md:grid-cols-3">
          <CartaoComite comite={{ ...COMITES[0], projetosAtivos: 2, tarefasAbertas: 7 }} />
          <CartaoComite comite={{ ...COMITES[1], projetosAtivos: 1, tarefasAbertas: 3 }} />
          <Card>
            <h3 className="text-lg font-semibold">Card simples</h3>
            <p className="mt-2 text-sm text-suave">Superfície elevada com borda e sombra suave.</p>
          </Card>
        </div>
      </Secao>

      <Secao titulo="Lista de tarefas (sem caixa de marcação: o status conclui)">
        <Card className="p-3 md:p-4">
          <TabelaTarefas tarefas={TAREFAS} membros={[vitor, ana]} comites={COMITES} projetos={PROJETOS} hoje="2026-11-22" qs="" />
        </Card>
      </Secao>

      <Secao titulo="Quadro">
        <div className="grid gap-4 md:grid-cols-3">
          {(["a_fazer", "em_andamento", "em_revisao"] as const).map((st) => (
            <div key={st} className="flex flex-col gap-3 rounded-2xl bg-sutil p-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-suave">
                {STATUS_OPCOES.find((o) => o.valor === st)?.rotulo}
              </h3>
              <ul className="flex flex-col gap-3">
                {TAREFAS.filter((t) => t.status === st).map((t) => (
                  <CartaoTarefa key={t.id} t={t} membros={[vitor, ana]} hoje="2026-11-22" qs="" />
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
              { id: "c1", texto: "Subi o ajuste do fluxo. Falta revisar as mensagens de erro.", quando: "22/11/26, 14:30", autor: "Ana Souza", autorId: "p2" },
              { id: "c2", texto: "Combinado. Reviso hoje à noite.", quando: "22/11/26, 15:02", autor: "Vitor Moraes", autorId: "p1" },
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
