"use client";

import { TbPlus } from "react-icons/tb";
import { useActionState } from "react";
import { criarFormularioAction, salvarFormularioAction, type EstadoAdmin } from "@/app/org/admin/acoes";
import { campo, rotulo } from "@/components/tarefas/estilos";
import { Botao } from "@/components/ui/Botao";
import { chaveFormulario, rotuloDoTipo, type CampoPersonalizado } from "@/lib/campos-personalizados-tipos";
import type { FormularioView } from "@/lib/formularios-tipos";
import type { ComiteBasico } from "@/lib/organizacao";
import { CAMPOS, CAMPOS_CONFIGURAVEIS } from "@/lib/tarefas-campos";

const TIPOS: Record<string, string> = {
  pessoa: "pessoa",
  data: "data",
  opcao: "lista de opções",
  projeto: "lista de projetos",
};

export function FormNovoFormulario() {
  const [estado, acao, pendente] = useActionState<EstadoAdmin, FormData>(criarFormularioAction, {});
  return (
    <form action={acao} className="flex flex-col gap-3">
      <label htmlFor="novo-formulario" className={rotulo}>
        Novo formulário
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id="novo-formulario" name="nome" required maxLength={80} placeholder="Ex.: Pauta jornalística" className={`${campo} sm:flex-1`} />
        <Botao type="submit" disabled={pendente}>
          <TbPlus size={16} aria-hidden="true" />
          {pendente ? "Criando…" : "Criar formulário"}
        </Botao>
      </div>
      <p className="text-xs text-suave">Começa com os mesmos campos do Padrão geral. Depois é só adicionar ou remover.</p>
      {estado.erro && (
        <p role="alert" className="text-sm font-bold text-marca-texto">
          {estado.erro}
        </p>
      )}
    </form>
  );
}

export function FormEditarFormulario({
  formulario,
  comites,
  personalizados,
  formularioDoComite,
}: {
  formulario: FormularioView;
  comites: ComiteBasico[];
  personalizados: CampoPersonalizado[];
  /** Nome do formulário que cada comitê usa hoje como padrão (se algum). */
  formularioDoComite: Record<string, string | undefined>;
}) {
  const [estado, acao, pendente] = useActionState<EstadoAdmin, FormData>(
    salvarFormularioAction.bind(null, formulario.id),
    {},
  );
  const fixos = CAMPOS.filter((c) => c.fixo && c.chave !== "formulario_id");

  return (
    <form action={acao} className="flex flex-col gap-8">
      <div className="grid gap-4">
        <div>
          <label htmlFor="nome" className={rotulo}>
            Nome
          </label>
          <input id="nome" name="nome" required maxLength={80} defaultValue={formulario.nome} className={campo} />
        </div>
        <div>
          <label htmlFor="descricao-formulario" className={rotulo}>
            Descrição <span className="font-normal text-suave">(opcional)</span>
          </label>
          <textarea
            id="descricao-formulario"
            name="descricao"
            rows={2}
            maxLength={500}
            defaultValue={formulario.descricao ?? ""}
            className={`${campo} py-2`}
          />
        </div>
      </div>

      <fieldset>
        <legend className="text-lg font-semibold">Campos</legend>
        <p className="mt-1 text-sm text-suave">
          Sempre presentes: Assunto, Descrição,{" "}
          {fixos.map((c) => c.rotulo).join(", ")}. Marque os outros campos que este formulário deve ter.
        </p>
        <ul className="mt-3 grid gap-x-6 sm:grid-cols-2">
          {CAMPOS_CONFIGURAVEIS.map((c) => (
            <li key={c.chave}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 hover:bg-sutil">
                <input
                  type="checkbox"
                  name="campo"
                  value={c.chave}
                  defaultChecked={formulario.campos.includes(c.chave)}
                  className="size-5 shrink-0 accent-marca"
                />
                <span className="text-[15px] font-bold">{c.rotulo}</span>
                <span className="text-[11px] uppercase text-suave">{TIPOS[c.tipo] ?? c.tipo}</span>
              </label>
            </li>
          ))}
        </ul>
        {personalizados.length > 0 && (
          <>
            <h3 className="mt-5 text-[11px] uppercase tracking-widest text-suave">Campos personalizados</h3>
            <ul className="mt-1 grid gap-x-6 sm:grid-cols-2">
              {personalizados.map((c) => (
                <li key={c.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 hover:bg-sutil">
                    <input
                      type="checkbox"
                      name="campo"
                      value={chaveFormulario(c.id)}
                      defaultChecked={formulario.campos.includes(chaveFormulario(c.id))}
                      className="size-5 shrink-0 accent-marca"
                    />
                    <span className="text-[15px] font-bold">
                      {c.rotulo}
                      {c.obrigatorio && <span aria-hidden="true"> *</span>}
                    </span>
                    <span className="text-[11px] uppercase text-suave">{rotuloDoTipo(c.tipo)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
      </fieldset>

      {formulario.padrao ? (
        <p className="rounded-lg border border-ouro/40 bg-ouro-suave p-3 text-sm text-ouro-texto">
          Este é o <strong>Padrão geral</strong>: vale para todo comitê que não tem um formulário próprio, e não pode ser
          excluído.
        </p>
      ) : (
        <fieldset>
          <legend className="text-lg font-semibold">Padrão para os comitês</legend>
          <p className="mt-1 text-sm text-suave">
            Tarefas criadas nesses comitês já abrem com este formulário. Marcar um comitê que usa outro formulário passa
            ele para este.
          </p>
          <ul className="mt-3">
            {comites.map((c) => {
              const outro = formularioDoComite[c.slug];
              const aqui = formulario.comites.includes(c.slug);
              return (
                <li key={c.slug}>
                  <label className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-3 hover:bg-sutil">
                    <input type="checkbox" name="comite" value={c.slug} defaultChecked={aqui} className="size-5 shrink-0 accent-marca" />
                    <span className="text-[15px] font-bold">{c.nome}</span>
                    {!aqui && outro && <span className="text-[11px] uppercase text-suave">hoje usa: {outro}</span>}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      {estado.erro && (
        <p role="alert" className="rounded-lg border border-marca/30 bg-marca-suave p-3 text-sm font-medium text-marca-texto">
          {estado.erro}
        </p>
      )}
      <div className="flex items-center gap-4">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar formulário"}
        </Botao>
        {estado.ok && !pendente && (
          <span role="status" className="text-xs font-bold uppercase text-suave">
            Salvo
          </span>
        )}
      </div>
    </form>
  );
}
