/** Products, prices and tiers — read helpers shared by landing, checkout and admin. */
import "server-only";
import { db } from "@/lib/db";
import { activePrice, nextPrice } from "@/server/pricing";
import type { Tier } from "@/generated/prisma/enums";

export const TIER_RANK: Record<Tier, number> = { BASIC: 1, PRO: 2, DONE_WITH_YOU: 3 };

export function higherTier(a: Tier | null | undefined, b: Tier): Tier {
  if (!a) return b;
  return TIER_RANK[a] >= TIER_RANK[b] ? a : b;
}

export async function getProductWithPrice(slug: string, now = new Date()) {
  const product = await db.product.findUnique({ where: { slug }, include: { prices: true } });
  if (!product || !product.active) return null;
  const price = activePrice(product.prices, now);
  if (!price) return null;
  return { product, price, next: nextPrice(product.prices, now) };
}

/** All active products (pricing table + checkout). */
export async function listProducts(now = new Date()) {
  const products = await db.product.findMany({ where: { active: true }, include: { prices: true }, orderBy: { position: "asc" } });
  return products
    .map((p) => ({ product: p, price: activePrice(p.prices, now), next: nextPrice(p.prices, now) }))
    .filter((x) => x.price !== null) as { product: (typeof products)[number]; price: NonNullable<ReturnType<typeof activePrice>>; next: ReturnType<typeof nextPrice> }[];
}
