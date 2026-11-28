// Baixa a imagem de uma prévia (com as mesmas proteções das páginas) e a reduz.
import sharp from "sharp";
import { PREVIA } from "@/lib/limites";
import { buscarExterno } from "./buscar";

// SVG fica de fora: pode citar outros arquivos.
const FORMATOS = new Set(["jpeg", "png", "webp", "gif", "heif", "tiff"]);

export async function baixarImagemReduzida(endereco: string): Promise<Buffer> {
  const r = await buscarExterno(endereco, {
    maxBytes: PREVIA.imagemMaxBytes,
    inteiro: true,
    aceita: (tipo) => /^image\/(?!svg)/i.test(tipo),
    accept: "image/webp,image/png,image/jpeg,image/*",
  });
  // O limite de pontos barra imagens pequenas que "explodem" ao abrir.
  const imagem = sharp(r.corpo, { limitInputPixels: 40_000_000 });
  const { format } = await imagem.metadata();
  if (!format || !FORMATOS.has(format)) throw new Error("Formato de imagem não aceito.");
  return imagem.rotate().resize({ width: PREVIA.larguraMaxPx, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
}
