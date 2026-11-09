/**
 * End-to-end money flow against a real Postgres test DB:
 * webhook → order paid → enrolment → commission → approval → withdrawal → refund reversal.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { makeCatalog, makeOrder, makePartner, payment, resetDb, sendWebhook } from "./helpers";
import { approveDueCommissions, decideWithdrawal, getWallet, requestWithdrawal } from "@/server/partners";
import { getPartnerDashboard } from "@/server/partner-dashboard";
import { setSetting } from "@/server/settings";

beforeEach(resetDb);

describe("Razorpay webhook", () => {
  it("rejects a bad signature", async () => {
    const r = await sendWebhook("payment.captured", {}, "e1", "wrong-secret");
    expect(r.status).toBe(400);
  });

  it("fulfils a paid order exactly once (duplicate + order.paid events are no-ops)", async () => {
    const { basic, course } = await makeCatalog();
    const partner = await makePartner("LION", "lion@p.in");
    const order = await makeOrder({ productId: basic.id, price: 49900, email: "buyer@gmail.com", partnerId: partner.id, gatewayOrderId: "order_1" });
    const pay = payment("order_1", 49900, "pay_1");

    expect((await sendWebhook("payment.captured", pay, "evt_A")).status).toBe(200);
    expect((await sendWebhook("payment.captured", pay, "evt_A")).body).toBe("duplicate");
    expect((await sendWebhook("order.paid", pay, "evt_B")).status).toBe(200); // different event, same order

    const o = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(o.status).toBe("PAID");
    expect(o.gatewayFeePaise).toBe(1178);
    const user = await db.user.findUniqueOrThrow({ where: { email: "buyer@gmail.com" }, include: { roles: true } });
    expect(user.roles.map((r) => r.role)).toContain("STUDENT");
    expect(await db.enrollment.count({ where: { userId: user.id, courseId: course.id } })).toBe(1);

    const commissions = await db.commission.findMany();
    expect(commissions).toHaveLength(1);
    // (49900 − 0 GST − 1178 fee) × 50% = 24361
    expect(commissions[0]).toMatchObject({ basePaise: 48722, amountPaise: 24361, status: "PENDING" });
  });

  it("refuses to fulfil when the paid amount does not match", async () => {
    const { basic } = await makeCatalog();
    await makeOrder({ productId: basic.id, price: 49900, email: "b@x.in", gatewayOrderId: "order_2" });
    const r = await sendWebhook("payment.captured", payment("order_2", 100));
    expect(r.status).toBe(500);
    expect((await db.order.findFirstOrThrow()).status).toBe("CREATED");
    expect(await db.enrollment.count()).toBe(0);
  });

  it("upgrading Basic → Pro keeps one enrolment at the higher tier", async () => {
    const { basic, pro } = await makeCatalog();
    await makeOrder({ productId: basic.id, price: 49900, email: "u@x.in", gatewayOrderId: "o_b" });
    await makeOrder({ productId: pro.id, price: 199900, email: "u@x.in", gatewayOrderId: "o_p" });
    await sendWebhook("payment.captured", payment("o_b", 49900));
    await sendWebhook("payment.captured", payment("o_p", 199900));
    const e = await db.enrollment.findMany();
    expect(e).toHaveLength(1);
    expect(e[0].tier).toBe("PRO");
  });
});

describe("commission lifecycle & withdrawals", () => {
  async function paidSale() {
    const { basic } = await makeCatalog();
    const partner = await makePartner("LION", "lion@p.in");
    const order = await makeOrder({ productId: basic.id, price: 49900, email: "buyer@gmail.com", partnerId: partner.id, gatewayOrderId: "order_1" });
    await sendWebhook("payment.captured", payment("order_1", 49900, "pay_1"));
    await setSetting("minWithdrawalPaise", 10000); // ₹100 minimum for these tests
    return { partner, order };
  }

  it("self-referral at fulfilment time earns nothing if partner is not approved", async () => {
    const { basic } = await makeCatalog();
    const partner = await makePartner("LION", "lion@p.in");
    await db.partner.update({ where: { id: partner.id }, data: { status: "SUSPENDED" } });
    await makeOrder({ productId: basic.id, price: 49900, email: "b@x.in", partnerId: partner.id, gatewayOrderId: "o" });
    await sendWebhook("payment.captured", payment("o", 49900));
    expect(await db.commission.count()).toBe(0);
  });

  it("pending → approved after the refund window, then withdrawable", async () => {
    const { partner } = await paidSale();
    expect(await approveDueCommissions()).toBe(0); // still inside window
    expect((await getWallet(partner.id)).pendingPaise).toBe(24361);

    await db.commission.updateMany({ data: { availableAt: new Date(Date.now() - 1000) } });
    expect(await approveDueCommissions()).toBe(1);
    expect(await approveDueCommissions()).toBe(0); // idempotent
    expect(await getWallet(partner.id)).toMatchObject({ pendingPaise: 0, availablePaise: 24361 });
  });

  it("withdrawal rules: minimum, no overdraw, one open request at a time, paid with reference", async () => {
    const { partner } = await paidSale();
    await db.commission.updateMany({ data: { availableAt: new Date(Date.now() - 1000) } });
    await approveDueCommissions();
    const admin = await db.user.create({ data: { email: "admin@x.in" } });

    expect(await requestWithdrawal(partner.id, 5000)).toMatchObject({ ok: false }); // below minimum
    expect(await requestWithdrawal(partner.id, 99999)).toMatchObject({ ok: false }); // more than available
    const [a, b] = await Promise.all([requestWithdrawal(partner.id, 20000), requestWithdrawal(partner.id, 20000)]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1); // parallel double-request blocked
    expect((await getWallet(partner.id)).availablePaise).toBe(4361);

    const payout = await db.payout.findFirstOrThrow();
    await expect(decideWithdrawal(admin.id, payout.id, { action: "paid", reference: "UTR1" })).rejects.toThrow(); // must approve first
    await decideWithdrawal(admin.id, payout.id, { action: "approve" });
    await decideWithdrawal(admin.id, payout.id, { action: "paid", reference: "UTR1" });
    expect(await getWallet(partner.id)).toMatchObject({ availablePaise: 4361, paidPaise: 20000, requestedPaise: 0 });
    expect(await db.auditLog.count({ where: { entity: "Payout" } })).toBe(2);
  });

  it("rejected withdrawal returns money to available", async () => {
    const { partner } = await paidSale();
    await db.commission.updateMany({ data: { availableAt: new Date(Date.now() - 1000) } });
    await approveDueCommissions();
    await requestWithdrawal(partner.id, 20000);
    const payout = await db.payout.findFirstOrThrow();
    await decideWithdrawal("admin", payout.id, { action: "reject", reason: "KYC" });
    expect((await getWallet(partner.id)).availablePaise).toBe(24361);
  });

  it("refund reverses commission (pending → reversed, no wallet change)", async () => {
    const { partner } = await paidSale();
    await sendWebhook("refund.processed", { refund: { entity: { id: "rfnd_1", payment_id: "pay_1", amount: 49900 } } });
    expect((await db.order.findFirstOrThrow()).status).toBe("REFUNDED");
    expect((await db.commission.findFirstOrThrow()).status).toBe("REVERSED");
    expect((await db.enrollment.findFirstOrThrow()).revokedAt).not.toBeNull();
    expect(await getWallet(partner.id)).toMatchObject({ pendingPaise: 0, availablePaise: 0 });
  });

  it("refund after payout makes the wallet negative", async () => {
    const { partner } = await paidSale();
    await db.commission.updateMany({ data: { availableAt: new Date(Date.now() - 1000) } });
    await approveDueCommissions();
    await requestWithdrawal(partner.id, 24361);
    const p = await db.payout.findFirstOrThrow();
    await decideWithdrawal("admin", p.id, { action: "approve" });
    await decideWithdrawal("admin", p.id, { action: "paid", reference: "UTR" });
    await sendWebhook("refund.processed", { refund: { entity: { id: "rfnd_2", payment_id: "pay_1", amount: 49900 } } });
    expect((await getWallet(partner.id)).availablePaise).toBe(-24361);
  });
});

describe("partner data isolation", () => {
  it("a partner's dashboard only contains their own sales and never buyer contact details", async () => {
    const { basic } = await makeCatalog();
    const a = await makePartner("AAA", "a@p.in");
    const b = await makePartner("BBB", "b@p.in");
    await makeOrder({ productId: basic.id, price: 49900, email: "secret.buyer@gmail.com", partnerId: a.id, gatewayOrderId: "oa" });
    await makeOrder({ productId: basic.id, price: 49900, email: "other@gmail.com", partnerId: b.id, gatewayOrderId: "ob" });
    await sendWebhook("payment.captured", payment("oa", 49900));
    await sendWebhook("payment.captured", payment("ob", 49900));

    const dash = await getPartnerDashboard(a.id, 30);
    expect(dash.sales).toHaveLength(1);
    const json = JSON.stringify(dash);
    expect(json).not.toContain("secret.buyer");
    expect(json).not.toContain("9876543210");
    expect(json).not.toContain("other@gmail.com");
  });
});
