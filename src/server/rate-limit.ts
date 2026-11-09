/**
 * Simple fixed-window rate limiter in Postgres (one atomic upsert per check).
 * Example: rateLimit(`otp:${email}`, 5, 15 * 60) → max 5 per 15 minutes.
 */

import { db } from "@/lib/db";

export async function rateLimit(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; remaining: number }> {
  const now = new Date();
  const windowStart = new Date(Math.floor(now.getTime() / (windowSec * 1000)) * windowSec * 1000);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "windowStart", "count") VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" = EXCLUDED."windowStart" THEN "RateLimit"."count" + 1 ELSE 1 END,
      "windowStart" = EXCLUDED."windowStart"
    RETURNING "count"`;
  const count = Number(rows[0]?.count ?? 1);
  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}

export class RateLimitError extends Error {
  constructor(msg = "Bahut zyada attempts. Thodi der baad try karein.") {
    super(msg);
  }
}

export async function enforceRateLimit(key: string, limit: number, windowSec: number) {
  const r = await rateLimit(key, limit, windowSec);
  if (!r.ok) throw new RateLimitError();
}
