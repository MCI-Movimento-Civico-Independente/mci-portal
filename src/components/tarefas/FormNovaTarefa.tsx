"use client";

import { useActionState, useState } from "react";
import { criarTarefaAction, type EstadoForm } from "@/app/org/tarefas/acoes";
import { CampoDescricao } from "@/components/editor/CampoDescricao";
import { Botao } from "@/components/ui/Botao";
import { chaveFormulario, type CampoPersonalizado } from "@/lib/campos-personalizados-tipos";
import { resolverFormulario, type FormularioView } from "@/lib/formularios-tipos";
import type { GrupoBasico } from "@/lib/grupos-tipos";
import type { ComiteBasico, ProjetoBasico } from "@/lib/organizacao";
import type { Pessoa } from "@/lib/tarefas";
import { PRIORIDADE_OPCOES } from "@/lib/tarefas-campos";
import { campo, rotulo } from "./estilos";

export function FormNovaTarefa({
  membros,
  comites,
  projetos,
  formularios,
  grupos,
  camposPersonalizados,
  euId,
  fecharHref,
  retorno = "/org/tarefas",
  projetoInicial = "",
  grupoInicial = "",
}: {
  membros: Pessoa[];
  comites: ComiteBasico[];
  projetos: ProjetoBasico[];
  formularios: FormularioView[];
  grupos: GrupoBasico[];
  camposPersonalizados: CampoPersonalizado[];
  euId: string;
  fecharHref: string;
  /** Página para onde voltar depois de criar (a tarefa abre por cima dela). */
  retorno?: string;
  /** Quando a janela abre a partir de um grupo do projeto, vêm preenchidos. */
  projetoInicial?: string;
  grupoInicial?: string;
}) {
  const [estado, acao, pendente] = useActionState<EstadoForm, FormData>(criarTarefaAction, {});
  const [comite, setComite] = useState("");
  const [projeto, setProjeto] = useState(projetoInicial);
  // Formulário escolhido à mão; sem escolha, vale o padrão do comitê (ou o Padrão geral).
  const [formManual, setFormManual] = useState<string | null>(null);
  const formularioId = formManual ?? resolverFormulario(formularios, comite)?.id ?? "";
  const incluidos = new Set(formularios.find((f) => f.id === formularioId)?.campos ?? []);
  const tem = (chave: string) => incluidos.has(chave);
  const personalizados = camposPersonalizados.filter((c) => tem(chaveFormulario(c.id)));
  const opcional = <span className="font-normal text-suave">(opcional)</span>;

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
      <input type="hidden" name="retorno" value={retorno} />
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
        <p className={rotulo}>Descrição</p>
        <CampoDescricao placeholder="O que precisa ser feito e qual o resultado esperado" />
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
          <p className="mt-1 text-xs text-suave">Define quais campos aparecem. Segue o padrão do comitê.</p>
        </div>

        {tem("projeto_id") && (
          <div>
            <label htmlFor="projeto_id" className={rotulo}>
              Projeto {opcional}
            </label>
            <select id="projeto_id" name="projeto_id" value={projeto} onChange={(e) => setProjeto(e.target.value)} className={campo}>
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
            <p className="mt-1 text-xs text-suave">Escolher um projeto define o comitê dele.</p>
          </div>
        )}
        {tem("projeto_id") && grupos.some((g) => g.projeto_id === projeto) && (
          <div>
            <label htmlFor="grupo_id" className={rotulo}>
              Grupo {opcional}
            </label>
            <select key={projeto} id="grupo_id" name="grupo_id" defaultValue={projeto === projetoInicial ? grupoInicial : ""} className={campo}>
              <option value="">Primeiro grupo</option>
              {grupos
                .filter((g) => g.projeto_id === projeto)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nome}
                  </option>
                ))}
            </select>
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

        {personalizados.map((c) => {
          const nome = `p_${c.id}`;
          const sufixo = c.obrigatorio || c.tipo === "caixa" ? null : opcional;
          return (
            <div key={c.id} className={c.tipo === "texto_longo" ? "sm:col-span-2" : ""}>
              {c.tipo === "caixa" ? (
                <label className="mt-6 flex min-h-11 items-center gap-3 text-sm font-bold">
                  <input type="checkbox" name={nome} value="true" className="size-5 accent-marca" />
                  {c.rotulo}
                </label>
              ) : (
                <>
                  <label htmlFor={nome} className={rotulo}>
                    {c.rotulo} {sufixo}
                  </label>
                  {c.tipo === "texto_longo" ? (
                    <textarea id={nome} name={nome} rows={3} maxLength={2000} required={c.obrigatorio} className={`${campo} py-2`} />
                  ) : c.tipo === "lista" ? (
                    <select id={nome} name={nome} defaultValue="" required={c.obrigatorio} className={campo}>
                      <option value="">{c.obrigatorio ? "Escolha" : "—"}</option>
                      {c.opcoes.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={nome}
                      name={nome}
                      type={c.tipo === "numero" ? "number" : c.tipo === "data" ? "date" : "text"}
                      step={c.tipo === "numero" ? "any" : undefined}
                      min={c.tipo === "data" ? "2000-01-01" : undefined}
                      max={c.tipo === "data" ? "2100-12-31" : undefined}
                      maxLength={c.tipo === "texto" ? 200 : undefined}
                      required={c.obrigatorio}
                      className={campo}
                    />
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {estado.erro && (
        <p role="alert" className="rounded-lg border border-marca/30 bg-marca-suave p-3 text-sm font-medium text-marca-texto">
          {estado.erro}
        </p>
      )}

      <div className="flex gap-3">
        <Botao type="submit" disabled={pendente}>
          {pendente ? "Criando…" : "Criar tarefa"}
        </Botao>
        <Botao href={fecharHref} variante="secundario" local>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}
