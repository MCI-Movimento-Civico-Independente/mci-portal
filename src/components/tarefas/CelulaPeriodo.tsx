"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { DayPicker, type DateRange } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import { TbCalendar, TbChevronLeft, TbChevronRight } from "react-icons/tb";
import { atualizarPeriodoAction } from "@/app/org/tarefas/acoes";

const paraData = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
};
const paraIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const curta = (iso: string, comAno: boolean) => {
  const [a, m, d] = iso.split("-");
  return comAno ? `${d}/${m}/${a.slice(2)}` : `${d}/${m}`;
};
const completa = (iso?: string) => (iso ? iso.split("-").reverse().join("/") : "");

const LARGURA = 296;
const ALTURA = 400;

/**
 * Período da tarefa (início → entrega) escolhido num calendário só, como na Monday:
 * o primeiro clique marca o início, o segundo a entrega, e o período é salvo.
 */
export function CelulaPeriodo({
  id,
  inicio,
  fim,
  hoje,
  alerta = false,
}: {
  id: string;
  inicio: string;
  fim: string;
  hoje: string;
  alerta?: boolean;
}) {
  const [atual, setOtimista] = useOptimistic({ inicio, fim });
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [intervalo, setIntervalo] = useState<DateRange | undefined>();
  const botao = useRef<HTMLButtonElement>(null);
  const painel = useRef<HTMLDivElement>(null);
  const [posicao, setPosicao] = useState({ top: 0, left: 0 });

  function abrir() {
    const r = botao.current!.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left, window.innerWidth - LARGURA - 8));
    const cabeAbaixo = r.bottom + ALTURA + 8 <= window.innerHeight;
    setPosicao({ left, top: cabeAbaixo ? r.bottom + 4 : Math.max(8, r.top - ALTURA - 4) });
    setIntervalo({ from: atual.inicio ? paraData(atual.inicio) : undefined, to: atual.fim ? paraData(atual.fim) : undefined });
    setErro(null);
    painel.current?.showPopover();
  }

  function salvar(novoInicio: string, novoFim: string) {
    painel.current?.hidePopover();
    if (novoInicio === atual.inicio && novoFim === atual.fim) return;
    setErro(null);
    iniciar(async () => {
      setOtimista({ inicio: novoInicio, fim: novoFim });
      const r = await atualizarPeriodoAction(id, novoInicio, novoFim);
      if (r.erro) setErro(r.erro);
    });
  }

  // Sem período fechado: clique marca o início; o segundo clique marca a entrega.
  function aoClicar(dia: Date) {
    const { from, to } = intervalo ?? {};
    if (!from || to) {
      setIntervalo({ from: dia, to: undefined });
      return;
    }
    const [a, b] = dia < from ? [dia, from] : [from, dia];
    setIntervalo({ from: a, to: b });
    salvar(paraIso(a), paraIso(b));
  }

  const anoAtual = hoje.slice(0, 4);
  const comAno = [atual.inicio, atual.fim].some((d) => d && d.slice(0, 4) !== anoAtual);
  const rotulo =
    !atual.inicio && !atual.fim
      ? null
      : `${atual.inicio ? curta(atual.inicio, comAno) : "…"} → ${atual.fim ? curta(atual.fim, comAno) : "…"}`;

  return (
    <div className="min-w-0">
      <button
        ref={botao}
        type="button"
        aria-label={rotulo ? `Período: ${rotulo}. Alterar` : "Definir período"}
        aria-haspopup="dialog"
        disabled={pendente}
        onClick={abrir}
        className={`flex min-h-11 w-full items-center gap-1.5 border border-transparent bg-transparent px-1.5 text-xs hover:border-borda hover:bg-sutil disabled:opacity-60 md:min-h-8 md:text-[11px] ${
          alerta ? "font-bold text-marca-texto" : rotulo ? "font-medium" : "text-suave"
        }`}
      >
        <TbCalendar size={14} aria-hidden="true" className="shrink-0" />
        <span className="truncate">{rotulo ?? "Definir datas"}</span>
      </button>
      {erro && (
        <p role="alert" className="mt-0.5 text-xs font-bold text-marca-texto">
          {erro}
        </p>
      )}

      {/* popover nativo: fica na camada de cima, acima de rolagens e da janela da tarefa */}
      <div
        ref={painel}
        popover="auto"
        role="dialog"
        aria-label="Definir período"
        style={{ top: posicao.top, left: posicao.left, width: LARGURA }}
        className="fixed m-0 border-2 border-inverso bg-superficie p-3 text-texto"
      >
        <div className="mb-2 grid grid-cols-2 gap-2 text-center">
          <p className={`border-2 px-2 py-1.5 text-sm ${!intervalo?.to && intervalo?.from ? "border-texto" : "border-borda-forte"}`}>
            <span className="rotulo block text-[10px] text-suave">Início</span>
            {intervalo?.from ? completa(paraIso(intervalo.from)) : "—"}
          </p>
          <p className={`border-2 px-2 py-1.5 text-sm ${!intervalo?.from ? "border-borda-forte" : intervalo.to ? "border-borda-forte" : "border-dashed border-borda-forte"}`}>
            <span className="rotulo block text-[10px] text-suave">Entrega</span>
            {intervalo?.to ? completa(paraIso(intervalo.to)) : "—"}
          </p>
        </div>

        <DayPicker
          mode="range"
          locale={ptBR}
          weekStartsOn={1}
          showOutsideDays
          fixedWeeks
          startMonth={new Date(2000, 0)}
          endMonth={new Date(2100, 11)}
          defaultMonth={intervalo?.from ?? (atual.inicio ? paraData(atual.inicio) : paraData(hoje))}
          selected={intervalo}
          onDayClick={aoClicar}
          components={{
            Chevron: ({ orientation }) =>
              orientation === "left" ? <TbChevronLeft size={16} aria-hidden="true" /> : <TbChevronRight size={16} aria-hidden="true" />,
          }}
          classNames={{
            root: "w-full",
            months: "relative",
            month_caption: "flex h-9 items-center justify-center",
            caption_label: "font-titulo text-sm font-extrabold uppercase tracking-tight",
            nav: "absolute inset-x-0 top-0 flex h-9 items-center justify-between",
            button_previous: "flex size-9 items-center justify-center hover:bg-sutil",
            button_next: "flex size-9 items-center justify-center hover:bg-sutil",
            month_grid: "w-full border-collapse",
            weekday: "rotulo h-8 text-[10px] font-normal text-suave",
            day: "p-0 text-center text-sm",
            day_button: "flex size-10 w-full items-center justify-center hover:bg-sutil",
            today: "font-extrabold text-marca-texto underline underline-offset-4",
            outside: "text-suave opacity-50",
            selected: "bg-ouro-suave",
            range_start: "[&>button]:bg-marca [&>button]:text-sobre-marca [&>button]:hover:bg-marca",
            range_end: "[&>button]:bg-marca [&>button]:text-sobre-marca [&>button]:hover:bg-marca",
            range_middle: "bg-ouro-suave",
          }}
        />

        <div className="mt-2 flex items-center justify-between border-t border-borda pt-2">
          <button
            type="button"
            onClick={() => salvar("", "")}
            className="rotulo inline-flex min-h-11 items-center px-2 font-bold text-marca-texto hover:underline md:min-h-8"
          >
            Limpar datas
          </button>
          <button
            type="button"
            disabled={!intervalo?.from}
            onClick={() => salvar(intervalo?.from ? paraIso(intervalo.from) : "", intervalo?.to ? paraIso(intervalo.to) : "")}
            className="rotulo inline-flex min-h-11 items-center bg-inverso px-3 font-bold text-sobre-inverso hover:opacity-90 disabled:opacity-40 md:min-h-8"
          >
            {intervalo?.to ? "Aplicar" : "Só início"}
          </button>
        </div>
      </div>
    </div>
  );
}
