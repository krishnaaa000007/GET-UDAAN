/**
 * CHECKOUT — creates a pending Order and a gateway order.
 * Prices, coupons and attribution are ALWAYS computed here on the server;
 * nothing the browser sends about money is trusted.
 */
import "server-only";
import { z } from "zod";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { hashIp } from "@/lib/crypto";
import { normalizeEmail } from "@/server/auth";
import { cartTotals, evaluateCoupon, type CartLine } from "@/server/pricing";
import { decodeRefCookie, resolveAttribution } from "@/server/attribution";
import { getProductWithPrice } from "@/server/catalog";
import { getSettings } from "@/server/settings";
import { gateway } from "@/server/payments/gateway";
import { enforceRateLimit } from "@/server/rate-limit";
import { env } from "@/lib/env";

export const checkoutSchema = z.object({
  productSlug: z.string().min(1).max(60),
  name: z.string().trim().min(2, "Apna naam likhiye").max(80),
  phone: z
    .string()
    .transform((s) => s.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""))
    .refine((s) => /^[6-9]\d{9}$/.test(s), "10 digit ka sahi mobile number daaliye"),
  email: z.string().trim().toLowerCase().email("Sahi email daaliye"),
  coupon: z.string().trim().max(40).optional().default(""),
  bumpSlugs: z.array(z.string().max(60)).max(3).optional().default([]),
});
export type CheckoutInput = z.input<typeof checkoutSchema>;

export type CouponPreview = { ok: true; code: string; discountPaise: number; totalPaise: number } | { ok: false; reason: string };

/** Live coupon check for the checkout form (no order created). */
export async function previewCoupon(productSlug: string, code: string): Promise<CouponPreview> {
  const p = await getProductWithPrice(productSlug);
  if (!p) return { ok: false, reason: "Product nahi mila" };
  const coupon = await db.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  const r = evaluateCoupon(coupon, productSlug, p.price.amountPaise);
  if (!r.ok) return r;
  return { ok: true, code: coupon!.code, discountPaise: r.discountPaise, totalPaise: p.price.amountPaise - r.discountPaise };
}

export type StartCheckoutResult =
  | {
      ok: true;
      orderId: string;
      gatewayOrderId: string;
      amountPaise: number;
      mode: "razorpay" | "mock";
      keyId: string | null;
      prefill: { name: string; email: string; contact: string };
      description: string;
    }
  | { ok: false; error: string; field?: string };

export async function startCheckout(raw: CheckoutInput): Promise<StartCheckoutResult> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: String(issue.path[0] ?? "") };
  }
  const input = parsed.data;
  const email = normalizeEmail(input.email);
  const h = await headers();
  const jar = await cookies();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await enforceRateLimit(`checkout:${hashIp(ip) ?? email}`, 15, 10 * 60);

  const settings = await getSettings();
  const main = await getProductWithPrice(input.productSlug);
  if (!main) return { ok: false, error: "Ye product abhi available nahi hai" };

  // Order bump add-ons (only ADDON products are allowed as bumps).
  const lines: CartLine[] = [{ productSlug: main.product.slug, name: main.product.name, unitPaise: main.price.amountPaise, kind: "MAIN" }];
  const productIds: Record<string, string> = { [main.product.slug]: main.product.id };
  for (const slug of [...new Set(input.bumpSlugs)]) {
    const b = await getProductWithPrice(slug);
    if (b && b.product.kind === "ADDON") {
      lines.push({ productSlug: slug, name: b.product.name, unitPaise: b.price.amountPaise, kind: "BUMP" });
      productIds[slug] = b.product.id;
    }
  }

  // Coupon (applies to the main product only).
  let couponId: string | null = null;
  let couponPartnerId: string | null = null;
  let discountPaise = 0;
  if (input.coupon) {
    const coupon = await db.coupon.findUnique({ where: { code: input.coupon.toUpperCase() } });
    const r = evaluateCoupon(coupon, main.product.slug, main.price.amountPaise);
    if (!r.ok) return { ok: false, error: r.reason, field: "coupon" };
    discountPaise = r.discountPaise;
    couponId = coupon!.id;
    couponPartnerId = coupon!.partnerId;
  }
  const totals = cartTotals(lines, discountPaise, settings.gstRegistered);

  // ── Attribution snapshot ──
  const ref = decodeRefCookie(jar.get("rb_ref")?.value);
  const refPartner = ref ? await db.partner.findUnique({ where: { code: ref.code }, select: { id: true } }) : null;
  const existingUser = await db.user.findUnique({ where: { email }, select: { id: true } });
  const lead = await db.lead.findFirst({
    where: { partnerId: { not: null }, OR: [{ email }, { phone: input.phone }] },
    orderBy: { createdAt: "desc" },
  });
  const partnerIds = [couponPartnerId, refPartner?.id, lead?.partnerId].filter(Boolean) as string[];
  const partnerRows = await db.partner.findMany({ where: { id: { in: partnerIds } }, include: { user: { select: { email: true } } } });
  const attribution = resolveAttribution({
    now: new Date(),
    windowDays: settings.attributionWindowDays,
    buyer: { userId: existingUser?.id ?? null, email, phone: input.phone },
    coupon: couponPartnerId ? { partnerId: couponPartnerId } : null,
    cookie: ref && refPartner ? { partnerId: refPartner.id, clickId: ref.clickId, campaign: ref.campaign, at: ref.at } : null,
    lead: lead?.partnerId ? { id: lead.id, partnerId: lead.partnerId, campaign: lead.campaign, at: lead.createdAt } : null,
    partners: Object.fromEntries(partnerRows.map((p) => [p.id, { status: p.status, userId: p.userId, email: p.user.email, phone: p.phone }])),
  });

  const visitorId = jar.get("rb_vid")?.value ?? null;
  const visitor = visitorId ? await db.visitor.findUnique({ where: { id: visitorId } }) : null;

  // ── Create order + checkout record ──
  const order = await db.order.create({
    data: {
      email,
      phone: input.phone,
      name: input.name,
      subtotalPaise: totals.subtotalPaise,
      discountPaise: totals.discountPaise,
      taxPaise: totals.taxPaise,
      totalPaise: totals.totalPaise,
      couponId,
      partnerId: attribution.partnerId,
      attributionSource: attribution.source,
      clickId: attribution.clickId,
      leadId: attribution.leadId,
      campaign: attribution.campaign,
      visitorId,
      utmSource: visitor?.utmSource,
      utmMedium: visitor?.utmMedium,
      utmCampaign: visitor?.utmCampaign,
      city: decodeURIComponent(h.get("x-vercel-ip-city") ?? "") || null,
      items: { create: lines.map((l) => ({ productId: productIds[l.productSlug], name: l.name, kind: l.kind, unitPaise: l.unitPaise })) },
    },
  });

  // One open checkout per email+product (updated, not duplicated) — used for abandoned-cart recovery.
  const open = await db.checkout.findFirst({ where: { email, productSlug: main.product.slug, status: "OPEN" } });
  if (open) await db.checkout.update({ where: { id: open.id }, data: { orderId: order.id, name: input.name, phone: input.phone, visitorId } });
  else await db.checkout.create({ data: { email, phone: input.phone, name: input.name, productSlug: main.product.slug, orderId: order.id, visitorId } });

  await db.funnelEvent.create({
    data: { name: "checkout_start", visitorId, partnerId: attribution.partnerId, campaign: attribution.campaign, path: `/checkout/${main.product.slug}`, props: { orderId: order.id, totalPaise: totals.totalPaise } },
  });

  const gw = gateway();
  const { gatewayOrderId } = await gw.createOrder({ amountPaise: totals.totalPaise, receipt: `rb_${order.number}`, notes: { orderId: order.id } });
  await db.order.update({ where: { id: order.id }, data: { gatewayOrderId } });

  return {
    ok: true,
    orderId: order.id,
    gatewayOrderId,
    amountPaise: totals.totalPaise,
    mode: gw.mode,
    keyId: gw.mode === "razorpay" ? env.razorpay.keyId : null,
    prefill: { name: input.name, email, contact: `+91${input.phone}` },
    description: lines.map((l) => l.name).join(" + "),
  };
}
