"use server";

import { headers } from "next/headers";
import { hashIp } from "@/lib/crypto";
import { db } from "@/lib/db";
import { normalizeCode } from "@/server/attribution";
import { partnerApplicationSchema, submitPartnerApplication } from "@/server/partners";
import { rateLimit } from "@/server/rate-limit";

export async function applyAction(_: unknown, form: FormData): Promise<{ ok: boolean; error?: string }> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (!(await rateLimit(`apply:${hashIp(ip) ?? "anon"}`, 5, 3600)).ok) return { ok: false, error: "Bahut zyada attempts. Thodi der baad try karein." };
  const parsed = partnerApplicationSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  return submitPartnerApplication(parsed.data);
}

/** Live check of an invite code: returns the inviting partner's display name, or null. Codes are public (they're in links). */
export async function checkInviteAction(code: string): Promise<{ code: string; name: string } | null> {
  const clean = normalizeCode(code);
  if (!clean) return null;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (!(await rateLimit(`invite-check:${hashIp(ip) ?? "anon"}`, 40, 600)).ok) return null;
  const p = await db.partner.findUnique({ where: { code: clean }, select: { status: true, displayName: true } });
  return p?.status === "APPROVED" ? { code: clean, name: p.displayName } : null;
}
