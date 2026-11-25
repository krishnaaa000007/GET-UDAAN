/**
 * THANK-YOU PAGE (DESIGN.md 7.5) — the happiest page on the site.
 * ONE action: "Lesson 1 Shuru Karo". Then ONE upsell card, then the share card.
 * While the webhook hasn't arrived yet, it shows "confirming…" and polls.
 */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Check, CircleCheck, MessageCircle } from "lucide-react";
import { Badge, Highlight } from "@/components/ui/basics";
import { Button, buttonClass } from "@/components/ui/button";
import t from "@/content/hi-Latn/checkout.json";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { formatINR } from "@/lib/money";
import { formatIST } from "@/lib/time";
import { createSession, getCurrentUser } from "@/server/auth";
import { upgradeCredit, upgradedPrice } from "@/server/upgrade";
import { getProductWithPrice } from "@/server/catalog";
import { browserOwnsOrder } from "@/server/order-cookie";
import { getSettings, supportWhatsappHref } from "@/server/settings";
import { ConfettiOnce, PurchasePixel, ShareLink, WaitForPayment } from "./client";

export const metadata: Metadata = { title: "Payment successful", robots: { index: false } };

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
  const [order, settings] = await Promise.all([db.order.findUnique({ where: { id: orderId }, include: { items: { include: { product: true } } } }), getSettings()]);
  if (!order) notFound();
  const wa = supportWhatsappHref(settings);

  if (order.status !== "PAID") {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <WaitForPayment orderId={order.id} whatsappHref={wa} />
      </main>
    );
  }

  const main = order.items.find((i) => i.kind === "MAIN")?.product;
  // ONE upsell: Pro (tier BASIC) → Done-for-you (tier PRO). They pay only the difference.
  const upsell = main?.tier === "BASIC" ? await getProductWithPrice("pro") : null;
  const upsellPaise = upsell ? upgradedPrice(upsell.price.amountPaise, await upgradeCredit(order.userId, upsell.product)) : 0;
  const ownsIt = await browserOwnsOrder(order.id);
  const firstName = order.name.trim().split(/\s+/)[0] ?? "";
  const maskedEmail = order.email.replace(/^(.{2}).*@/, "$1***@");
  const shareHref = `https://wa.me/?text=${encodeURIComponent(`${t.thankYou.share.message} ${env.appUrl}`)}`;

  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-4 py-8">
      {ownsIt && <PurchasePixel orderId={order.id} valuePaise={order.totalPaise} />}

      <div className="flex flex-col items-center gap-4 text-center">
        <ConfettiOnce orderId={order.id}>
          <CircleCheck aria-hidden className="size-20 text-success" strokeWidth={1.5} />
        </ConfettiOnce>
        <Badge tone="success">{t.thankYou.badge}</Badge>
        <h1 className="type-display text-ink">
          <Highlight text={t.thankYou.title.replace("{name}", firstName)} />
        </h1>
        <p className="text-ink-muted">{t.thankYou.sub.replace("{email}", maskedEmail)}</p>
      </div>

      {/* Order details */}
      <dl className="flex flex-col gap-2 rounded-md border border-line bg-surface-raised p-4 shadow-card">
        <div className="flex justify-between gap-3">
          <dt className="font-semibold text-ink">{t.thankYou.order.replace("{number}", String(order.number))}</dt>
          <dd className="type-small text-ink-muted">{formatIST(order.paidAt ?? order.createdAt, "date")}</dd>
        </div>
        {order.items.map((i) => (
          <div key={i.id} className="flex justify-between gap-3">
            <dt className="text-ink-muted">{i.name}</dt>
            <dd className="text-ink">{formatINR(i.unitPaise)}</dd>
          </div>
        ))}
        {order.discountPaise > 0 && (
          <div className="flex justify-between gap-3 text-success">
            <dt>{t.summary.coupon.replace("{code}", "").trim()}</dt>
            <dd>−{formatINR(order.discountPaise)}</dd>
          </div>
        )}
        <div className="flex items-end justify-between gap-3 border-t border-line pt-2">
          <dt className="font-semibold text-ink">{t.thankYou.paid}</dt>
          <dd className="type-heading text-gold-text">{formatINR(order.totalPaise)}</dd>
        </div>
      </dl>

      {/* The one action */}
      <form action={startLearning}>
        <input type="hidden" name="orderId" value={order.id} />
        <Button type="submit" size="lg" block arrow>
          {t.thankYou.start}
        </Button>
      </form>

      {/* ONE upsell. The checkout opens with this buyer's details already filled in. */}
      {upsell && (
        <section className="flex flex-col gap-3 rounded-lg bg-gold-soft p-6">
          <p className="type-label text-gold-text">{t.thankYou.upsell.eyebrow}</p>
          <h2 className="type-heading text-ink">{t.thankYou.upsell.title.replace("{name}", upsell.product.name)}</h2>
          <ul className="flex flex-col gap-1">
            {(Array.isArray(upsell.product.features) ? (upsell.product.features as string[]) : []).slice(0, 4).map((f) => (
              <li key={f} className="flex gap-2 text-ink">
                <Check aria-hidden className="mt-0.5 size-5 flex-none text-success" strokeWidth={2.5} />
                {f}
              </li>
            ))}
          </ul>
          <Button href={`/checkout/${upsell.product.slug}?from=${order.id}`} variant="secondary" block data-cta="thank_you_upsell">
            {t.thankYou.upsell.cta.replace("{name}", upsell.product.name).replace("{price}", formatINR(upsellPaise))}
          </Button>
          <p className="type-small text-center text-ink-muted">{t.thankYou.upsell.skip}</p>
        </section>
      )}

      {/* Share card */}
      <section className="flex flex-col gap-3 rounded-md border border-line bg-surface-raised p-6 shadow-card">
        <h2 className="type-title text-ink">{t.thankYou.share.title}</h2>
        <p className="text-ink-muted">{t.thankYou.share.text}</p>
        <ShareLink href={shareHref} className={buttonClass({ variant: "secondary", block: true })}>
          <MessageCircle aria-hidden className="size-5" />
          {t.thankYou.share.cta}
        </ShareLink>
      </section>
    </main>
  );
}
