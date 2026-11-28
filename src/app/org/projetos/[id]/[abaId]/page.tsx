import { notFound, redirect } from "next/navigation";
import { PaginaProjeto } from "@/components/paginas/PaginaProjeto";
import { getSessao } from "@/lib/auth/sessao";
import { abaPorId } from "@/lib/paginas/paginas";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PaginaDaAba({ params }: { params: Promise<{ id: string; abaId: string }> }) {
  const { id, abaId } = await params;
  const sessao = await getSessao();
  if (!sessao) redirect(`/login?next=/org/projetos/${encodeURIComponent(id)}/${encodeURIComponent(abaId)}`);
  if (!sessao.podeOrg) redirect("/comunidade");
  if (!UUID.test(id) || !UUID.test(abaId)) notFound();
  const aba = await abaPorId(abaId);
  if (!aba || aba.projeto_id !== id) notFound();

  return <PaginaProjeto key={aba.id} abaId={aba.id} tituloInicial={aba.titulo} />;
}
