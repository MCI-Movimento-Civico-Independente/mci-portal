import type { Pessoa as PessoaDb } from "@/lib/tarefas";

/** Avatar com a inicial + nome. Sem pessoa: "Sem responsável". */
export function Pessoa({ pessoa, mostrarNome = true }: { pessoa: PessoaDb | null; mostrarNome?: boolean }) {
  if (!pessoa) {
    return <span className="font-mono text-[11px] uppercase text-cinza">Sem responsável</span>;
  }
  const nome = pessoa.nome?.trim() || "Membro";
  return (
    <span className="inline-flex items-center gap-2" title={nome}>
      <span
        aria-hidden="true"
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-laranja text-[11px] font-extrabold text-preto"
      >
        {nome[0]?.toUpperCase()}
      </span>
      {mostrarNome ? <span className="truncate text-sm font-medium">{nome.split(/\s+/)[0]}</span> : <span className="sr-only">{nome}</span>}
    </span>
  );
}
