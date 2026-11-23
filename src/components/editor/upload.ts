import type { Editor } from "@tiptap/core";
import type { TipoAnexo } from "@/lib/editor/documento";
import { createClient } from "@/lib/supabase/client";

export const LIMITE_BYTES = 8 * 1024 * 1024;
const MAIOR_LADO = 1920;

/** Reduz no navegador: no máximo 1920px no lado maior, WebP com qualidade 0,85. Recusa acima de 8 MB. */
export async function reduzirImagem(arquivo: Blob): Promise<Blob> {
  if (!arquivo.type.startsWith("image/")) throw new Error("Esse arquivo não é uma imagem.");
  if (arquivo.size > LIMITE_BYTES) throw new Error("A imagem passa de 8 MB.");
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(arquivo);
  } catch {
    throw new Error("Não deu para ler essa imagem.");
  }
  const escala = Math.min(1, MAIOR_LADO / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * escala));
  canvas.height = Math.max(1, Math.round(bitmap.height * escala));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const webp = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/webp", 0.85));
  if (!webp) throw new Error("Não deu para preparar a imagem.");
  return webp;
}

/** Pede a URL assinada ao servidor e envia o arquivo direto ao Storage. Devolve o caminho. */
export async function enviarImagem(blob: Blob, tipo: TipoAnexo, itemId: string): Promise<string> {
  const resposta = await fetch("/api/anexos/assinar", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ tipo, itemId }),
  });
  const dados = (await resposta.json().catch(() => ({}))) as { path?: string; token?: string; erro?: string };
  if (!resposta.ok || !dados.path || !dados.token) throw new Error(dados.erro ?? "Não deu para enviar a imagem.");
  const { error } = await createClient().storage.from("anexos").uploadToSignedUrl(dados.path, dados.token, blob, { contentType: "image/webp" });
  if (error) throw new Error("Não deu para enviar a imagem. Tente de novo.");
  return dados.path;
}

// Arquivos aguardando envio (para "tentar de novo"), por id de upload.
const pendentes = new Map<string, File | Blob>();

function atualizarImagem(editor: Editor, uploadId: string, atributos: Record<string, unknown>) {
  editor.state.doc.descendants((no, pos) => {
    if (no.type.name === "image" && no.attrs.uploadId === uploadId) {
      editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...no.attrs, ...atributos }));
      return false;
    }
    return true;
  });
}

async function processar(editor: Editor, uploadId: string, tipo: TipoAnexo, tarefaId: string) {
  const arquivo = pendentes.get(uploadId);
  if (!arquivo) return;
  atualizarImagem(editor, uploadId, { estado: "carregando", erroMsg: null });
  try {
    const caminho = await enviarImagem(await reduzirImagem(arquivo), tipo, tarefaId);
    pendentes.delete(uploadId);
    atualizarImagem(editor, uploadId, { path: caminho, estado: null, erroMsg: null, uploadId: null });
  } catch (e) {
    atualizarImagem(editor, uploadId, { estado: "erro", erroMsg: e instanceof Error ? e.message : "Não deu para enviar a imagem." });
  }
}

/** Insere as imagens na hora (com o estado "carregando") e envia em segundo plano. */
export function inserirImagens(editor: Editor, arquivos: File[], tipo: TipoAnexo, tarefaId: string) {
  for (const arquivo of arquivos) {
    const uploadId = crypto.randomUUID();
    pendentes.set(uploadId, arquivo);
    editor
      .chain()
      .focus()
      .insertContent({ type: "image", attrs: { src: URL.createObjectURL(arquivo), alt: arquivo.name.slice(0, 200), estado: "carregando", uploadId } })
      .run();
    void processar(editor, uploadId, tipo, tarefaId);
  }
}

export function repetirEnvio(editor: Editor, uploadId: string, tipo: TipoAnexo, tarefaId: string) {
  void processar(editor, uploadId, tipo, tarefaId);
}

/** Há imagem ainda subindo ou com erro? Enquanto houver, o conteúdo não deve ser salvo. */
export function imagensPendentes(editor: Editor): "carregando" | "erro" | null {
  let achado: "carregando" | "erro" | null = null;
  editor.state.doc.descendants((no) => {
    if (no.type.name === "image" && no.attrs.estado) {
      if (no.attrs.estado === "erro") achado = "erro";
      else if (achado !== "erro") achado = "carregando";
    }
    return true;
  });
  return achado;
}
