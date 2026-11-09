"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { requestOtp, verifyOtp } from "@/server/auth";
import { RateLimitError } from "@/server/rate-limit";

const emailSchema = z.string().trim().toLowerCase().email();

export async function sendCodeAction(_: unknown, form: FormData): Promise<{ ok: boolean; email?: string; error?: string }> {
  const parsed = emailSchema.safeParse(form.get("email"));
  if (!parsed.success) return { ok: false, error: "Sahi email address daaliye" };
  try {
    await requestOtp(parsed.data);
    return { ok: true, email: parsed.data };
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Code bhejne mein dikkat aayi. Thodi der baad try karein." };
  }
}

/** Only allow redirects to our own pages (prevents open-redirect phishing). */
function safeNext(next: unknown): string {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
}

export async function verifyCodeAction(_: unknown, form: FormData): Promise<{ ok: boolean; error?: string }> {
  const email = emailSchema.safeParse(form.get("email"));
  const code = String(form.get("code") ?? "");
  if (!email.success || !/^\d{6}$/.test(code.replace(/\D/g, ""))) return { ok: false, error: "6 digit ka code daaliye" };
  let result;
  try {
    result = await verifyOtp(email.data, code);
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false, error: e.message };
    throw e;
  }
  if (!result.ok) return { ok: false, error: result.error };
  redirect(safeNext(form.get("next")));
}
