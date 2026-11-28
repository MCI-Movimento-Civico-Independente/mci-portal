import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { buscarExterno } from "./buscar";
import { enxugar, lerMetadados } from "./html";
import { baixarImagemReduzida } from "./imagem";
import { urlPermitida } from "./rede";
import type { Previa } from "./tipos";

const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;
export const BUCKET_PREVIAS = "previas";
export const NOME_DE_PREVIA = /^[0-9a-f]{64}\.webp$/;

/** YouTube e Vimeo têm um endereço próprio (oEmbed) para os dados do vídeo. */
function enderecoOEmbed(url: URL): string | null {
  const host = url.hostname.replace(/^(www|m)\./, "");
  const alvo = encodeURIComponent(url.toString());
  if (host === "youtube.com" || host === "youtu.be") return `https://www.youtube.com/oembed?format=json&url=${alvo}`;
  if (host === "vimeo.com" || host === "player.vimeo.com") return `https://vimeo.com/api/oembed.json?url=${alvo}`;
  return null;
}

/** Endereço completo da imagem citada pela página, se for um que o servidor pode visitar. */
function enderecoDaImagem(imagem: unknown, base: URL): string | null {
  if (typeof imagem !== "string") return null;
  try {
    return urlPermitida(new URL(imagem, base).toString())?.toString() ?? null;
  } catch {
    return null;
  }
}

/** Guarda a cópia reduzida no bucket das prévias. Null se não der (o cartão fica sem imagem). */
async function guardarImagem(pagina: string, imagem: string | null): Promise<string | null> {
  if (!imagem) return null;
  try {
    const corpo = await baixarImagemReduzida(imagem);
    // Um arquivo por página: buscar de novo substitui a cópia.
    const nome = `${createHash("sha256").update(pagina).digest("hex")}.webp`;
    const { error } = await createAdminClient().storage.from(BUCKET_PREVIAS).upload(nome, corpo, { contentType: "image/webp", upsert: true });
    if (error) throw error;
    return nome;
  } catch (e) {
    console.info("Prévia sem imagem:", e instanceof Error ? e.message : e);
    return null;
  }
}

function texto(corpo: Buffer, tipo: string): string {
  const charset = /charset=["']?([\w-]+)/i.exec(tipo)?.[1] ?? /<meta[^>]{0,200}charset=["']?([\w-]+)/i.exec(corpo.toString("latin1", 0, 4000))?.[1];
  try {
    return new TextDecoder(charset ?? "utf-8").decode(corpo);
  } catch {
    return corpo.toString("utf-8");
  }
}

type Consulta = { titulo: string | null; descricao: string | null; imagem: string | null };

async function consultar(url: URL): Promise<Consulta> {
  const oembed = enderecoOEmbed(url);
  if (oembed) {
    const r = await buscarExterno(oembed);
    const d = JSON.parse(r.corpo.toString("utf-8")) as Record<string, unknown>;
    return {
      titulo: enxugar(d.title, 200),
      descricao: enxugar(d.description, 300) ?? enxugar(d.author_name, 100),
      imagem: enderecoDaImagem(d.thumbnail_url, url),
    };
  }
  const r = await buscarExterno(url.toString());
  if (!/html/i.test(r.tipo)) return { titulo: null, descricao: null, imagem: null };
  const m = lerMetadados(texto(r.corpo, r.tipo));
  return { titulo: m.titulo, descricao: m.descricao, imagem: enderecoDaImagem(m.imagem, r.url) };
}

type Linha = { titulo: string | null; descricao: string | null; imagem_url: string | null; buscado_em: string };

/** O que vai para a tela: a imagem sempre vem da cópia guardada, nunca do site de origem. */
function paraTela(url: string, l: Linha): Previa {
  const guardada = l.imagem_url && NOME_DE_PREVIA.test(l.imagem_url) ? l.imagem_url : null;
  return {
    url,
    titulo: l.titulo,
    descricao: l.descricao,
    imagem_url: guardada ? `/api/link-preview/imagem/${guardada}?v=${Date.parse(l.buscado_em)}` : null,
  };
}

/** Prévia com cache de 7 dias. Se a página não responder, devolve a antiga ou uma prévia vazia. */
export async function obterPrevia(url: URL): Promise<Previa> {
  const chave = url.toString();
  const db = createAdminClient();
  const { data, error } = await db
    .from("link_previews")
    .select("titulo, descricao, imagem_url, buscado_em")
    .eq("url", chave)
    .maybeSingle();
  if (error) console.error("Falha ao ler o cache de prévias:", error);
  const antiga = data as Linha | null;
  // Registros de antes guardavam o endereço do site de origem: são buscados de novo.
  const atual =
    antiga &&
    Date.now() - Date.parse(antiga.buscado_em) < VALIDADE_MS &&
    (!antiga.imagem_url || NOME_DE_PREVIA.test(antiga.imagem_url));
  if (antiga && atual) return paraTela(chave, antiga);

  try {
    const c = await consultar(url);
    const nova: Linha = {
      titulo: c.titulo,
      descricao: c.descricao,
      imagem_url: await guardarImagem(chave, c.imagem),
      buscado_em: new Date().toISOString(),
    };
    const r = await db.from("link_previews").upsert({ url: chave, ...nova });
    if (r.error) console.error("Falha ao guardar a prévia:", r.error);
    return paraTela(chave, nova);
  } catch (e) {
    console.info(`Sem prévia para ${url.hostname}:`, e instanceof Error ? e.message : e);
    return antiga ? paraTela(chave, antiga) : { url: chave, titulo: null, descricao: null, imagem_url: null };
  }
}
