/**
 * Pricing rules (pure functions — no database). Tested in tests/unit/pricing.test.ts
 */
import { applyBps, type Paise } from "@/lib/money";

export type PriceRow = { amountPaise: number; label: string | null; startsAt: Date; endsAt: Date | null };

/**
 * The price that applies right now: newest row that has started and not ended.
 * A launch price = a row with a real endsAt; once it passes, the next valid row wins automatically.
 */
export function activePrice<T extends PriceRow>(rows: T[], now = new Date()): T | null {
  const valid = rows
    .filter((r) => r.startsAt <= now && (!r.endsAt || r.endsAt > now))
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime());
  return valid[0] ?? null;
}

/**
 * The price that will apply after the current one ends — used to show an HONEST
 * "₹499 till Sunday, then ₹999" message. Returns null when there is no real deadline.
 */
export function nextPrice<T extends PriceRow>(rows: T[], now = new Date()): T | null {
  const current = activePrice(rows, now);
  if (!current?.endsAt) return null;
  return activePrice(rows, new Date(current.endsAt.getTime() + 1000));
}

export type CouponLike = {
  code: string;
  kind: "PERCENT" | "FLAT";
  value: number;
  active: boolean;
  maxUses: number | null;
  usedCount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  productSlugs: unknown;
};

export type CouponCheck = { ok: true; discountPaise: Paise } | { ok: false; reason: string };

/** Validate a coupon for a product and compute the discount (never more than the price, never below ₹1). */
export function evaluateCoupon(coupon: CouponLike | null, productSlug: string, pricePaise: Paise, now = new Date()): CouponCheck {
  if (!coupon || !coupon.active) return { ok: false, reason: "Ye coupon valid nahi hai" };
  if (coupon.startsAt && coupon.startsAt > now) return { ok: false, reason: "Ye coupon abhi active nahi hua" };
  if (coupon.endsAt && coupon.endsAt <= now) return { ok: false, reason: "Ye coupon expire ho gaya" };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return { ok: false, reason: "Is coupon ki limit khatam ho gayi" };
  if (Array.isArray(coupon.productSlugs) && !coupon.productSlugs.includes(productSlug))
    return { ok: false, reason: "Ye coupon is product pe lagu nahi hota" };

  // Percent discounts are rounded DOWN to whole rupees so prices look clean (₹449, not ₹449.10).
  const raw = coupon.kind === "PERCENT" ? Math.floor(applyBps(pricePaise, coupon.value) / 100) * 100 : coupon.value;
  // Keep at least ₹1 payable so the gateway accepts it.
  const discountPaise = Math.max(0, Math.min(raw, pricePaise - 100));
  return { ok: true, discountPaise };
}

/**
 * GST split. Prices are shown GST-INCLUSIVE. If not registered, tax = 0.
 * total 49900 at 18% → tax = 49900 − round(49900/1.18) = 7612
 */
export function gstIncluded(totalPaise: Paise, gstRegistered: boolean, rateBps = 1800): Paise {
  if (!gstRegistered) return 0;
  const base = Math.round((totalPaise * 10_000) / (10_000 + rateBps));
  return totalPaise - base;
}

export type CartLine = { productSlug: string; name: string; unitPaise: Paise; kind: "MAIN" | "BUMP" | "UPSELL" };

export function cartTotals(lines: CartLine[], discountPaise: Paise, gstRegistered: boolean) {
  const subtotalPaise = lines.reduce((s, l) => s + l.unitPaise, 0);
  const totalPaise = subtotalPaise - discountPaise;
  const taxPaise = gstIncluded(totalPaise, gstRegistered);
  return { subtotalPaise, discountPaise, totalPaise, taxPaise };
}
