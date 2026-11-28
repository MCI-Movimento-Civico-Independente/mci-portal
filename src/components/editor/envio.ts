import type { Editor } from "@tiptap/core";
import { controladorDe } from "@/components/paginas/controlador";
import { ARQUIVO, IMAGEM, PAGINA } from "@/lib/limites";
import { ARQUIVO_GRANDE, extensaoDe, IMAGEM_GRANDE, RECUSA_TIPO, type Especie, type Uso } from "@/lib/paginas/arquivos-tipos";
import { createClient } from "@/lib/supabase/client";
import { inserirBlocos } from "./inserir";
import { reduzirImagem } from "./upload";

export const MAXIMO_DE_IMAGENS = `Cada página aceita no máximo ${PAGINA.maxImagens} imagens.`;

// Tenta primeiro no tamanho cheio, baixando a qualidade; depois diminui a imagem.
const COMPRESSAO = {
  entradaMax: IMAGEM.entradaMaxBytes,
  maiorLado: IMAGEM.maiorLadoPx,
  saidaMax: IMAGEM.maxBytes,
  tentativas: [
    { escala: 1, qualidade: 0.85 },
    { escala: 1, qualidade: 0.72 },
    { escala: 1, qualidade: 0.6 },
    { escala: 0.75, qualidade: 0.7 },
    { escala: 0.6, qualidade: 0.6 },
  ],
};

/** Arquivos aguardando envio (para "tentar de novo"), por id de upload. */
const originais = new Map<string, { arquivo: File; especie: Especie }>();
export const podeRepetir = (uploadId: string) => originais.has(uploadId);

async function pedir<T>(url: string, corpo: unknown): Promise<T> {
  const resposta = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) });
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(dados.erro ?? "Não deu para enviar o arquivo.");
  return dados as T;
}

/** Pede a vaga (o servidor confere a cota), envia direto ao Storage e pede a conferência. */
export async function enviarAnexo(abaId: string, uploadId: string) {
  const original = originais.get(uploadId);
  if (!original) return;
  const pagina = controladorDe(abaId);
  pagina.atualizarNo(uploadId, { estado: "enviando", erro: null });
  try {
    const { arquivo, especie } = original;
    let corpo: Blob = arquivo;
    if (especie === "imagem") {
      corpo = await reduzirImagem(arquivo, COMPRESSAO).catch((e: Error) => {
        throw e.message.includes("pequena o bastante") ? new Error(IMAGEM_GRANDE) : e;
      });
    }
    const vaga = await pedir<{ id: string; caminho: string; token: string; tipo: string }>(`/api/paginas/${abaId}/arquivos`, {
      nome: especie === "imagem" ? `${arquivo.name.replace(/\.[^.]*$/, "") || "imagem"}.webp` : arquivo.name,
      tamanho: corpo.size,
      especie,
    });
    const { error } = await createClient()
      .storage.from("paginas")
      // O tipo vai no próprio arquivo: alguns sistemas não reconhecem os do Office.
      .uploadToSignedUrl(vaga.caminho, vaga.token, new Blob([corpo], { type: vaga.tipo }), { contentType: vaga.tipo });
    if (error) throw new Error("Não deu para enviar o arquivo. Tente de novo.");
    const ok = await pedir<{ tamanho: number; uso: Uso }>(`/api/paginas/${abaId}/arquivos/${vaga.id}`, {});
    originais.delete(uploadId);
    pagina.definirUso(ok.uso);
    pagina.atualizarNo(uploadId, { arquivoId: vaga.id, tamanho: ok.tamanho, uploadId: null, estado: null, erro: null });
  } catch (e) {
    pagina.atualizarNo(uploadId, { estado: "erro", erro: e instanceof Error ? e.message : "Não deu para enviar o arquivo." });
  }
}

/** Insere os blocos na hora e envia em segundo plano. Devolve a mensagem do que foi recusado. */
export function inserirAnexos(editor: Editor, abaId: string, arquivos: File[]): string | null {
  let imagens = 0;
  editor.state.doc.descendants((n) => {
    if (n.type.name === "imagem") imagens++;
  });
  let recusa: string | null = null;
  const novos: { uploadId: string; tipo: Especie; attrs: Record<string, unknown> }[] = [];

  for (const arquivo of arquivos) {
    const imagem = arquivo.type.startsWith("image/");
    if (imagem) {
      if (imagens >= PAGINA.maxImagens) {
        recusa = MAXIMO_DE_IMAGENS;
        continue;
      }
      imagens++;
    } else if (!extensaoDe(arquivo.name)) {
      recusa = RECUSA_TIPO;
      continue;
    } else if (arquivo.size > ARQUIVO.maxBytes) {
      recusa = ARQUIVO_GRANDE;
      continue;
    }
    const uploadId = crypto.randomUUID();
    const tipo: Especie = imagem ? "imagem" : "arquivo";
    originais.set(uploadId, { arquivo, especie: tipo });
    novos.push({
      uploadId,
      tipo,
      attrs: {
        uploadId,
        estado: "enviando",
        nome: arquivo.name.slice(-200),
        tamanho: arquivo.size,
        ...(imagem ? { previa: URL.createObjectURL(arquivo) } : {}),
      },
    });
  }

  if (novos.length) {
    inserirBlocos(editor, novos.map((n) => ({ type: n.tipo, attrs: n.attrs })));
    novos.forEach((n) => void enviarAnexo(abaId, n.uploadId));
  }
  return recusa;
}
