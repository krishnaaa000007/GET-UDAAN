/** Real testimonials + real recent purchases, for honest social proof. */
import "server-only";
import { db } from "@/lib/db";

/** Has this student already sent a result? (Who sent it, and when they agreed, is kept in the audit log.) */
export async function hasSharedResult(userId: string): Promise<boolean> {
  return (await db.auditLog.count({ where: { actorId: userId, action: "testimonial.submit" } })) > 0;
}

/** Published testimonials, but only once at least 3 real ones exist (same rule as the landing page). */
export async function getPublishedTestimonials() {
  const rows = await db.testimonial.findMany({ where: { published: true }, orderBy: { position: "asc" } });
  return rows.length >= 3 ? rows : [];
}

/** Real paid orders from the last 24 hours that have a city. Only city + time leave the server — never a name. */
export async function getRecentPurchases(limit = 5) {
  const since = new Date(Date.now() - 24 * 3_600_000);
  const rows = await db.order.findMany({ where: { status: "PAID", paidAt: { gt: since }, city: { not: null } }, orderBy: { paidAt: "desc" }, take: limit, select: { city: true, paidAt: true } });
  return rows.filter((r) => r.city && r.paidAt).map((r) => ({ city: r.city as string, at: (r.paidAt as Date).toISOString() }));
}
