/**
 * Payment gateway abstraction.
 *  - "razorpay": real Razorpay (test or live keys)
 *  - "mock": local fake gateway. The /pay/mock page sends a REAL, correctly signed
 *            webhook to our own endpoint, so the exact production code path is tested.
 */
import "server-only";
import crypto from "node:crypto";
import { env } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";

export interface PaymentGateway {
  mode: "razorpay" | "mock";
  createOrder(p: { amountPaise: number; receipt: string; notes: Record<string, string> }): Promise<{ gatewayOrderId: string }>;
  refund(p: { paymentId: string; amountPaise: number; notes?: Record<string, string> }): Promise<{ refundId: string; status: string }>;
}

class RazorpayGateway implements PaymentGateway {
  mode = "razorpay" as const;
  private async client() {
    const Razorpay = (await import("razorpay")).default;
    if (!env.razorpay.keyId || !env.razorpay.keySecret) throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing");
    return new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });
  }
  async createOrder(p: { amountPaise: number; receipt: string; notes: Record<string, string> }) {
    const rz = await this.client();
    const o = await rz.orders.create({ amount: p.amountPaise, currency: "INR", receipt: p.receipt, notes: p.notes });
    return { gatewayOrderId: o.id };
  }
  async refund(p: { paymentId: string; amountPaise: number; notes?: Record<string, string> }) {
    const rz = await this.client();
    const r = await rz.payments.refund(p.paymentId, { amount: p.amountPaise, speed: "normal", notes: p.notes });
    return { refundId: r.id, status: r.status ?? "pending" };
  }
}

class MockGateway implements PaymentGateway {
  mode = "mock" as const;
  async createOrder() {
    return { gatewayOrderId: `order_mock_${crypto.randomBytes(8).toString("hex")}` };
  }
  async refund() {
    return { refundId: `rfnd_mock_${crypto.randomBytes(8).toString("hex")}`, status: "processed" };
  }
}

export function gateway(): PaymentGateway {
  return env.paymentsMode === "razorpay" ? new RazorpayGateway() : new MockGateway();
}

/** Razorpay webhook signature = HMAC-SHA256(raw body, webhook secret), hex. */
export function signWebhook(rawBody: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyWebhookSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  return safeEqual(signWebhook(rawBody, secret), signature);
}
