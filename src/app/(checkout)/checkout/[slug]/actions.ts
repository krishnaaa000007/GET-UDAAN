"use server";

import { cookies } from "next/headers";
import { previewCoupon, startCheckout, type CheckoutInput } from "@/server/checkout";
import { RateLimitError } from "@/server/rate-limit";
import { hmac } from "@/lib/crypto";

export async function previewCouponAction(productSlug: string, code: string) {
  if (!code.trim()) return { ok: false as const, reason: "Coupon code daaliye" };
  return previewCoupon(productSlug, code);
}

export async function startCheckoutAction(input: CheckoutInput) {
  try {
    const r = await startCheckout(input);
    if (r.ok) {
      // Remember which order THIS browser started, so the thank-you page can log the buyer in safely.
      const jar = await cookies();
      jar.set("rb_order", `${r.orderId}.${hmac(`order:${r.orderId}`).slice(0, 24)}`, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 6,
        path: "/",
      });
    }
    return r;
  } catch (e) {
    if (e instanceof RateLimitError) return { ok: false as const, error: e.message };
    console.error("checkout failed", e);
    return { ok: false as const, error: "Kuch gadbad ho gayi. Dobara try karein ya WhatsApp pe message karein." };
  }
}
