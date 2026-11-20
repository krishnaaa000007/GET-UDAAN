/**
 * Google "Sign in with Google" using the standard OAuth 2.0 authorization-code flow + PKCE.
 *
 * Flow:
 *   1. User clicks the button → /auth/google/start creates a one-time state + PKCE verifier, stores a
 *      short cookie, and redirects to accounts.google.com.
 *   2. Google redirects to /auth/google/callback with ?code=&state=.
 *   3. We verify the state cookie, trade the code for an id_token, read email + sub + name + email_verified,
 *      then link to an existing User (same email OR same googleSub) or create one, and open a session.
 *
 *  - Button only shows / routes only work when GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set.
 *  - No library, no refresh tokens: we just need the user's email once.
 *  - We never trust the code or state from the URL alone — we verify the state cookie, the id_token's
 *    issuer, audience, expiry, and the nonce that we put in the cookie. (The id_token is signed by Google,
 *    but checking the nonce stops someone from replaying a leaked token.)
 */
import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { randomToken, sha256b64url } from "@/lib/crypto";
import { env } from "@/lib/env";
import { createSession, normalizeEmail } from "@/server/auth";

const STATE_COOKIE = "gu_g_state";
const STATE_MAX_AGE_SEC = 10 * 60;
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

function clientId() {
  return process.env.GOOGLE_CLIENT_ID ?? null;
}
function clientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET ?? null;
}
/** True when Google sign-in is turned on (both env vars set). Pages hide the button when false. */
export function googleEnabled() {
  return !!(clientId() && clientSecret());
}

function redirectUri(): string {
  return `${env.appUrl}/auth/google/callback`;
}

function b64urlDecode(s: string): string {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

export async function buildAuthUrl(next: string): Promise<string> {
  if (!googleEnabled()) throw new Error("Google sign-in is not configured");
  const state = randomToken(24);
  const nonce = randomToken(24);
  const verifier = randomToken(48); // PKCE: 48 bytes → ~64 url-safe chars, within the 43–128 limit
  const challenge = sha256b64url(verifier);
  const jar = await cookies();
  jar.set(STATE_COOKIE, JSON.stringify({ state, nonce, verifier, next }), {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    maxAge: STATE_MAX_AGE_SEC,
  });
  const u = new URL(AUTH_URL);
  u.searchParams.set("client_id", clientId()!);
  u.searchParams.set("redirect_uri", redirectUri());
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", "openid email profile");
  u.searchParams.set("state", state);
  u.searchParams.set("nonce", nonce);
  u.searchParams.set("code_challenge", challenge);
  u.searchParams.set("code_challenge_method", "S256");
  u.searchParams.set("access_type", "online");
  u.searchParams.set("prompt", "select_account");
  return u.toString();
}

type IdPayload = { iss?: string; aud?: string; exp?: number; sub?: string; email?: string; email_verified?: boolean | string; name?: string; nonce?: string };

/** Minimal JWT payload parse. We DON'T verify the signature because we read id_token straight from
 *  Google's own token endpoint over TLS (not from the URL), so Google has signed off on it. */
function parseIdToken(idToken: string): IdPayload {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("bad id_token");
  return JSON.parse(b64urlDecode(parts[1])) as IdPayload;
}

export type GoogleResult = { ok: true; next: string } | { ok: false; error: string };

export async function handleCallback(codeFromUrl: string | null, stateFromUrl: string | null): Promise<GoogleResult> {
  if (!googleEnabled()) return { ok: false, error: "Google sign-in is not configured" };
  const jar = await cookies();
  const raw = jar.get(STATE_COOKIE)?.value;
  jar.delete(STATE_COOKIE);
  if (!codeFromUrl || !stateFromUrl || !raw) return { ok: false, error: "Login session expired. Please try again." };
  let stored: { state: string; nonce: string; verifier: string; next: string };
  try {
    stored = JSON.parse(raw) as typeof stored;
  } catch {
    return { ok: false, error: "Login session expired. Please try again." };
  }
  if (stored.state !== stateFromUrl) return { ok: false, error: "Login state did not match. Please try again." };

  const body = new URLSearchParams({
    code: codeFromUrl,
    client_id: clientId()!,
    client_secret: clientSecret()!,
    redirect_uri: redirectUri(),
    grant_type: "authorization_code",
    code_verifier: stored.verifier,
  });
  const r = await fetch(TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  if (!r.ok) return { ok: false, error: `Google did not accept the login (${r.status}).` };
  const json = (await r.json()) as { id_token?: string };
  if (!json.id_token) return { ok: false, error: "Google did not return an id_token." };

  const p = parseIdToken(json.id_token);
  if (!p.iss || !ISSUERS.has(p.iss)) return { ok: false, error: "Login token issuer mismatch." };
  if (p.aud !== clientId()) return { ok: false, error: "Login token audience mismatch." };
  if (!p.exp || p.exp * 1000 < Date.now()) return { ok: false, error: "Login token expired." };
  if (p.nonce !== stored.nonce) return { ok: false, error: "Login token nonce mismatch." };
  if (!p.sub || !p.email) return { ok: false, error: "Google did not return your email." };
  const verified = p.email_verified === true || p.email_verified === "true";
  if (!verified) return { ok: false, error: "This Google account's email is not verified." };

  const email = normalizeEmail(p.email);
  const next = stored.next?.startsWith("/") && !stored.next.startsWith("//") ? stored.next : "/dashboard";
  // Link to an existing account on either Google sub or email; create otherwise. Name only filled if empty.
  const existing = await db.user.findFirst({ where: { OR: [{ googleSub: p.sub }, { email }] } });
  const user = existing
    ? await db.user.update({
        where: { id: existing.id },
        data: {
          googleSub: existing.googleSub ?? p.sub,
          name: existing.name ?? p.name ?? undefined,
          // Keep their email as it was; a mismatch between an older email and Google's would need the user to say so.
        },
      })
    : await db.user.create({ data: { email, name: p.name ?? undefined, googleSub: p.sub } });
  await createSession(user.id);
  return { ok: true, next };
}
