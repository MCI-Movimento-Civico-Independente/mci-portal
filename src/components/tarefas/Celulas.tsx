"use client";

import { TbPencil } from "react-icons/tb";
import Link from "next/link";
import { useRef, useState } from "react";
import type { FormularioView } from "@/lib/formularios-tipos";
import { corDoGrupo, type GrupoBasico } from "@/lib/grupos-tipos";
import type { ComiteBasico, ProjetoBasico } from "@/lib/organizacao";
import type { Pessoa, TarefaDb } from "@/lib/tarefas";
import {
  campoPorChave,
  type CampoTarefa,
  type ChaveCampo,
  type Opcao,
} from "@/lib/tarefas-campos";
import { CelulaPeriodo } from "./CelulaPeriodo";
import { CelulaPessoa } from "./CelulaPessoa";
import { useCampo } from "./useCampo";

function MensagemErro({ erro }: { erro: string | null }) {
  return erro ? (
    <p role="alert" className="mt-0.5 text-xs font-bold text-marca-texto">
      {erro}
    </p>
  ) : null;
}

/** Etiqueta colorida que é um seletor (status, prioridade). */
export function CelulaOpcao({
  id,
  chave,
  valor: valorServidor,
  opcoes,
  rotulo,
}: {
  id: string;
  chave: ChaveCampo;
  valor: string;
  opcoes: Opcao[];
  rotulo: string;
}) {
  const { valor, salvar, pendente, erro } = useCampo(id, chave, valorServidor);
  const atual = opcoes.find((o) => o.valor === valor) ?? opcoes[0];
  return (
    <div className="min-w-0">
      <select
        aria-label={rotulo}
        value={valor}
        disabled={pendente}
        onChange={(e) => salvar(e.target.value)}
        className={`min-h-11 md:min-h-8 w-full rounded-lg border px-2.5 text-xs md:text-[11px] font-semibold hover:brightness-95 disabled:opacity-60 dark:hover:brightness-125 ${atual.classes}`}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor} className="bg-superficie text-texto">
            {o.rotulo}
          </option>
        ))}
      </select>
      <MensagemErro erro={erro} />
    </div>
  );
}

export function CelulaData({
  id,
  chave,
  valor: valorServidor,
  rotulo,
  alerta = false,
}: {
  id: string;
  chave: ChaveCampo;
  valor: string;
  rotulo: string;
  alerta?: boolean;
}) {
  const { salvar, pendente, erro } = useCampo(id, chave, valorServidor);
  // Salva ao terminar de editar (sair do campo), não a cada tecla: digitar o ano
  // passa por valores como 0002 e 0020. O campo recomeça do valor do servidor
  // quando ele muda ou quando o servidor recusa (por isso o key).
  return (
    <div className="min-w-0">
      <input
        key={`${valorServidor}|${erro ?? ""}`}
        type="date"
        aria-label={rotulo}
        defaultValue={valorServidor}
        min="2000-01-01"
        max="2100-12-31"
        disabled={pendente}
        onBlur={(e) => salvar(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className={`min-h-11 md:min-h-8 w-28 md:w-24 border border-transparent bg-transparent px-1 text-xs md:text-[11px] hover:border-borda hover:bg-sutil disabled:opacity-60 ${
          alerta ? "font-bold text-marca-texto" : ""
        }`}
      />
      <MensagemErro erro={erro} />
    </div>
  );
}

/** Seletor de grupo do projeto (como na Monday). Só lista os grupos do projeto da tarefa. */
export function CelulaGrupo({
  id,
  valor: valorServidor,
  grupos,
}: {
  id: string;
  valor: string;
  grupos: GrupoBasico[];
}) {
  const { valor, salvar, pendente, erro } = useCampo(id, "grupo_id", valorServidor);
  const atual = grupos.find((g) => g.id === valor);
  return (
    <div className="min-w-0">
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-2 top-1/2 size-2.5 -translate-y-1/2"
          style={{ backgroundColor: atual ? corDoGrupo(atual.cor) : "#c4c4c4" }}
        />
        <select
          aria-label="Grupo"
          value={valor}
          disabled={pendente}
          onChange={(e) => salvar(e.target.value)}
          className="min-h-11 md:min-h-8 w-full truncate border border-transparent bg-transparent py-0 pl-6 pr-1.5 text-sm md:text-[13px] font-medium hover:border-borda-forte hover:bg-sutil disabled:opacity-60"
        >
          {valor === "" && <option value="">—</option>}
          {grupos.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nome}
            </option>
          ))}
        </select>
      </div>
      <MensagemErro erro={erro} />
    </div>
  );
}

/** Seletor de formulário da tarefa. */
export function CelulaFormulario({
  id,
  valor: valorServidor,
  formularios,
}: {
  id: string;
  valor: string;
  formularios: FormularioView[];
}) {
  const { valor, salvar, pendente, erro } = useCampo(id, "formulario_id", valorServidor);
  return (
    <div className="min-w-0">
      <select
        aria-label="Formulário"
        value={valor}
        disabled={pendente}
        onChange={(e) => salvar(e.target.value)}
        className="min-h-11 md:min-h-8 w-full truncate rounded-lg border border-transparent bg-transparent px-1.5 text-sm md:text-[13px] font-medium hover:border-borda hover:bg-sutil disabled:opacity-60"
      >
        {formularios.map((f) => (
          <option key={f.id} value={f.id}>
            {f.nome}
          </option>
        ))}
      </select>
      <MensagemErro erro={erro} />
    </div>
  );
}

/** Seletor de comitê. */
export function CelulaComite({
  id,
  valor: valorServidor,
  comites,
}: {
  id: string;
  valor: string;
  comites: ComiteBasico[];
}) {
  const { valor, salvar, pendente, erro } = useCampo(id, "comite_slug", valorServidor);
  return (
    <div className="min-w-0">
      <select
        aria-label="Comitê"
        value={valor}
        disabled={pendente}
        onChange={(e) => salvar(e.target.value)}
        className="min-h-11 md:min-h-8 w-full truncate rounded-lg border border-transparent bg-transparent px-1.5 text-sm md:text-[13px] font-medium hover:border-borda hover:bg-sutil disabled:opacity-60"
      >
        <option value="">— sem comitê</option>
        {comites.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.nome}
          </option>
        ))}
      </select>
      <MensagemErro erro={erro} />
    </div>
  );
}

/**
 * Seletor de projeto, agrupado por comitê. Escolher um projeto define o comitê da
 * tarefa. Projetos arquivados só aparecem se forem o atual.
 */
export function CelulaProjeto({
  id,
  valor: valorServidor,
  comites,
  projetos,
  comiteFiltro = null,
}: {
  id: string;
  valor: string;
  comites: ComiteBasico[];
  projetos: ProjetoBasico[];
  comiteFiltro?: string | null;
}) {
  const { valor, salvar, pendente, erro } = useCampo(id, "projeto_id", valorServidor);
  const visiveis = projetos.filter((p) => (p.status === "ativo" || p.id === valor) && (!comiteFiltro || p.comite_slug === comiteFiltro));
  return (
    <div className="min-w-0">
      <select
        aria-label="Projeto"
        value={valor}
        disabled={pendente}
        onChange={(e) => salvar(e.target.value)}
        className="min-h-11 md:min-h-8 w-full truncate rounded-lg border border-transparent bg-transparent px-1.5 text-sm md:text-[13px] font-medium hover:border-borda hover:bg-sutil disabled:opacity-60"
      >
        <option value="">— sem projeto</option>
        {comites.map((c) => {
          const doComite = visiveis.filter((p) => p.comite_slug === c.slug);
          if (doComite.length === 0) return null;
          return (
            <optgroup key={c.slug} label={c.nome}>
              {doComite.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                  {p.status === "arquivado" ? " (arquivado)" : ""}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
      <MensagemErro erro={erro} />
    </div>
  );
}

/** Assunto: é um link que abre a janela da tarefa; o lápis edita ali mesmo. */
export function CelulaTitulo({
  id,
  valor: valorServidor,
  href,
  riscado = false,
  grande = false,
}: {
  id: string;
  valor: string;
  href?: string;
  riscado?: boolean;
  grande?: boolean;
}) {
  const { valor, salvar, pendente, erro } = useCampo(id, "titulo", valorServidor);
  const [editando, setEditando] = useState(false);
  const cancelou = useRef(false);

  function terminar(texto: string) {
    setEditando(false);
    if (cancelou.current) {
      cancelou.current = false;
      return;
    }
    if (texto.trim()) salvar(texto.trim());
  }

  const tamanho = grande ? "font-titulo text-2xl font-extrabold leading-tight tracking-tight md:text-3xl" : "text-sm font-bold leading-snug md:text-[13px]";

  if (editando) {
    return (
      <div className="min-w-0 flex-1">
        <input
          autoFocus
          aria-label="Assunto da tarefa"
          defaultValue={valor}
          maxLength={200}
          onBlur={(e) => terminar(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              cancelou.current = true;
              e.currentTarget.blur();
            }
          }}
          className={`min-h-11 md:min-h-8 w-full border border-inverso bg-superficie px-2 ${tamanho}`}
        />
        <MensagemErro erro={erro} />
      </div>
    );
  }

  return (
    <div className="min-w-0 flex-1">
      <div className="group/titulo flex items-center gap-1">
        {href ? (
          <Link
            href={href}
            scroll={false}
            className={`min-w-0 hover:text-marca-texto hover:underline ${tamanho} ${riscado ? "line-through opacity-60" : ""} ${pendente ? "opacity-60" : ""}`}
          >
            {valor}
          </Link>
        ) : (
          <span className={`min-w-0 ${tamanho} ${pendente ? "opacity-60" : ""}`}>{valor}</span>
        )}
        <button
          type="button"
          aria-label="Editar assunto"
          onClick={() => setEditando(true)}
          className="flex size-11 md:size-7 shrink-0 items-center justify-center text-suave hover:bg-sutil hover:text-texto md:opacity-0 md:focus-visible:opacity-100 md:group-hover/titulo:opacity-100"
        >
          <TbPencil size={14} aria-hidden="true" />
        </button>
      </div>
      <MensagemErro erro={erro} />
    </div>
  );
}

/** Escolhe a célula certa pelo tipo do campo no registro. */
export function CampoEditavel({
  campo,
  tarefa,
  membros,
  comites,
  projetos,
  formularios,
  grupos,
  hoje,
}: {
  campo: CampoTarefa;
  tarefa: TarefaDb;
  membros: Pessoa[];
  comites: ComiteBasico[];
  projetos: ProjetoBasico[];
  formularios: FormularioView[];
  grupos: GrupoBasico[];
  hoje: string;
}) {
  const bruto = (tarefa as unknown as Record<string, string | null>)[campo.chave] ?? "";
  switch (campo.tipo) {
    case "opcao":
      return <CelulaOpcao id={tarefa.id} chave={campo.chave} valor={bruto} opcoes={campo.opcoes ?? []} rotulo={campo.rotulo} />;
    case "pessoa":
      return <CelulaPessoa id={tarefa.id} chave={campo.chave} valor={bruto} extras={campo.chave === "responsavel_id" ? tarefa.executores_extra : []} membros={membros} rotulo={campo.rotulo} />;
    case "data":
      return (
        <CelulaPeriodo
          id={tarefa.id}
          inicio={tarefa.data_inicio ?? ""}
          fim={tarefa.prazo ?? ""}
          hoje={hoje}
          status={tarefa.status}
        />
      );
    case "comite":
      return <CelulaComite id={tarefa.id} valor={bruto} comites={comites} />;
    case "grupo":
      return <CelulaGrupo id={tarefa.id} valor={bruto} grupos={grupos.filter((g) => g.projeto_id === tarefa.projeto_id)} />;
    case "formulario":
      return <CelulaFormulario id={tarefa.id} valor={bruto} formularios={formularios} />;
    case "projeto":
      return (
        <CelulaProjeto
          id={tarefa.id}
          valor={bruto}
          comites={comites}
          projetos={projetos}
          comiteFiltro={tarefa.comite_slug}
        />
      );
    case "texto":
      return <CelulaTitulo id={tarefa.id} valor={bruto} />;
  }
}

export { campoPorChave };
