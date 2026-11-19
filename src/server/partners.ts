/**
 * PARTNER (affiliate) domain logic: applications, approval, clicks, commissions,
 * wallet and withdrawals. Every function that reads partner data takes the
 * partnerId from the SESSION (never from the request) — see app/partner/*.
 */
import "server-only";
import { z } from "zod";
import { db, type Tx } from "@/lib/db";
import { hmac, safeEqual } from "@/lib/crypto";
import { addRole, findOrCreateUser } from "@/server/auth";
import { notify } from "@/server/notify";
import { audit } from "@/server/audit";
import { getSettings } from "@/server/settings";
import { walletSummary, withdrawalSplit } from "@/server/commission";
import { normalizeCode } from "@/server/attribution";
import { checkRecruiter } from "@/server/team";
import { env } from "@/lib/env";

// ───────────── Application ─────────────

export const partnerApplicationSchema = z.object({
  name: z.string().trim().min(2, "Naam likhiye").max(80),
  email: z.string().trim().toLowerCase().email("Sahi email daaliye"),
  phone: z
    .string()
    .transform((s) => s.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""))
    .refine((s) => /^[6-9]\d{9}$/.test(s), "10 digit mobile number"),
  instagramHandle: z
    .string()
    .trim()
    .transform((s) => s.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, ""))
    .refine((s) => /^[a-zA-Z0-9._]{1,30}$/.test(s), "Sahi Instagram handle daaliye"),
  followers: z.coerce.number().int().min(0).max(1_000_000_000),
  niche: z.string().trim().max(120).optional().default(""),
  upiId: z
    .string()
    .trim()
    .max(80)
    .refine((s) => s === "" || /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(s), "UPI ID jaise name@okaxis")
    .optional()
    .default(""),
  bankAccountName: z.string().trim().max(80).optional().default(""),
  bankAccountNumber: z.string().trim().max(30).optional().default(""),
  bankIfsc: z
    .string()
    .trim()
    .toUpperCase()
    .refine((s) => s === "" || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(s), "Sahi IFSC daaliye")
    .optional()
    .default(""),
  /** Invite code of the partner who invited this applicant (team bonus). Optional. */
  inviteCode: z.string().trim().max(40).optional().default(""),
});
export type PartnerApplication = z.infer<typeof partnerApplicationSchema>;

export async function submitPartnerApplication(data: PartnerApplication) {
  const user = await findOrCreateUser(data.email, { name: data.name, phone: data.phone });
  const existing = await db.partner.findUnique({ where: { userId: user.id } });
  if (existing && existing.status !== "REJECTED") return { ok: false as const, error: "Is email se application pehle se hai." };

  const fields = {
    displayName: data.name,
    instagramHandle: data.instagramHandle,
    followers: data.followers,
    niche: data.niche || null,
    phone: data.phone,
    upiId: data.upiId || null,
    bankAccountName: data.bankAccountName || null,
    bankAccountNumber: data.bankAccountNumber || null,
    bankIfsc: data.bankIfsc || null,
    status: "PENDING" as const,
    // Recruiter: only while not yet locked (it locks at approval). Unknown / unapproved codes are ignored.
    ...(existing?.recruiterLockedAt ? {} : { referredByPartnerId: await recruiterFromCode(data.inviteCode, user.id) }),
  };
  const partnerRow = existing ? await db.partner.update({ where: { id: existing.id }, data: fields }) : await db.partner.create({ data: { userId: user.id, ...fields } });

  await notify(data.email, "partnerApplicationReceived", { name: data.name });
  if (env.adminEmail)
    await notify(env.adminEmail, "adminNewPartnerApplication", { name: data.name, instagram: data.instagramHandle, followers: data.followers, adminUrl: `${env.appUrl}/admin/partners/review?t=${encodeURIComponent(partnerDecisionToken(partnerRow.id))}` });
  return { ok: true as const };
}

/** Approved partner for an invite code, or null. Never the applicant themself. */
export async function recruiterFromCode(code: string | undefined, applicantUserId?: string): Promise<string | null> {
  const c = normalizeCode(code ?? "");
  if (!c) return null;
  const r = await db.partner.findUnique({ where: { code: c }, select: { id: true, status: true, userId: true } });
  if (!r || r.status !== "APPROVED" || r.userId === applicantUserId) return null;
  return r.id;
}

async function uniqueCode(base: string): Promise<string> {
  const clean = normalizeCode(base.replace(/[._]/g, ""))?.slice(0, 12) || "PARTNER";
  for (let i = 0; i < 50; i++) {
    const code = i === 0 ? clean : `${clean}${Math.floor(10 + Math.random() * 89)}`;
    const taken = (await db.partner.findUnique({ where: { code } })) || (await db.coupon.findUnique({ where: { code } }));
    if (!taken) return code;
  }
  throw new Error("could not generate a unique partner code");
}

export async function approvePartner(adminId: string, partnerId: string, requestedCode?: string) {
  const p = await db.partner.findUniqueOrThrow({ where: { id: partnerId }, include: { user: true } });
  const settings = await getSettings();
  const code = p.code ?? (await uniqueCode(normalizeCode(requestedCode) ?? p.instagramHandle));

  await db.$transaction(async (tx) => {
    // Team: check the recruiter (no self, no cycle, must be approved) and lock it for good.
    let recruiter = p.referredByPartnerId;
    if (!p.recruiterLockedAt && recruiter) {
      const ok = await checkRecruiter(tx, p.id, recruiter);
      if (!ok.ok) {
        await audit({ actorId: adminId, action: "partner.recruiter_dropped", entity: "Partner", entityId: p.id, before: { referredByPartnerId: recruiter }, after: { reason: ok.reason } }, tx);
        recruiter = null;
      }
    }
    await tx.partner.update({
      where: { id: p.id },
      data: { status: "APPROVED", code, approvedAt: p.approvedAt ?? new Date(), ...(p.recruiterLockedAt ? {} : { referredByPartnerId: recruiter, recruiterLockedAt: new Date() }) },
    });
    const hasCoupon = await tx.coupon.findFirst({ where: { partnerId: p.id } });
    if (!hasCoupon) await tx.coupon.create({ data: { code, kind: "PERCENT", value: settings.partnerCouponDiscountBps, partnerId: p.id } });
    await audit({ actorId: adminId, action: "partner.approve", entity: "Partner", entityId: p.id, before: { status: p.status }, after: { status: "APPROVED", code } }, tx);
  });
  await addRole(p.userId, "PARTNER");
  await notify(p.user.email, "partnerApproved", {
    name: p.displayName,
    link: `${env.appUrl}/?ref=${code}`,
    coupon: code,
    dashboardUrl: `${env.appUrl}/partner`,
    // Team invite link only while the team bonus is switched on.
    inviteLink: settings.teamBonusEnabled ? `${env.appUrl}/j/${code}` : undefined,
  });
}

export async function rejectPartner(adminId: string, partnerId: string, reason: string) {
  const p = await db.partner.findUniqueOrThrow({ where: { id: partnerId }, include: { user: true } });
  await db.partner.update({ where: { id: p.id }, data: { status: "REJECTED", adminNote: reason } });
  await audit({ actorId: adminId, action: "partner.reject", entity: "Partner", entityId: p.id, before: { status: p.status }, after: { status: "REJECTED", reason } });
  await notify(p.user.email, "partnerRejected", { name: p.displayName, reason });
}

export { recordClick } from "@/server/clicks";

// ───────────── Commission lifecycle ─────────────

/**
 * PENDING → APPROVED (available in the wallet) once availableAt has passed — 60 minutes after the sale by default.
 * Idempotent: a status-guarded update + one ledger row per commission, so running it twice never pays twice.
 * Frozen partners are skipped (their commissions wait until unfrozen).
 * With absorbRefunds on, a refunded order's commission is still released (Get Udaan bears the refund).
 */
export async function approveDueCommissions(partnerId?: string) {
  const { absorbRefunds } = await getSettings();
  const due = await db.commission.findMany({
    where: {
      status: "PENDING",
      availableAt: { lte: new Date() },
      order: { status: absorbRefunds ? { in: ["PAID", "REFUNDED", "PARTIALLY_REFUNDED"] } : "PAID" },
      partner: { frozenAt: null },
      ...(partnerId ? { partnerId } : {}),
    },
    select: { id: true, partnerId: true, amountPaise: true },
    take: 500,
  });
  for (const c of due) {
    await db.$transaction(async (tx) => {
      const r = await tx.commission.updateMany({ where: { id: c.id, status: "PENDING" }, data: { status: "APPROVED", approvedAt: new Date() } });
      if (r.count === 1)
        await tx.partnerLedger.create({ data: { partnerId: c.partnerId, type: "COMMISSION_APPROVED", amountPaise: c.amountPaise, commissionId: c.id } });
    });
  }
  return due.length;
}

/** Only used when absorbRefunds is OFF: refund → commission reversed (wallet can go negative if already paid out). */
export async function reverseCommissionsForRefund(tx: Tx, orderId: string) {
  const list = await tx.commission.findMany({ where: { orderId, status: { not: "REVERSED" } } });
  for (const c of list) {
    await tx.commission.update({ where: { id: c.id }, data: { status: "REVERSED", reversedAt: new Date() } });
    if (c.status === "APPROVED" || c.status === "PAID") {
      await tx.partnerLedger.create({ data: { partnerId: c.partnerId, type: "COMMISSION_REVERSED", amountPaise: -c.amountPaise, commissionId: c.id, note: "Order refunded" } });
    }
  }
}

// ───────────── Wallet & withdrawals ─────────────

export async function getWallet(partnerId: string) {
  const [commissions, ledger, open, paid] = await Promise.all([
    db.commission.findMany({ where: { partnerId, status: { in: ["PENDING", "APPROVED", "PAID"] } }, select: { status: true, amountPaise: true } }),
    db.partnerLedger.aggregate({ where: { partnerId }, _sum: { amountPaise: true } }),
    db.payout.aggregate({ where: { partnerId, status: { in: ["REQUESTED", "APPROVED"] } }, _sum: { grossPaise: true } }),
    db.payout.aggregate({ where: { partnerId, status: "PAID" }, _sum: { grossPaise: true } }),
  ]);
  return walletSummary({
    commissions,
    ledgerSumPaise: ledger._sum.amountPaise ?? 0,
    openWithdrawalsPaise: open._sum.grossPaise ?? 0,
    paidOutPaise: paid._sum.grossPaise ?? 0,
  });
}

export type WithdrawalCheck = { ok: true } | { ok: false; error: string };

export async function requestWithdrawal(partnerId: string, amountPaise: number): Promise<WithdrawalCheck> {
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) return { ok: false, error: "Sahi amount daaliye" };
  const settings = await getSettings();
  if (amountPaise < settings.minWithdrawalPaise) return { ok: false, error: `Minimum withdrawal ₹${settings.minWithdrawalPaise / 100} hai` };

  // Serialise per partner: row lock prevents two parallel requests spending the same money.
  return db.$transaction(async (tx) => {
    const [p] = await tx.$queryRaw<{ id: string; upiId: string | null; bankAccountNumber: string | null; bankIfsc: string | null; bankAccountName: string | null; payoutDetailsUpdatedAt: Date | null; status: string; frozenAt: Date | null; frozenReason: string | null }[]>`
      SELECT id, "upiId", "bankAccountNumber", "bankIfsc", "bankAccountName", "payoutDetailsUpdatedAt", status, "frozenAt", "frozenReason" FROM "Partner" WHERE id = ${partnerId} FOR UPDATE`;
    if (!p || p.status !== "APPROVED") return { ok: false as const, error: "Partner account active nahi hai" };
    if (p.frozenAt) return { ok: false as const, error: `Aapka account abhi review mein hai, isliye withdraw ruka hua hai.${p.frozenReason ? " Reason: " + p.frozenReason : ""}` };
    if (!p.upiId && !(p.bankAccountNumber && p.bankIfsc)) return { ok: false as const, error: "Pehle UPI ID ya bank details add karein" };
    if (p.payoutDetailsUpdatedAt && Date.now() - p.payoutDetailsUpdatedAt.getTime() < 24 * 3600_000)
      return { ok: false as const, error: "Payout details abhi badle gaye hain — security ke liye 24 ghante baad withdraw kar payenge" };

    const open = await tx.payout.count({ where: { partnerId, status: { in: ["REQUESTED", "APPROVED"] } } });
    if (open > 0) return { ok: false as const, error: "Ek request pehle se pending hai" };

    const ledger = await tx.partnerLedger.aggregate({ where: { partnerId }, _sum: { amountPaise: true } });
    const available = ledger._sum.amountPaise ?? 0;
    if (amountPaise > available) return { ok: false as const, error: "Available balance se zyada amount" };

    const split = withdrawalSplit(amountPaise, settings.tdsBps);
    await tx.payout.create({
      data: {
        partnerId,
        grossPaise: split.grossPaise,
        tdsBps: settings.tdsBps,
        tdsPaise: split.tdsPaise,
        netPaise: split.netPaise,
        method: p.upiId ? { type: "upi", upiId: p.upiId } : { type: "bank", name: p.bankAccountName, account: p.bankAccountNumber, ifsc: p.bankIfsc },
      },
    });
    return { ok: true as const };
  });
}

export async function decideWithdrawal(adminId: string, payoutId: string, decision: { action: "approve" } | { action: "reject"; reason: string } | { action: "paid"; reference: string }) {
  await db.$transaction(async (tx) => {
    const p = await tx.payout.findUniqueOrThrow({ where: { id: payoutId } });
    const now = new Date();
    if (decision.action === "approve") {
      if (p.status !== "REQUESTED") throw new Error("Only requested payouts can be approved");
      await tx.payout.update({ where: { id: p.id }, data: { status: "APPROVED", approvedAt: now, decidedById: adminId } });
    } else if (decision.action === "reject") {
      if (!["REQUESTED", "APPROVED"].includes(p.status)) throw new Error("Cannot reject now");
      await tx.payout.update({ where: { id: p.id }, data: { status: "REJECTED", rejectReason: decision.reason, decidedById: adminId } });
    } else {
      if (p.status !== "APPROVED") throw new Error("Approve before marking paid");
      if (!decision.reference.trim()) throw new Error("Payment reference (UTR) required");
      await tx.payout.update({ where: { id: p.id }, data: { status: "PAID", paidAt: now, reference: decision.reference.trim(), decidedById: adminId } });
      // The ledger is the source of truth for money; commissions stay APPROVED (a withdrawal can be partial).
      await tx.partnerLedger.create({ data: { partnerId: p.partnerId, type: "WITHDRAWAL_PAID", amountPaise: -p.grossPaise, payoutId: p.id } });
    }
    await audit({ actorId: adminId, action: `payout.${decision.action}`, entity: "Payout", entityId: p.id, before: { status: p.status }, after: decision }, tx);
  });
}

// ───────────── Freeze (fraud check) ─────────────

/** Freeze: new commissions stay pending and withdrawals pause, with a reason shown to the partner. */
export async function freezePartner(adminId: string, partnerId: string, reason: string) {
  const clean = reason.trim().slice(0, 300);
  if (!clean) return { ok: false as const, error: "Give a reason (it is shown to the partner)" };
  await db.partner.update({ where: { id: partnerId }, data: { frozenAt: new Date(), frozenReason: clean } });
  await audit({ actorId: adminId, action: "partner.freeze", entity: "Partner", entityId: partnerId, after: { reason: clean } });
  return { ok: true as const };
}

/** Unfreeze: releases every commission that became due while frozen. */
export async function unfreezePartner(adminId: string, partnerId: string) {
  await db.partner.update({ where: { id: partnerId }, data: { frozenAt: null, frozenReason: null } });
  await audit({ actorId: adminId, action: "partner.unfreeze", entity: "Partner", entityId: partnerId });
  await approveDueCommissions(partnerId);
  return { ok: true as const };
}

// ───────────── One-tap approval links (admin alert email) ─────────────

const DECISION_TTL_MS = 48 * 3600_000;

/** Signed, expiring token for the admin's one-tap review link. The page it opens still requires an admin login. */
export function partnerDecisionToken(partnerId: string, now = Date.now()) {
  const exp = Math.floor((now + DECISION_TTL_MS) / 1000);
  return `${partnerId}.${exp}.${hmac(`partner-decision:${partnerId}:${exp}`).slice(0, 32)}`;
}

export function verifyPartnerDecisionToken(token: string, now = Date.now()): string | null {
  const [id, exp, sig] = token.split(".");
  if (!id || !exp || !sig) return null;
  if (Number(exp) * 1000 < now) return null;
  return safeEqual(sig, hmac(`partner-decision:${id}:${exp}`).slice(0, 32)) ? id : null;
}
