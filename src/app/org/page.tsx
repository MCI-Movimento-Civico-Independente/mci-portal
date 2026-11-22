import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Botao } from "@/components/ui/Botao";
import { Card } from "@/components/ui/Card";
import { EtiquetaStatus } from "@/components/ui/EtiquetaStatus";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth/sessao";
import { formatarPrazo, hojeSP } from "@/lib/datas";
import { tarefasAbertasDe } from "@/lib/tarefas";
import { comitesComResumo } from "@/lib/organizacao";
import { proximos, saudacao } from "@/lib/mock";

const rotuloMono = "font-mono text-[11px] uppercase tracking-widest";

export default async function InicioPage() {
  const sessao = await getSessao();
  if (!sessao) redirect("/login?next=/org");
  const { nivel } = sessao;
  const abertas = await tarefasAbertasDe(sessao.conta.id);
  const tarefas = abertas.slice(0, 4);
  const comites = await comitesComResumo();
  const hoje = hojeSP();

  return (
    <div className="flex flex-col gap-5 md:gap-7">
      {/* Saudação */}
      <section className="relative overflow-hidden bg-preto px-6 py-8 text-creme md:px-10 md:py-10">
        <div
          aria-hidden="true"
          className="absolute -right-16 -top-24 size-56 rounded-full bg-laranja md:-right-24 md:-top-28 md:size-[420px]"
        />
        <div
          aria-hidden="true"
          className="absolute -top-4 right-[88px] hidden size-48 opacity-90 md:block"
          style={{
            backgroundImage:
              "radial-gradient(var(--amarelo) 1.6px, transparent 1.7px)",
            backgroundSize: "10px 10px",
            maskImage: "radial-gradient(circle at 70% 40%, #000 30%, transparent 70%)",
          }}
        />
        <div className="relative">
          <p className={`${rotuloMono} text-amarelo`}>
            <span className="md:hidden">{saudacao.dataCurta}</span>
            <span className="hidden md:inline">{saudacao.data}</span>
          </p>
          <h1 className="mt-3 text-[34px] font-black uppercase leading-none tracking-tighter md:text-5xl">
            {saudacao.periodo},{" "}
            <span className="font-serif font-normal normal-case italic">
              {sessao.primeiroNome}.
            </span>
          </h1>
          <p className="mt-3 max-w-md text-base leading-snug text-creme/90 md:text-lg">
            Você tem {abertas.length} {abertas.length === 1 ? "tarefa em aberto" : "tarefas em aberto"} e{" "}
            {saudacao.reunioes} reunião do comitê de {saudacao.comiteReuniao}.
          </p>
          <div className="mt-5 hidden md:block">
            <Botao href="/org/tarefas" variante="secundario" className="border-creme-claro bg-creme-claro">
              Ver minhas tarefas
              <ArrowUpRight size={16} aria-hidden="true" />
            </Botao>
          </div>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-[1fr_385px] md:gap-7">
        {/* Nível: no celular vira uma faixa compacta antes das tarefas */}
        <section
          aria-labelledby="titulo-nivel"
          className="self-start bg-amarelo p-5 md:col-start-2 md:row-start-1 md:p-6"
        >
          <p className={`${rotuloMono} hidden md:block`}>Seu nível</p>
          <div className="flex items-center gap-4 md:mt-3 md:items-baseline md:justify-between">
            <span className="text-5xl font-black leading-none md:order-2">
              {nivel.numero}
            </span>
            <div className="flex-1 md:order-1 md:flex-none">
              <div className="flex items-baseline justify-between">
                <h2
                  id="titulo-nivel"
                  className="text-base font-black uppercase tracking-tight md:text-4xl"
                >
                  {nivel.nome}
                </h2>
                {nivel.proximo && (
                  <span className={`${rotuloMono} md:hidden`}>
                    Faltam {nivel.xpFaltando}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div
            role="progressbar"
            aria-label={`Progresso para ${nivel.proximo}`}
            aria-valuenow={Math.round(nivel.progresso * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-3 h-2 bg-preto/30"
          >
            <div
              className="h-full bg-preto"
              style={{ width: `${nivel.progresso * 100}%` }}
            />
          </div>
          <p className="mt-3 hidden text-sm font-medium md:block">
            {nivel.proximo
              ? `Faltam ${nivel.xpFaltando} de experiência para ${nivel.proximo}`
              : "Você chegou ao nível máximo"}
          </p>
        </section>

        {/* Minhas tarefas */}
        <Card className="md:col-start-1 md:row-span-2 md:row-start-1">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">
              Minhas tarefas
            </h2>
            <Link
              href="/org/tarefas"
              className={`${rotuloMono} inline-flex min-h-11 items-center text-laranja-texto underline`}
            >
              <span className="md:hidden">Todas</span>
              <span className="hidden md:inline">Ver todas</span>
            </Link>
          </div>
          {tarefas.length === 0 && (
            <p className="mt-3 border-t border-linha pt-4 text-[15px]">
              Nenhuma tarefa em aberto.{" "}
              <Link href="/org/tarefas?nova=1" className="font-bold text-laranja-texto underline">
                Criar tarefa
              </Link>
            </p>
          )}
          <ul className="mt-1 border-t border-linha">
            {tarefas.map((t) => (
              <li
                key={t.id}
                className="flex min-h-11 items-start gap-4 border-b border-linha py-3.5 last:border-b-0 hover:bg-creme/60"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 border-2 border-preto"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/org/tarefas?tarefa=${t.id}`}
                    className="text-[15px] font-bold leading-snug hover:text-laranja-texto hover:underline"
                  >
                    {t.titulo}
                  </Link>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-cinza">
                    <span>{formatarPrazo(t.prazo, hoje)}</span>
                    {t.status === "em_andamento" && (
                      <span className="md:hidden">
                        <EtiquetaStatus status={t.status} />
                      </span>
                    )}
                  </p>
                </div>
                <span className="hidden md:block">
                  <EtiquetaStatus status={t.status} />
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Próximos: só no desktop */}
        <Card className="hidden md:col-start-2 md:row-start-2 md:block">
          <h2 className="text-xl font-extrabold tracking-tight">Próximos</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {proximos.map((e) => (
              <li key={e.id} className="flex items-center gap-4">
                <span
                  className={`flex size-[52px] shrink-0 flex-col items-center justify-center leading-none ${
                    e.destaque ? "bg-laranja text-preto" : "bg-preto text-creme-claro"
                  }`}
                >
                  <span className="font-mono text-[9px] uppercase">{e.diaSemana}</span>
                  <span className="mt-0.5 text-[22px] font-black">{e.dia}</span>
                </span>
                <div>
                  <p className="text-sm font-bold">{e.titulo}</p>
                  <p className="text-xs text-cinza">{e.detalhe}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Comitês */}
      <section aria-labelledby="titulo-comites">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="titulo-comites" className="text-xl font-black tracking-tight md:text-2xl">
            Comitês
          </h2>
          <Link
            href="/org/comites"
            className={`${rotuloMono} ml-auto inline-flex min-h-11 items-center text-laranja-texto underline`}
          >
            Todos os comitês
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          {comites.map((c, i) => (
            <Link
              key={c.slug}
              href={`/org/comites/${c.slug}`}
              className={`relative flex min-h-[112px] flex-col justify-between p-4 hover:brightness-110 md:min-h-[150px] md:p-5 ${
                i % 2 === 0 ? "bg-preto text-creme" : "bg-laranja text-preto"
              }`}
            >
              <span className="pr-6 text-lg font-black uppercase leading-tight tracking-tight md:text-xl">
                {c.nome}
              </span>
              <ArrowUpRight size={16} aria-hidden="true" className="absolute right-4 top-4" />
              <span className="font-mono text-[11px] tracking-wide">
                {c.projetosAtivos} {c.projetosAtivos === 1 ? "projeto ativo" : "projetos ativos"} · {c.tarefasAbertas}{" "}
                {c.tarefasAbertas === 1 ? "tarefa" : "tarefas"}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
