/**
 * THANK-YOU PAGE: confirmation → "Start lesson 1" → ONE upsell.
 * While the webhook hasn't arrived yet, it shows "confirming…" and polls.
 */
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { hmac } from "@/lib/crypto";
import { formatINR } from "@/lib/money";
import { createSession, getCurrentUser } from "@/server/auth";
import { getProductWithPrice } from "@/server/catalog";
import { WaitForPayment, PurchasePixel } from "./client";

export const metadata: Metadata = { title: "Payment successful", robots: { index: false } };

/** Is this browser the one that started this order? (signed cookie set at checkout) */
async function browserOwnsOrder(orderId: string): Promise<boolean> {
  const v = (await cookies()).get("rb_order")?.value ?? "";
  const [id, sig] = v.split(".");
  return id === orderId && sig === hmac(`order:${orderId}`).slice(0, 24);
}

async function firstLessonPath(userId: string) {
  const e = await db.enrollment.findFirst({ where: { userId, revokedAt: null }, include: { course: true } });
  if (!e) return "/dashboard";
  const lesson = await db.lesson.findFirst({ where: { module: { courseId: e.courseId }, published: true }, orderBy: [{ module: { position: "asc" } }, { position: "asc" }] });
  return lesson ? `/learn/${e.course.slug}/${lesson.id}` : "/dashboard";
}

async function startLearning(form: FormData) {
  "use server";
  const orderId = String(form.get("orderId"));
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "PAID" || !order.userId) redirect("/login");
  const current = await getCurrentUser();
  if (current?.id !== order.userId) {
    // Auto-login only for the same browser that paid, and only shortly after payment.
    const fresh = order.paidAt && Date.now() - order.paidAt.getTime() < 6 * 3600_000;
    if (!(await browserOwnsOrder(orderId)) || !fresh) redirect(`/login?next=/dashboard`);
    await createSession(order.userId);
  }
  redirect(await firstLessonPath(order.userId));
}

export default async function ThankYouPage({ params }: PageProps<"/thank-you/[orderId]">) {
  const { orderId } = await params;
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: { include: { product: true } } } });
  if (!order) notFound();

  if (order.status !== "PAID") {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <WaitForPayment orderId={order.id} />
      </main>
    );
  }

  const main = order.items.find((i) => i.kind === "MAIN")?.product;
  // ONE upsell: Basic → Pro, Pro → Done-with-you, DWY → none.
  const upsellSlug = main?.tier === "BASIC" ? "pro" : main?.tier === "PRO" ? "done-with-you" : null;
  const upsell = upsellSlug ? await getProductWithPrice(upsellSlug) : null;
  const ownsIt = await browserOwnsOrder(order.id);

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      {ownsIt && <PurchasePixel orderId={order.id} valuePaise={order.totalPaise} />}
      <div className="text-center">
        <div className="text-6xl">🎉</div>
        <h1 className="font-display mt-3 text-4xl text-white">Payment successful!</h1>
        <p className="mt-2 text-muted">
          Welcome {order.name.split(" ")[0]}! Order #{order.number} • {formatINR(order.totalPaise)}
        </p>
        <p className="mt-1 text-sm text-muted">Login link aur receipt {order.email.replace(/^(.{2}).*@/, "$1***@")} pe bhej diya hai.</p>
      </div>

      <form action={startLearning} className="mt-6">
        <input type="hidden" name="orderId" value={order.id} />
        <button className="btn-gold w-full text-lg">▶ Lesson 1 abhi shuru karo</button>
      </form>

      {upsell && (
        <div className="card mt-8 border-gold/60 p-5">
          <p className="text-xs font-semibold text-gold">EK SPECIAL OFFER — sirf naye students ke liye</p>
          <h2 className="font-display mt-1 text-2xl">{upsell.product.name} mein upgrade karo</h2>
          <p className="mt-1 text-sm text-muted">{upsell.product.tagline}</p>
          <ul className="mt-3 space-y-1 text-sm">
            {(Array.isArray(upsell.product.features) ? (upsell.product.features as string[]) : []).slice(0, 4).map((f) => (
              <li key={f}>
                <span className="text-gold">✓</span> {f}
              </li>
            ))}
          </ul>
          <Link href={`/checkout/${upsell.product.slug}`} className="btn-ghost mt-4 w-full">
            {upsell.product.name} dekho — {formatINR(upsell.price.amountPaise)}
          </Link>
          <p className="mt-2 text-center text-xs text-muted">Abhi nahi chahiye? Koi baat nahi — upar se course shuru karein.</p>
        </div>
      )}
    </main>
  );
}
