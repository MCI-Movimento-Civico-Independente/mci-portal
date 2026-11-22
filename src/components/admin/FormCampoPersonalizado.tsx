"use client";

import { TbPlus } from "react-icons/tb";
import { useActionState, useState } from "react";
import {
  atualizarCampoPersonalizadoAction,
  criarCampoPersonalizadoAction,
  type EstadoAdmin,
} from "@/app/org/admin/acoes";
import { campo, rotulo } from "@/components/tarefas/estilos";
import { Botao } from "@/components/ui/Botao";
import {
  rotuloDoTipo,
  TIPOS_PERSONALIZADOS,
  type CampoPersonalizado,
  type TipoCampoPersonalizado,
} from "@/lib/campos-personalizados-tipos";

const DICA_OPCOES = "Uma opção por linha";

/** Cria um campo personalizado. Com `formularioId`, o campo já entra nesse formulário. */
export function FormNovoCampo({ formularioId }: { formularioId?: string }) {
  const [estado, acao, pendente] = useActionState<EstadoAdmin, FormData>(
    criarCampoPersonalizadoAction.bind(null, formularioId ?? ""),
    {},
  );
  const [tipo, setTipo] = useState<TipoCampoPersonalizado>("texto");

  return (
    <form key={estado.n ?? 0} action={acao} className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">Novo campo personalizado</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="novo-campo-rotulo" className={rotulo}>
            Nome do campo
          </label>
          <input id="novo-campo-rotulo" name="rotulo" required maxLength={60} placeholder="Ex.: Fonte da pauta" className={campo} />
        </div>
        <div>
          <label htmlFor="novo-campo-tipo" className={rotulo}>
            Tipo
          </label>
          <select
            id="novo-campo-tipo"
            name="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoCampoPersonalizado)}
            className={campo}
          >
            {TIPOS_PERSONALIZADOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </select>
        </div>
      </div>
      {tipo === "lista" && (
        <div>
          <label htmlFor="novo-campo-opcoes" className={rotulo}>
            Opções <span className="font-normal text-suave">({DICA_OPCOES})</span>
          </label>
          <textarea id="novo-campo-opcoes" name="opcoes" required rows={4} placeholder={"Fonte oficial\nImprensa\nDenúncia"} className={`${campo} py-2`} />
        </div>
      )}
      {tipo !== "caixa" && (
        <label className="flex min-h-11 items-center gap-3 text-sm font-bold">
          <input type="checkbox" name="obrigatorio" className="size-5 accent-marca" />
          Obrigatório ao criar a tarefa
        </label>
      )}
      {estado.erro && (
        <p role="alert" className="text-sm font-bold text-marca-texto">
          {estado.erro}
        </p>
      )}
      <div>
        <Botao type="submit" disabled={pendente}>
          <TbPlus size={16} aria-hidden="true" />
          {pendente ? "Criando…" : formularioId ? "Criar e adicionar ao formulário" : "Criar campo"}
        </Botao>
      </div>
    </form>
  );
}

/** Edita nome, opções e obrigatoriedade. O tipo não muda (os valores já gravados dependem dele). */
export function FormEditarCampo({ campoPersonalizado }: { campoPersonalizado: CampoPersonalizado }) {
  const c = campoPersonalizado;
  const [estado, acao, pendente] = useActionState<EstadoAdmin, FormData>(
    atualizarCampoPersonalizadoAction.bind(null, c.id, c.tipo),
    {},
  );

  return (
    <form action={acao} className="min-w-0 flex-1 basis-80">
      <div className="grid gap-2">
        <div className="flex gap-2">
          <label htmlFor={`rotulo-${c.id}`} className="sr-only">
            Nome do campo
          </label>
          <input id={`rotulo-${c.id}`} name="rotulo" required maxLength={60} defaultValue={c.rotulo} className={`${campo} font-bold`} />
          <Botao type="submit" variante="secundario" disabled={pendente}>
            {pendente ? "…" : "Salvar"}
          </Botao>
        </div>
        {c.tipo === "lista" && (
          <div>
            <label htmlFor={`opcoes-${c.id}`} className="sr-only">
              Opções ({DICA_OPCOES})
            </label>
            <textarea
              id={`opcoes-${c.id}`}
              name="opcoes"
              required
              rows={Math.min(8, Math.max(3, c.opcoes.length))}
              defaultValue={c.opcoes.join("\n")}
              className={`${campo} py-2`}
            />
            <p className="mt-1 text-xs text-suave">{DICA_OPCOES}. Tirar uma opção não apaga o valor já gravado nas tarefas.</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-4">
          <span className="text-[11px] uppercase text-suave">{rotuloDoTipo(c.tipo)}</span>
          {c.tipo !== "caixa" && (
            <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
              <input type="checkbox" name="obrigatorio" defaultChecked={c.obrigatorio} className="size-5 accent-marca" />
              Obrigatório
            </label>
          )}
        </div>
        {estado.erro && (
          <p role="alert" className="text-xs font-bold text-marca-texto">
            {estado.erro}
          </p>
        )}
        {estado.ok && !pendente && (
          <p role="status" className="rotulo font-bold text-suave">
            Salvo
          </p>
        )}
      </div>
    </form>
  );
}
