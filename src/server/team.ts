/**
 * TEAM BONUS — 2 levels only, switched on by the admin setting `teamBonusEnabled` (off by default).
 *
 *  - Level 1: the partner who invited the seller gets PARTNER_RULES.teamBonus.l1Bps (10%) of the seller's SALE commission.
 *  - Level 2: the partner who invited THAT partner gets l2Bps (5%) of the same SALE commission.
 *  - Bonuses are paid by Get Udaan on top — the seller's commission is never reduced.
 *  - No bonus-on-bonus: a bonus is always a % of a SALE commission, never of another bonus. No level 3.
 *  - The recruiter link is checked (no self-invite, no cycle) and locked when the partner is approved.
 *  - Same release time and refund rule as sale commissions. A frozen recruiter gets no level-1 bonus for
 *    that sale; the level-2 recruiter is still paid.
 */
import "server-only";
import type { Tx } from "@/lib/db";
import { PARTNER_RULES } from "@/config/partners";

export type BonusType = "TEAM_L1" | "TEAM_L2";

/** Bonus amount for one level, rounded down to the paisa. */
export function teamBonusPaise(saleCommissionPaise: number, level: 1 | 2): number {
  const bps = level === 1 ? PARTNER_RULES.teamBonus.l1Bps : PARTNER_RULES.teamBonus.l2Bps;
  return Math.floor((saleCommissionPaise * bps) / 10000);
}

const last10 = (v?: string | null) => (v ?? "").replace(/\D/g, "").slice(-10);

type PersonLike = { id: string; phone: string; user: { email: string } };

/** True when two partners look like the same person (same email or same phone). */
export function samePerson(a: PersonLike, b: PersonLike) {
  return a.id === b.id || a.user.email.toLowerCase() === b.user.email.toLowerCase() || (last10(a.phone).length === 10 && last10(a.phone) === last10(b.phone));
}

/**
 * Can `recruiterId` be locked in as `partnerId`'s recruiter?
 * Rules: recruiter must exist and be approved, must not be the same person, and must not be in the
 * partner's own downline (that would make a cycle: A invited B invited A).
 */
export async function checkRecruiter(tx: Tx, partnerId: string, recruiterId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (recruiterId === partnerId) return { ok: false, reason: "self" };
  // One query at a time: a transaction is a single connection.
  const me = await tx.partner.findUnique({ where: { id: partnerId }, select: { id: true, phone: true, user: { select: { email: true } } } });
  const r = await tx.partner.findUnique({ where: { id: recruiterId }, select: { id: true, phone: true, status: true, user: { select: { email: true } } } });
  if (!me || !r) return { ok: false, reason: "not_found" };
  if (r.status !== "APPROVED") return { ok: false, reason: "recruiter_not_approved" };
  if (samePerson(me, r)) return { ok: false, reason: "self" };
  // Walk up from the recruiter; meeting the partner again means a cycle.
  let cursor: string | null = recruiterId;
  for (let i = 0; cursor && i < 100; i++) {
    if (cursor === partnerId) return { ok: false, reason: "cycle" };
    const up: { referredByPartnerId: string | null } | null = await tx.partner.findUnique({ where: { id: cursor }, select: { referredByPartnerId: true } });
    cursor = up?.referredByPartnerId ?? null;
  }
  return { ok: true };
}

type Buyer = { email: string; phone: string; payerEmail?: string; payerContact?: string; payerVpa?: string };

function buyerIs(p: { phone: string; upiId: string | null; user: { email: string } }, b: Buyer) {
  const emails = [b.email, b.payerEmail].filter(Boolean).map((e) => e!.trim().toLowerCase());
  const phones = [b.phone, b.payerContact].map(last10).filter((x) => x.length === 10);
  return (
    emails.includes(p.user.email.toLowerCase()) ||
    phones.includes(last10(p.phone)) ||
    (!!b.payerVpa && !!p.upiId && b.payerVpa.trim().toLowerCase() === p.upiId.trim().toLowerCase())
  );
}

/**
 * Creates TEAM_L1 / TEAM_L2 bonuses for one SALE commission, inside the payment transaction.
 * Idempotent through the (orderId, partnerId, type) unique key.
 */
export async function createTeamBonuses(
  tx: Tx,
  input: { orderId: string; sellerId: string; sale: { id: string; amountPaise: number }; availableAt: Date; buyer: Buyer },
): Promise<{ partnerId: string; type: BonusType; amountPaise: number }[]> {
  const created: { partnerId: string; type: BonusType; amountPaise: number }[] = [];
  const pick = { id: true, status: true, frozenAt: true, phone: true, upiId: true, recruiterLockedAt: true, referredByPartnerId: true, user: { select: { email: true } } } as const;

  const seller = await tx.partner.findUniqueOrThrow({ where: { id: input.sellerId }, select: pick });
  // Only a recruiter link that was checked + locked at approval counts.
  const r1 = seller.recruiterLockedAt && seller.referredByPartnerId ? await tx.partner.findUnique({ where: { id: seller.referredByPartnerId }, select: pick }) : null;
  const r2 = r1?.recruiterLockedAt && r1.referredByPartnerId ? await tx.partner.findUnique({ where: { id: r1.referredByPartnerId }, select: pick }) : null;

  const levels: [1 | 2, typeof r1][] = [
    [1, r1],
    [2, r2],
  ];
  const seen = new Set([seller.id]);
  for (const [level, r] of levels) {
    if (!r || seen.has(r.id)) continue; // missing, or a loop that slipped through
    seen.add(r.id);
    const type: BonusType = level === 1 ? "TEAM_L1" : "TEAM_L2";
    let skip: string | null = null;
    if (r.status !== "APPROVED") skip = "not_approved";
    else if (r.frozenAt) skip = "frozen";
    else if (buyerIs(r, input.buyer)) skip = "recruiter_is_buyer";
    if (skip) {
      await tx.auditLog.create({ data: { actorId: null, action: "team_bonus.skipped", entity: "Order", entityId: input.orderId, after: { partnerId: r.id, type, reason: skip } } });
      continue;
    }
    const amountPaise = teamBonusPaise(input.sale.amountPaise, level);
    if (amountPaise <= 0) continue;
    const exists = await tx.commission.findUnique({ where: { orderId_partnerId_type: { orderId: input.orderId, partnerId: r.id, type } } });
    if (exists) continue;
    await tx.commission.create({
      data: {
        partnerId: r.id,
        orderId: input.orderId,
        type,
        sourceCommissionId: input.sale.id,
        basePaise: input.sale.amountPaise,
        rateBps: level === 1 ? PARTNER_RULES.teamBonus.l1Bps : PARTNER_RULES.teamBonus.l2Bps,
        amountPaise,
        availableAt: input.availableAt,
      },
    });
    created.push({ partnerId: r.id, type, amountPaise });
  }
  return created;
}
