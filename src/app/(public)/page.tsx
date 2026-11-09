/**
 * LANDING PAGE — the sales engine's front door.
 * One job: get the visitor to checkout (or the free lesson). Sections are in the order from the brief;
 * copy comes from src/content/landing.ts + Admin overrides.
 * Cached and refreshed every 5 minutes (and instantly when Admin saves content/prices).
 */
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { formatIST } from "@/lib/time";
import { getLandingContent, getSocialProof } from "@/server/content";
import { listProducts } from "@/server/catalog";
import { getSettings } from "@/server/settings";
import { Countdown, CtaLink, HeroVideo, PageView, StickyBuyBar } from "@/components/landing/client-bits";

export const revalidate = 300;

const Section = ({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) => (
  <section id={id} className={`mx-auto max-w-5xl px-4 py-14 md:py-20 ${className}`}>
    {children}
  </section>
);
const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="font-display text-3xl text-white md:text-5xl">{children}</h2>;

export default async function LandingPage() {
  const [c, products, proof, settings, course] = await Promise.all([
    getLandingContent(),
    listProducts(),
    getSocialProof(),
    getSettings(),
    db.course.findFirst({
      where: { published: true },
      orderBy: { createdAt: "asc" },
      include: { modules: { orderBy: { position: "asc" }, include: { lessons: { where: { published: true }, orderBy: { position: "asc" }, select: { id: true, title: true, durationSec: true, isFreePreview: true } } } } },
    }),
  ]);

  const tiers = products.filter((p) => p.product.kind !== "ADDON");
  const entry = tiers[0];
  const entryHref = entry ? `/checkout/${entry.product.slug}` : "#pricing";
  const entryPrice = entry ? formatINR(entry.price.amountPaise) : "";
  const deadline = tiers.find((t) => t.price.endsAt);
  const showStudentCount = proof.students >= settings.studentCountThreshold;
  const freeLesson = course?.modules.flatMap((m) => m.lessons).find((l) => l.isFreePreview);

  return (
    <main>
      <PageView />

      {/* 1. HERO */}
      <section id="hero" className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_20%,rgba(255,182,39,0.18),transparent)]" />
        <div className="relative mx-auto grid max-w-5xl items-center gap-8 px-4 pt-8 pb-12 md:grid-cols-[1.15fr_1fr] md:pt-16">
          <div>
            <p className="mb-3 text-sm font-medium text-gold">{c.hero.eyebrow}</p>
            <h1 className="font-display text-[2.6rem] text-white md:text-6xl">
              {c.hero.headline} <span className="text-gold">{c.hero.highlight}</span>
            </h1>
            <p className="mt-4 text-base text-zinc-300 md:text-lg">{c.hero.subheadline}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <CtaLink href={entryHref} id="hero_primary" className="btn-gold">
                {c.hero.ctaText} — {entryPrice} →
              </CtaLink>
              {freeLesson && (
                <CtaLink href="#curriculum" id="hero_secondary" className="btn-ghost min-h-[52px]">
                  {c.hero.secondaryCta}
                </CtaLink>
              )}
            </div>
            <ul className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
              {c.hero.stats.map((s) => (
                <li key={s.label} className="shrink-0 rounded-full border border-line bg-panel px-3 py-1.5 text-sm">
                  <b className="text-gold">{s.value}</b> <span className="text-muted">{s.label}</span>
                </li>
              ))}
              {showStudentCount && (
                <li className="shrink-0 rounded-full border border-line bg-panel px-3 py-1.5 text-sm">
                  <b className="text-gold">{proof.students.toLocaleString("en-IN")}+</b> <span className="text-muted">students</span>
                </li>
              )}
            </ul>
          </div>
          {/* 9:16 phone frame with the sample reel */}
          <div className="mx-auto w-[min(72vw,300px)]">
            <div className="relative aspect-[9/16] overflow-hidden rounded-[2rem] border-4 border-panel-2 bg-gradient-to-b from-zinc-800 to-ink shadow-2xl shadow-gold/10">
              {c.hero.videoUrl ? (
                <HeroVideo src={c.hero.videoUrl} poster={c.hero.posterUrl} />
              ) : (
                <div className="grid h-full place-items-center p-6 text-center">
                  <div>
                    <div className="text-7xl">🦁</div>
                    <p className="font-display mt-4 text-2xl text-gold">Bhai is back</p>
                    <p className="mt-2 text-xs text-muted">Sample reel yahan chalegi — Admin → Landing content mein video URL daalein.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. PROBLEM */}
      <Section className="border-t border-line/60">
        <H2>{c.problem.title}</H2>
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {c.problem.points.map((p) => (
            <li key={p} className="card flex gap-3 p-4">
              <span className="text-bad">✕</span>
              <span className="text-zinc-200">{p}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-lg font-semibold text-gold">{c.problem.answer}</p>
      </Section>

      {/* 3. WAYS CREATORS EARN (with honest disclaimer) */}
      <Section>
        <H2>{c.earn.title}</H2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {c.earn.items.map((e) => (
            <div key={e.title} className="card p-5">
              <div className="text-2xl">{e.icon}</div>
              <h3 className="mt-2 font-semibold text-white">{e.title}</h3>
              <p className="mt-1 text-sm text-muted">{e.desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-xl border border-line bg-panel-2 p-4 text-sm text-muted">⚠️ {c.earn.disclaimer}</p>
      </Section>

      {/* 4. HOW IT WORKS */}
      <Section>
        <H2>{c.howItWorks.title}</H2>
        <ol className="mt-6 grid gap-3 md:grid-cols-5">
          {c.howItWorks.steps.map((s, i) => (
            <li key={s.title} className="card p-4">
              <span className="font-display text-3xl text-gold">{i + 1}</span>
              <h3 className="mt-1 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.desc}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* 5. CURRICULUM */}
      {course && (
        <Section id="curriculum">
          <H2>{c.curriculum.title}</H2>
          <p className="mt-2 text-muted">{c.curriculum.subtitle}</p>
          <div className="mt-6 space-y-2">
            {course.modules.map((m, i) => (
              <details key={m.id} className="card group overflow-hidden" open={i === 0}>
                <summary className="flex cursor-pointer items-center justify-between gap-3 p-4">
                  <span>
                    <span className="text-xs text-gold">Module {i + 1}</span>
                    <span className="block font-semibold">{m.title}</span>
                  </span>
                  <span className="text-sm text-muted">
                    {m.lessons.length} lessons <span className="inline-block transition group-open:rotate-180">⌄</span>
                  </span>
                </summary>
                <ul className="border-t border-line">
                  {m.lessons.map((l) => (
                    <li key={l.id} className="flex items-center justify-between gap-3 border-b border-line/50 px-4 py-3 text-sm last:border-0">
                      <span className="text-zinc-300">{l.title}</span>
                      {l.isFreePreview ? (
                        <CtaLink href={`/preview/${l.id}`} id="free_preview" className="shrink-0 rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold text-gold">
                          ▶ Free
                        </CtaLink>
                      ) : (
                        <span className="shrink-0 text-xs text-muted">{Math.round(l.durationSec / 60)} min</span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </Section>
      )}

      {/* 6. BONUSES */}
      <Section>
        <H2>{c.bonuses.title}</H2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {c.bonuses.items.map((b) => (
            <div key={b.title} className="card flex gap-4 p-5">
              <div className="text-3xl">{b.icon}</div>
              <div>
                <h3 className="font-semibold">{b.title}</h3>
                <p className="mt-1 text-sm text-muted">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 7. TESTIMONIALS — real only, hidden until at least 3 exist */}
      {proof.testimonials.length >= 3 && (
        <Section>
          <H2>{c.testimonials.title}</H2>
          <p className="mt-2 text-sm text-muted">{c.testimonials.subtitle}</p>
          <div className="no-scrollbar mt-6 flex snap-x gap-3 overflow-x-auto pb-2">
            {proof.testimonials.map((t) => (
              <figure key={t.id} className="card w-[80%] shrink-0 snap-start p-5 sm:w-[45%] md:w-[32%]">
                {t.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.imageUrl} alt={`${t.name} result`} loading="lazy" className="mb-3 aspect-[4/5] w-full rounded-xl object-cover" />
                )}
                {t.result && <p className="font-semibold text-gold">{t.result}</p>}
                <blockquote className="mt-2 text-sm text-zinc-300">“{t.quote}”</blockquote>
                <figcaption className="mt-3 text-xs text-muted">
                  — {t.name}
                  {t.city ? `, ${t.city}` : ""}
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      )}

      {/* 8. PRICING */}
      <Section id="pricing">
        <H2>{c.pricing.title}</H2>
        <p className="mt-2 text-muted">{c.pricing.subtitle}</p>
        {deadline?.price.endsAt && (
          <div className="mt-4">
            <Countdown endsAt={deadline.price.endsAt.toISOString()} nextPriceLabel={deadline.next ? formatINR(deadline.next.amountPaise) : null} />
          </div>
        )}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {tiers.map(({ product, price, next }) => {
            const popular = product.slug === "pro";
            const features = Array.isArray(product.features) ? (product.features as string[]) : [];
            return (
              <div key={product.id} className={`card relative flex flex-col p-6 ${popular ? "border-gold ring-1 ring-gold" : ""}`}>
                {popular && <span className="absolute -top-3 left-6 rounded-full bg-gold px-3 py-0.5 text-xs font-bold text-ink">Sabse popular</span>}
                <h3 className="font-display text-2xl">{product.name}</h3>
                <p className="text-sm text-muted">{product.tagline}</p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-4xl font-bold text-white">{formatINR(price.amountPaise)}</span>
                  {/* Only a REAL upcoming price is shown — never a made-up "original" price. */}
                  {price.endsAt && next && next.amountPaise > price.amountPaise && (
                    <span className="pb-1 text-xs text-muted">
                      {formatIST(price.endsAt, "date")} ke baad {formatINR(next.amountPaise)}
                    </span>
                  )}
                </div>
                {price.label && <span className="mt-1 text-xs text-gold">{price.label}</span>}
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-gold">✓</span>
                      <span className="text-zinc-300">{f}</span>
                    </li>
                  ))}
                </ul>
                <CtaLink href={`/checkout/${product.slug}`} id={`pricing_${product.slug}`} className={`${popular ? "btn-gold" : "btn-ghost min-h-[52px]"} mt-6 w-full`}>
                  {product.kind === "SERVICE" ? "Details & join" : `${product.name} join karo`} →
                </CtaLink>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-center text-xs text-muted">🔒 Secure payment by Razorpay • UPI • Cards • Netbanking • Wallets</p>
      </Section>

      {/* 9. GUARANTEE */}
      <Section>
        <div className="card flex flex-col items-center gap-3 border-gold/50 p-8 text-center">
          <div className="text-5xl">🛡️</div>
          <H2>{c.guarantee.title}</H2>
          <p className="max-w-xl text-zinc-300">{c.guarantee.text}</p>
        </div>
      </Section>

      {/* 10. FAQ */}
      <Section>
        <H2>{c.faq.title}</H2>
        <div className="mt-6 space-y-2">
          {c.faq.items.map((f) => (
            <details key={f.q} className="card group">
              <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 font-semibold">
                {f.q}
                <span className="text-gold transition group-open:rotate-45">+</span>
              </summary>
              <p className="px-4 pb-4 text-sm text-zinc-300">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-8 text-center">
          <CtaLink href={entryHref} id="faq_cta" className="btn-gold">
            {c.hero.ctaText} — {entryPrice} →
          </CtaLink>
        </div>
      </Section>

      {/* 11. PARTNER RECRUITMENT */}
      <Section>
        <div className="card flex flex-col gap-4 bg-gradient-to-br from-panel to-panel-2 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-2xl text-white md:text-3xl">{c.partner.title}</h2>
            <p className="mt-2 max-w-xl text-sm text-muted">{c.partner.text}</p>
          </div>
          <CtaLink href="/partners" id="partner_block" className="btn-ghost shrink-0">
            {c.partner.cta} →
          </CtaLink>
        </div>
      </Section>

      {/* 12. STICKY MOBILE BUY BAR */}
      {entry && <StickyBuyBar priceLabel={entryPrice} href={entryHref} ctaText={c.stickyBar.ctaText} />}
    </main>
  );
}
