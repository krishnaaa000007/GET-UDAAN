/**
 * PURCHASE FULFILMENT — runs ONLY from a verified Razorpay webhook.
 *
 * Guarantees:
 *  - Signature verified with the webhook secret (fake requests rejected).
 *  - Idempotent: the same event (or a second event for the same order) never
 *    double-enrols, double-counts a coupon or double-pays a commission.
 *  - Amount check: the captured amount must equal the order total.
 *  - Everything that changes money/access happens in ONE database transaction.
 */
import "server-only";
import { db } from "@/lib/db";
import { siteUrl } from "@/lib/site-url";
import { addMinutes, formatIST } from "@/lib/time";
import { computeOrderCommission } from "@/server/commission";
import { higherTier } from "@/server/catalog";
import { createMagicLink } from "@/server/auth";
import { notify } from "@/server/notify";
import { getSettings } from "@/server/settings";
import { verifyWebhookSignature } from "./gateway";
import { reverseCommissionsForRefund } from "@/server/partners";
import { sendServerPurchaseEvents } from "@/server/analytics";
import type { Tier } from "@/generated/prisma/enums";

type RzPayment = { id: string; order_id: string; amount: number; fee?: number; tax?: number; status: string; email?: string; contact?: string; vpa?: string };
type RzRefund = { id: string; payment_id: string; amount: number; status?: string };
type RzEvent = { event: string; payload: { payment?: { entity: RzPayment }; refund?: { entity: RzRefund } } };

export type WebhookResult = { status: number; body: string };

export async function handleRazorpayWebhook(rawBody: string, signature: string | null, eventIdHeader: string | null, secret: string): Promise<WebhookResult> {
  if (!verifyWebhookSignature(rawBody, signature, secret)) return { status: 400, body: "invalid signature" };

  let evt: RzEvent;
  try {
    evt = JSON.parse(rawBody);
  } catch {
    return { status: 400, body: "bad json" };
  }
  const eventId = eventIdHeader ?? `${evt.event}:${evt.payload.payment?.entity.id ?? evt.payload.refund?.entity.id ?? "?"}`;

  // Idempotency gate #1: have we already processed this exact event?
  const seen = await db.webhookEvent.findUnique({ where: { id: eventId } });
  if (seen?.processedAt) return { status: 200, body: "duplicate" };
  if (!seen) {
    try {
      await db.webhookEvent.create({ data: { id: eventId, type: evt.event, payload: evt as never } });
    } catch {
      return { status: 200, body: "duplicate (race)" };
    }
  }

  try {
    let after: (() => Promise<void>) | null = null;
    switch (evt.event) {
      case "payment.captured":
      case "order.paid": {
        const p = evt.payload.payment?.entity;
        if (!p) throw new Error("payment entity missing");
        after = await fulfilPayment(p);
        break;
      }
      case "refund.processed": {
        const r = evt.payload.refund?.entity;
        if (r) await recordGatewayRefund(r);
        break;
      }
      case "payment.failed": {
        const p = evt.payload.payment?.entity;
        if (p) await db.order.updateMany({ where: { gatewayOrderId: p.order_id, status: "CREATED" }, data: { status: "FAILED" } });
        break;
      }
      default:
        break; // ignore events we don't use
    }
    await db.webhookEvent.update({ where: { id: eventId }, data: { processedAt: new Date(), error: null } });
    if (after) await after().catch((e) => console.error("post-purchase side effects failed", e));
    return { status: 200, body: "ok" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("webhook processing failed", eventId, msg);
    await db.webhookEvent.update({ where: { id: eventId }, data: { error: msg } });
    // 500 → Razorpay retries later.
    return { status: 500, body: "error" };
  }
}

/** Marks the order paid and grants access. Returns side-effects to run after commit (emails, pixels). */
export async function fulfilPayment(p: RzPayment): Promise<(() => Promise<void>) | null> {
  const settings = await getSettings();

  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { gatewayOrderId: p.order_id },
      include: { items: { include: { product: true } }, partner: { include: { user: true, rates: true } } },
    });
    if (!order) throw new Error(`order not found for ${p.order_id}`);

    // Idempotency gate #2: atomically flip CREATED/FAILED → PAID. Only one caller can win.
    if (p.amount !== order.totalPaise) throw new Error(`amount mismatch: paid ${p.amount}, expected ${order.totalPaise}`);
    const paidAt = new Date();
    const flipped = await tx.order.updateMany({
      where: { id: order.id, status: { in: ["CREATED", "FAILED"] } },
      data: { status: "PAID", paidAt, gatewayPaymentId: p.id, gatewayFeePaise: p.fee ?? null },
    });
    if (flipped.count === 0) return null; // already fulfilled

    // Account (guest checkout auto-creates it)
    const user = await tx.user.upsert({
      where: { email: order.email },
      create: { email: order.email, name: order.name, phone: order.phone },
      update: { name: undefined, phone: order.phone },
    });
    await tx.order.update({ where: { id: order.id }, data: { userId: user.id } });
    await tx.userRole.upsert({ where: { userId_role: { userId: user.id, role: "STUDENT" } }, create: { userId: user.id, role: "STUDENT" }, update: {} });

    // Access
    for (const item of order.items) {
      const prod = item.product;
      let tier: Tier | null = prod.tier;
      if (prod.kind === "SERVICE") {
        await tx.userRole.upsert({ where: { userId_role: { userId: user.id, role: "SERVICE_CLIENT" } }, create: { userId: user.id, role: "SERVICE_CLIENT" }, update: {} });
        tier = "DONE_WITH_YOU";
        // Client tracker: one project per paid Done-with-you order.
        await tx.serviceProject.upsert({ where: { orderId: order.id }, create: { orderId: order.id, userId: user.id }, update: {} });
      }
      if (prod.courseId && tier) {
        const existing = await tx.enrollment.findUnique({ where: { userId_courseId: { userId: user.id, courseId: prod.courseId } } });
        await tx.enrollment.upsert({
          where: { userId_courseId: { userId: user.id, courseId: prod.courseId } },
          create: { userId: user.id, courseId: prod.courseId, tier, orderId: order.id },
          update: { tier: higherTier(existing?.revokedAt ? null : existing?.tier, tier), revokedAt: null, orderId: order.id },
        });
      }
    }

    if (order.couponId) await tx.coupon.update({ where: { id: order.couponId }, data: { usedCount: { increment: 1 } } });
    await tx.checkout.updateMany({ where: { email: order.email, status: { in: ["OPEN", "ABANDONED"] } }, data: { status: "PAID" } });
    await tx.lead.updateMany({ where: { OR: [{ email: order.email }, { phone: order.phone }], status: "NEW" }, data: { status: "CONVERTED", convertedAt: paidAt } });

    // Partner commission: PENDING until commissionReleaseMinutes after payment (1 hour by default)
    let commission: { amountPaise: number; availableAt: Date } | null = null;
    // Self-purchase check at payment time: the payer's email, phone or UPI ID matching the partner's own = no commission.
    const last10 = (v?: string | null) => (v ?? "").replace(/\D/g, "").slice(-10);
    const partnerSelf =
      !!order.partner &&
      ((!!p.vpa && !!order.partner.upiId && p.vpa.trim().toLowerCase() === order.partner.upiId.trim().toLowerCase()) ||
        (last10(p.contact).length === 10 && last10(p.contact) === last10(order.partner.phone)) ||
        last10(order.phone) === last10(order.partner.phone) ||
        (!!p.email && p.email.trim().toLowerCase() === order.partner.user.email.toLowerCase()));
    if (partnerSelf) await tx.auditLog.create({ data: { actorId: null, action: "commission.blocked_self_purchase", entity: "Order", entityId: order.id, after: { partnerId: order.partnerId } } });
    if (order.partner && order.partner.status === "APPROVED" && !partnerSelf) {
      const rateFor = (productId: string, fallback: number) => order.partner!.rates.find((r) => r.productId === productId)?.rateBps ?? fallback;
      const c = computeOrderCommission({
        items: order.items.map((i) => ({ unitPaise: i.unitPaise, rateBps: rateFor(i.productId, i.product.defaultCommissionBps) })),
        subtotalPaise: order.subtotalPaise,
        totalPaise: order.totalPaise,
        taxPaise: order.taxPaise,
        gatewayFeePaise: p.fee ?? null,
      });
      if (c.amountPaise > 0) {
        const availableAt = addMinutes(paidAt, settings.commissionReleaseMinutes);
        await tx.commission.create({
          data: { partnerId: order.partner.id, orderId: order.id, basePaise: c.basePaise, rateBps: c.effectiveRateBps, amountPaise: c.amountPaise, availableAt },
        });
        commission = { amountPaise: c.amountPaise, availableAt };
      }
    }

    await tx.funnelEvent.create({
      data: { name: "payment_success", visitorId: order.visitorId, userId: user.id, partnerId: order.partnerId, campaign: order.campaign, props: { orderId: order.id, totalPaise: order.totalPaise } },
    });

    return { order, userId: user.id, commission };
  });

  if (!result) return null;
  const { order, commission } = result;

  return async () => {
    const loginUrl = await createMagicLink(order.email, "/dashboard");
    await notify(order.email, "purchaseConfirmation", {
      name: order.name,
      orderNumber: order.number,
      items: order.items.map((i) => i.name),
      totalPaise: order.totalPaise,
      loginUrl,
      supportWhatsapp: settings.supportWhatsapp,
    });
    if (commission && order.partner) {
      await notify(order.partner.user.email, "partnerNewSale", {
        name: order.partner.displayName,
        productName: order.items.map((i) => i.name).join(" + "),
        commissionPaise: commission.amountPaise,
        availableOn: formatIST(commission.availableAt, "datetime"),
        dashboardUrl: `${siteUrl()}/partner`,
      });
    }
    await sendServerPurchaseEvents(order);
  };
}

/** A refund done in the Razorpay dashboard (or via our admin) — mark order and reverse commission. */
async function recordGatewayRefund(r: RzRefund) {
  const { absorbRefunds } = await getSettings();
  const order = await db.order.findUnique({ where: { gatewayPaymentId: r.payment_id } });
  if (!order) throw new Error(`order not found for payment ${r.payment_id}`);
  await db.$transaction(async (tx) => {
    const existing = await tx.refund.findUnique({ where: { gatewayRefundId: r.id } });
    if (existing) await tx.refund.update({ where: { id: existing.id }, data: { status: "processed" } });
    else await tx.refund.create({ data: { orderId: order.id, amountPaise: r.amount, gatewayRefundId: r.id, status: "processed" } });

    const refunded = await tx.refund.aggregate({ where: { orderId: order.id, status: "processed" }, _sum: { amountPaise: true } });
    const full = (refunded._sum.amountPaise ?? 0) >= order.totalPaise;
    await tx.order.update({ where: { id: order.id }, data: { status: full ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
    if (full) {
      await tx.enrollment.updateMany({ where: { orderId: order.id }, data: { revokedAt: new Date() } });
      // Refunds are absorbed by Get Udaan by default: commissions (and team bonuses) stay.
      if (!absorbRefunds) await reverseCommissionsForRefund(tx, order.id);
    }
  });
}
