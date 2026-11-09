/**
 * AUTH — email one-time code (OTP) + magic link, with our own session table.
 *
 * Why our own sessions (and not Supabase Auth)? We must enforce "max 2 devices,
 * new login logs out the oldest" on EVERY request, including video token requests.
 * A database session checked server-side does that exactly, at zero cost.
 * Supabase is still our Postgres database.
 */
import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashIp, hmac, randomDigits, randomToken } from "@/lib/crypto";
import { enforceRateLimit } from "@/server/rate-limit";
import { notify } from "@/server/notify";
import { getSetting } from "@/server/settings";
import type { RoleName } from "@/generated/prisma/enums";

export const SESSION_COOKIE = "rb_session";
const SESSION_DAYS = 30;
const OTP_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const MAGIC_DAYS = 7;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function clientInfo() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  return { ip, userAgent: h.get("user-agent")?.slice(0, 300) ?? null };
}

// ───────────── OTP ─────────────

export async function requestOtp(rawEmail: string) {
  const email = normalizeEmail(rawEmail);
  const { ip } = await clientInfo();
  await enforceRateLimit(`otp:email:${email}`, 5, 15 * 60);
  if (ip) await enforceRateLimit(`otp:ip:${hashIp(ip)}`, 20, 15 * 60);

  // Only the newest code works.
  await db.loginToken.updateMany({ where: { email, kind: "OTP", consumedAt: null }, data: { consumedAt: new Date() } });
  const code = randomDigits(6);
  // The hash includes the row id, so two people getting the same 6 digits never collide.
  const id = randomToken(16);
  await db.loginToken.create({
    data: { id, email, kind: "OTP", tokenHash: hmac(`otp:${id}:${code}`), expiresAt: new Date(Date.now() + OTP_MINUTES * 60_000) },
  });
  await notify(email, "loginOtp", { code });
}

export async function verifyOtp(rawEmail: string, code: string): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const email = normalizeEmail(rawEmail);
  await enforceRateLimit(`otp-verify:${email}`, 10, 15 * 60);
  const token = await db.loginToken.findFirst({
    where: { email, kind: "OTP", consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!token) return { ok: false, error: "Code expire ho gaya. Naya code mangaiye." };
  if (token.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, error: "Bahut galat attempts. Naya code mangaiye." };

  const clean = code.replace(/\D/g, "");
  if (hmac(`otp:${token.id}:${clean}`) !== token.tokenHash) {
    await db.loginToken.update({ where: { id: token.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: "Code galat hai. Dobara check karein." };
  }
  await db.loginToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } });
  const user = await findOrCreateUser(email);
  await createSession(user.id);
  return { ok: true, userId: user.id };
}

// ───────────── Magic link (sent after purchase) ─────────────

export async function createMagicLink(rawEmail: string, next = "/dashboard"): Promise<string> {
  const email = normalizeEmail(rawEmail);
  const token = randomToken(32);
  await db.loginToken.create({
    data: { email, kind: "MAGIC_LINK", tokenHash: hmac(`magic:${token}`), expiresAt: new Date(Date.now() + MAGIC_DAYS * 86_400_000) },
  });
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/auth/magic?token=${token}&next=${encodeURIComponent(next)}`;
}

/** Magic links are single-use. Returns userId or null. Must run in a Route Handler / Server Action. */
export async function consumeMagicLink(token: string): Promise<string | null> {
  const row = await db.loginToken.findUnique({ where: { tokenHash: hmac(`magic:${token}`) } });
  if (!row || row.kind !== "MAGIC_LINK" || row.consumedAt || row.expiresAt < new Date()) return null;
  const claimed = await db.loginToken.updateMany({ where: { id: row.id, consumedAt: null }, data: { consumedAt: new Date() } });
  if (claimed.count !== 1) return null; // someone else used it at the same moment
  const user = await findOrCreateUser(row.email);
  await createSession(user.id);
  return user.id;
}

// ───────────── Users ─────────────

export async function findOrCreateUser(email: string, extra: { name?: string; phone?: string } = {}) {
  const e = normalizeEmail(email);
  return db.user.upsert({
    where: { email: e },
    create: { email: e, name: extra.name, phone: extra.phone },
    update: {},
  });
}

export async function addRole(userId: string, role: RoleName) {
  await db.userRole.upsert({ where: { userId_role: { userId, role } }, create: { userId, role }, update: {} });
}

// ───────────── Sessions & device limit ─────────────

function deviceLabel(ua: string | null): string {
  if (!ua) return "Unknown device";
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iPhone" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "Mac" : "Device";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "Browser";
  return `${br} on ${os}`;
}

export async function createSession(userId: string) {
  const { ip, userAgent } = await clientInfo();
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({
    data: { userId, tokenHash: hmac(`session:${token}`), userAgent, deviceLabel: deviceLabel(userAgent), ipHash: hashIp(ip), expiresAt },
  });
  await enforceDeviceLimit(userId);

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Keep only the newest N active sessions; revoke the rest ("new login logs out the oldest"). */
export async function enforceDeviceLimit(userId: string) {
  const max = await getSetting("maxDevices");
  const active = await db.session.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  const extra = active.slice(max).map((s) => s.id);
  if (extra.length) {
    await db.session.updateMany({ where: { id: { in: extra } }, data: { revokedAt: new Date(), revokedReason: "DEVICE_LIMIT" } });
  }
}

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  roles: RoleName[];
  sessionId: string;
};

type SessionResult = { user: CurrentUser } | { user: null; revokedReason?: string };

/** Current user for this request (cached per request). Checks revocation on EVERY call. */
export const getSession = cache(async (): Promise<SessionResult> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return { user: null };
  const s = await db.session.findUnique({
    where: { tokenHash: hmac(`session:${token}`) },
    include: { user: { include: { roles: true } } },
  });
  if (!s) return { user: null };
  if (s.revokedAt) return { user: null, revokedReason: s.revokedReason ?? "REVOKED" };
  if (s.expiresAt < new Date()) return { user: null, revokedReason: "EXPIRED" };

  // Touch lastSeenAt at most every 5 minutes (keeps DB writes low).
  if (Date.now() - s.lastSeenAt.getTime() > 5 * 60_000) {
    await db.session.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } });
  }
  return {
    user: { id: s.user.id, email: s.user.email, name: s.user.name, phone: s.user.phone, roles: s.user.roles.map((r) => r.role), sessionId: s.id },
  };
});

export async function getCurrentUser(): Promise<CurrentUser | null> {
  return (await getSession()).user;
}

/** Use at the top of every protected page / action. Redirects to login if needed. */
export async function requireUser(next?: string): Promise<CurrentUser> {
  const s = await getSession();
  if (s.user) return s.user;
  const q = new URLSearchParams();
  if (next) q.set("next", next);
  if (s.revokedReason === "DEVICE_LIMIT") q.set("reason", "device");
  redirect(`/login${q.size ? `?${q}` : ""}`);
}

export async function requireRole(role: RoleName, next?: string): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (!user.roles.includes(role) && !user.roles.includes("ADMIN")) redirect("/dashboard?denied=1");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (!user.roles.includes("ADMIN")) redirect("/dashboard?denied=1");
  return user;
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.updateMany({ where: { tokenHash: hmac(`session:${token}`) }, data: { revokedAt: new Date(), revokedReason: "LOGOUT" } });
  }
  jar.delete(SESSION_COOKIE);
}
