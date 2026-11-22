// Datas no fuso de Brasília. Sem "server-only": são funções puras.
const FUSO = "America/Sao_Paulo";

/** Hoje como "AAAA-MM-DD" em Brasília. */
export function hojeSP(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: FUSO });
}

/** Data válida no formato AAAA-MM-DD (rejeita 2026-02-31). */
export function dataValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
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
