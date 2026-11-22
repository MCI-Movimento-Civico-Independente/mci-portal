"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { TbCheck, TbUserPlus } from "react-icons/tb";
import { atualizarCampoAction, atualizarExecutoresAction } from "@/app/org/tarefas/acoes";
import { Avatar } from "@/components/ui/Avatar";
import type { Pessoa } from "@/lib/tarefas";
import type { ChaveCampo } from "@/lib/tarefas-campos";

const LARGURA = 232;

/**
 * Solicitante e executor como "fotos de perfil" (iniciais). No máximo dois perfis no bloco;
 * com mais gente aparece só o primeiro e o "+N". Passar o mouse mostra os nomes.
 * Clicar abre a lista de pessoas: solicitante escolhe uma, executor pode ter várias.
 */
export function CelulaPessoa({
  id,
  chave,
  valor,
  extras = [],
  membros,
  rotulo,
}: {
  id: string;
  chave: ChaveCampo;
  valor: string;
  /** Demais executores (só para "responsavel_id"). */
  extras?: string[];
  membros: Pessoa[];
  rotulo: string;
}) {
  const multiplo = chave === "responsavel_id";
  const servidor = [valor, ...extras].filter(Boolean);
  const [ids, setOtimista] = useOptimistic<string[]>(servidor);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const dica = useRef<HTMLDivElement>(null);
  const [posDica, setPosDica] = useState({ x: 0, y: 0, abaixo: false });
  const [posicao, setPosicao] = useState({ top: 0, left: 0 });

  const porId = new Map(membros.map((m) => [m.id, m]));
  const pessoas = ids.map((i) => porId.get(i)).filter((p): p is Pessoa => !!p);
  const nomes = pessoas.map((p) => p.nome?.trim() || "Membro");

  function mostrarDica() {
    const r = botao.current!.getBoundingClientRect();
    const abaixo = r.top < 90;
    setPosDica({ x: Math.max(70, Math.min(r.left + r.width / 2, window.innerWidth - 70)), y: abaixo ? r.bottom + 4 : r.top - 4, abaixo });
    dica.current?.showPopover();
  }
  const esconderDica = () => dica.current?.hidePopover();

  function abrir() {
    esconderDica();
    const r = botao.current!.getBoundingClientRect();
    const altura = Math.min(membros.length * 40 + 44, 300);
    const left = Math.max(8, Math.min(r.left, window.innerWidth - LARGURA - 8));
    const cabeAbaixo = r.bottom + altura + 8 <= window.innerHeight;
    setPosicao({ left, top: cabeAbaixo ? r.bottom + 4 : Math.max(8, r.top - altura - 4) });
    setErro(null);
    painel.current?.showPopover();
  }

  function salvar(novos: string[]) {
    setErro(null);
    iniciar(async () => {
      setOtimista(novos);
      const r = multiplo ? await atualizarExecutoresAction(id, novos) : await atualizarCampoAction(id, chave, novos[0] ?? "");
      if (r.erro) setErro(r.erro);
    });
  }

  function alternar(pessoaId: string) {
    if (!multiplo) {
      painel.current?.hidePopover();
      salvar(ids[0] === pessoaId ? [] : [pessoaId]);
      return;
    }
    salvar(ids.includes(pessoaId) ? ids.filter((i) => i !== pessoaId) : [...ids, pessoaId]);
  }

  // Até 2 perfis; com mais, só o primeiro e o "+N".
  const mostrados = pessoas.length <= 2 ? pessoas : pessoas.slice(0, 1);
  const restantes = pessoas.length > 2 ? pessoas.length - 1 : 0;
  const descricao = nomes.length ? `${rotulo}: ${nomes.join(", ")}. Alterar` : `${rotulo}: ninguém. Definir`;

  return (
    <div className="min-w-0">
      <div className="group/pessoas inline-block">
        <button
          ref={botao}
          type="button"
          aria-label={descricao}
          aria-haspopup="dialog"
          disabled={pendente}
          onClick={abrir}
          onPointerEnter={mostrarDica}
          onPointerLeave={esconderDica}
          onFocus={mostrarDica}
          onBlur={esconderDica}
          className="flex min-h-11 items-center px-1.5 hover:bg-sutil disabled:opacity-60 md:min-h-8"
        >
          {pessoas.length === 0 ? (
            <span className="flex size-7 items-center justify-center rounded-full border-2 border-dashed border-borda-forte text-suave group-hover/pessoas:border-texto group-hover/pessoas:text-texto">
              <TbUserPlus size={14} aria-hidden="true" />
            </span>
          ) : (
            <span className="flex items-center -space-x-1.5">
              {mostrados.map((p) => (
                <Avatar key={p.id} pessoa={p} />
              ))}
              {restantes > 0 && (
                <span
                  aria-hidden="true"
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-superficie bg-borda font-mono text-[10px] font-bold text-texto"
                >
                  +{restantes}
                </span>
              )}
            </span>
          )}
        </button>

        {/* Nomes ao passar o mouse (ou focar). Popover na camada de cima: a tabela não corta. */}
        <div
          ref={dica}
          popover="manual"
          role="tooltip"
          style={{ left: posDica.x, top: posDica.y, transform: posDica.abaixo ? "translateX(-50%)" : "translate(-50%, -100%)" }}
          className="dica-pessoas pointer-events-none fixed m-0 flex flex-col gap-0.5 overflow-visible whitespace-nowrap border-0 bg-inverso px-2.5 py-1.5 text-[11px] font-medium text-sobre-inverso"
        >
          <span className="rotulo text-[9px] opacity-70">
            {rotulo}
            {nomes.length > 1 ? "es" : ""}
          </span>
          {nomes.length ? nomes.map((n, i) => <span key={`${n}-${i}`}>{n}</span>) : <span>Ninguém</span>}
        </div>
      </div>
      {erro && (
        <p role="alert" className="mt-0.5 text-xs font-bold text-marca-texto">
          {erro}
        </p>
      )}

      <div
        ref={painel}
        popover="auto"
        role="dialog"
        aria-label={multiplo ? "Escolher executores" : `Escolher ${rotulo.toLowerCase()}`}
        style={{ top: posicao.top, left: posicao.left, width: LARGURA }}
        className="fixed m-0 max-h-[300px] overflow-y-auto border-2 border-inverso bg-superficie p-1.5 text-texto"
      >
        <p className="rotulo px-2 pb-1 pt-1 text-[10px] text-suave">{multiplo ? "Executores" : rotulo}</p>
        <ul>
          {membros.map((m) => {
            const marcado = ids.includes(m.id);
            return (
              <li key={m.id}>
                <button
                  type="button"
                  aria-pressed={marcado}
                  onClick={() => alternar(m.id)}
                  className="flex min-h-11 w-full items-center gap-2.5 px-2 text-left text-sm hover:bg-sutil md:min-h-9"
                >
                  <Avatar pessoa={m} tamanho="sm" />
                  <span className="min-w-0 flex-1 truncate">{m.nome?.trim() || "Membro"}</span>
                  {marcado && <TbCheck size={15} aria-hidden="true" className="shrink-0 text-marca-texto" />}
                </button>
              </li>
            );
          })}
        </ul>
        {ids.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (!multiplo) painel.current?.hidePopover();
              salvar([]);
            }}
            className="rotulo mt-1 inline-flex min-h-11 w-full items-center border-t border-borda px-2 text-[10px] text-suave hover:text-marca-texto md:min-h-8"
          >
            Remover {multiplo ? "todos" : "pessoa"}
          </button>
        )}
      </div>
    </div>
  );
}
