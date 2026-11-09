
import crypto from "node:crypto";

export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/** Keyed hash (uses APP_SECRET) — for OTPs, session tokens, IPs. */
export function hmac(input: string, secret = process.env.APP_SECRET ?? ""): string {
  return crypto.createHmac("sha256", secret).update(input).digest("hex");
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function randomDigits(n = 6): string {
  let s = "";
  for (let i = 0; i < n; i++) s += crypto.randomInt(0, 10).toString();
  return s;
}

/** Constant-time string comparison (prevents timing attacks on signatures). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** IPs are never stored raw: hashed with a daily-rotating salt for click de-duplication. */
export function hashIp(ip: string | null | undefined, day = new Date().toISOString().slice(0, 10)): string | null {
  if (!ip) return null;
  return hmac(`${day}:${ip}`).slice(0, 32);
}
