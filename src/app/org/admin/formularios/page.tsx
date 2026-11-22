import { ChevronLeft } from "lucide-react";
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
        className="inline-flex min-h-11 w-fit items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-laranja-texto hover:underline"
      >
        <ChevronLeft size={14} aria-hidden="true" />
        Administração
      </Link>
      <h1 className="text-3xl font-black tracking-tighter md:text-4xl">Formulários</h1>

      <Card>
        <ul>
          {formularios.map((f) => (
            <li key={f.id} className="border-b border-linha last:border-b-0">
              <Link href={`/org/admin/formularios/${f.id}`} className="flex flex-col gap-1 py-3 hover:bg-creme/60">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[15px] font-bold">{f.nome}</span>
                  {f.padrao && (
                    <span className="bg-amarelo px-2 py-0.5 font-mono text-[10px] font-bold uppercase">Padrão geral</span>
                  )}
                </span>
                <span className="font-mono text-[11px] uppercase text-cinza">
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
