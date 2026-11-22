import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSessao } from "@/lib/auth/sessao";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Só admin entra na central. O banco é a fonte da verdade (getSessao lê o papel de lá).
  const sessao = await getSessao();
  if (!sessao) redirect("/login?next=/org/admin");
  if (!sessao.souAdmin) redirect("/org");
  return children;
}
