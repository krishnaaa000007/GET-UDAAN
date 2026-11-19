import "server-only";
import { db } from "@/lib/db";
import { normalizeCode } from "@/server/attribution";

/** The approved partner behind an invite code (only what a share card may show). */
export async function inviterFor(code: string) {
  const clean = normalizeCode(code);
  if (!clean) return null;
  const p = await db.partner.findUnique({ where: { code: clean }, select: { status: true, displayName: true } });
  return p?.status === "APPROVED" ? { code: clean, name: p.displayName } : null;
}

export const inviteTitle = (name: string) => `${name} ne aapko *Get Udaan* partner banne ka invite bheja`;
export const inviteSub = "Apne reel page se Get Udaan promote karo aur har sale par commission kamao. Joining free hai.";
