"use client";

import { useEffect, useRef, useState } from "react";
import { TbDownload, TbX } from "react-icons/tb";
import { listarArquivosAction, type ItemDeArquivo } from "@/app/org/projetos/acoes-abas";
import { emAviso, formatarTamanho, SEM_ESPACO, type Uso } from "@/lib/paginas/arquivos-tipos";

/** Janela com o espaço usado pelos arquivos do projeto e a lista deles, do maior para o menor. */
export function ArquivosProjeto({ projetoId, aoFechar }: { projetoId: string; aoFechar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [dados, setDados] = useState<{ uso: Uso; itens: ItemDeArquivo[] } | { erro: string } | null>(null);

  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal();
  }, []);
  useEffect(() => {
    let ativo = true;
    listarArquivosAction(projetoId)
      .catch(() => ({ erro: "Não deu para listar os arquivos." }))
      .then((r) => ativo && setDados(r));
    return () => {
      ativo = false;
    };
  }, [projetoId]);

  const uso = dados && "uso" in dados ? dados.uso : null;
  const pct = uso ? Math.min(100, Math.round((uso.usado / uso.maximo) * 100)) : 0;

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      aria-labelledby="titulo-arquivos"
      className="m-auto max-h-[80dvh] w-[min(100%-2rem,36rem)] overflow-y-auto border border-texto bg-menu p-5 text-texto backdrop:bg-black/60"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id="titulo-arquivos" className="font-titulo text-xl font-extrabold">
          Arquivos do projeto
        </h2>
        <button
          type="button"
          aria-label="Fechar"
          onClick={() => ref.current?.close()}
          className="flex size-11 shrink-0 items-center justify-center hover:bg-inverso hover:text-sobre-inverso"
        >
          <TbX size={18} aria-hidden="true" />
        </button>
      </div>

      {dados === null ? (
        <div className="mt-4 h-24 animate-pulse bg-sutil" aria-busy="true" />
      ) : "erro" in dados ? (
        <p role="alert" className="mt-4 text-sm font-bold text-marca-texto">
          {dados.erro}
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm font-bold">
            Este projeto usa {formatarTamanho(dados.uso.usado)} de {formatarTamanho(dados.uso.maximo)}.
          </p>
          <div role="progressbar" aria-label="Espaço usado" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-2.5 bg-sutil">
            <div className={`h-full ${emAviso(dados.uso) ? "bg-absurdo" : "bg-ouro"}`} style={{ width: `${pct}%` }} />
          </div>
          {dados.uso.usado >= dados.uso.maximo && <p className="mt-2 text-sm font-bold text-marca-texto">{SEM_ESPACO}</p>}
          <p className="mt-3 text-xs text-suave">Para liberar espaço, remova o arquivo das páginas que o usam.</p>
          {dados.itens.length === 0 ? (
            <p className="mt-4 text-sm">Nenhum arquivo ainda.</p>
          ) : (
            <ul className="mt-4 border-t border-borda">
              {dados.itens.map((i) => (
                <li key={i.id} className="flex items-center gap-3 border-b border-borda py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{i.nome}</p>
                    <p className="rotulo text-[10px] text-suave">
                      {formatarTamanho(i.tamanho)}
                      {i.pagina ? ` · enviado em ${i.pagina}` : ""} · {i.enviadoEm}
                    </p>
                  </div>
                  <a
                    href={`/api/arquivos/${i.id}?baixar=1`}
                    target="_blank"
                    rel="noopener"
                    aria-label={`Baixar ${i.nome}`}
                    className="flex size-11 shrink-0 items-center justify-center border-2 border-inverso hover:bg-inverso hover:text-sobre-inverso md:size-9"
                  >
                    <TbDownload size={16} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </dialog>
  );
}
