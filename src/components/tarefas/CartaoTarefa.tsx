import Link from "next/link";
import { SeletorStatus } from "./ControlesTarefa";
import { Progresso, textoPrazo } from "./LinhaTarefa";
import { Pessoa } from "./Pessoa";
import type { TarefaDb } from "@/lib/tarefas";

/** Cartão do quadro (estilo Jira/Monday). */
export function CartaoTarefa({ t, hoje }: { t: TarefaDb; hoje: string }) {
  const { texto, atrasada } = textoPrazo(t, hoje);
  return (
    <li className="flex flex-col gap-3 border border-linha bg-creme-claro p-3 hover:border-preto">
      <div>
        {t.paiTitulo && (
          <p className="mb-1 truncate font-mono text-[11px] uppercase text-cinza">↳ {t.paiTitulo}</p>
        )}
        <Link href={`/org/tarefas/${t.id}`} className="block text-[15px] font-bold leading-snug hover:text-laranja-texto hover:underline">
          {t.titulo}
        </Link>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Pessoa pessoa={t.responsavel} />
        <span className="flex items-center gap-3">
          <Progresso feitas={t.subfeitas} total={t.subtotal} />
          <span
            className={`font-mono text-[11px] uppercase ${atrasada ? "font-bold text-laranja-texto" : "text-cinza"}`}
          >
            {texto}
          </span>
        </span>
      </div>
      <SeletorStatus id={t.id} status={t.status} />
    </li>
  );
}
