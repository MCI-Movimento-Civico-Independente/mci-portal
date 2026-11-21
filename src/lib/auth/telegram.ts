import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const VALIDADE_SEGUNDOS = 24 * 60 * 60;

export type DadosTelegram = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

type Resultado = { ok: true; dados: DadosTelegram } | { ok: false; motivo: string };

/**
 * Valida os dados do Telegram Login Widget:
 * secret = SHA256(token do bot); hash = HMAC-SHA256(secret, data-check-string).
 * Recusa auth_date com mais de 24h.
 */
export function validarTelegram(entrada: unknown, botToken: string): Resultado {
  if (typeof entrada !== "object" || entrada === null) {
    return { ok: false, motivo: "dados_invalidos" };
  }
  const { hash, ...resto } = entrada as Record<string, unknown>;
  if (typeof hash !== "string" || !/^[0-9a-f]{64}$/i.test(hash)) {
    return { ok: false, motivo: "hash_invalido" };
  }

  const campos: string[] = [];
  for (const chave of Object.keys(resto).sort()) {
    const valor = resto[chave];
    if (typeof valor !== "string" && typeof valor !== "number") {
      return { ok: false, motivo: "dados_invalidos" };
    }
    campos.push(`${chave}=${valor}`);
  }

  const segredo = createHash("sha256").update(botToken).digest();
  const esperado = createHmac("sha256", segredo).update(campos.join("\n")).digest();
  const recebido = Buffer.from(hash, "hex");
  if (recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado)) {
    return { ok: false, motivo: "hash_invalido" };
  }

  const id = Number(resto.id);
  const authDate = Number(resto.auth_date);
  if (!Number.isSafeInteger(id) || id <= 0 || !Number.isFinite(authDate)) {
    return { ok: false, motivo: "dados_invalidos" };
  }
  const agora = Math.floor(Date.now() / 1000);
  if (agora - authDate > VALIDADE_SEGUNDOS || authDate - agora > 300) {
    return { ok: false, motivo: "expirado" };
  }

  return { ok: true, dados: { ...(resto as Omit<DadosTelegram, "hash">), id, auth_date: authDate, hash } };
}
