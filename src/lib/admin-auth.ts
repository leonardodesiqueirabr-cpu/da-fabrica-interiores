// Sessão do administrador: token assinado (HMAC-SHA256) guardado numa cookie httpOnly.
// Usa apenas Web Crypto, por isso funciona no middleware (Edge) e nas rotas Node.
//
// Formato do token: v1.<expira_em_segundos>.<nonce>.<assinatura_base64url>
// - A assinatura cobre "v1.<expira>.<nonce>" com o segredo ADMIN_SESSION_SECRET.
// - Sem segredo (ou segredo curto) nenhuma sessão é válida e o login é recusado.
// - Mudar ADMIN_SESSION_SECRET invalida todas as sessões existentes.
// - Cookies antigas (valor fixo "authenticated") não têm este formato e são recusadas.

export const ADMIN_SESSION_COOKIE = "dafabrica_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas

const TOKEN_VERSION = "v1";
const MIN_SECRET_LENGTH = 32;
const encoder = new TextEncoder();

function getSessionSecret(): string | null {
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  return secret.length >= MIN_SECRET_LENGTH ? secret : null;
}

export function isAdminSessionConfigured() {
  return getSessionSecret() !== null;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function getHmacKey(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

/** Cria um token de sessão assinado. Devolve null se o segredo não estiver configurado. */
export async function createAdminSessionToken(): Promise<string | null> {
  const secret = getSessionSecret();
  if (!secret) return null;

  const expiresAt = Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS;
  const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(16)));
  const payload = `${TOKEN_VERSION}.${expiresAt}.${nonce}`;
  const signature = await crypto.subtle.sign("HMAC", await getHmacKey(secret), encoder.encode(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Valida assinatura e expiração do token da cookie de sessão. */
export async function isValidAdminSession(token: string | undefined | null): Promise<boolean> {
  const secret = getSessionSecret();
  if (!secret || !token || token.length > 256) return false;

  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== TOKEN_VERSION) return false;

  const [version, rawExpiresAt, nonce, rawSignature] = parts;
  if (!/^\d{1,12}$/.test(rawExpiresAt) || !/^[A-Za-z0-9_-]{16,64}$/.test(nonce)) return false;
  if (Number(rawExpiresAt) <= Math.floor(Date.now() / 1000)) return false;

  const signature = fromBase64Url(rawSignature);
  if (!signature || signature.length !== 32) return false;

  try {
    // crypto.subtle.verify compara em tempo constante.
    return await crypto.subtle.verify(
      "HMAC",
      await getHmacKey(secret),
      signature,
      encoder.encode(`${version}.${rawExpiresAt}.${nonce}`),
    );
  } catch {
    return false;
  }
}

async function sha256(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

function equalBytes(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Compara utilizador e password em tempo constante (hashes de igual tamanho). */
export async function isValidAdminCredentials(username: string, password: string) {
  const expectedUser = process.env.ADMIN_USERNAME || "admin";
  const expectedPass = process.env.ADMIN_PASSWORD || "";
  if (!expectedPass) return false;

  const [userOk, passOk] = await Promise.all([
    sha256(username).then(async (hash) => equalBytes(hash, await sha256(expectedUser))),
    sha256(password).then(async (hash) => equalBytes(hash, await sha256(expectedPass))),
  ]);
  return userOk && passOk;
}
