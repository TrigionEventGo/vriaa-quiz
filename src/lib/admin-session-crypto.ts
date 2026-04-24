const enc = new TextEncoder();
const dec = new TextDecoder();

export const ADMIN_SESSION_COOKIE = "quiz_admin_session";

function b64urlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(secret));
  return crypto.subtle.importKey(
    "raw",
    digest,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function hmacSign(secret: string, message: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return b64urlEncode(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** Signed opaque session value: `v1|<expMs>` + HMAC, base64url-encoded. */
export async function mintAdminSessionValue(
  secret: string,
  ttlMs: number
): Promise<string> {
  const exp = Date.now() + ttlMs;
  const canonical = `v1|${exp}`;
  const sig = await hmacSign(secret, canonical);
  return `${b64urlEncode(enc.encode(canonical))}.${sig}`;
}

export async function verifyAdminSessionValue(
  secret: string,
  value: string
): Promise<boolean> {
  const dot = value.indexOf(".");
  if (dot < 1) return false;
  const payloadEnc = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  let canonical: string;
  try {
    canonical = dec.decode(b64urlDecode(payloadEnc));
  } catch {
    return false;
  }
  if (!canonical.startsWith("v1|")) return false;
  const exp = Number.parseInt(canonical.slice(3), 10);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = await hmacSign(secret, canonical);
  return timingSafeEqual(sig, expected);
}
