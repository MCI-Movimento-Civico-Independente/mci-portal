"use client";

import { useActionState, useState } from "react";
import { criarTarefaAction, type EstadoForm } from "@/app/org/tarefas/acoes";
import { Botao } from "@/components/ui/Botao";
import { resolverFormulario, type FormularioView } from "@/lib/formularios-tipos";
import type { ComiteBasico, ProjetoBasico } from "@/lib/organizacao";
import type { Pessoa } from "@/lib/tarefas";
import { PRIORIDADE_OPCOES } from "@/lib/tarefas-campos";
import { campo, rotulo } from "./estilos";

export function FormNovaTarefa({
  membros,
  comites,
  projetos,
  formularios,
  euId,
  fecharHref,
}: {
  membros: Pessoa[];
  comites: ComiteBasico[];
  projetos: ProjetoBasico[];
  formularios: FormularioView[];
  euId: string;
  fecharHref: string;
}) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(criarTarefaAction, {});
  const [comite, setComite] = useState("");
  // Formulário escolhido à mão; sem escolha, vale o padrão do comitê (ou o Padrão geral).
  const [formManual, setFormManual] = useState<string | null>(null);
  const formularioId = formManual ?? resolverFormulario(formularios, comite)?.id ?? "";
  const incluidos = new Set(formularios.find((f) => f.id === formularioId)?.campos ?? []);
  const tem = (chave: string) => incluidos.has(chave);
  const opcional = <span className="font-normal text-cinza">(opcional)</span>;

  const seletorPessoa = (id: string, rotuloCampo: string) => (
    <div key={id}>
      <label htmlFor={id} className={rotulo}>
        {rotuloCampo} {opcional}
      </label>
      <select id={id} name={id} defaultValue={euId} className={campo}>
        <option value="">Ninguém</option>
        {membros.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nome}
            {m.id === euId ? " (eu)" : ""}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <form action={acao} className="flex flex-col gap-5">
      <div>
        <label htmlFor="titulo" className={rotulo}>
          Assunto
        </label>
        <input
          id="titulo"
          name="titulo"
          required
          maxLength={200}
          autoFocus
          placeholder="Ex.: Revisar o texto do guia"
          className={campo}
        />
      </div>

      <div>
        <label htmlFor="descricao" className={rotulo}>
          Descrição
        </label>
        <textarea
          id="descricao"
          name="descricao"
          required
          rows={5}
          maxLength={2000}
          placeholder="O que precisa ser feito e qual o resultado esperado"
          className={`${campo} py-2`}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="comite_slug" className={rotulo}>
            Comitê {opcional}
          </label>
          <select
            id="comite_slug"
            name="comite_slug"
            value={comite}
            onChange={(e) => {
              setComite(e.target.value);
              setFormManual(null);
            }}
            className={campo}
          >
            <option value="">Sem comitê</option>
            {comites.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="formulario_id" className={rotulo}>
            Formulário
          </label>
          <select
            id="formulario_id"
            name="formulario_id"
            value={formularioId}
            onChange={(e) => setFormManual(e.target.value)}
            className={campo}
          >
            {formularios.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-cinza">Define quais campos aparecem. Segue o padrão do comitê.</p>
        </div>

        {tem("projeto_id") && (
          <div>
            <label htmlFor="projeto_id" className={rotulo}>
              Projeto {opcional}
            </label>
            <select id="projeto_id" name="projeto_id" defaultValue="" className={campo}>
              <option value="">Sem projeto</option>
              {comites.map((c) => {
                const doComite = projetos.filter((p) => p.comite_slug === c.slug && p.status === "ativo");
                return doComite.length === 0 ? null : (
                  <optgroup key={c.slug} label={c.nome}>
                    {doComite.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
            <p className="mt-1 text-xs text-cinza">Escolher um projeto define o comitê dele.</p>
          </div>
        )}
        {tem("solicitante_id") && seletorPessoa("solicitante_id", "Solicitante")}
        {tem("responsavel_id") && seletorPessoa("responsavel_id", "Executor")}
        {tem("prioridade") && (
          <div>
            <label htmlFor="prioridade" className={rotulo}>
              Prioridade {opcional}
            </label>
            <select id="prioridade" name="prioridade" defaultValue="" className={campo}>
              {PRIORIDADE_OPCOES.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.valor ? o.rotulo : "Não definida"}
                </option>
              ))}
            </select>
          </div>
        )}
        {(tem("data_inicio") || tem("prazo")) && (
          <div className="grid grid-cols-2 gap-3">
            {tem("data_inicio") && (
              <div>
                <label htmlFor="data_inicio" className={rotulo}>
                  De quando {opcional}
                </label>
                <input id="data_inicio" name="data_inicio" type="date" min="2000-01-01" max="2100-12-31" className={campo} />
              </div>
            )}
            {tem("prazo") && (
              <div>
                <label htmlFor="prazo" className={rotulo}>
                  Até quando {opcional}
                </label>
                <input id="prazo" name="prazo" type="date" min="2000-01-01" max="2100-12-31" className={campo} />
              </div>
            )}
          </div>
        )}
      </div>

      {estado.erro && (
        <p role="alert" className="border-l-4 border-laranja-texto bg-creme-claro p-3 text-sm font-bold">
          {estado.erro}
        </p>
      )}

      <div className="flex gap-3">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Criando…" : "Criar tarefa"}
        </Botao>
        <Botao href={fecharHref} variante="secundario">
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
