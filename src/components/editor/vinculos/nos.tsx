"use client";

import { mergeAttributes, Node, type Editor } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, useEditorState, type NodeViewProps } from "@tiptap/react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { TbArrowUpRight, TbLock, TbTrash } from "react-icons/tb";
import { atualizarCampoAction } from "@/app/org/tarefas/acoes";
import { comConfirmacao } from "@/components/org/confirmacao";
import { anunciarXp } from "@/components/org/avisos-xp";
import { itemDeMenu, MenuSuspenso } from "@/components/paginas/MenuSuspenso";
import { Avatar } from "@/components/ui/Avatar";
import { hojeSP } from "@/lib/datas";
import { PRIORIDADE_OPCOES, STATUS_OPCOES, type Opcao } from "@/lib/tarefas-campos";
import {
  codigo,
  linkDaTarefa,
  linkDoGrupo,
  rotuloDoStatus,
  temAcesso,
  type GrupoVinculo,
  type TarefaVinculo,
} from "@/lib/vinculos/tipos";
import type { DadosDeVinculos } from "./dados";

/*
 * Blocos e menções de tarefas e grupos. No documento fica só o id; o resto vem ao vivo do
 * quadro (dados.ts). Cada um marca `data-ref` para o "Mencionada em" conseguir rolar até ele.
 */

export type OpcoesDeVinculo = { dados: DadosDeVinculos | null };

type Situacao<T> = { tipo: "carregando" } | { tipo: "removido" } | { tipo: "sem_acesso" } | { tipo: "ok"; valor: T };

function useVinculo<T extends object>(props: NodeViewProps, grupo: "tarefas" | "grupos", id: string): Situacao<T> {
  const dados = (props.extension.options as OpcoesDeVinculo).dados!;
  const estado = useSyncExternalStore(dados.assinar, dados.ler, dados.ler);
  const v = estado[grupo][id] as unknown;
  if (v === undefined) return { tipo: estado.respondidos.has(id) ? "removido" : "carregando" };
  return temAcesso<T>(v as T) ? { tipo: "ok", valor: v as T } : { tipo: "sem_acesso" };
}

const COR_DO_STATUS: Record<string, string> = {
  a_fazer: "bg-inverso text-sobre-inverso",
  em_andamento: "bg-ouro text-sobre-ouro",
  em_revisao: "bg-marca text-sobre-marca",
  concluida: "bg-verde text-sobre-verde",
};

function Aviso({ texto, aoTirar, carregando = false }: { texto: string; aoTirar?: () => void; carregando?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 border border-dashed border-borda-forte bg-menu p-3 text-sm ${carregando ? "animate-pulse" : ""}`}>
      <span className="min-w-0 flex-1 font-bold text-suave">{texto}</span>
      {aoTirar && (
        <button type="button" onClick={aoTirar} className="rotulo inline-flex min-h-9 items-center gap-1 px-2 text-[11px] hover:text-marca-texto">
          <TbTrash size={14} aria-hidden="true" />
          Tirar o bloco
        </button>
      )}
    </div>
  );
}

// ---------- bloco de tarefa ----------

const DIA = 24 * 60 * 60 * 1000;
const emDias = (data: string) => Math.round(Date.parse(`${data}T12:00:00Z`) / DIA);
const curta = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}`;

function Periodo({ t }: { t: TarefaVinculo }) {
  const hoje = hojeSP();
  const feita = t.status === "concluida";
  const atraso = !feita && t.prazo && t.prazo < hoje ? emDias(hoje) - emDias(t.prazo) : 0;
  let pct: number | null = null;
  if (feita) pct = 100;
  else if (atraso) pct = 100;
  else if (t.data_inicio && t.prazo) {
    const total = emDias(t.prazo) - emDias(t.data_inicio);
    pct = total <= 0 ? (hoje >= t.prazo ? 100 : 0) : Math.min(100, Math.max(0, ((emDias(hoje) - emDias(t.data_inicio)) / total) * 100));
  }
  const texto = t.data_inicio && t.prazo ? `${curta(t.data_inicio)} → ${curta(t.prazo)}` : t.prazo ? curta(t.prazo) : t.data_inicio ? `desde ${curta(t.data_inicio)}` : "—";
  return (
    <span className={`flex flex-col gap-1 ${atraso ? "text-marca-texto" : ""}`}>
      <span className="text-[13px] font-bold">{texto}</span>
      {atraso > 0 && <span className="text-[11px] font-bold">atrasada {atraso === 1 ? "1 dia" : `${atraso} dias`}</span>}
      {pct !== null && (
        <span role="img" aria-label={`${Math.round(pct)}% do prazo decorrido`} className="block h-1 w-full bg-sutil">
          <span className={`block h-full ${feita ? "bg-verde" : atraso ? "bg-marca-texto" : "bg-inverso"}`} style={{ width: `${pct}%` }} />
        </span>
      )}
    </span>
  );
}

/** Etiqueta de status ou prioridade que abre o menu e usa a mesma ação do quadro. */
function Etiqueta({ t, chave, opcoes, aoMudar }: { t: TarefaVinculo; chave: "status" | "prioridade"; opcoes: Opcao[]; aoMudar: () => void }) {
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const valor = escolhido ?? t[chave] ?? "";
  const atual = opcoes.find((o) => o.valor === valor) ?? opcoes[0];
  const nome = chave === "status" ? "Status" : "Prioridade";

  async function mudar(novo: string) {
    if (novo === (t[chave] ?? "")) return;
    setErro(null);
    setEscolhido(novo);
    try {
      const r = await comConfirmacao((forcar) => atualizarCampoAction(t.id, chave, novo, forcar));
      if (r?.erro) setErro(r.erro);
      anunciarXp(r?.xp);
      await aoMudar();
    } catch {
      setErro("Não deu para mudar. Tente de novo.");
    }
    setEscolhido(null);
  }

  return (
    <>
      <MenuSuspenso
        rotulo={`${nome}: ${atual.rotulo}. Mudar`}
        botao={atual.rotulo}
        className={`min-h-9 max-w-full truncate border px-2 text-[11px] font-bold md:min-h-7 ${atual.classes} ${escolhido !== null ? "opacity-60" : ""}`}
      >
        {(fechar) =>
          opcoes.map((o) => (
            <button
              key={o.valor}
              type="button"
              aria-current={o.valor === valor}
              onClick={() => {
                fechar();
                void mudar(o.valor);
              }}
              className={`${itemDeMenu} aria-[current=true]:bg-superficie aria-[current=true]:font-bold`}
            >
              {o.valor ? o.rotulo : "Não definida"}
            </button>
          ))
        }
      </MenuSuspenso>
      {erro && (
        <span role="alert" className="block text-[11px] font-bold text-marca-texto">
          {erro}
        </span>
      )}
    </>
  );
}

/** Passo na sequência de blocos de tarefa e a tarefa do bloco logo acima. */
function vizinhanca(editor: Editor, pos: number | undefined) {
  const nada = { passo: 1, acima: null as string | null };
  if (pos === undefined || pos > editor.state.doc.content.size) return nada;
  const $pos = editor.state.doc.resolve(pos);
  let passo = 1;
  for (let i = $pos.index() - 1; i >= 0 && $pos.parent.child(i).type.name === "tarefaBloco"; i--) passo++;
  return { passo, acima: passo > 1 ? ($pos.parent.child($pos.index() - 1).attrs.tarefaId as string) : null };
}

function TarefaBlocoView(props: NodeViewProps) {
  const id = props.node.attrs.tarefaId as string;
  const s = useVinculo<TarefaVinculo>(props, "tarefas", id);
  const { passo, acima } = useEditorState({
    editor: props.editor,
    selector: ({ editor }) => vizinhanca(editor, props.getPos()),
  });
  const dados = (props.extension.options as OpcoesDeVinculo).dados!;
  const estado = useSyncExternalStore(dados.assinar, dados.ler, dados.ler);
  const referencia = `tarefa:${id}`;

  if (s.tipo !== "ok") {
    return (
      <NodeViewWrapper className="my-2" contentEditable={false} data-ref={referencia}>
        {s.tipo === "carregando" ? (
          <Aviso carregando texto={estado.falhou ? "Não deu para carregar a tarefa." : "Carregando a tarefa…"} />
        ) : s.tipo === "removido" ? (
          <Aviso texto="Tarefa removida" aoTirar={props.deleteNode} />
        ) : (
          <Aviso texto="Tarefa de outro projeto sem acesso" />
        )}
      </NodeViewWrapper>
    );
  }
  const t = s.valor;
  const href = linkDaTarefa(t);
  const libera = !!acima && t.depende_de.some((d) => d.id === acima);
  const coluna = (nome: string, conteudo: React.ReactNode) => (
    <div className="flex min-w-0 flex-col gap-1 border-b border-r border-borda px-3 py-2">
      <span className="rotulo text-[10px] text-suave">{nome}</span>
      {conteudo}
    </div>
  );
  const abrir = (conteudo: React.ReactNode, nome: string) => (
    <Link href={href} aria-label={`${nome}: abrir a tarefa ${codigo(t.numero)}`} className="sem-estilo -m-1 block p-1 hover:bg-superficie">
      {conteudo}
    </Link>
  );
  const pessoas = (lista: TarefaVinculo["executores"]) =>
    lista.length ? (
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="flex -space-x-2">
          {lista.slice(0, 2).map((p) => (
            <Avatar key={p.id} pessoa={p} tamanho="sm" />
          ))}
        </span>
        <span className="truncate text-[13px]" title={lista.map((p) => p.nome ?? "Membro").join(", ")}>
          {lista[0].nome?.split(" ")[0] ?? "Membro"}
          {lista.length > 1 && ` +${lista.length - 1}`}
        </span>
      </span>
    ) : (
      <span className="text-[13px] text-suave">Ninguém</span>
    );

  return (
    <NodeViewWrapper className="my-2" contentEditable={false} data-ref={referencia}>
      {libera && (
        <div aria-label="A tarefa de cima libera esta" className="-mt-2 ml-5 flex h-9 items-center border-l-2 border-inverso">
          <span className="rotulo ml-2 border border-borda bg-menu px-1.5 py-0.5 text-[10px]">Libera a próxima</span>
        </div>
      )}
      <div className={`@container border bg-menu ${props.selected ? "border-marca-texto outline-2 outline-marca-texto" : t.status === "em_andamento" ? "border-texto" : "border-borda"}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-borda py-1.5 pl-3 pr-1.5">
          <span className={`flex size-6 shrink-0 items-center justify-center font-mono text-xs font-bold ${COR_DO_STATUS[t.status]}`} aria-label={`Passo ${passo}`}>
            {passo}
          </span>
          <span className="rotulo shrink-0 text-suave">{codigo(t.numero)}</span>
          <Link href={href} className={`sem-estilo min-w-0 flex-1 basis-40 text-[15px] font-extrabold hover:underline ${t.status === "concluida" ? "line-through decoration-1" : ""}`}>
            {t.titulo}
          </Link>
          {t.grupo && (
            <span className="max-w-full truncate bg-bloco px-2 py-1 text-[11px] text-sobre-bloco">
              <span className="rotulo mr-1.5 text-[9px] text-ouro">Grupo</span>
              {t.grupo.nome}
            </span>
          )}
          <Link href={href} aria-label={`Abrir ${codigo(t.numero)} no quadro`} title="Abrir no quadro" className="sem-estilo flex size-9 shrink-0 items-center justify-center border border-borda hover:border-texto">
            <TbArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {/* As mesmas colunas do quadro; em área estreita, quebram em linhas. */}
        <div className="-mb-px -mr-px grid grid-cols-2 @md:grid-cols-3 @2xl:grid-cols-5">
          {coluna("Solicitante", abrir(pessoas(t.solicitante ? [t.solicitante] : []), "Solicitante"))}
          {coluna(t.executores.length > 1 ? "Executores" : "Executor", abrir(pessoas(t.executores), "Executor"))}
          {coluna("Prioridade", <Etiqueta t={t} chave="prioridade" opcoes={PRIORIDADE_OPCOES} aoMudar={dados.atualizar} />)}
          {coluna("Status", <Etiqueta t={t} chave="status" opcoes={STATUS_OPCOES} aoMudar={dados.atualizar} />)}
          {coluna("Período", abrir(<Periodo t={t} />, "Período"))}
        </div>
        {t.depende_de.length > 0 && (
          <div role="list" className="border-t border-borda bg-superficie px-3 py-1.5">
            {t.depende_de.map((d) => (
              <div role="listitem" key={d.id} className="flex items-center gap-2 text-[13px]">
                <TbLock size={14} aria-hidden="true" className={d.status === "concluida" ? "text-suave" : "text-marca-texto"} />
                <span>
                  <strong className="text-marca-texto">Depende de</strong> {codigo(d.numero)} {d.titulo} · {rotuloDoStatus(d.status).toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// ---------- menção de tarefa ----------

function TarefaMencaoView(props: NodeViewProps) {
  const id = props.node.attrs.tarefaId as string;
  const s = useVinculo<TarefaVinculo>(props, "tarefas", id);
  const idCartao = useId();
  const etiqueta = useRef<HTMLButtonElement>(null);
  const cartao = useRef<HTMLSpanElement>(null);
  const fechar = useRef(0);
  const referencia = `tarefa:${id}`;
  useEffect(() => () => window.clearTimeout(fechar.current), []);

  const abrir = () => {
    window.clearTimeout(fechar.current);
    const c = cartao.current;
    const r = etiqueta.current?.getBoundingClientRect();
    if (!c || !r || c.matches(":popover-open")) return;
    c.showPopover();
    c.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - c.offsetWidth - 8))}px`;
    c.style.top = `${r.bottom + 6 + c.offsetHeight > window.innerHeight ? Math.max(8, r.top - c.offsetHeight - 6) : r.bottom + 6}px`;
  };
  const agendarFechar = () => {
    window.clearTimeout(fechar.current);
    fechar.current = window.setTimeout(() => cartao.current?.matches(":popover-open") && cartao.current.hidePopover(), 180);
  };

  if (s.tipo !== "ok") {
    return (
      <NodeViewWrapper as="span" data-ref={referencia} contentEditable={false}>
        <span className="border border-dashed border-borda-forte px-1.5 text-[0.9em] text-suave">
          {s.tipo === "carregando" ? "tarefa…" : s.tipo === "removido" ? "Tarefa removida" : "Tarefa sem acesso"}
        </span>
      </NodeViewWrapper>
    );
  }
  const t = s.valor;
  return (
    <NodeViewWrapper as="span" data-ref={referencia} contentEditable={false}>
      <button
        ref={etiqueta}
        type="button"
        aria-describedby={idCartao}
        onPointerEnter={(e) => e.pointerType === "mouse" && abrir()}
        onPointerLeave={(e) => e.pointerType === "mouse" && agendarFechar()}
        onFocus={abrir}
        onBlur={agendarFechar}
        onClick={abrir}
        className={`inline-flex max-w-full items-baseline gap-1.5 border bg-menu px-1.5 align-baseline text-[0.9em] hover:border-texto ${props.selected ? "border-marca-texto outline-2 outline-marca-texto" : "border-borda"}`}
      >
        <span aria-label={rotuloDoStatus(t.status)} className={`size-2.5 shrink-0 self-center ${COR_DO_STATUS[t.status]}`} />
        <span className="font-mono text-[0.85em] text-suave">{codigo(t.numero)}</span>
        <span className="max-w-[16rem] truncate font-bold">{t.titulo}</span>
      </button>
      <span
        ref={cartao}
        id={idCartao}
        popover="manual"
        onPointerEnter={() => window.clearTimeout(fechar.current)}
        onPointerLeave={agendarFechar}
        onFocus={() => window.clearTimeout(fechar.current)}
        onBlur={agendarFechar}
        className="fixed m-0 w-80 max-w-[calc(100vw-1rem)] border border-texto bg-menu p-4 text-left text-sm text-texto"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="rotulo text-[10px] text-suave">
            {codigo(t.numero)}
            {t.grupo ? ` · ${t.grupo.nome}` : ""}
          </span>
          <span className={`rotulo px-1.5 py-0.5 text-[10px] font-bold ${COR_DO_STATUS[t.status]}`}>{rotuloDoStatus(t.status)}</span>
        </span>
        <span className="mt-2 block text-base font-extrabold">{t.titulo}</span>
        <span className="mt-2 grid grid-cols-[6.5rem_1fr] gap-x-2 gap-y-1 text-[13px]">
          <span className="text-suave">{t.executores.length > 1 ? "Executores" : "Executor"}</span>
          <span>{t.executores.map((p) => p.nome ?? "Membro").join(", ") || "Ninguém"}</span>
          <span className="text-suave">Prazo</span>
          <span>{t.prazo ? curta(t.prazo) : "Sem prazo"}</span>
          {t.depende_de.length > 0 && (
            <>
              <span className="text-suave">Depende de</span>
              <span>
                {t.depende_de.map((d) => (
                  <span key={d.id} className="block">
                    {codigo(d.numero)} {d.titulo} · {rotuloDoStatus(d.status).toLowerCase()}
                  </span>
                ))}
              </span>
            </>
          )}
        </span>
        <Link href={linkDaTarefa(t)} className="sem-estilo mt-3 flex min-h-11 items-center justify-center gap-2 bg-inverso text-sm font-bold text-sobre-inverso">
          Abrir no quadro principal
          <TbArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </span>
    </NodeViewWrapper>
  );
}

// ---------- grupo ----------

function GrupoBlocoView(props: NodeViewProps) {
  const id = props.node.attrs.grupoId as string;
  const s = useVinculo<GrupoVinculo>(props, "grupos", id);
  const referencia = `grupo:${id}`;
  if (s.tipo !== "ok") {
    return (
      <NodeViewWrapper className="my-2" contentEditable={false} data-ref={referencia}>
        {s.tipo === "carregando" ? (
          <Aviso carregando texto="Carregando o grupo…" />
        ) : s.tipo === "removido" ? (
          <Aviso texto="Grupo removido" aoTirar={props.deleteNode} />
        ) : (
          <Aviso texto="Grupo de outro projeto sem acesso" />
        )}
      </NodeViewWrapper>
    );
  }
  const g = s.valor;
  const total = Object.values(g.contagem).reduce((a, b) => a + b, 0);
  const pct = total ? Math.round((g.contagem.concluida / total) * 100) : 0;
  return (
    <NodeViewWrapper className="my-2" contentEditable={false} data-ref={referencia}>
      <div className={`border bg-menu p-3 ${props.selected ? "border-marca-texto outline-2 outline-marca-texto" : "border-borda"}`}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span aria-hidden="true" className="size-3.5 shrink-0" style={{ background: g.cor }} />
          <span className="rotulo text-[10px] text-suave">Grupo</span>
          <span className="min-w-0 flex-1 truncate font-titulo text-lg font-extrabold">{g.nome}</span>
          <Link href={linkDoGrupo(g)} className="sem-estilo inline-flex min-h-9 items-center gap-1 text-xs font-bold hover:underline">
            Ver no quadro
            <TbArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <div role="list" className="mt-2 flex flex-wrap gap-2">
          {STATUS_OPCOES.map((o) => (
            <span role="listitem" key={o.valor} className={`rotulo border px-2 py-0.5 text-[10px] font-bold ${o.classes} ${g.contagem[o.valor as keyof typeof g.contagem] ? "" : "opacity-45"}`}>
              {o.rotulo} {g.contagem[o.valor as keyof typeof g.contagem]}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div role="progressbar" aria-label="Tarefas concluídas" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2 flex-1 bg-sutil">
            <div className="h-full bg-verde" style={{ width: `${pct}%` }} />
          </div>
          <span className="rotulo text-[10px] text-suave">
            {g.contagem.concluida} de {total} · {pct}%
          </span>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

function GrupoMencaoView(props: NodeViewProps) {
  const id = props.node.attrs.grupoId as string;
  const s = useVinculo<GrupoVinculo>(props, "grupos", id);
  return (
    <NodeViewWrapper as="span" data-ref={`grupo:${id}`} contentEditable={false}>
      {s.tipo === "ok" ? (
        <Link
          href={linkDoGrupo(s.valor)}
          className={`sem-estilo inline-flex max-w-full items-baseline gap-1.5 bg-bloco px-1.5 align-baseline text-[0.88em] text-sobre-bloco ${props.selected ? "outline-2 outline-marca-texto" : ""}`}
        >
          <span className="rotulo text-[0.75em] text-ouro">Grupo ·</span>
          <span className="truncate">{s.valor.nome}</span>
        </Link>
      ) : (
        <span className="border border-dashed border-borda-forte px-1.5 text-[0.9em] text-suave">
          {s.tipo === "carregando" ? "grupo…" : s.tipo === "removido" ? "Grupo removido" : "Grupo sem acesso"}
        </span>
      )}
    </NodeViewWrapper>
  );
}

// ---------- nós ----------

function no(nome: string, atributo: "tarefaId" | "grupoId", linha: boolean, Visao: (p: NodeViewProps) => React.ReactNode) {
  const marca = atributo === "tarefaId" ? "data-tarefa" : "data-grupo";
  const etiqueta = linha ? "span" : "div";
  return Node.create<OpcoesDeVinculo>({
    name: nome,
    group: linha ? "inline" : "block",
    inline: linha,
    atom: true,
    addOptions: () => ({ dados: null }),
    addAttributes: () => ({
      [atributo]: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute(marca),
        renderHTML: (attrs: Record<string, unknown>) => ({ [marca]: attrs[atributo] as string }),
      },
    }),
    // Sem o id não há vínculo: o HTML colado é ignorado.
    parseHTML: () => [{ tag: `${etiqueta}[data-vinculo="${nome}"]`, getAttrs: (el) => (el.getAttribute(marca) ? null : false) }],
    renderHTML: ({ HTMLAttributes }) => [etiqueta, mergeAttributes(HTMLAttributes, { "data-vinculo": nome })],
    addNodeView: () => ReactNodeViewRenderer(Visao, linha ? { as: "span" } : undefined),
  });
}

export const TarefaBloco = no("tarefaBloco", "tarefaId", false, TarefaBlocoView);
export const TarefaMencao = no("tarefaMencao", "tarefaId", true, TarefaMencaoView);
export const GrupoBloco = no("grupoBloco", "grupoId", false, GrupoBlocoView);
export const GrupoMencao = no("grupoMencao", "grupoId", true, GrupoMencaoView);
