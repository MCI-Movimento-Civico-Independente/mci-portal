import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

// Fluxo atual do Telegram: OpenID Connect, Authorization Code + PKCE.
// Doc: https://core.telegram.org/bots/telegram-login
const EMISSOR = "https://oauth.telegram.org";
const AUTORIZACAO = `${EMISSOR}/auth`;
const TOKEN = `${EMISSOR}/token`;
const jwks = createRemoteJWKSet(new URL(`${EMISSOR}/.well-known/jwks.json`));

export const COOKIE_OIDC = "mci_tg_oidc";

/** O Client ID do Telegram é o id numérico do bot (o prefixo do token). */
export function clientIdTelegram(): string | null {
  const explicito = process.env.TELEGRAM_CLIENT_ID;
  if (explicito) return explicito;
  const prefixo = process.env.TELEGRAM_BOT_TOKEN?.split(":")[0];
  return prefixo && /^\d+$/.test(prefixo) ? prefixo : null;
}

export function oidcConfigurado(): boolean {
  return Boolean(clientIdTelegram() && process.env.TELEGRAM_CLIENT_SECRET);
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export function novoPedido(clientId: string, redirectUri: string) {
  const state = b64url(randomBytes(24));
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());

  const url = new URL(AUTORIZACAO);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  return { url: url.toString(), state, verifier };
}

export type PerfilTelegram = { id: string; nome: string };

/** Troca o code pelo id_token e valida assinatura, emissor, audiência e validade. */
export async function trocarCodigo(params: {
  code: string;
  verifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<PerfilTelegram> {
  const resposta = await fetch(TOKEN, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${params.clientId}:${params.clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      code_verifier: params.verifier,
    }),
    cache: "no-store",
  });
  if (!resposta.ok) {
    throw new Error(`Telegram recusou o code (${resposta.status}): ${(await resposta.text()).slice(0, 200)}`);
  }
  const { id_token: idToken } = (await resposta.json()) as { id_token?: string };
  if (!idToken) throw new Error("A resposta do Telegram não trouxe id_token.");

  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: EMISSOR,
    audience: params.clientId,
  });

  // O id do usuário no Telegram vem no claim "id" (escopo profile): é ele que
  // casa com identidades.externo_id do bot. Não usamos "sub" como substituto,
  // porque não há garantia de que seja o mesmo número.
  const id = payload.id;
  if (typeof id !== "number" && typeof id !== "string") {
    throw new Error(`id_token sem o claim "id". Claims recebidos: ${Object.keys(payload).join(", ")}`);
  }
  const nome = typeof payload.name === "string" ? payload.name : "";
  const usuario = typeof payload.preferred_username === "string" ? payload.preferred_username : "";
  return { id: String(id), nome: nome || usuario || `Membro ${id}` };
}
