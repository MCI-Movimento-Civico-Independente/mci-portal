// Que endereços o servidor pode visitar para montar a prévia de um link (proteção contra SSRF).
import { BlockList, isIP } from "node:net";

const internos4 = new BlockList();
for (const [ip, prefixo] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  internos4.addSubnet(ip, prefixo, "ipv4");
}

// Em IPv6 vale o contrário: só o espaço público (2000::/3), menos as faixas especiais dentro dele.
// Assim ficam de fora ::1, fc00::/7, fe80::/10 e os endereços IPv4 embutidos.
const publicos6 = new BlockList();
publicos6.addSubnet("2000::", 3, "ipv6");
const especiais6 = new BlockList();
for (const [ip, prefixo] of [
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
] as const) {
  especiais6.addSubnet(ip, prefixo, "ipv6");
}

export function ipPublico(ip: string): boolean {
  const familia = isIP(ip);
  if (familia === 4) return !internos4.check(ip, "ipv4");
  if (familia === 6) return publicos6.check(ip, "ipv6") && !especiais6.check(ip, "ipv6");
  return false;
}

const NOMES_INTERNOS = /(^|\.)(localhost|local|internal|lan|home\.arpa)$/;

/** Só http e https, na porta padrão, sem usuário e senha, e nunca um endereço interno. */
export function urlPermitida(texto: string): URL | null {
  if (texto.length > 2000) return null;
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password || url.port) return null;
  const nome = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (isIP(nome)) return ipPublico(nome) ? url : null;
  return nome.includes(".") && !NOMES_INTERNOS.test(nome) ? url : null;
}
