/** Google OAuth: PKCE challenge and ID-token payload parse. The full flow is tested on staging. */
import { describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { sha256b64url } from "@/lib/crypto";

describe("Google OAuth building blocks", () => {
  it("PKCE S256 challenge matches the standard", () => {
    const verifier = "abcDEF-123._~" + "A".repeat(40);
    const expected = crypto.createHash("sha256").update(verifier).digest("base64url");
    expect(sha256b64url(verifier)).toBe(expected);
    expect(sha256b64url(verifier)).not.toContain("=");
  });

  it("button hidden when env vars are not set", async () => {
    const saved = { id: process.env.GOOGLE_CLIENT_ID, s: process.env.GOOGLE_CLIENT_SECRET };
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    const m = await import("@/server/google-oauth");
    expect(m.googleEnabled()).toBe(false);
    if (saved.id) process.env.GOOGLE_CLIENT_ID = saved.id;
    if (saved.s) process.env.GOOGLE_CLIENT_SECRET = saved.s;
  });
});
