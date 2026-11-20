/**
 * UPGRADE PRICING — someone who already owns a lower tier of a course pays only the difference.
 *   upgrade price = today's price of the new tier − today's price of the tier they own
 *   e.g. Done-for-you ₹1,499 − Pro ₹499 = ₹1,000
 * Uses today's list prices (simple and predictable; what they actually paid with a coupon is not looked up).
 * Only for a logged-in account: the upgrade lands on that account, so nobody can borrow someone else's credit.
 */
import "server-only";
import { db } from "@/lib/db";
import { activePrice } from "@/server/pricing";
import { tierAllows } from "@/server/learning";
import type { Tier } from "@/generated/prisma/enums";

export type UpgradeCredit = { creditPaise: number; fromTier: Tier; fromName: string };

type ProductLike = { kind: string; courseId: string | null; tier: Tier | null };

/** Credit for buying `product` when the user already owns a LOWER tier of the same course; null otherwise. */
export async function upgradeCredit(userId: string | null | undefined, product: ProductLike, now = new Date()): Promise<UpgradeCredit | null> {
  if (!userId || product.kind !== "COURSE_TIER" || !product.courseId || !product.tier) return null;
  const owned = await db.enrollment.findUnique({ where: { userId_courseId: { userId, courseId: product.courseId } }, select: { tier: true, revokedAt: true } });
  if (!owned || owned.revokedAt) return null;
  if (tierAllows(owned.tier, product.tier)) return null; // already has this tier or higher — not an upgrade
  const ownedProduct = await db.product.findFirst({
    where: { courseId: product.courseId, tier: owned.tier, kind: "COURSE_TIER" },
    include: { prices: true },
  });
  const price = ownedProduct ? activePrice(ownedProduct.prices, now) : null;
  if (!ownedProduct || !price) return null;
  return { creditPaise: price.amountPaise, fromTier: owned.tier, fromName: ownedProduct.name };
}

/** Never below ₹1 — a 0 or negative price means it isn't really an upgrade. */
export function upgradedPrice(pricePaise: number, credit: UpgradeCredit | null): number {
  return credit ? Math.max(0, pricePaise - credit.creditPaise) : pricePaise;
}
