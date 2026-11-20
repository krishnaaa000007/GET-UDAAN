import { expect, test } from "@playwright/test";
import { latestOtp, login } from "./helpers";

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
  await expect(page.getByText(/Done-for-you mein upgrade karo/i)).toBeVisible(); // one upsell

  // 4. Same browser is logged in automatically and lands in lesson 1 with a watermark
  await page.getByRole("button", { name: /Lesson 1 Shuru Karo/ }).click();
  await expect(page).toHaveURL(/\/learn\//);
  await expect(page.getByText("98XXXXX233")).toBeVisible();

  // 5. Partner sees the sale — masked, never the buyer's email
  const partnerCtx = await browser.newContext();
  const partner = await partnerCtx.newPage();
  await login(partner, "lionbhai.partner@example.com", "/partner");
  await partner.goto("/partner?tab=sales"); // sales live on their own tab
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
  await devices[2].p.goto("/dashboard/profile"); // devices live on the Profile page
  await expect(devices[2].p.getByText(/Logged-in devices \(2\/2\)/)).toBeVisible();
  for (const d of devices) await d.ctx.close();
});

test("partners and students cannot open admin pages", async ({ page }) => {
  await login(page, "lionbhai.partner@example.com", "/partner");
  await page.goto("/admin");
  // A partner with no course lands on Profile, which explains they cannot open that page.
  await expect(page).toHaveURL(/\/dashboard(\/profile)?\?denied=1/);
  await expect(page.getByRole("alert")).toBeVisible();
  const res = await page.request.get("/api/admin/export/orders");
  expect(res.status()).toBe(403);
});

test("masterclass → FIRST100 auto-applied → pay; partner keeps the credit and sees it pending for ~1 hour", async ({ page, browser }) => {
  const email = `e2e.mc.${Date.now()}@example.com`;
  // Came from a partner's reel first, then watched the masterclass
  await page.goto("/?ref=LIONBHAI&c=mcflow");
  await page.goto("/masterclass");
  await expect(page.getByText(/Pehle 100 students/)).toBeVisible();
  await page.locator('[data-cta="masterclass_first100"]').click();

  await expect(page).toHaveURL(/\/checkout\/basic\?coupon=FIRST100/);
  await expect(page.getByText(/FIRST100 laga/)).toBeVisible();
  await page.getByPlaceholder("Rahul Kumar").fill("Mc Buyer");
  await page.getByPlaceholder("98765 43210").fill("9811122244");
  await page.getByPlaceholder("aap@gmail.com").fill(email);
  await expect(page.getByRole("button", { name: /₹450 Pay Karo/ })).toBeVisible();
  await page.getByRole("button", { name: /Pay Karo/ }).click();
  await expect(page).toHaveURL(/\/pay\/mock\//);
  await page.getByRole("button", { name: /payment successful/i }).click();
  await expect(page.getByRole("heading", { name: /Welcome to Get Udaan/i })).toBeVisible({ timeout: 30_000 });

  // FIRST100 is not a partner coupon, so LIONBHAI's link still gets the sale; it shows as pending with a release time
  const ctx = await browser.newContext();
  const partner = await ctx.newPage();
  await login(partner, "lionbhai.partner@example.com", "/partner");
  await partner.goto("/partner?tab=sales");
  const row = partner.locator("li", { hasText: "mcflow" }).first();
  await expect(row).toBeVisible();
  await expect(row.getByText(/tak wallet mein/)).toBeVisible();
  await expect(row.getByText("Pending")).toBeVisible();
  expect(await partner.content()).not.toContain(email);
  await ctx.close();
});

test("invite link pre-fills the apply form with the inviter's name", async ({ page }) => {
  await page.goto("/j/lionbhai");
  await expect(page).toHaveURL(/\/partners\?invite=LIONBHAI/);
  await page.getByLabel("Poora naam").fill("Invite Tester");
  await page.getByLabel("Email").fill(`e2e.inv.${Date.now()}@example.com`);
  await page.getByLabel("WhatsApp number").fill("9811122255");
  await page.getByRole("button", { name: /Aage Badho/ }).click();
  await page.getByPlaceholder("yourpage").fill("invitetester");
  await page.getByPlaceholder("50000").fill("1200");
  await page.getByRole("button", { name: /Aage Badho/ }).click();
  // Step 3 is shown (not auto-submitted) with the inviter pre-filled
  await expect(page.getByText(/ne invite kiya/)).toContainText("Lion Bhai Official");
  await expect(page.getByRole("button", { name: /Application Bhejo/ })).toBeVisible();
});

test("student app: Home, My Courses, Explore and Profile are real pages with a bottom tab bar", async ({ page }) => {
  await login(page, "student@example.com", "/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Namaste/);
  await expect(page.getByText(/Continue watching|Shuru karo/i).first()).toBeVisible();
  const tabs = page.getByRole("navigation", { name: "App tabs" });
  await tabs.getByRole("link", { name: "Courses", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard\/courses$/);
  await tabs.getByRole("link", { name: "Explore" }).click();
  await expect(page).toHaveURL(/\/dashboard\/explore$/);
  await expect(page.getByText(/Upgrade|Naya|Aapke paas hai/).first()).toBeVisible();
  await tabs.getByRole("link", { name: "Profile" }).click();
  await expect(page.getByText(/Logged-in devices/)).toBeVisible();
});

test("login Partner tab lands on the partner Home with the Student/Partner switch", async ({ page }) => {
  const t = Date.now() - 1000;
  await page.goto("/login?as=partner");
  await expect(page.getByRole("heading", { name: /Partner login/i })).toBeVisible();
  await page.getByPlaceholder("aap@gmail.com").fill("lionbhai.partner@example.com");
  await page.getByRole("button", { name: /Login code bhejo/ }).click();
  await page.getByPlaceholder("••••••").fill(await latestOtp("lionbhai.partner@example.com", t));
  await page.getByRole("button", { name: /Login karein/ }).click();
  await expect(page).toHaveURL(/\/partner$/);
  await expect(page.getByRole("group", { name: "Mode badlo" }).first()).toBeVisible();
});

test("upgrade: a Pro owner sees Done-for-you at the difference (₹1,499 − ₹499 = ₹1,000), email locked", async ({ page }) => {
  await login(page, "student@example.com", "/dashboard");
  await page.goto("/checkout/pro");
  await expect(page.getByText(/pehle se hai/)).toBeVisible();
  await expect(page.getByRole("button", { name: /₹1,000 Pay Karo/ })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAttribute("readonly", "");
});
