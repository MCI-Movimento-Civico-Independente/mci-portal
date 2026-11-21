// Sem "server-only": o proxy também importa este arquivo.

export type Papel = "membro" | "organizacao" | "admin";

export function podeAcessarOrg(papel: unknown): boolean {
  return papel === "organizacao" || papel === "admin";
}

/** Aceita só caminhos internos. Barra duplicada ou contrabarra viram redirect externo. */
export function nextSeguro(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  if (!valor.startsWith("/") || valor.startsWith("//") || valor.startsWith("/\\")) {
    return null;
  }
  return valor;
}

/** Para onde ir depois do login, respeitando ?next quando o papel permite. */
export function destinoPosLogin(papel: unknown, next: unknown): string {
  const seguro = nextSeguro(next);
  const caminho = seguro?.split(/[?#]/)[0] ?? "";
  if (seguro && (caminho === "/org" || caminho.startsWith("/org/")) && !podeAcessarOrg(papel)) {
    return "/comunidade";
  }
  if (seguro && seguro !== "/login") return seguro;
  return podeAcessarOrg(papel) ? "/org" : "/comunidade";
}
