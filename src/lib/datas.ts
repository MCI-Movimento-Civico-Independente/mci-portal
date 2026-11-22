// Datas no fuso de Brasília. Sem "server-only": são funções puras.
const FUSO = "America/Sao_Paulo";

/** Hoje como "AAAA-MM-DD" em Brasília. */
export function hojeSP(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: FUSO });
}

/** Data válida no formato AAAA-MM-DD (rejeita 2026-02-31 e anos fora de 2000–2100). */
export function dataValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const ano = Number(valor.slice(0, 4));
  if (ano < 2000 || ano > 2100) return false;
  const d = new Date(`${valor}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(valor);
}

/** "Hoje", "Atrasada · 20/11" ou "Seg, 23/11". */
export function formatarPrazo(prazo: string | null, hoje: string): string {
  if (!prazo) return "Sem prazo";
  const [, mes, dia] = prazo.split("-");
  if (prazo === hoje) return "Hoje";
  if (prazo < hoje) return `Atrasada · ${dia}/${mes}`;
  const semana = new Date(`${prazo}T12:00:00Z`)
    .toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" })
    .replace(".", "");
  return `${semana.charAt(0).toUpperCase()}${semana.slice(1)}, ${dia}/${mes}`;
}

/** "22/11/26, 14:30" em Brasília. Formate no servidor e passe o texto pronto ao client. */
export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: FUSO,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "22/11/2026" a partir de "2026-11-22". */
export function formatarDataCurta(data: string): string {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}
