"use server";

import { headers } from "next/headers";
import { hashIp } from "@/lib/crypto";
import { partnerApplicationSchema, submitPartnerApplication } from "@/server/partners";
import { rateLimit } from "@/server/rate-limit";

export async function applyAction(_: unknown, form: FormData): Promise<{ ok: boolean; error?: string }> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (!(await rateLimit(`apply:${hashIp(ip) ?? "anon"}`, 5, 3600)).ok) return { ok: false, error: "Bahut zyada attempts. Thodi der baad try karein." };
  const parsed = partnerApplicationSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  return submitPartnerApplication(parsed.data);
}
