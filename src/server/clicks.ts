/** Referral click recording — imported by proxy.ts, so keep this module small. */
import { db } from "@/lib/db";
import { hashIp, hmac } from "@/lib/crypto";
import { rateLimit } from "@/server/rate-limit";


/**
 * Record a referral click. Rate-limited per IP; repeat clicks from the same
 * visitor for the same partner+campaign within 30 min are marked duplicate.
 * Returns null if the code is unknown/unapproved or the IP is spamming.
 */
export async function recordClick(p: { code: string; clickId: string; campaign: string | null; landingPath: string; visitorId: string | null; ip: string | null; userAgent: string | null }) {
  const partner = await db.partner.findUnique({ where: { code: p.code }, select: { id: true, status: true } });
  if (!partner || partner.status !== "APPROVED") return null;
  const ipHash = hashIp(p.ip);
  if (ipHash) {
    const rl = await rateLimit(`click:${ipHash}`, 30, 60 * 60);
    if (!rl.ok) return null;
  }
  const since = new Date(Date.now() - 30 * 60_000);
  const dup = p.visitorId
    ? await db.click.findFirst({ where: { partnerId: partner.id, visitorId: p.visitorId, campaign: p.campaign, createdAt: { gt: since } }, select: { id: true } })
    : null;
  await db.click.create({
    data: {
      id: p.clickId,
      partnerId: partner.id,
      campaign: p.campaign,
      landingPath: p.landingPath.slice(0, 200),
      visitorId: p.visitorId,
      ipHash,
      uaHash: p.userAgent ? hmac(p.userAgent).slice(0, 32) : null,
      isDuplicate: !!dup,
    },
  });
  return partner.id;
}

