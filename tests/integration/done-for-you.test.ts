/** Done-for-you buyers (course tier PRO, incl. upgrades) get a project page to work with the team. */
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { makeCatalog, makeOrder, payment, resetDb, sendWebhook } from "./helpers";
import { getClientProject, SERVICE_STAGES } from "@/server/service";

beforeEach(resetDb);

async function buy(slug: "basic" | "pro", email = "buyer@gmail.com", n = 1) {
  const { basic, pro } = await makeCatalog().catch(async () => ({ basic: await db.product.findUniqueOrThrow({ where: { slug: "basic" } }), pro: await db.product.findUniqueOrThrow({ where: { slug: "pro" } }) }));
  const product = slug === "basic" ? basic : pro;
  const price = slug === "basic" ? 49900 : 149900;
  await makeOrder({ productId: product.id, price, email, gatewayOrderId: `o${n}` });
  await sendWebhook("payment.captured", payment(`o${n}`, price, `pay_${n}`));
  return db.user.findUniqueOrThrow({ where: { email }, include: { roles: true } });
}

describe("Done-for-you project page", () => {
  it("buying Done-for-you creates the project and the role", async () => {
    const user = await buy("pro");
    expect(await db.serviceProject.count({ where: { userId: user.id } })).toBe(1);
    expect(user.roles.map((r) => r.role)).toContain("SERVICE_CLIENT");
  });

  it("buying Pro (tier BASIC) does not", async () => {
    const user = await buy("basic");
    expect(await db.serviceProject.count()).toBe(0);
    expect(user.roles.map((r) => r.role)).not.toContain("SERVICE_CLIENT");
  });

  it("upgrading from Pro to Done-for-you creates it; webhook replay doesn't make a second one", async () => {
    const user = await buy("basic", "u@x.in", 1);
    await buy("pro", "u@x.in", 2);
    await sendWebhook("payment.captured", payment("o2", 149900, "pay_2"), "evt_replay");
    expect(await db.serviceProject.count({ where: { userId: user.id } })).toBe(1);
  });

  it("someone who bought before project pages existed gets one when they open it", async () => {
    const user = await buy("pro");
    await db.serviceProject.deleteMany();
    await db.userRole.deleteMany({ where: { role: "SERVICE_CLIENT" } });
    const p = await getClientProject(user.id);
    expect(p?.stage).toBe(0);
    expect(await db.userRole.count({ where: { userId: user.id, role: "SERVICE_CLIENT" } })).toBe(1);
  });

  it("has the 5 Done-for-you stages, starting with onboarding", () => {
    expect(SERVICE_STAGES).toHaveLength(5);
    expect(SERVICE_STAGES[0].title).toBe("Onboarding");
  });
});
