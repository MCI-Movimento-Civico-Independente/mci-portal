import Link from "next/link";
import { TbArrowUpRight } from "react-icons/tb";
import { Botao } from "@/components/ui/Botao";
import { Card } from "@/components/ui/Card";
import { EtiquetaStatus } from "@/components/ui/EtiquetaStatus";
import type { Sessao } from "@/lib/auth/sessao";
import { formatarPrazo } from "@/lib/datas";
import { proximos, saudacao } from "@/lib/mock";
import type { ComiteResumo } from "@/lib/organizacao";
import type { TarefaDb } from "@/lib/tarefas";
import { CartaoComite } from "./CartaoComite";

const rotulo = "text-[11px] font-semibold uppercase tracking-widest";

type Props = {
  primeiroNome: string;
  nivel: Sessao["nivel"];
  /** Tarefas em aberto do usuário (a lista mostra as 4 primeiras). */
  abertas: TarefaDb[];
  comites: ComiteResumo[];
  hoje: string;
};

/** Conteúdo da página Início (recebe os dados prontos, sem consultar nada). */
export function InicioView({ primeiroNome, nivel, abertas, comites, hoje }: Props) {
  const tarefas = abertas.slice(0, 4);

  return (
    <div className="flex flex-col gap-5 md:gap-7">
      {/* Saudação */}
      <section className="relative overflow-hidden rounded-3xl border border-borda bg-superficie p-6 shadow-elevado md:p-10">
        <div aria-hidden="true" className="absolute -right-20 -top-28 size-80 rounded-full bg-marca/25 blur-3xl md:size-[28rem]" />
        <div
          aria-hidden="true"
          className="absolute -bottom-10 right-10 hidden size-52 opacity-60 md:block"
          style={{
            backgroundImage: "radial-gradient(var(--ouro) 1.6px, transparent 1.7px)",
            backgroundSize: "11px 11px",
            maskImage: "radial-gradient(circle at 60% 60%, #000 25%, transparent 70%)",
          }}
        />
        <div className="relative">
          <p className={`${rotulo} text-marca-texto`}>
            <span className="md:hidden">{saudacao.dataCurta}</span>
            <span className="hidden md:inline">{saudacao.data}</span>
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-[1.05] md:text-6xl">
            {saudacao.periodo},{" "}
            <span className="italic text-marca-texto">{primeiroNome}.</span>
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-suave md:text-lg">
            Você tem {abertas.length} {abertas.length === 1 ? "tarefa em aberto" : "tarefas em aberto"} e{" "}
            {saudacao.reunioes} reunião do comitê de {saudacao.comiteReuniao}.
          </p>
          <div className="mt-6">
            <Botao href="/org/tarefas">
              Ver minhas tarefas
              <TbArrowUpRight size={17} aria-hidden="true" />
            </Botao>
          </div>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-[1fr_385px] md:gap-7">
        {/* Nível */}
        <section
          aria-labelledby="titulo-nivel"
          className="relative self-start overflow-hidden rounded-2xl border border-ouro/40 bg-gradient-to-br from-ouro-suave to-superficie p-5 shadow-suave md:col-start-2 md:row-start-1 md:p-6"
        >
          <p className={`${rotulo} text-ouro-texto`}>Seu nível</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <h2 id="titulo-nivel" className="font-serif text-4xl leading-none">
              {nivel.nome}
            </h2>
            <span className="font-serif text-6xl leading-none text-ouro-texto">{nivel.numero}</span>
          </div>
          <div
            role="progressbar"
            aria-label={nivel.proximo ? `Progresso para ${nivel.proximo}` : "Nível máximo"}
            aria-valuenow={Math.round(nivel.progresso * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-5 h-2.5 overflow-hidden rounded-full bg-ouro/25"
          >
            <div className="h-full rounded-full bg-ouro" style={{ width: `${nivel.progresso * 100}%` }} />
          </div>
          <p className="mt-3 text-sm font-medium">
            {nivel.proximo
              ? `Faltam ${nivel.xpFaltando} de experiência para ${nivel.proximo}`
              : "Você chegou ao nível máximo"}
          </p>
        </section>

        {/* Minhas tarefas */}
        <Card className="md:col-start-1 md:row-span-2 md:row-start-1">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">Minhas tarefas</h2>
            <Link
              href="/org/tarefas"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-marca-texto hover:underline"
            >
              Ver todas
            </Link>
          </div>
          {tarefas.length === 0 ? (
            <p className="mt-3 border-t border-borda pt-4 text-[15px] text-suave">
              Nenhuma tarefa em aberto.{" "}
              <Link href="/org/tarefas?nova=1" className="font-semibold text-marca-texto underline">
                Criar tarefa
              </Link>
            </p>
          ) : (
            <ul className="mt-2">
              {tarefas.map((t) => {
                const atrasada = !!t.prazo && t.prazo < hoje;
                return (
                  <li key={t.id} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 hover:bg-sutil">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/org/tarefas?tarefa=${t.id}`}
                        className="block text-[15px] font-semibold leading-snug hover:text-marca-texto hover:underline"
                      >
                        {t.titulo}
                      </Link>
                      <p className={`mt-1 text-xs font-medium ${atrasada ? "text-marca-texto" : "text-suave"}`}>
                        {formatarPrazo(t.prazo, hoje)}
                      </p>
                    </div>
                    <EtiquetaStatus status={t.status} />
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Próximos: só no desktop */}
        <Card className="hidden md:col-start-2 md:row-start-2 md:block">
          <h2 className="text-xl font-semibold">Próximos</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {proximos.map((e) => (
              <li key={e.id} className="flex items-center gap-4">
                <span
                  className={`flex size-14 shrink-0 flex-col items-center justify-center rounded-xl leading-none ${
                    e.destaque ? "bg-marca text-sobre-marca" : "bg-sutil text-texto"
                  }`}
                >
                  <span className="text-[10px] font-semibold uppercase">{e.diaSemana}</span>
                  <span className="mt-0.5 font-serif text-2xl">{e.dia}</span>
                </span>
                <div>
                  <p className="text-sm font-semibold">{e.titulo}</p>
                  <p className="text-xs text-suave">{e.detalhe}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Comitês */}
      <section aria-labelledby="titulo-comites">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="titulo-comites" className="font-serif text-2xl md:text-3xl">
            Comitês
          </h2>
          <Link
            href="/org/comites"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-marca-texto hover:underline"
          >
            Todos os comitês
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {comites.map((c) => (
            <CartaoComite key={c.slug} comite={c} />
          ))}
        </div>
      </section>
    </div>
  );
}
