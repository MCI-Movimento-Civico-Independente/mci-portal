import type { Editor } from "@tiptap/core";
import type { TipoAnexo } from "@/lib/editor/documento";
import { createClient } from "@/lib/supabase/client";

export const LIMITE_BYTES = 8 * 1024 * 1024;
const MAIOR_LADO = 1920;

type Compressao = {
  /** Maior arquivo aceito antes de comprimir. */
  entradaMax: number;
  maiorLado: number;
  /** Tamanho máximo do resultado; as tentativas vão em ordem até caber. */
  saidaMax?: number;
  tentativas: { escala: number; qualidade: number }[];
  /** Se o navegador não gerar WebP, gera JPEG com esta qualidade. Sem isso, recusa. */
  qualidadeJpeg?: number;
};

const DE_TAREFA: Compressao = { entradaMax: LIMITE_BYTES, maiorLado: MAIOR_LADO, tentativas: [{ escala: 1, qualidade: 0.85 }] };

const gerar = (canvas: HTMLCanvasElement, tipo: string, qualidade: number) =>
  new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, qualidade));

/** Reduz no navegador e converte para WebP (ou JPEG, se pedido e necessário). Padrão (tarefas): 1920px, qualidade 0,85, até 8 MB de entrada. */
export async function reduzirImagem(arquivo: Blob, opcoes: Compressao = DE_TAREFA): Promise<Blob> {
  const { entradaMax, maiorLado, saidaMax = Infinity, tentativas, qualidadeJpeg } = opcoes;
  if (!arquivo.type.startsWith("image/")) throw new Error("Esse arquivo não é uma imagem.");
  if (arquivo.size > entradaMax) throw new Error(`A imagem passa de ${Math.round(entradaMax / 1024 / 1024)} MB.`);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(arquivo);
  } catch {
    throw new Error("Não deu para ler essa imagem.");
  }
  try {
    const base = Math.min(1, maiorLado / Math.max(bitmap.width, bitmap.height));
    for (const { escala, qualidade } of tentativas) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * base * escala));
      canvas.height = Math.max(1, Math.round(bitmap.height * base * escala));
      const pincel = canvas.getContext("2d")!;
      pincel.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      let saida = await gerar(canvas, "image/webp", qualidade);
      // Quem não sabe gerar WebP devolve outro tipo (PNG): confere o que saiu de verdade.
      if (saida && saida.type !== "image/webp") {
        if (!qualidadeJpeg) throw new Error("Este navegador não converte imagens para WebP. Use o Chrome, o Edge ou o Firefox.");
        // JPEG não tem transparência: o fundo vira branco em vez de preto.
        pincel.globalCompositeOperation = "destination-over";
        pincel.fillStyle = "#ffffff";
        pincel.fillRect(0, 0, canvas.width, canvas.height);
        saida = await gerar(canvas, "image/jpeg", qualidadeJpeg);
        if (saida && saida.type !== "image/jpeg") saida = null;
      }
      if (!saida) throw new Error("Não deu para preparar a imagem.");
      if (saida.size <= saidaMax) return saida;
    }
    throw new Error("Não deu para deixar a imagem pequena o bastante.");
  } finally {
    bitmap.close();
  }
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
