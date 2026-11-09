import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against the dev server + the seeded dev database, with PAYMENTS_MODE=mock.
 *   npm run db:start        (other terminal)
 *   npm run db:seed
 *   npm run test:e2e
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  // channel "msedge" uses the Microsoft Edge already installed on Windows (no browser download needed).
  // On Mac/Linux/CI remove `channel` and run `npx playwright install chromium` once.
  use: { baseURL: "http://localhost:3000", ...devices["Pixel 7"], channel: process.platform === "win32" ? "msedge" : undefined, trace: "retain-on-failure" },
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 180_000 },
});
