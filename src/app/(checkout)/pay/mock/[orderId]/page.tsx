/**
 * TEST-ONLY fake payment screen (PAYMENTS_MODE=mock). Lets you test the whole
 * purchase flow locally without a Razorpay account. It sends a properly signed
 * webhook to our real webhook endpoint — the same path production uses.
 */
import { notFound, redirect } from "next/navigation";
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
    <main className="mx-auto max-w-md px-4 py-8">
      <div className="mb-4 rounded-xl border border-gold/50 bg-gold/10 p-3 text-center text-sm text-gold">
        🧪 TEST MODE — ye asli payment nahi hai. Live site pe yahan Razorpay khulega.
      </div>
      <div className="card p-6 text-center">
        <p className="text-sm text-muted">Pay to ReelBhai Academy</p>
        <p className="mt-1 text-4xl font-bold">{formatINR(order.totalPaise)}</p>
        <p className="mt-1 text-sm text-muted">{order.items.map((i) => i.name).join(" + ")}</p>
        <form action={mockPay} className="mt-6 space-y-3">
          <input type="hidden" name="orderId" value={order.id} />
          <button name="outcome" value="success" className="btn-gold w-full">
            ✅ UPI payment successful (test)
          </button>
          <button name="outcome" value="fail" className="btn-ghost w-full">
            ❌ Payment fail karo (test)
          </button>
        </form>
      </div>
    </main>
  );
}
