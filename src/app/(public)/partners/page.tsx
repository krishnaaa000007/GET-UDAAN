/**
 * PARTNER LANDING (DESIGN.md 7.7). ONE action: apply.
 * Order of doubts: what is it → how it works → how much (calculator + honesty line) → when do I get paid → questions → apply.
 * Commission %, refund days and minimum withdrawal all come from real products and settings.
 */
import type { Metadata } from "next";
import { FunnelTracker } from "@/components/landing/islands";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Badge, Highlight, IncomeDisclaimer, SectionHeader } from "@/components/ui/basics";
import { Button } from "@/components/ui/button";
import t from "@/content/hi-Latn/partner.json";
import { PARTNER_RULES, releaseLabel } from "@/config/partners";
import { formatINR } from "@/lib/money";
import { listProducts } from "@/server/catalog";
import { evaluateCoupon } from "@/server/pricing";
import { getSettings } from "@/server/settings";
import { ApplyForm } from "./apply-form";
import { CommissionCalculator } from "./calculator";

export const metadata: Metadata = { title: "Partner program", description: "Apne reel page se Get Udaan promote karo aur har sale par commission kamao." };

const L = t.landing;

export default async function PartnersPage() {
  const [s, products] = await Promise.all([getSettings(), listProducts()]);
  const tiers = products.filter((p) => p.product.kind !== "ADDON");
  const entry = tiers[0];
  const maxPct = Math.round(Math.max(0, ...tiers.map((p) => p.product.defaultCommissionBps)) / 100);

  // What ONE entry-course sale pays a partner, worked out the same way as the real commission:
  // price − partner coupon discount − GST (if registered) − ~2.36% payment fee, × commission rate.
  let perSalePaise = 0;
  if (entry) {
    const price = entry.price.amountPaise;
    const coupon = evaluateCoupon({ code: "X", kind: "PERCENT", value: s.partnerCouponDiscountBps, active: true, maxUses: null, usedCount: 0, startsAt: null, endsAt: null, productSlugs: null }, entry.product.slug, price);
    const paid = price - (coupon.ok ? coupon.discountPaise : 0);
    const gst = s.gstRegistered ? paid - Math.round((paid * 10_000) / 11_800) : 0;
    const fee = Math.round(paid * 0.0236);
    perSalePaise = Math.max(0, Math.floor(((paid - gst - fee) * entry.product.defaultCommissionBps) / 10_000));
  }
  const fill = (str: string) =>
    str
      .replaceAll("{days}", String(s.refundWindowDays))
      .replaceAll("{release}", releaseLabel(s.commissionReleaseMinutes))
      .replaceAll("{payoutTime}", s.payoutTimeText)
      .replaceAll("{approval}", PARTNER_RULES.approvalTargetHours)
      .replaceAll("{min}", formatINR(s.minWithdrawalPaise))
      .replaceAll("{pct}", String(maxPct))
      .replaceAll("{window}", String(s.attributionWindowDays));

  return (
    <main>
      <FunnelTracker />

      {/* HERO */}
      <section className="film-grain">
        <div className="container-page flex flex-col items-start gap-5 pt-8 pb-12 md:pt-16 md:pb-20">
          <Badge tone="gold">{L.eyebrow}</Badge>
          <h1 className="type-display-xl text-ink">
            <Highlight text={L.title} />
          </h1>
          <p className="type-body-lg max-w-reading text-ink-muted">{L.sub}</p>
          <Button href="#apply" size="lg" block arrow data-cta="partner_hero_apply" className="sm:w-auto">
            {L.cta}
          </Button>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-t border-line py-12 md:py-20">
        <div className="container-page">
          <SectionHeader eyebrow={L.steps.eyebrow} heading={L.steps.title} className="reveal" />
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {L.steps.items.map((step, i) => (
              <li key={step.title} className="reveal flex gap-4 rounded-md border border-line bg-surface-raised p-4 md:flex-col md:p-6">
                <span className="type-heading grid size-12 flex-none place-items-center rounded-pill border border-line bg-surface text-gold-text">{i + 1}</span>
                <div className="flex flex-col gap-1">
                  <h3 className="type-title text-ink">{step.title}</h3>
                  <p className="text-ink-muted">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CALCULATOR — income talk, so the honesty line sits right under it */}
      {entry && perSalePaise > 0 && (
        <section className="py-12 md:py-20">
          <div className="container-page">
            <SectionHeader eyebrow={L.calc.eyebrow} heading={L.calc.title} className="reveal" />
            <div className="mt-8 flex flex-col gap-4 rounded-lg bg-gold-soft p-4 md:p-8">
              <CommissionCalculator perSalePaise={perSalePaise} />
              <p className="type-small text-ink-muted">
                {L.calc.perSale.replace("{product}", entry.product.name).replace("{amount}", formatINR(perSalePaise)).replace("{pct}", String(Math.round(entry.product.defaultCommissionBps / 100)))} {L.calc.note}
              </p>
              {s.teamBonusEnabled && (
                <p className="type-small rounded-md border border-line bg-surface-raised p-3 text-ink">
                  {L.calc.teamExample
                    .replace("{invited}", "3")
                    .replace("{sales}", "10")
                    .replace("{pct}", String(PARTNER_RULES.teamBonus.l1Bps / 100))
                    .replace("{amount}", formatINR(3 * 10 * Math.floor((perSalePaise * PARTNER_RULES.teamBonus.l1Bps) / 10_000)))}{" "}
                  <b>{L.calc.teamNote}</b>
                </p>
              )}
              <IncomeDisclaimer />
            </div>
          </div>
        </section>
      )}

      {/* PAYOUT SCHEDULE */}
      <section className="border-t border-line py-12 md:py-20">
        <div className="container-page">
          <SectionHeader eyebrow={L.payout.eyebrow} heading={L.payout.title} className="reveal" />
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {L.payout.items.filter((p) => !("needs" in p) || (p.needs === "payoutTime" && s.payoutTimeText)).map((p) => (
              <li key={p.title} className="reveal flex flex-col gap-1 rounded-md border border-line bg-surface-raised p-4 md:p-6">
                <h3 className="type-title text-ink">{fill(p.title)}</h3>
                <p className="text-ink-muted">{fill(p.desc)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 md:py-20">
        <div className="container-page">
          <SectionHeader heading={L.faq.title} className="reveal" />
          <Accordion className="mt-8 max-w-3xl">
            {L.faq.items.map((f) => (
              <AccordionItem key={f.q} group="partner-faq" title={f.q}>
                {fill(!s.absorbRefunds && "aReversed" in f && f.aReversed ? f.aReversed : f.a)}
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* APPLY */}
      <section id="apply" className="scroll-mt-16 border-t border-line py-12 md:py-20">
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4">
          <SectionHeader heading={t.apply.title} sub={t.apply.sub} />
          <ApplyForm />
        </div>
      </section>
    </main>
  );
}
