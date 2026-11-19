/**
 * DONE-WITH-YOU PAGE (DESIGN.md 7.8). ONE action: book a slot.
 * Premium tone: more whitespace, gold-soft accents.
 * Order of doubts: what is it → how does it go → what exactly do I get (scope from the real product) →
 * who does it (real team, hidden until filled in) → questions → book.
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Info } from "lucide-react";
import { FunnelTracker } from "@/components/landing/islands";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Badge, Highlight, IncomeDisclaimer, SectionHeader, SpeedTrails, TrustRow } from "@/components/ui/basics";
import { Button } from "@/components/ui/button";
import { StickyBuyBar } from "@/components/ui/interactive";
import t from "@/content/hi-Latn/done-with-you.json";
import { formatINR } from "@/lib/money";
import { getProductWithPrice } from "@/server/catalog";
import { getLandingContent } from "@/server/content";
import { getSettings, supportWhatsappHref } from "@/server/settings";

export const metadata: Metadata = { title: t.meta.title, description: t.meta.description };
export const revalidate = 300;

const section = "scroll-mt-16 py-16 md:py-24";

export default async function DoneWithYouPage() {
  const [item, settings, landing] = await Promise.all([getProductWithPrice("done-with-you"), getSettings(), getLandingContent()]);
  if (!item) notFound();

  const price = formatINR(item.price.amountPaise);
  const href = `/checkout/${item.product.slug}`;
  const features = Array.isArray(item.product.features) ? (item.product.features as string[]) : [];
  const wa = supportWhatsappHref(settings);
  const team = landing.team;

  return (
    <main>
      <FunnelTracker />

      {/* HERO */}
      <section id="hero" className="film-grain">
        <div className="container-page flex flex-col items-start gap-6 pt-10 pb-16 md:pt-20 md:pb-24">
          <Badge tone="gold">{t.hero.eyebrow}</Badge>
          <h1 className="type-display-xl text-ink">
            <Highlight text={t.hero.title} />
          </h1>
          <p className="type-body-lg max-w-reading text-ink-muted">{t.hero.sub}</p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-6">
            <Button href={href} size="lg" block arrow data-cta="dwy_hero" className="sm:w-auto">
              {t.hero.cta}
            </Button>
            <p className="flex flex-col">
              <span className="type-title text-gold-text">{t.hero.price.replace("{price}", price)}</span>
              <span className="type-small text-ink-muted">{t.hero.trust}</span>
            </p>
          </div>
        </div>
      </section>

      {/* PROCESS TIMELINE */}
      <section className={`${section} border-t border-line`}>
        <div className="container-page">
          <SectionHeader eyebrow={t.process.eyebrow} heading={t.process.title} className="reveal" />
          <ol className="mt-10 grid gap-0 md:grid-cols-5 md:gap-4">
            {t.process.steps.map((s, i) => (
              <li key={s.title} className="reveal relative flex gap-4 pb-8 last:pb-0 md:flex-col md:gap-3 md:pb-0">
                {i < t.process.steps.length - 1 && <span aria-hidden className="absolute top-12 bottom-0 left-6 w-px bg-line md:hidden" />}
                <span className="type-heading grid size-12 flex-none place-items-center rounded-pill bg-gold-soft text-gold-text">{i + 1}</span>
                <div className="flex flex-col gap-1 pt-1 md:pt-0">
                  <h3 className="type-title text-ink">{s.title}</h3>
                  <p className="text-ink-muted">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* SCOPE — straight from the product, so the page and the checkout always say the same thing */}
      <section className={section}>
        <div className="container-page">
          <div className="grid gap-8 rounded-lg bg-gold-soft p-6 md:grid-cols-2 md:p-10">
            <SectionHeader eyebrow={t.included.eyebrow} heading={t.included.title} sub={t.included.sub} className="reveal" />
            <div className="flex flex-col gap-4">
              <ul className="flex flex-col gap-3">
                {features.map((f) => (
                  <li key={f} className="flex gap-3 text-ink">
                    <Check aria-hidden className="mt-0.5 size-5 flex-none text-success" strokeWidth={2.5} />
                    <span className="type-body-lg">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-3 rounded-md border border-dashed border-line bg-surface-sunken p-4">
                <Info aria-hidden className="mt-0.5 size-5 flex-none text-ink-muted" />
                <p className="text-ink-muted">
                  <strong className="font-semibold text-ink">{t.included.noGuaranteeTitle}:</strong> {t.included.noGuarantee}
                </p>
              </div>
              <IncomeDisclaimer />
            </div>
          </div>
        </div>
      </section>

      {/* TEAM — real people only; hidden until a name + bio are saved (Admin → Landing content → 8b) */}
      {team.name && team.bio && (
        <section className={`${section} border-t border-line`}>
          <div className="container-page">
            <SectionHeader eyebrow={team.eyebrow} heading={team.title} className="reveal" />
            <div className="reveal mt-10 flex flex-col gap-6 rounded-lg border border-line bg-surface-raised p-6 md:flex-row md:items-center md:p-10">
              {team.photoUrl && <Image src={team.photoUrl} alt={team.name} width={160} height={160} unoptimized loading="lazy" className="size-32 flex-none rounded-lg object-cover md:size-40" />}
              <div className="flex flex-col items-start gap-2">
                <h3 className="type-heading text-ink">{team.name}</h3>
                {team.role && <p className="type-label text-gold-text">{team.role}</p>}
                <p className="max-w-reading whitespace-pre-line text-ink-muted">{team.bio}</p>
                {team.instagramUrl && (
                  <a href={team.instagramUrl} target="_blank" rel="noopener" className="inline-flex min-h-12 items-center font-semibold text-gold-text underline underline-offset-4">
                    {team.instagramLabel}
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className={`${section} border-t border-line`}>
        <div className="container-page">
          <SectionHeader heading={t.faq.title} className="reveal" />
          <Accordion className="mt-10 max-w-3xl">
            {t.faq.items.map((f) => (
              <AccordionItem key={f.q} group="dwy-faq" title={f.q}>
                {f.a}
              </AccordionItem>
            ))}
          </Accordion>
          <Link href="/legal/refund" className="mt-4 inline-flex min-h-12 items-center text-gold-text underline underline-offset-4">
            {t.faq.refundLink}
          </Link>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="final-cta" className="film-grain border-t border-line py-16 md:py-24">
        <div className="container-page flex flex-col items-center gap-6 text-center">
          <SpeedTrails className="h-10 w-12" />
          <h2 className="type-display text-ink">
            <Highlight text={t.final.title} />
          </h2>
          <p className="type-body-lg max-w-reading text-ink-muted">{t.final.sub}</p>
          <Button href={href} size="lg" arrow data-cta="dwy_final" className="w-full sm:w-auto">
            {t.hero.cta}
          </Button>
          <TrustRow className="justify-center" whatsappHref={wa} />
        </div>
      </section>

      <StickyBuyBar
        price={price}
        note={t.sticky.note}
        hideOnIds={["final-cta", "site-footer"]}
        cta={
          <Button href={href} pill data-cta="dwy_sticky">
            {t.sticky.cta}
          </Button>
        }
      />
    </main>
  );
}
