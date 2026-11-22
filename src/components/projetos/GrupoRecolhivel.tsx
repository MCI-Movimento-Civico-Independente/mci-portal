"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { TbArrowDown, TbArrowUp, TbChevronRight, TbPencil, TbPlus, TbTrash } from "react-icons/tb";
import { excluirGrupoAction, moverGrupoAction } from "@/app/org/projetos/acoes";
import { BotaoAcao } from "@/components/ui/BotaoAcao";
import type { GrupoBasico } from "@/lib/grupos-tipos";
import { FormEditarGrupo, PaletaCor } from "./FormGrupo";

type Props = {
  grupo: GrupoBasico;
  /** O último grupo do projeto não pode ser excluído. */
  podeExcluir?: boolean;
  total: number;
  feitas: number;
  /** Link que abre "Nova tarefa" já com este grupo escolhido. */
  hrefNovaTarefa: string;
  primeiro?: boolean;
  ultimo?: boolean;
  children: ReactNode;
};

/** Grupo do projeto (como na Monday): cabeçalho que expande e comprime a lista de tarefas. */
export function GrupoRecolhivel({ grupo, total, feitas, hrefNovaTarefa, primeiro = false, ultimo = false, podeExcluir = true, children }: Props) {
  const [aberto, setAberto] = useState(true);
  const [editando, setEditando] = useState(false);
  const nome = grupo.nome;
  const idConteudo = `grupo-${grupo.id}`;
  const pct = total > 0 ? Math.round((feitas / total) * 100) : 0;

  return (
    <section aria-label={nome} className="border-2 border-borda bg-superficie">
      <div className="flex flex-wrap items-center gap-x-2 border-b-2 border-borda">
        <div className="pl-1">
          <PaletaCor id={grupo.id} cor={grupo.cor} nome={nome} />
        </div>
        {editando ? (
          <FormEditarGrupo id={grupo.id} nome={grupo.nome} aoTerminar={() => setEditando(false)} />
        ) : (
          <button
            type="button"
            aria-expanded={aberto}
            aria-controls={idConteudo}
            onClick={() => setAberto((v) => !v)}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-1 text-left hover:text-marca-texto"
          >
            <TbChevronRight size={18} aria-hidden="true" className={`shrink-0 transition-transform ${aberto ? "rotate-90" : ""}`} />
            <span className="truncate font-titulo text-lg font-extrabold uppercase tracking-tight">{nome}</span>
            <span className="rotulo shrink-0 text-suave">
              {total} {total === 1 ? "tarefa" : "tarefas"}
              {total > 0 && ` · ${pct}%`}
            </span>
          </button>
        )}

        {!editando && (
          <div className="flex items-center">
            <Link
              href={hrefNovaTarefa}
              scroll={false}
              className="rotulo inline-flex min-h-11 items-center gap-1 px-2.5 font-bold hover:bg-inverso hover:text-sobre-inverso"
            >
              <TbPlus size={15} aria-hidden="true" />
              Tarefa
            </Link>
            {
              <>
                <BotaoAcao acao={moverGrupoAction.bind(null, grupo.id, "cima")} desabilitado={primeiro} rotulo={`Subir ${nome}`}>
                  <TbArrowUp size={16} aria-hidden="true" />
                </BotaoAcao>
                <BotaoAcao acao={moverGrupoAction.bind(null, grupo.id, "baixo")} desabilitado={ultimo} rotulo={`Descer ${nome}`}>
                  <TbArrowDown size={16} aria-hidden="true" />
                </BotaoAcao>
                <button
                  type="button"
                  aria-label={`Editar ${nome}`}
                  onClick={() => setEditando(true)}
                  className="flex size-11 items-center justify-center hover:bg-sutil"
                >
                  <TbPencil size={16} aria-hidden="true" />
                </button>
                {podeExcluir && (
                  <BotaoAcao
                    acao={excluirGrupoAction.bind(null, grupo.id)}
                    aviso={`Excluir o grupo "${nome}"?${total > 0 ? ` As ${total} tarefas dele não são apagadas: vão para o primeiro grupo que sobrar.` : ""}`}
                    perigo
                    rotulo={`Excluir ${nome}`}
                  >
                    <TbTrash size={16} aria-hidden="true" />
                  </BotaoAcao>
                )}
              </>
            }
          </div>
        )}
      </div>

      {/* hidden em vez de desmontar: preserva o que a pessoa estava editando nas linhas. */}
      <div id={idConteudo} hidden={!aberto} className="p-2 md:p-3">
        {children}
      </div>
    </section>
  );
}
