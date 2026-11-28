// Lê título, descrição e imagem (Open Graph) do HTML de uma página.

const ENTIDADES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export const decodificar = (texto: string) =>
  texto.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (tudo, e: string) => {
    if (e[0] !== "#") return ENTIDADES[e.toLowerCase()] ?? tudo;
    const codigo = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return codigo > 0 && codigo <= 0x10ffff ? String.fromCodePoint(codigo) : tudo;
  });

export const enxugar = (texto: unknown, max: number): string | null => {
  if (typeof texto !== "string") return null;
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo ? (limpo.length > max ? `${limpo.slice(0, max - 1)}…` : limpo) : null;
};

export function lerMetadados(html: string) {
  const metas = new Map<string, string>();
  for (const [tag] of html.matchAll(/<meta\b[^>]{0,4000}>/gi)) {
    const attrs: Record<string, string> = {};
    for (const m of tag.matchAll(/([a-zA-Z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
      attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
    }
    const chave = (attrs.property ?? attrs.name)?.toLowerCase();
    if (chave && attrs.content && !metas.has(chave)) metas.set(chave, decodificar(attrs.content));
  }
  const tagTitulo = /<title\b[^>]{0,500}>([^<]{0,1000})<\/title>/i.exec(html)?.[1];
  const primeiro = (...chaves: string[]) => chaves.map((c) => metas.get(c)).find(Boolean);
  return {
    titulo: enxugar(primeiro("og:title", "twitter:title") ?? (tagTitulo ? decodificar(tagTitulo) : undefined), 200),
    descricao: enxugar(primeiro("og:description", "twitter:description", "description"), 300),
    imagem: primeiro("og:image:secure_url", "og:image", "twitter:image") ?? null,
  };
}
