/**
 * TEST-ONLY fake payment screen (PAYMENTS_MODE=mock). Lets you test the whole
 * purchase flow locally without a Razorpay account. It sends a properly signed
 * webhook to our real webhook endpoint — the same path production uses.
 */
import { FlaskConical } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import t from "@/content/hi-Latn/checkout.json";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { formatINR } from "@/lib/money";
import { signWebhook } from "@/server/payments/gateway";

async function mockPay(form: FormData) {
  "use server";
  if (env.paymentsMode !== "mock") notFound();
  const orderId = String(form.get("orderId"));
  const outcome = String(form.get("outcome"));
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order?.gatewayOrderId) notFound();

  const paymentId = `pay_mock_${Date.now()}`;
  const fee = Math.round(order.totalPaise * 0.0236); // simulate ~2% + GST gateway fee
  const event = outcome === "success" ? "payment.captured" : "payment.failed";
  const body = JSON.stringify({
    entity: "event",
    event,
    payload: { payment: { entity: { id: paymentId, order_id: order.gatewayOrderId, amount: order.totalPaise, fee, tax: Math.round(fee * 0.18 / 1.18), status: outcome === "success" ? "captured" : "failed", method: "upi" } } },
  });
  await fetch(`${env.appUrl}/api/webhooks/razorpay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-razorpay-signature": signWebhook(body, env.razorpay.webhookSecret), "x-razorpay-event-id": `evt_mock_${paymentId}` },
    body,
  });
  redirect(outcome === "success" ? `/thank-you/${orderId}` : `/checkout/${(await db.orderItem.findFirst({ where: { orderId, kind: "MAIN" }, include: { product: true } }))?.product.slug ?? "basic"}?failed=1`);
}

export default async function MockPayPage({ params }: PageProps<"/pay/mock/[orderId]">) {
  if (env.paymentsMode !== "mock") notFound();
  const { orderId } = await params;
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) notFound();
  if (order.status === "PAID") redirect(`/thank-you/${order.id}`);

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-8">
      <p role="note" className="type-small flex items-start gap-2 rounded-sm border border-dashed border-line bg-gold-soft p-3 text-gold-text">
        <FlaskConical aria-hidden className="mt-0.5 size-5 flex-none" />
        {t.mock.banner}
      </p>
      <div className="flex flex-col items-center gap-1 rounded-lg border border-line bg-surface-raised p-6 text-center">
        <p className="type-small text-ink-muted">{t.mock.payTo}</p>
        <p className="type-price text-ink">{formatINR(order.totalPaise)}</p>
        <p className="type-small text-ink-muted">{order.items.map((i) => i.name).join(" + ")}</p>
        <form action={mockPay} className="mt-6 flex w-full flex-col gap-3">
          <input type="hidden" name="orderId" value={order.id} />
          <Button type="submit" name="outcome" value="success" block>
            {t.mock.success}
          </Button>
          <Button type="submit" name="outcome" value="fail" variant="secondary" block>
            {t.mock.fail}
          </Button>
        </form>
      </div>
    </main>
  );
}
