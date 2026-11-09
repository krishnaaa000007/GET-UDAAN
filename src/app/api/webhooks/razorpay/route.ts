/**
 * Razorpay webhook endpoint. In Razorpay Dashboard → Webhooks add:
 *   URL:    https://yourdomain.com/api/webhooks/razorpay
 *   Secret: same as RAZORPAY_WEBHOOK_SECRET
 *   Events: payment.captured, order.paid, payment.failed, refund.processed
 * A purchase is confirmed ONLY here (never from the browser).
 */
import { NextResponse, type NextRequest } from "next/server";
import { handleRazorpayWebhook } from "@/server/payments/fulfil";
import { env } from "@/lib/env";

export async function POST(req: NextRequest) {
  const raw = await req.text(); // raw body is required for signature verification
  const r = await handleRazorpayWebhook(raw, req.headers.get("x-razorpay-signature"), req.headers.get("x-razorpay-event-id"), env.razorpay.webhookSecret);
  return new NextResponse(r.body, { status: r.status });
}
