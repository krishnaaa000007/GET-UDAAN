import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

/** Reads the newest dev email (./.local-mail) for an address and returns the 6-digit code. */
export async function latestOtp(email: string, after: number): Promise<string> {
  const dir = path.resolve(".local-mail");
  const key = email.replace(/[^a-z0-9]/gi, "_");
  for (let i = 0; i < 40; i++) {
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.includes(key) && Number(f.split("-")[0]) >= after) : [];
    for (const f of files.sort().reverse()) {
      const m = fs.readFileSync(path.join(dir, f), "utf8").match(/letter-spacing:8px">(\d{6})/);
      if (m) return m[1];
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`no OTP email for ${email}`);
}

export async function login(page: Page, email: string, next = "/dashboard") {
  const t = Date.now() - 1000;
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByPlaceholder("aap@gmail.com").fill(email);
  await page.getByRole("button", { name: /Login code bhejo/ }).click();
  const code = await latestOtp(email, t);
  await page.getByPlaceholder("••••••").fill(code);
  await page.getByRole("button", { name: /Login karein/ }).click();
  await expect(page).toHaveURL(new RegExp(next.replace(/[/?]/g, "\\$&")));
}
