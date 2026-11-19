/**
 * Team bonus (functionality brief §4): 10% level 1, 5% level 2, of the seller's SALE commission,
 * paid on top, no level 3, no bonus-on-bonus, no cycles. Off unless the admin setting is on.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { makeCatalog, payment, resetDb, sendWebhook } from "./helpers";
import { approveDueCommissions, approvePartner, freezePartner, getWallet, submitPartnerApplication } from "@/server/partners";
import { setSetting } from "@/server/settings";
import { teamBonusPaise } from "@/server/team";

beforeEach(resetDb);

let phoneSeq = 0;
/** Approved partner with its own phone; `recruiter` is locked in as if checked at approval. */
async function partner(code: string, recruiter?: { id: string }) {
  const user = await db.user.create({ data: { email: `${code.toLowerCase()}@p.in`, name: code } });
  return db.partner.create({
    data: {
      userId: user.id, status: "APPROVED", code, displayName: code, instagramHandle: code.toLowerCase(),
      phone: `98000000${String(++phoneSeq).padStart(2, "0")}`, upiId: `${code.toLowerCase()}@upi`,
      referredByPartnerId: recruiter?.id ?? null, recruiterLockedAt: new Date(),
    },
  });
}

/** Chain: TOP ← A ← B ← C (C invited by B, B by A, A by TOP). */
async function chain() {
  const top = await partner("TOP");
  const a = await partner("AAA", top);
  const b = await partner("BBB", a);
  const c = await partner("CCC", b);
  return { top, a, b, c };
}

async function sell(sellerId: string, buyer = { email: "buyer@gmail.com", phone: "9876543210" }, n = 1) {
  const { basic } = await makeCatalog();
  await db.order.create({
    data: {
      ...buyer, name: "Buyer", subtotalPaise: 49900, totalPaise: 49900, partnerId: sellerId, attributionSource: "COOKIE", gatewayOrderId: `o${n}`,
      items: { create: [{ productId: basic.id, name: "Basic", unitPaise: 49900 }] },
    },
  });
  await sendWebhook("payment.captured", payment(`o${n}`, 49900, `pay_${n}`));
}

const byType = async (type: "SALE" | "TEAM_L1" | "TEAM_L2") => db.commission.findMany({ where: { type } });
const releaseAll = async () => {
  await db.commission.updateMany({ data: { availableAt: new Date(Date.now() - 60_000) } });
  await approveDueCommissions();
};

describe("team bonus", () => {
  it("is OFF by default: only the seller's commission is created", async () => {
    const { c } = await chain();
    await sell(c.id);
    expect(await db.commission.count()).toBe(1);
    expect((await byType("SALE"))[0].partnerId).toBe(c.id);
  });

  it("ON: level 1 gets 10%, level 2 gets 5% of the sale commission; nobody above level 2; seller not reduced", async () => {
    await setSetting("teamBonusEnabled", true);
    const { a, b, c } = await chain();
    await sell(c.id);
    const [sale] = await byType("SALE");
    expect(sale.partnerId).toBe(c.id);
    expect(sale.amountPaise).toBe(24361); // same as without team bonus
    const [l1] = await byType("TEAM_L1");
    const [l2] = await byType("TEAM_L2");
    expect(l1.partnerId).toBe(b.id);
    expect(l1.amountPaise).toBe(teamBonusPaise(24361, 1));
    expect(l1.amountPaise).toBe(2436);
    expect(l2.partnerId).toBe(a.id);
    expect(l2.amountPaise).toBe(1218);
    expect(await db.commission.count()).toBe(3); // TOP (level 3) gets nothing
  });

  it("no bonus-on-bonus: both bonuses point at the SALE commission", async () => {
    await setSetting("teamBonusEnabled", true);
    const { c } = await chain();
    await sell(c.id);
    const [sale] = await byType("SALE");
    const bonuses = await db.commission.findMany({ where: { type: { not: "SALE" } } });
    expect(bonuses).toHaveLength(2);
    for (const x of bonuses) {
      expect(x.sourceCommissionId).toBe(sale.id);
      expect(x.basePaise).toBe(sale.amountPaise);
    }
  });

  it("bonuses follow the same 60-minute release and refunds don't take them back", async () => {
    await setSetting("teamBonusEnabled", true);
    const { a, b, c } = await chain();
    await sell(c.id);
    expect(await approveDueCommissions()).toBe(0); // not yet
    await sendWebhook("refund.processed", { refund: { entity: { id: "rf1", payment_id: "pay_1", amount: 49900 } } });
    await releaseAll();
    expect((await getWallet(b.id)).availablePaise).toBe(2436);
    expect((await getWallet(a.id)).availablePaise).toBe(1218);
    expect((await getWallet(c.id)).availablePaise).toBe(24361);
  });

  it("frozen level-1 recruiter gets no bonus for that sale; level 2 is still paid", async () => {
    await setSetting("teamBonusEnabled", true);
    const { a, b, c } = await chain();
    await freezePartner("admin", b.id, "Checking");
    await sell(c.id);
    expect(await byType("TEAM_L1")).toHaveLength(0);
    const [l2] = await byType("TEAM_L2");
    expect(l2.partnerId).toBe(a.id);
    expect(await db.auditLog.count({ where: { action: "team_bonus.skipped" } })).toBe(1);
  });

  it("recruiter buying through their own invitee's link gets no bonus", async () => {
    await setSetting("teamBonusEnabled", true);
    const { b, c } = await chain();
    await sell(c.id, { email: "bbb@p.in", phone: "9123456789" });
    expect((await byType("TEAM_L1")).find((x) => x.partnerId === b.id)).toBeUndefined();
  });

  it("webhook replay creates no extra bonuses", async () => {
    await setSetting("teamBonusEnabled", true);
    const { c } = await chain();
    await sell(c.id);
    await sendWebhook("payment.captured", payment("o1", 49900, "pay_1"), "evt_again");
    expect(await db.commission.count()).toBe(3);
    await releaseAll();
    await releaseAll();
    expect(await db.partnerLedger.count()).toBe(3);
  });
});

describe("recruiter link checks at approval", () => {
  async function pending(code: string, recruiterId: string | null, phone = `97000000${String(++phoneSeq).padStart(2, "0")}`) {
    const user = await db.user.create({ data: { email: `${code.toLowerCase()}@p.in`, name: code } });
    return db.partner.create({ data: { userId: user.id, status: "PENDING", displayName: code, instagramHandle: code.toLowerCase(), phone, referredByPartnerId: recruiterId } });
  }

  it("a valid recruiter is locked in at approval", async () => {
    const r = await partner("RRR");
    const p = await pending("NEWA", r.id);
    await approvePartner("admin", p.id);
    const after = await db.partner.findUniqueOrThrow({ where: { id: p.id } });
    expect(after.referredByPartnerId).toBe(r.id);
    expect(after.recruiterLockedAt).not.toBeNull();
  });

  it("self-invite is dropped (same partner, or same phone)", async () => {
    const r = await partner("RRR");
    const samePhone = await pending("NEWB", r.id, r.phone);
    await approvePartner("admin", samePhone.id);
    expect((await db.partner.findUniqueOrThrow({ where: { id: samePhone.id } })).referredByPartnerId).toBeNull();

    const own = await pending("NEWC", null);
    await db.partner.update({ where: { id: own.id }, data: { referredByPartnerId: own.id } });
    await approvePartner("admin", own.id);
    expect((await db.partner.findUniqueOrThrow({ where: { id: own.id } })).referredByPartnerId).toBeNull();
  });

  it("a cycle is dropped: P cannot be recruited by someone in P's own team", async () => {
    const p = await pending("PPP", null);
    const q = await partner("QQQ", p); // Q was invited by P
    await db.partner.update({ where: { id: p.id }, data: { referredByPartnerId: q.id } }); // P claims Q invited them
    await approvePartner("admin", p.id);
    expect((await db.partner.findUniqueOrThrow({ where: { id: p.id } })).referredByPartnerId).toBeNull();
    expect(await db.auditLog.count({ where: { action: "partner.recruiter_dropped" } })).toBe(1);
  });

  it("an unapproved recruiter is dropped", async () => {
    const r = await pending("RRR", null);
    const p = await pending("NEWD", r.id);
    await approvePartner("admin", p.id);
    expect((await db.partner.findUniqueOrThrow({ where: { id: p.id } })).referredByPartnerId).toBeNull();
  });
});

describe("invite code on the partner application", () => {
  const app = (email: string, inviteCode: string, phone = "9811111111") => ({
    name: "New Creator", email, phone, instagramHandle: "newcreator", followers: 1000, niche: "", upiId: "", bankAccountName: "", bankAccountNumber: "", bankIfsc: "", inviteCode,
  });

  it("a valid code (any case) records the inviter; approval locks it", async () => {
    const r = await partner("RAHUL");
    expect((await submitPartnerApplication(app("new@c.in", "rahul"))).ok).toBe(true);
    const p = await db.partner.findFirstOrThrow({ where: { user: { email: "new@c.in" } } });
    expect(p.referredByPartnerId).toBe(r.id);
    await approvePartner("admin", p.id);
    expect((await db.partner.findUniqueOrThrow({ where: { id: p.id } })).recruiterLockedAt).not.toBeNull();
  });

  it("an unknown code or an unapproved partner's code is ignored", async () => {
    await pendingPartner("WAITING");
    await submitPartnerApplication(app("x@c.in", "NOPE"));
    await submitPartnerApplication(app("y@c.in", "WAITING", "9822222222"));
    expect(await db.partner.count({ where: { referredByPartnerId: { not: null } } })).toBe(0);
  });

  async function pendingPartner(code: string) {
    const user = await db.user.create({ data: { email: `${code.toLowerCase()}@p.in`, name: code } });
    return db.partner.create({ data: { userId: user.id, status: "PENDING", code, displayName: code, instagramHandle: code.toLowerCase(), phone: "9833333333" } });
  }
});
