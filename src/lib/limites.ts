// Limites do portal para páginas e anexos. Um lugar só: o servidor e o navegador leem daqui.

const KB = 1024;
const MB = 1024 * KB;

export const TABELA = { maxColunas: 10, maxLinhas: 100 } as const;

export const PAGINA = {
  /** Tamanho máximo do conteúdo (JSON) de uma página. */
  conteudoMaxBytes: 500 * KB,
  tituloMaxCaracteres: 120,
  maxImagens: 20,
  /** Por quantos dias uma página excluída aparece na lixeira (depois fica só no banco). */
  diasNaLixeira: 30,
} as const;

export const IMAGEM = {
  /** Depois de comprimida. */
  maxBytes: 1.5 * MB,
  tipo: "image/webp",
  /** Para navegadores que não geram WebP (iPhone e Safari). */
  tipoReserva: "image/jpeg",
  qualidadeReserva: 0.82,
  maiorLadoPx: 1920,
  /** Maior arquivo que o navegador aceita abrir para comprimir. */
  entradaMaxBytes: 25 * MB,
} as const;

export const ARQUIVO = {
  maxBytes: 5 * MB,
  /** Extensão → tipo MIME aceito. */
  tipos: {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  },
} as const;

/** Prefixos de tipo MIME recusados (vídeo e áudio entram só como link). */
export const MIDIA_BLOQUEADA = ["video/", "audio/"] as const;

export const COTA_PROJETO = {
  maxBytes: 100 * MB,
  /** Fração da cota a partir da qual o portal avisa. */
  avisoEm: 0.8,
} as const;

/** Imagem dos cartões de link: o servidor baixa, reduz e guarda uma cópia (fora da cota). */
export const PREVIA = {
  imagemMaxBytes: 2 * MB,
  larguraMaxPx: 600,
} as const;
