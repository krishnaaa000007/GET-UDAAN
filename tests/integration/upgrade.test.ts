/**
 * Upgrade pricing: an owner of a lower tier pays only the difference (new tier price − owned tier price).
 * Test catalog prices: BASIC ₹499, PRO ₹1,999 → upgrade ₹1,500. (On the live site: Pro ₹499 → Done-for-you ₹1,499 = ₹1,000.)
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { makeCatalog, resetDb } from "./helpers";
import { tierNames } from "@/server/student-app";
import { upgradeCredit, upgradedPrice } from "@/server/upgrade";

beforeEach(resetDb);

async function student(tier?: "BASIC" | "PRO", revoked = false) {
  const { course, basic, pro } = await makeCatalog();
  const user = await db.user.create({ data: { email: "s@x.in", name: "S" } });
  if (tier) await db.enrollment.create({ data: { userId: user.id, courseId: course.id, tier, revokedAt: revoked ? new Date() : null } });
  return { user, basic, pro, course };
}

describe("upgrade price", () => {
  it("lower-tier owner pays only the difference", async () => {
    const { user, pro } = await student("BASIC");
    const credit = await upgradeCredit(user.id, pro);
    expect(credit).toMatchObject({ creditPaise: 49900, fromTier: "BASIC", fromName: "Basic" });
    expect(upgradedPrice(199900, credit)).toBe(150000);
  });

  it("no credit when not logged in, not enrolled, refunded, or buying the same/lower tier", async () => {
    const { user, basic, pro } = await student();
    expect(await upgradeCredit(null, pro)).toBeNull();
    expect(await upgradeCredit(user.id, pro)).toBeNull(); // owns nothing
    await resetDb();
    const r = await student("BASIC", true);
    expect(await upgradeCredit(r.user.id, r.pro)).toBeNull(); // access revoked (refunded)
    await resetDb();
    const owner = await student("PRO");
    expect(await upgradeCredit(owner.user.id, owner.pro)).toBeNull(); // already has it
    expect(await upgradeCredit(owner.user.id, owner.basic)).toBeNull(); // lower tier is not an upgrade
    expect(basic).toBeTruthy();
  });

  it("uses today's price of the owned tier (a newer price row wins)", async () => {
    const { user, basic, pro } = await student("BASIC");
    await db.price.updateMany({ where: { productId: basic.id }, data: { startsAt: new Date(Date.now() - 86_400_000) } }); // old price: since yesterday
    await db.price.create({ data: { productId: basic.id, amountPaise: 59900, startsAt: new Date(Date.now() - 1000) } }); // new price: since now
    expect((await upgradeCredit(user.id, pro))?.creditPaise).toBe(59900);
  });

  it("plan badges use the product name, not the internal tier code", async () => {
    const { course, basic } = await student("BASIC");
    await db.product.update({ where: { id: basic.id }, data: { name: "Pro" } });
    const nameOf = await tierNames([course.id]);
    expect(nameOf(course.id, "BASIC")).toBe("Pro");
    expect(nameOf("other", "DONE_WITH_YOU")).toBe("DONE WITH YOU");
  });
});
