// Regras dos anexos das páginas. Sem "server-only": o navegador avisa cedo; o servidor decide.
import { ARQUIVO, COTA_PROJETO, IMAGEM } from "@/lib/limites";

export type Especie = "imagem" | "arquivo";
export type Extensao = keyof typeof ARQUIVO.tipos;
export type Uso = { usado: number; maximo: number };

export const RECUSA_TIPO = "Vídeos e áudios não podem ser enviados. Cole o link que ele vira um cartão com prévia.";
export const SEM_ESPACO = "O espaço do projeto acabou. Remova arquivos antigos para enviar novos.";
export const ARQUIVO_GRANDE = `O arquivo passa de ${ARQUIVO.maxBytes / 1024 / 1024} MB.`;
export const IMAGEM_GRANDE = "Não deu para deixar a imagem abaixo de 1,5 MB.";

export function extensaoDe(nome: string): Extensao | null {
  const ext = nome.slice(nome.lastIndexOf(".") + 1).toLowerCase();
  return nome.includes(".") && Object.hasOwn(ARQUIVO.tipos, ext) ? (ext as Extensao) : null;
}

export const nomeLimpo = (nome: string) =>
  // Sem barras nem caracteres de controle; a extensão fica no fim.
  nome.replace(/[\u0000-\u001f\u007f/\\]/g, " ").trim().slice(-200) || "arquivo";

export const emAviso = (uso: Uso) => uso.usado >= uso.maximo * COTA_PROJETO.avisoEm;

/** "820 KB", "1,4 MB". */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
}

const comeca = (b: Uint8Array, texto: string, em = 0) => [...texto].every((c, i) => b[em + i] === c.charCodeAt(0));
const contem = (b: Uint8Array, texto: string) => {
  const alvo = new TextEncoder().encode(texto);
  externo: for (let i = 0; i <= b.length - alvo.length; i++) {
    for (let j = 0; j < alvo.length; j++) if (b[i + j] !== alvo[j]) continue externo;
    return true;
  }
  return false;
};

const PASTA_OFFICE: Record<string, string> = { docx: "word/", xlsx: "xl/", pptx: "ppt/" };

/** O começo (e, nos arquivos do Office, o miolo) do arquivo bate com o que a extensão promete? */
export function conteudoConfere(tipo: string, bytes: Uint8Array): boolean {
  if (tipo === IMAGEM.tipo) return comeca(bytes, "RIFF") && comeca(bytes, "WEBP", 8);
  if (tipo === ARQUIVO.tipos.pdf) return comeca(bytes, "%PDF-");
  const ext = (Object.keys(ARQUIVO.tipos) as Extensao[]).find((e) => ARQUIVO.tipos[e] === tipo);
  if (!ext || !PASTA_OFFICE[ext]) return false;
  // DOCX, XLSX e PPTX são ZIP com o índice [Content_Types].xml e a pasta do programa.
  return comeca(bytes, "PK\u0003\u0004") && contem(bytes, "[Content_Types].xml") && contem(bytes, PASTA_OFFICE[ext]);
}
