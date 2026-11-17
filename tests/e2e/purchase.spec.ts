import { expect, test } from "@playwright/test";
import { login } from "./helpers";

const buyerEmail = `e2e.${Date.now()}@example.com`;

test("visitor from a partner reel buys the course and starts lesson 1; partner sees the sale", async ({ page, browser }) => {
  // 1. Arrive from a partner's reel
  await page.goto("/?ref=LIONBHAI&c=e2ereel");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/viral/i);

  // 2. Checkout — partner coupon is auto-applied
  await page.getByRole("link", { name: /mein Join Karo/ }).first().click();
  await expect(page).toHaveURL(/\/checkout\/basic/);
  await expect(page.getByText(/LIONBHAI laga/)).toBeVisible();
  await page.getByPlaceholder("Rahul Kumar").fill("E2E Buyer");
  await page.getByPlaceholder("98765 43210").fill("9811122233");
  await page.getByPlaceholder("aap@gmail.com").fill(buyerEmail);
  await expect(page.getByRole("button", { name: /₹450 Pay Karo/ })).toBeVisible(); // ₹499 − ₹49 (10%, whole rupees)
  await page.getByRole("button", { name: /Pay Karo/ }).click();

  // 3. Mock gateway → signed webhook → thank-you
  await expect(page).toHaveURL(/\/pay\/mock\//);
  await page.getByRole("button", { name: /payment successful/i }).click();
  await expect(page.getByRole("heading", { name: /Welcome to Get Udaan/i })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/Pro mein upgrade karo/i)).toBeVisible(); // one upsell

  // 4. Same browser is logged in automatically and lands in lesson 1 with a watermark
  await page.getByRole("button", { name: /Lesson 1 Shuru Karo/ }).click();
  await expect(page).toHaveURL(/\/learn\//);
  await expect(page.getByText("98XXXXX233")).toBeVisible();

  // 5. Partner sees the sale — masked, never the buyer's email
  const partnerCtx = await browser.newContext();
  const partner = await partnerCtx.newPage();
  await login(partner, "lionbhai.partner@example.com", "/partner");
  await expect(partner.getByText("E***").first()).toBeVisible();
  await expect(partner.getByText("e2ereel").first()).toBeVisible();
  expect(await partner.content()).not.toContain(buyerEmail);
  await partnerCtx.close();
});

test("an account stays logged in on max 2 devices; the oldest is logged out", async ({ browser }) => {
  const email = "student@example.com";
  const devices = [];
  for (let i = 0; i < 3; i++) {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await login(p, email, "/dashboard");
    devices.push({ ctx, p });
  }
  // Device 1 (oldest) is now logged out with an explanation
  await devices[0].p.goto("/dashboard");
  await expect(devices[0].p).toHaveURL(/\/login\?.*reason=device/);
  // Devices 2 and 3 still work
  await devices[2].p.goto("/dashboard");
  await expect(devices[2].p.getByText(/Logged-in devices \(2\/2\)/)).toBeVisible();
  for (const d of devices) await d.ctx.close();
});

test("partners and students cannot open admin pages", async ({ page }) => {
  await login(page, "lionbhai.partner@example.com", "/partner");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard\?denied=1/);
  const res = await page.request.get("/api/admin/export/orders");
  expect(res.status()).toBe(403);
});
