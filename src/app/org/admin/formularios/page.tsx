import { TbChevronLeft } from "react-icons/tb";
import Link from "next/link";
import { FormNovoFormulario } from "@/components/admin/FormFormulario";
import { Card } from "@/components/ui/Card";
import { listarFormularios } from "@/lib/formularios";
import { comitesBasicos } from "@/lib/organizacao";

export const metadata = { title: "Formulários · Administração · MCi" };

export default async function FormulariosAdminPage() {
  const [formularios, comites] = await Promise.all([listarFormularios(), comitesBasicos()]);
  const nomeComite = new Map(comites.map((c) => [c.slug, c.nome]));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Link
        href="/org/admin"
        className="inline-flex min-h-11 w-fit items-center gap-1 rotulo text-marca-texto hover:underline"
      >
        <TbChevronLeft size={14} aria-hidden="true" />
        Administração
      </Link>
      <h1 className="font-titulo font-black uppercase tracking-tight text-3xl md:text-4xl">Formulários</h1>

      <Card>
        <ul>
          {formularios.map((f) => (
            <li key={f.id} className="border-b border-borda last:border-b-0">
              <Link href={`/org/admin/formularios/${f.id}`} className="flex flex-col gap-1 py-3 hover:bg-sutil">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold">{f.nome}</span>
                  {f.padrao && (
                    <span className="bg-ouro px-2 py-0.5 text-[10px] font-bold uppercase">Padrão geral</span>
                  )}
                </span>
                <span className="text-[11px] uppercase text-suave">
                  {f.campos.length} {f.campos.length === 1 ? "campo opcional" : "campos opcionais"}
                  {!f.padrao &&
                    ` · ${
                      f.comites.length
                        ? `padrão de: ${f.comites.map((s) => nomeComite.get(s) ?? s).join(", ")}`
                        : "não é padrão de nenhum comitê"
                    }`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <FormNovoFormulario />
      </Card>
    </div>
  );
}
