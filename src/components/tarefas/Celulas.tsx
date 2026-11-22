"use client";

import { Check, Pencil } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import type { Pessoa, TarefaDb } from "@/lib/tarefas";
import {
  campoPorChave,
  type CampoTarefa,
  type ChaveCampo,
  type Opcao,
} from "@/lib/tarefas-campos";
import { useCampo } from "./useCampo";

function MensagemErro({ erro }: { erro: string | null }) {
  return erro ? (
    <p role="alert" className="mt-0.5 text-xs font-bold text-laranja-texto">
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
        className={`min-h-11 w-full border px-2 font-mono text-[11px] font-bold uppercase hover:brightness-95 disabled:opacity-60 ${atual.classes}`}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor} className="bg-creme-claro text-preto">
            {o.rotulo}
          </option>
        ))}
      </select>
      <MensagemErro erro={erro} />
    </div>
  );
}

/** Seletor de pessoa (solicitante, executor), discreto até o mouse passar. */
export function CelulaPessoa({
  id,
  chave,
  valor: valorServidor,
  membros,
  rotulo,
}: {
  id: string;
  chave: ChaveCampo;
  valor: string;
  membros: Pessoa[];
  rotulo: string;
}) {
  const { valor, salvar, pendente, erro } = useCampo(id, chave, valorServidor);
  return (
    <div className="min-w-0">
      <select
        aria-label={rotulo}
        value={valor}
        disabled={pendente}
        onChange={(e) => salvar(e.target.value)}
        className="min-h-11 w-full truncate border border-transparent bg-transparent px-1.5 text-sm font-medium hover:border-linha hover:bg-creme-claro disabled:opacity-60"
      >
        <option value="">—</option>
        {membros.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nome}
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
  const { valor, salvar, pendente, erro } = useCampo(id, chave, valorServidor);
  return (
    <div className="min-w-0">
      <input
        type="date"
        aria-label={rotulo}
        value={valor}
        disabled={pendente}
        onChange={(e) => salvar(e.target.value)}
        className={`min-h-11 w-[8.5rem] border border-transparent bg-transparent px-1 font-mono text-xs hover:border-linha hover:bg-creme-claro disabled:opacity-60 ${
          alerta ? "font-bold text-laranja-texto" : ""
        }`}
      />
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

  const tamanho = grande ? "text-2xl font-black leading-tight tracking-tighter md:text-3xl" : "text-[15px] font-bold leading-snug";

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
          className={`min-h-11 w-full border border-preto bg-creme-claro px-2 ${tamanho}`}
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
            className={`min-w-0 hover:text-laranja-texto hover:underline ${tamanho} ${riscado ? "line-through opacity-60" : ""} ${pendente ? "opacity-60" : ""}`}
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
          className="flex size-11 shrink-0 items-center justify-center text-cinza hover:bg-creme hover:text-preto md:opacity-0 md:focus-visible:opacity-100 md:group-hover/titulo:opacity-100"
        >
          <Pencil size={14} aria-hidden="true" />
        </button>
      </div>
      <MensagemErro erro={erro} />
    </div>
  );
}

/** Caixa de concluir/reabrir (alvo de toque de 44px). */
export function CaixaConcluir({ id, status }: { id: string; status: string }) {
  const { valor, salvar, pendente, erro } = useCampo(id, "status", status);
  const concluida = valor === "concluida";
  return (
    <>
      <button
        type="button"
        disabled={pendente}
        aria-label={concluida ? "Reabrir tarefa" : "Concluir tarefa"}
        aria-pressed={concluida}
        onClick={() => salvar(concluida ? "a_fazer" : "concluida")}
        className="group flex size-11 shrink-0 items-center justify-center disabled:opacity-50"
      >
        <span
          className={`flex size-5 items-center justify-center border-2 border-preto group-hover:bg-amarelo ${
            concluida ? "bg-preto text-creme-claro group-hover:bg-laranja-texto" : ""
          }`}
        >
          {concluida && <Check size={14} strokeWidth={3} aria-hidden="true" />}
        </span>
      </button>
      {erro && (
        <span role="alert" className="sr-only">
          {erro}
        </span>
      )}
    </>
  );
}

/** Escolhe a célula certa pelo tipo do campo no registro. */
export function CampoEditavel({
  campo,
  tarefa,
  membros,
  hoje,
}: {
  campo: CampoTarefa;
  tarefa: TarefaDb;
  membros: Pessoa[];
  hoje: string;
}) {
  const bruto = (tarefa as unknown as Record<string, string | null>)[campo.chave] ?? "";
  switch (campo.tipo) {
    case "opcao":
      return <CelulaOpcao id={tarefa.id} chave={campo.chave} valor={bruto} opcoes={campo.opcoes ?? []} rotulo={campo.rotulo} />;
    case "pessoa":
      return <CelulaPessoa id={tarefa.id} chave={campo.chave} valor={bruto} membros={membros} rotulo={campo.rotulo} />;
    case "data":
      return (
        <CelulaData
          id={tarefa.id}
          chave={campo.chave}
          valor={bruto}
          rotulo={campo.rotulo}
          alerta={campo.chave === "prazo" && !!bruto && bruto < hoje && tarefa.status !== "concluida"}
        />
      );
    case "texto":
      return <CelulaTitulo id={tarefa.id} valor={bruto} />;
  }
}

export { campoPorChave };
