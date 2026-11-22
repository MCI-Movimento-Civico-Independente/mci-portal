import type { Pessoa } from "@/lib/tarefas";

/** "Vitor Moraes" → "VM"; "Vitor" → "V". Primeira letra do primeiro e do último nome. */
export function iniciais(nome: string | null | undefined): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return `${primeira}${ultima}`.toUpperCase();
}

// Cores da marca, com texto de contraste. A pessoa sempre recebe a mesma cor (pelo id).
const TONS = [
  "bg-marca text-sobre-marca",
  "bg-ouro text-sobre-ouro",
  "bg-verde text-sobre-verde",
  "bg-roxo text-sobre-roxo",
  "bg-inverso text-sobre-inverso",
];

function tomDe(chave: string) {
  let h = 0;
  for (const c of chave) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONS[h % TONS.length];
}

/** "Foto de perfil" provisória: círculo com as iniciais. */
export function Avatar({ pessoa, tamanho = "md" }: { pessoa: Pessoa; tamanho?: "sm" | "md" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-superficie font-mono font-bold leading-none ${
        tamanho === "sm" ? "size-6 text-[9px]" : "size-7 text-[10px]"
      } ${tomDe(pessoa.id)}`}
    >
      {iniciais(pessoa.nome)}
    </span>
  );
}
