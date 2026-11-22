import Link from "next/link";
import { TbArrowUpRight } from "react-icons/tb";
import type { ComiteResumo } from "@/lib/organizacao";

// Cartaz: blocos chapados que alternam preto, laranja e amarelo (manual: "alterne fundos
// grafite, amarelo e vermelho"), com um disco grande saindo pela borda.
const TONS = [
  { bloco: "bg-bloco text-sobre-bloco", disco: "bg-marca", seta: "text-ouro" },
  { bloco: "bg-marca text-sobre-marca", disco: "bg-bloco", seta: "text-sobre-marca" },
  { bloco: "bg-ouro text-sobre-ouro", disco: "bg-bloco", seta: "text-sobre-ouro" },
] as const;

type Props = {
  comite: ComiteResumo;
  /** Posição na lista: define a cor do bloco. */
  indice: number;
  /** Destino do clique. Por padrão, a página do comitê. */
  href?: string;
  /** Realça o cartão (quando ele é o filtro ativo). */
  selecionado?: boolean;
};

/** Cartão de comitê: número grande de projetos ativos e tarefas em aberto. */
export function CartaoComite({ comite, indice, href, selecionado = false }: Props) {
  const { slug, nome, projetosAtivos, tarefasAbertas } = comite;
  const tom = TONS[indice % TONS.length];
  return (
    <Link
      href={href ?? `/org/projetos?comite=${slug}`}
      aria-current={selecionado ? "true" : undefined}
      className={`group relative flex min-h-[176px] flex-col justify-between gap-6 overflow-hidden border-2 p-5 hover:-translate-y-0.5 ${tom.bloco} ${
        selecionado ? "border-texto outline outline-2 outline-offset-2 outline-texto" : "border-transparent hover:border-texto"
      }`}
    >
      <span aria-hidden="true" className={`absolute -right-12 -top-12 size-32 rounded-full ${tom.disco}`} />
      <TbArrowUpRight size={20} aria-hidden="true" className={`absolute right-3.5 top-3.5 ${tom.seta}`} />

      <span className="relative flex items-end gap-3">
        <span className="font-impacto text-7xl leading-[0.85]">{projetosAtivos}</span>
        <span className="rotulo pb-1 leading-tight">
          {projetosAtivos === 1 ? "projeto" : "projetos"}
          <br />
          {projetosAtivos === 1 ? "ativo" : "ativos"}
        </span>
      </span>

      <span className="relative flex flex-col gap-1.5">
        <span className="font-titulo text-lg font-black uppercase leading-tight tracking-tight">{nome}</span>
        <span className="rotulo opacity-80">
          {tarefasAbertas} {tarefasAbertas === 1 ? "tarefa em aberto" : "tarefas em aberto"}
        </span>
      </span>
    </Link>
  );
}
