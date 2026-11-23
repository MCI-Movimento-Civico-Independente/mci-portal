import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { caminhoDoAnexo, type Documento, type No, type TipoAnexo } from "./documento";

export const BUCKET = "anexos";
const VALIDADE_LEITURA = 60 * 60; // 1 hora

/** URL assinada para o navegador enviar a imagem direto ao Storage (não passa pela Vercel). */
export async function criarUrlDeUpload(tipo: TipoAnexo, tarefaId: string) {
  const caminho = `${tipo}/${tarefaId}/${crypto.randomUUID()}.webp`;
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(caminho);
  if (error || !data) throw error ?? new Error("Sem URL de upload.");
  return { path: caminho, token: data.token };
}

/** Troca os caminhos do Storage por URLs assinadas válidas por 1 hora. O caminho continua no `path`. */
export async function assinarDocumento(doc: Documento): Promise<Documento> {
  const caminhos = new Set<string>();
  const coletar = (no: No) => {
    if (no.type === "image" && typeof no.attrs?.path === "string" && caminhoDoAnexo(no.attrs.path)) caminhos.add(no.attrs.path);
    (no.content ?? []).forEach(coletar);
  };
  doc.content.forEach(coletar);
  if (caminhos.size === 0) return doc;

  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUrls([...caminhos], VALIDADE_LEITURA);
  if (error) throw error;
  const urls = new Map((data ?? []).map((d) => [d.path ?? "", d.signedUrl]));

  const aplicar = (no: No): No => {
    if (no.type === "image" && typeof no.attrs?.path === "string") {
      return { ...no, attrs: { ...no.attrs, src: urls.get(no.attrs.path) ?? null } };
    }
    return no.content ? { ...no, content: no.content.map(aplicar) } : no;
  };
  return { ...doc, content: doc.content.map(aplicar) };
}
