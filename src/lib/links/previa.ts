import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { buscarExterno } from "./buscar";
import { enxugar, lerMetadados } from "./html";
import { urlPermitida } from "./rede";
import type { Previa } from "./tipos";

const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;

/** YouTube e Vimeo têm um endereço próprio (oEmbed) para os dados do vídeo. */
function enderecoOEmbed(url: URL): string | null {
  const host = url.hostname.replace(/^(www|m)\./, "");
  const alvo = encodeURIComponent(url.toString());
  if (host === "youtube.com" || host === "youtu.be") return `https://www.youtube.com/oembed?format=json&url=${alvo}`;
  if (host === "vimeo.com" || host === "player.vimeo.com") return `https://vimeo.com/api/oembed.json?url=${alvo}`;
  return null;
}

/** A imagem é carregada pelo navegador de quem vê: só https e endereço público. */
function imagemSegura(imagem: unknown, base: URL): string | null {
  if (typeof imagem !== "string") return null;
  try {
    const url = urlPermitida(new URL(imagem, base).toString());
    return url?.protocol === "https:" ? url.toString() : null;
  } catch {
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

async function consultar(url: URL): Promise<Omit<Previa, "url">> {
  const oembed = enderecoOEmbed(url);
  if (oembed) {
    const r = await buscarExterno(oembed);
    const d = JSON.parse(r.corpo.toString("utf-8")) as Record<string, unknown>;
    return {
      titulo: enxugar(d.title, 200),
      descricao: enxugar(d.description, 300) ?? enxugar(d.author_name, 100),
      imagem_url: imagemSegura(d.thumbnail_url, url),
    };
  }
  const r = await buscarExterno(url.toString());
  if (!/html/i.test(r.tipo)) return { titulo: null, descricao: null, imagem_url: null };
  const m = lerMetadados(texto(r.corpo, r.tipo));
  return { titulo: m.titulo, descricao: m.descricao, imagem_url: imagemSegura(m.imagem, r.url) };
}

/** Prévia com cache de 7 dias. Se a página não responder, devolve a antiga ou uma prévia vazia. */
export async function obterPrevia(url: URL): Promise<Previa> {
  const chave = url.toString();
  const db = createAdminClient();
  const { data: guardada, error } = await db
    .from("link_previews")
    .select("url, titulo, descricao, imagem_url, buscado_em")
    .eq("url", chave)
    .maybeSingle();
  if (error) console.error("Falha ao ler o cache de prévias:", error);
  const antiga: Previa | null = guardada
    ? { url: chave, titulo: guardada.titulo, descricao: guardada.descricao, imagem_url: guardada.imagem_url }
    : null;
  if (antiga && Date.now() - Date.parse(guardada!.buscado_em as string) < VALIDADE_MS) return antiga;

  try {
    const nova = { url: chave, ...(await consultar(url)) };
    const r = await db.from("link_previews").upsert({ ...nova, buscado_em: new Date().toISOString() });
    if (r.error) console.error("Falha ao guardar a prévia:", r.error);
    return nova;
  } catch (e) {
    console.info(`Sem prévia para ${url.hostname}:`, e instanceof Error ? e.message : e);
    return antiga ?? { url: chave, titulo: null, descricao: null, imagem_url: null };
  }
}
