import { TbArrowDown, TbArrowUp, TbChevronLeft, TbTrash } from "react-icons/tb";
import Link from "next/link";
import { excluirComiteAction, moverComiteAction } from "@/app/org/admin/acoes";
import { FormNovoComite, FormRenomearComite } from "@/components/admin/FormComite";
import { BotaoAcao } from "@/components/ui/BotaoAcao";
import { Card } from "@/components/ui/Card";
import { usoDosComites } from "@/lib/admin";
import { comitesBasicos } from "@/lib/organizacao";

export const metadata = { title: "Comitês · Administração · MCi" };

export default async function ComitesAdminPage() {
  const [comites, uso] = await Promise.all([comitesBasicos(), usoDosComites()]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link
        href="/org/admin"
        className="inline-flex min-h-11 w-fit items-center gap-1 rotulo text-marca-texto hover:underline"
      >
        <TbChevronLeft size={14} aria-hidden="true" />
        Administração
      </Link>
      <h1 className="font-titulo font-black uppercase tracking-tight text-3xl md:text-4xl">Comitês</h1>

      <Card>
        <ul>
          {comites.map((c, i) => {
            const u = uso.get(c.slug) ?? { projetos: 0, tarefas: 0 };
            const emUso = u.projetos > 0 || u.tarefas > 0;
            return (
              <li key={c.slug} className="flex flex-wrap items-start gap-x-2 gap-y-2 border-b border-borda py-3 last:border-b-0">
                <div className="flex">
                  <BotaoAcao acao={moverComiteAction.bind(null, c.slug, "cima")} desabilitado={i === 0} rotulo={`Subir ${c.nome}`}>
                    <TbArrowUp size={16} aria-hidden="true" />
                  </BotaoAcao>
                  <BotaoAcao
                    acao={moverComiteAction.bind(null, c.slug, "baixo")}
                    desabilitado={i === comites.length - 1}
                    rotulo={`Descer ${c.nome}`}
                  >
                    <TbArrowDown size={16} aria-hidden="true" />
                  </BotaoAcao>
                </div>
                <FormRenomearComite slug={c.slug} nome={c.nome} />
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase text-suave">
                    {u.projetos} {u.projetos === 1 ? "projeto" : "projetos"} · {u.tarefas} {u.tarefas === 1 ? "tarefa" : "tarefas"}
                  </span>
                  <BotaoAcao
                    acao={excluirComiteAction.bind(null, c.slug)}
                    aviso={`Excluir "${c.nome}"? Não dá para desfazer.`}
                    perigo
                    desabilitado={emUso}
                    titulo={emUso ? "Só dá para excluir comitês sem projetos nem tarefas" : undefined}
                    rotulo={`Excluir ${c.nome}`}
                  >
                    <TbTrash size={16} aria-hidden="true" />
                  </BotaoAcao>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <FormNovoComite />
      </Card>
    </div>
  );
}
