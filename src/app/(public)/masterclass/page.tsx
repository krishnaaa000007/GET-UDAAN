/**
 * /masterclass — free masterclass + the FIRST100 offer.
 *  - The video shows only when the admin has set Settings → masterclassVideoUrl (no empty box otherwise;
 *    until then the page points to the free lesson).
 *  - The offer shows only while the FIRST100 coupon is active and not used up. The CTA sends
 *    ?coupon=FIRST100, which the proxy remembers and checkout applies automatically.
 *  - FIRST100 is a normal coupon, so a partner's link credit is kept.
 */
import type { Metadata } from "next";
import { Badge, Highlight, SpeedTrails } from "@/components/ui/basics";
import { Button } from "@/components/ui/button";
import { SITE } from "@/config/site";
import t from "@/content/hi-Latn/masterclass.json";
import { db } from "@/lib/db";
import { videoEmbed } from "@/lib/video-embed";
import { listProducts } from "@/server/catalog";
import { getSettings } from "@/server/settings";

export const revalidate = 300;
export const metadata: Metadata = { title: t.meta.title, description: t.meta.description, alternates: { canonical: "/masterclass" } };

export default async function MasterclassPage() {
  const code = SITE.masterclassCoupon.code;
  const [settings, products, coupon] = await Promise.all([getSettings(), listProducts(), db.coupon.findUnique({ where: { code } })]);
  const video = videoEmbed(settings.masterclassVideoUrl);
  const entry = products.find((p) => p.product.kind !== "ADDON" && p.product.kind !== "SERVICE");
  const now = new Date();
  const couponLive =
    !!coupon && coupon.active && !coupon.partnerId && (!coupon.startsAt || coupon.startsAt <= now) && (!coupon.endsAt || coupon.endsAt > now) && (coupon.maxUses == null || coupon.usedCount < coupon.maxUses);
  const left = coupon?.maxUses != null ? coupon.maxUses - coupon.usedCount : null;
  const pct = coupon?.kind === "PERCENT" ? String(coupon.value / 100) : String(SITE.masterclassCoupon.percent);
  const checkoutHref = entry ? `/checkout/${entry.product.slug}${couponLive ? `?coupon=${code}` : ""}` : "/#pricing";

  return (
    <main className="container-page flex flex-col items-center gap-8 py-12 text-center md:py-20">
      <div className="flex max-w-reading flex-col items-center gap-3">
        <SpeedTrails className="h-8 w-10" />
        <span className="type-label text-gold-text">{t.eyebrow}</span>
        <h1 className="type-display text-ink">
          <Highlight text={t.title} />
        </h1>
        <p className="type-body-lg text-ink-muted">{t.sub}</p>
      </div>

      {video ? (
        <div className="aspect-video w-full max-w-3xl overflow-hidden rounded-lg border border-line bg-surface-sunken">
          {video.kind === "youtube" ? (
            <iframe src={video.src} title={t.meta.title} className="size-full" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
          ) : (
            <video src={video.src} controls playsInline preload="metadata" className="size-full" />
          )}
        </div>
      ) : (
        <div className="flex max-w-reading flex-col items-center gap-3">
          <p className="text-ink-muted">{t.noVideo}</p>
          <Button href="/free-lesson" variant="secondary" arrow>
            {t.freeLesson}
          </Button>
        </div>
      )}

      {couponLive ? (
        <section className="flex w-full max-w-xl flex-col items-center gap-3 rounded-lg border-2 border-gold bg-gold-soft p-5 md:p-6">
          <Badge tone="solid">{t.offer.chip.replace("{code}", code)}</Badge>
          <h2 className="type-heading text-ink">{t.offer.title.replace("{pct}", pct)}</h2>
          <p className="text-ink-muted">{t.offer.text}</p>
          {left != null && left <= 50 && <p className="type-small font-semibold text-gold-text">{t.offer.left.replace("{n}", String(left))}</p>}
          <Button href={checkoutHref} size="lg" block arrow data-cta="masterclass_first100">
            {t.offer.cta.replace("{pct}", pct)}
          </Button>
        </section>
      ) : (
        <Button href={checkoutHref} size="lg" arrow data-cta="masterclass_join">
          {t.join}
        </Button>
      )}

      <p className="type-small max-w-reading text-ink-muted">{t.resultsVary}</p>
    </main>
  );
}
