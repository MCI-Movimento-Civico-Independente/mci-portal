"use client";

import type { Editor } from "@tiptap/core";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { TbPlus, TbSearch } from "react-icons/tb";
import { criarTarefaNoQuadroAction } from "@/app/org/tarefas/acoes-vinculos";
import type { GrupoBuscado, TarefaBuscada } from "@/lib/vinculos/busca";
import { codigo, rotuloDoStatus, type TipoRef } from "@/lib/vinculos/tipos";
import type { CanalDeComandos, EstadoComandos } from "../comandos";
import { inserirBlocos } from "../inserir";
import { usePosicaoNoCursor } from "../MenuComandos";

type Props = { editor: Editor; canal: CanalDeComandos; projetoId: string };
type Busca = { tarefas: TarefaBuscada[]; grupos: GrupoBuscado[] };
type Opcao = { chave: string; secao?: string; escolher: () => void; conteudo: React.ReactNode };
type Modo = "bloco" | "mencao";

const COR: Record<string, string> = { a_fazer: "bg-inverso", em_andamento: "bg-ouro", em_revisao: "bg-marca", concluida: "bg-verde" };

/** Bloco quando o "{" está sozinho numa linha; menção no meio de uma frase. */
function modoInicial(editor: Editor, trecho: { from: number; to: number }): Modo {
  const $de = editor.state.doc.resolve(trecho.from);
  const sozinho = $de.parent.type.name === "paragraph" && $de.parentOffset === 0 && trecho.to === $de.end();
  const naTabela = Array.from({ length: $de.depth }, (_, i) => $de.node(i + 1).type.name).includes("table");
  return sozinho && !naTabela ? "bloco" : "mencao";
}

function useBusca(projetoId: string, outros: boolean, q: string) {
  const chave = new URLSearchParams({ projeto: projetoId, ...(outros ? { outros: "1" } : {}), q }).toString();
  const [achado, setAchado] = useState<{ chave: string; busca: Busca | null } | null>(null);
  useEffect(() => {
    const controle = new AbortController();
    const espera = window.setTimeout(() => {
      fetch(`/api/vinculaveis?${chave}`, { signal: controle.signal })
        .then(async (r) => (r.ok ? ((await r.json()) as Busca) : null))
        .then((busca) => setAchado({ chave, busca }))
        .catch(() => !controle.signal.aborted && setAchado({ chave, busca: null }));
    }, 150);
    return () => {
      window.clearTimeout(espera);
      controle.abort();
    };
  }, [chave]);
  // Enquanto a nova busca não chega, a anterior continua na tela.
  return { busca: achado?.busca ?? null, carregando: achado?.chave !== chave, falhou: achado?.chave === chave && !achado.busca };
}

function Lista({ editor, canal, projetoId, estado }: Props & { estado: NonNullable<EstadoComandos> }) {
  const { consulta, trecho } = estado;
  const [aba, setAba] = useState(() => canal.abaPedida());
  const [outros, setOutros] = useState(false);
  const [modoEscolhido, setModo] = useState<Modo | null>(null);
  /** Título da tarefa a criar: enquanto houver, a lista é a de grupos do projeto. */
  const [criando, setCriando] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const modo = modoEscolhido ?? modoInicial(editor, trecho);
  const q = consulta.trim();
  const { busca, carregando, falhou } = useBusca(projetoId, criando === null && outros, criando === null ? q : "");
  const caixa = usePosicaoNoCursor(estado.onde);
  const rolagem = useRef<HTMLDivElement>(null);

  function inserir(tipo: TipoRef, id: string) {
    const atributos = tipo === "tarefa" ? { tarefaId: id } : { grupoId: id };
    editor.chain().focus().deleteRange(trecho).run();
    if (modo === "bloco") inserirBlocos(editor, [{ type: `${tipo}Bloco`, attrs: atributos }]);
    else editor.chain().insertContent([{ type: `${tipo}Mencao`, attrs: atributos }, { type: "text", text: " " }]).run();
  }

  async function criar(grupoId: string) {
    if (ocupado || criando === null) return;
    setOcupado(true);
    setErro(null);
    try {
      const r = await criarTarefaNoQuadroAction(projetoId, grupoId, criando);
      if (r.id) return inserir("tarefa", r.id);
      setErro(r.erro ?? "Não deu para criar a tarefa.");
    } catch {
      setErro("Não deu para criar a tarefa.");
    }
    setOcupado(false);
  }

  const opcoes: Opcao[] = [];
  const nomeDeGrupo = (g: GrupoBuscado) => (
    <>
      <span aria-hidden="true" className="size-3 shrink-0" style={{ background: g.cor }} />
      <span className="min-w-0 flex-1 truncate text-sm font-bold">{g.nome}</span>
    </>
  );
  if (criando !== null) {
    for (const g of busca?.grupos ?? []) opcoes.push({ chave: g.id, secao: "Em qual grupo?", escolher: () => void criar(g.id), conteudo: nomeDeGrupo(g) });
    opcoes.push({ chave: "voltar", escolher: () => setCriando(null), conteudo: <span className="text-sm text-suave">Voltar à busca</span> });
  } else {
    if (aba === "tarefas") {
      // Agrupadas pelo grupo (ou pelo projeto, na busca em outros).
      const secaoDe = (t: TarefaBuscada) =>
        outros ? `${t.projeto ?? "Sem projeto"}${t.grupo ? ` · ${t.grupo}` : ""}` : t.grupo ? `Grupo · ${t.grupo}` : "Sem grupo";
      const ordenadas = [...(busca?.tarefas ?? [])].sort((a, b) => secaoDe(a).localeCompare(secaoDe(b), "pt-BR"));
      for (const t of ordenadas) {
        opcoes.push({
          chave: t.id,
          secao: secaoDe(t),
          escolher: () => inserir("tarefa", t.id),
          conteudo: (
            <>
              <span aria-hidden="true" className={`size-2.5 shrink-0 ${COR[t.status]}`} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{t.titulo}</span>
                <span className="rotulo block truncate text-[10px] text-suave">
                  {codigo(t.numero)} · {rotuloDoStatus(t.status)} · {t.executor ?? "sem responsável"}
                </span>
              </span>
            </>
          ),
        });
      }
    } else {
      for (const g of busca?.grupos ?? []) {
        opcoes.push({ chave: g.id, secao: outros ? (g.projeto ?? "Projeto") : "Grupos do projeto", escolher: () => inserir("grupo", g.id), conteudo: nomeDeGrupo(g) });
      }
    }
    opcoes.push({
      chave: "outros",
      secao: " ",
      escolher: () => setOutros((v) => !v),
      conteudo: (
        <>
          <TbSearch size={15} aria-hidden="true" />
          <span className="text-sm">{outros ? "Voltar para este projeto" : "Buscar em outros projetos"}</span>
        </>
      ),
    });
    if (aba === "tarefas" && q) {
      opcoes.push({
        chave: "criar",
        secao: " ",
        escolher: () => setCriando(q),
        conteudo: (
          <>
            <TbPlus size={15} aria-hidden="true" />
            <span className="truncate text-sm font-bold">Criar tarefa “{q}”</span>
          </>
        ),
      });
    }
  }

  // A escolha volta ao primeiro item quando a lista muda.
  const assinatura = `${aba}|${outros}|${criando !== null}|${consulta}`;
  const [escolha, setEscolha] = useState({ assinatura, i: 0 });
  const indice = escolha.assinatura === assinatura ? Math.min(escolha.i, opcoes.length - 1) : 0;

  useEffect(() =>
    canal.atenderTeclado((e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const passo = e.key === "ArrowDown" ? 1 : -1;
        setEscolha({ assinatura, i: (indice + passo + opcoes.length) % opcoes.length });
        return true;
      }
      if (e.key === "Tab") {
        if (criando === null) setAba((a) => (a === "tarefas" ? "grupos" : "tarefas"));
        return true;
      }
      if (e.key === "Enter" && !e.isComposing) {
        if (e.shiftKey) setModo(modo === "bloco" ? "mencao" : "bloco");
        // Com a busca ainda chegando, Enter espera para não escolher o item errado.
        else if (!carregando) opcoes[indice]?.escolher();
        return true;
      }
      return false;
    }),
  );
  useEffect(() => {
    rolagem.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [indice]);

  return (
    <div
      ref={caixa}
      onMouseDown={(e) => e.preventDefault()}
      style={{ visibility: "hidden" }}
      className="fixed left-0 top-0 z-40 flex max-h-[min(28rem,65dvh)] w-96 max-w-[calc(100vw-1rem)] flex-col border border-texto bg-menu text-texto"
    >
      <div role="tablist" aria-label="O que inserir" className="flex border-b border-borda">
        {(["tarefas", "grupos"] as const).map((a) => (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={aba === a}
            disabled={criando !== null}
            onClick={() => setAba(a)}
            className="rotulo min-h-10 flex-1 border-b-[3px] border-transparent font-bold text-suave aria-selected:border-texto aria-selected:text-texto"
          >
            {a}
          </button>
        ))}
      </div>
      <div ref={rolagem} role="listbox" aria-label="Resultados" aria-busy={carregando || ocupado} className="overflow-y-auto p-1.5">
        {!busca && !falhou && <p className="px-3 py-2 text-sm text-suave">Buscando…</p>}
        {falhou && <p className="px-3 py-2 text-sm font-bold text-marca-texto">Não deu para buscar.</p>}
        {busca && criando === null && opcoes.every((o) => o.chave === "outros" || o.chave === "criar") && (
          <p className="px-3 py-2 text-sm text-suave">{aba === "tarefas" ? "Nenhuma tarefa encontrada." : "Nenhum grupo encontrado."}</p>
        )}
        {criando !== null && <p className="px-3 pt-2 text-sm">Criar “{criando}”</p>}
        {opcoes.map((o, i) => (
          <div key={o.chave}>
            {o.secao && o.secao !== opcoes[i - 1]?.secao && <p className="rotulo px-3 pb-1 pt-2 text-[10px] text-suave">{o.secao.trim()}</p>}
            <button
              type="button"
              role="option"
              aria-selected={i === indice}
              disabled={ocupado}
              onMouseMove={() => i !== indice && setEscolha({ assinatura, i })}
              onClick={o.escolher}
              className="flex min-h-10 w-full items-center gap-3 px-3 py-1 text-left aria-selected:bg-superficie"
            >
              {o.conteudo}
            </button>
          </div>
        ))}
        {erro && (
          <p role="alert" className="px-3 py-2 text-xs font-bold text-marca-texto">
            {erro}
          </p>
        )}
      </div>
      <div className="rotulo flex flex-wrap justify-between gap-x-3 border-t border-borda px-3 py-1.5 text-[10px] text-suave">
        <button type="button" onClick={() => setModo(modo === "bloco" ? "mencao" : "bloco")} className="min-h-7 font-bold text-texto hover:underline">
          Inserir como: {modo === "bloco" ? "bloco" : "menção"} (Shift+Enter)
        </button>
        <span className="self-center">Tab troca a aba · Enter insere</span>
      </div>
    </div>
  );
}

export function SeletorDeVinculo(props: Props) {
  const estado = useSyncExternalStore(props.canal.assinar, props.canal.ler, () => null);
  return estado ? <Lista {...props} estado={estado} /> : null;
}
