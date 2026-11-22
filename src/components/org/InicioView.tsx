import Link from "next/link";
import { TbArrowUpRight } from "react-icons/tb";
import { Card } from "@/components/ui/Card";
import { EtiquetaStatus } from "@/components/ui/EtiquetaStatus";
import type { Sessao } from "@/lib/auth/sessao";
import { formatarPrazo } from "@/lib/datas";
import { proximos, saudacao } from "@/lib/mock";
import type { ComiteResumo } from "@/lib/organizacao";
import type { TarefaDb } from "@/lib/tarefas";
import { CartaoComite } from "./CartaoComite";

type Props = {
  primeiroNome: string;
  nivel: Sessao["nivel"];
  /** Tarefas em aberto do usuário (a lista mostra as 4 primeiras). */
  abertas: TarefaDb[];
  comites: ComiteResumo[];
  hoje: string;
};

const titulo2 = "font-titulo text-xl font-extrabold uppercase tracking-tight md:text-2xl";

/** Conteúdo da página Início (recebe os dados prontos, sem consultar nada). */
export function InicioView({ primeiroNome, nivel, abertas, comites, hoje }: Props) {
  const tarefas = abertas.slice(0, 4);

  return (
    <div className="flex flex-col gap-5 md:gap-7">
      {/* Boas-vindas: bloco preto, disco laranja recortado e meio-tom amarelo (manual). */}
      <section className="relative overflow-hidden bg-bloco px-6 py-8 text-sobre-bloco md:px-10 md:py-10">
        <div aria-hidden="true" className="absolute -right-16 -top-24 size-56 rounded-full bg-marca md:-right-24 md:-top-28 md:size-[420px]" />
        <div aria-hidden="true" className="meio-tom absolute bottom-0 right-6 hidden size-44 text-ouro md:block" />
        <div className="relative">
          <p className="rotulo-barras text-ouro">
            <span className="md:hidden">{saudacao.dataCurta}</span>
            <span className="hidden md:inline">{saudacao.data}</span>
          </p>
          <h1 className="mt-3 font-titulo text-[34px] font-black uppercase leading-none tracking-tight md:text-5xl">
            {saudacao.periodo},{" "}
            <span className="font-serif text-[1.15em] font-normal normal-case italic">{primeiroNome}.</span>
          </h1>
          <p className="mt-3 max-w-md text-base leading-snug opacity-90 md:text-lg">
            Você tem {abertas.length} {abertas.length === 1 ? "tarefa em aberto" : "tarefas em aberto"} e{" "}
            {saudacao.reunioes} reunião do comitê de {saudacao.comiteReuniao}.
          </p>
          <Link
            href="/org/tarefas"
            className="mt-5 inline-flex min-h-11 items-center gap-2 border-2 border-sobre-bloco bg-sobre-bloco px-5 text-sm font-bold text-bloco hover:bg-transparent hover:text-sobre-bloco"
          >
            Ver minhas tarefas
            <TbArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-[1fr_385px] md:gap-7">
        {/* Nível: cartão amarelo chapado, como no manual. */}
        <section
          aria-labelledby="titulo-nivel"
          className="self-start border-2 border-ouro bg-ouro p-5 text-sobre-ouro md:col-start-2 md:row-start-1 md:p-6"
        >
          <p className="rotulo-barras">Seu nível</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <h2 id="titulo-nivel" className="font-titulo text-4xl font-black uppercase leading-none tracking-tight">
              {nivel.nome}
            </h2>
            <span className="font-impacto text-7xl leading-[0.8]">{nivel.numero}</span>
          </div>
          <div
            role="progressbar"
            aria-label={nivel.proximo ? `Progresso para ${nivel.proximo}` : "Nível máximo"}
            aria-valuenow={Math.round(nivel.progresso * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-5 h-2.5 bg-sobre-ouro/25"
          >
            <div className="h-full bg-sobre-ouro" style={{ width: `${nivel.progresso * 100}%` }} />
          </div>
          <p className="rotulo mt-3 font-bold">
            {nivel.proximo ? `Faltam ${nivel.xpFaltando} para ${nivel.proximo}` : "Você chegou ao nível máximo"}
          </p>
        </section>

        {/* Minhas tarefas */}
        <Card className="md:col-start-1 md:row-span-2 md:row-start-1">
          <div className="flex items-baseline justify-between">
            <h2 className={titulo2}>Minhas tarefas</h2>
            <Link href="/org/tarefas" className="rotulo inline-flex min-h-11 items-center text-marca-texto underline hover:text-texto">
              Todas
            </Link>
          </div>
          {tarefas.length === 0 ? (
            <p className="mt-3 border-t-2 border-borda pt-4 text-[15px] text-suave">
              Nenhuma tarefa em aberto agora.{" "}
              <Link href="/org/tarefas?nova=1" className="font-bold text-marca-texto underline">
                Criar tarefa
              </Link>
            </p>
          ) : (
            <ul className="mt-1 border-t-2 border-borda">
              {tarefas.map((t) => {
                const atrasada = !!t.prazo && t.prazo < hoje;
                return (
                  <li key={t.id} className="flex items-center gap-3 border-b border-borda py-3.5 last:border-b-0 hover:bg-sutil md:-mx-2 md:px-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/org/tarefas?tarefa=${t.id}`}
                        className="block text-[15px] font-semibold leading-snug hover:text-marca-texto hover:underline"
                      >
                        {t.titulo}
                      </Link>
                      <p className={`rotulo mt-1 ${atrasada ? "font-bold text-marca-texto" : "text-suave"}`}>
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
          <h2 className={titulo2}>Próximos</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {proximos.map((e) => (
              <li key={e.id} className="flex items-center gap-4">
                <span
                  className={`flex size-14 shrink-0 flex-col items-center justify-center leading-none ${
                    e.destaque ? "bg-marca text-sobre-marca" : "bg-bloco text-sobre-bloco"
                  }`}
                >
                  <span className="rotulo text-[9px]">{e.diaSemana}</span>
                  <span className="mt-0.5 font-impacto text-2xl">{e.dia}</span>
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
          <h2 id="titulo-comites" className="font-titulo text-2xl font-black uppercase tracking-tight">
            Comitês
          </h2>
          <Link href="/org/comites" className="rotulo inline-flex min-h-11 items-center text-marca-texto underline hover:text-texto">
            Todos os comitês
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {comites.map((c, i) => (
            <CartaoComite key={c.slug} comite={c} indice={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
