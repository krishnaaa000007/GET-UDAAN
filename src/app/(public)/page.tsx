/**
 * LANDING PAGE — the money page (DESIGN.md 7.2).
 * ONE job: get the visitor to checkout. Second choice: the free lesson.
 * Sections follow the order of a buyer's doubts. All words come from src/content/hi-Latn/landing.json
 * (+ Admin → Landing content overrides). Prices, lesson counts and refund days come from real data.
 * Cached and refreshed every 5 minutes (and instantly when Admin saves content/prices).
 */
import Image from "next/image";
import {
  Briefcase,
  Check,
  CirclePlay,
  FileText,
  Handshake,
  IndianRupee,
  LayoutTemplate,
  Lightbulb,
  Scissors,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { FunnelTracker, LeadSheet } from "@/components/landing/islands";
import { CountUp } from "@/components/theme/count-up";
import { FlightMeasured, FlightSpark } from "@/components/theme/flight-measured";
import { FlightPath } from "@/components/theme/flight-path";
import { PhoneMockup } from "@/components/ui/phone-mockup";
import { Accordion, AccordionItem, CurriculumModule } from "@/components/ui/accordion";
import { Badge, GuaranteeBox, Highlight, IncomeDisclaimer, SectionHeader, SpeedTrails, StatChip, TrustRow } from "@/components/ui/basics";
import { Button } from "@/components/ui/button";
import { PriceCard, TestimonialCard, TierCompareTable } from "@/components/ui/commerce";
import { Countdown, RecentPurchaseToast, StickyBuyBar } from "@/components/ui/interactive";
import { cn } from "@/lib/cn";
import { VideoWall } from "@/components/testimonials/video-wall";
import ui from "@/content/hi-Latn/ui.json";
import { studentVideos, wallCopy } from "@/lib/video-testimonials";
import { MasterclassVideo } from "@/components/masterclass-video";
import { getMasterclass } from "@/server/masterclass";
import mc from "@/content/hi-Latn/masterclass.json";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { formatIST } from "@/lib/time";
import { listProducts } from "@/server/catalog";
import { getLandingContent, getSocialProof } from "@/server/content";
import { getSettings, supportWhatsappHref } from "@/server/settings";
import { getRecentPurchases } from "@/server/testimonials";

export const revalidate = 300;

// Icon names used in the content file → the actual icons.
const ICONS: Record<string, LucideIcon> = {
  "trending-down": TrendingDown,
  scissors: Scissors,
  wallet: Wallet,
  lightbulb: Lightbulb,
  handshake: Handshake,
  "circle-play": CirclePlay,
  briefcase: Briefcase,
  "shopping-bag": ShoppingBag,
  sparkles: Sparkles,
  "file-text": FileText,
  "layout-template": LayoutTemplate,
  "indian-rupee": IndianRupee,
};
const Icon = ({ name, className }: { name: string; className?: string }) => {
  const I = ICONS[name] ?? Sparkles;
  return <I aria-hidden className={className} />;
};

/** A landing section: brief §4 rhythm (72px / 112px), its own flight-path segment, content above it. */
const Section = ({ id, children, className, bend = "left" }: { id?: string; children: ReactNode; className?: string; bend?: "left" | "right" | "straight" }) => (
  <section id={id} className={cn("section-y relative scroll-mt-16", className)}>
    <FlightPath bend={bend} />
    <div className="container-page relative z-[1]">{children}</div>
  </section>
);

const MONEY_WORDS = /₹|rs\.?\s?\d|income|kama|earn|paisa|paise|lakh/i;

export default async function LandingPage() {
  const [c, products, proof, settings, recent, course] = await Promise.all([
    getLandingContent(),
    listProducts(),
    getSocialProof(),
    getSettings(),
    getRecentPurchases(),
    db.course.findFirst({
      where: { published: true },
      orderBy: { createdAt: "asc" },
      include: { modules: { orderBy: { position: "asc" }, include: { lessons: { where: { published: true }, orderBy: { position: "asc" }, select: { id: true, title: true, durationSec: true, isFreePreview: true } } } } },
    }),
  ]);

  const masterclass = await getMasterclass(settings);
  const studentWall = studentVideos();
  const tiers = products.filter((p) => p.product.kind !== "ADDON");
  const entry = tiers[0];
  const entryHref = entry ? `/checkout/${entry.product.slug}` : "#pricing";
  const entryPrice = entry ? formatINR(entry.price.amountPaise) : "";
  const deadline = tiers.find((t) => t.price.endsAt)?.price.endsAt ?? null;
  const days = settings.refundWindowDays;
  const wa = supportWhatsappHref(settings);

  // Real numbers from the course itself.
  const lessons = course?.modules.flatMap((m) => m.lessons) ?? [];
  const totalMin = Math.round(lessons.reduce((s, l) => s + l.durationSec, 0) / 60);
  const freeLesson = lessons.find((l) => l.isFreePreview);
  const freeHref = freeLesson ? "/free-lesson" : null;
  const showStudentCount = proof.students >= settings.studentCountThreshold;
  const maxCommissionPct = Math.round(Math.max(0, ...tiers.map((t) => t.product.defaultCommissionBps)) / 100);

  const stats = [
    ...(lessons.length ? [{ value: String(lessons.length), label: c.hero.lessonsLabel }] : []),
    ...c.hero.stats,
    ...(showStudentCount ? [{ value: `${proof.students.toLocaleString("en-IN")}+`, label: c.hero.studentsLabel }] : []),
  ];
  const heroCta = entry ? c.hero.cta.replace("{price}", entryPrice) : c.stickyBar.cta;

  const heroHasReel = !!(c.hero.videoUrl && c.hero.posterUrl);
  const curriculumChips = c.curriculum.summary
    .replace("{lessons}", String(lessons.length))
    .replace("{min}", String(totalMin))
    .split("•")
    .map((x) => x.trim())
    .filter(Boolean);

  return (
    <main>
      <FunnelTracker />

      {masterclass.video ? (
        <>
      {/* 1. HERO WITH THE FREE MASTERCLASS — the video is the first thing people see (set Settings → masterclassVideoUrl).
          One set of elements; the grid puts them in order on a phone (text, video, offer) and in two columns on desktop. */}
      <section id="hero" className="sky-stars film-grain relative overflow-hidden">
        <FlightPath bend="right" />
        <div className="container-page relative z-[1] grid gap-x-12 gap-y-6 pt-6 pb-10 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:items-start lg:gap-y-8 lg:py-14">
          <div className="flex flex-col items-start lg:col-start-1 lg:row-start-1 lg:self-end">
            <Badge tone="gold">{mc.eyebrow}</Badge>
            <h1 className="type-display-xl mt-4 text-ink">
              <Highlight text={c.hero.headline} shimmer />
            </h1>
            <p className="type-body-lg mt-3 max-w-[34ch] text-ink-muted lg:max-w-[40ch]">{c.hero.sub}</p>
          </div>

          <div className="w-full lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
            <MasterclassVideo video={masterclass.video} title={mc.meta.title} />
          </div>

          <div className="flex flex-col lg:col-start-1 lg:row-start-2 lg:self-start">
            {masterclass.offer ? (
              <div className="flex w-full flex-col items-center gap-3 rounded-lg border-2 border-gold bg-gold-soft p-4 text-center sm:items-start sm:text-left md:p-5">
                <Badge tone="solid">{mc.offer.chip.replace("{code}", masterclass.offer.code)}</Badge>
                <p className="type-title text-ink">{mc.offer.title.replace("{pct}", String(masterclass.offer.pct))}</p>
                <p className="type-small text-ink-muted">{mc.offer.text}</p>
                <Button href={masterclass.checkoutHref} size="lg" block arrow data-cta="hero_masterclass_first100" className="sm:w-auto">
                  {mc.offer.cta.replace("{pct}", String(masterclass.offer.pct))}
                </Button>
              </div>
            ) : (
              <Button href={entryHref} size="lg" block arrow data-cta="hero_primary" className="sm:w-auto sm:self-start">
                {heroCta}
              </Button>
            )}
            <p className="type-small mt-3 w-full text-center text-ink-muted sm:text-left">{c.hero.trust.replace("{days}", String(days))}</p>
            <ul className={cn("mt-8 grid w-full", stats.length === 4 ? "grid-cols-2 gap-y-6 sm:grid-cols-4 sm:divide-x sm:divide-line" : "grid-cols-3 divide-x divide-line")}>
              {stats.map((x) => (
                <li key={x.label} className="px-3 first:pl-0">
                  <StatChip value={x.value} label={x.label} />
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="container-page relative z-[1] pb-14">
          <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            {c.hero.doubtKillers.map((d) => (
              <li key={d} className="flex items-start gap-3 text-ink">
                <Check aria-hidden className="mt-1 size-5 flex-none text-success" strokeWidth={2.5} />
                {d}
              </li>
            ))}
          </ul>
        </div>
      </section>
        </>
      ) : (
        <>
      {/* 1. HERO — night sky with stars; the flight path starts here */}
      <section id="hero" className="sky-stars film-grain relative overflow-hidden">
        <FlightPath bend="right" />
        <div className="container-page relative z-[1] grid items-center gap-12 pt-6 pb-16 lg:min-h-[calc(88vh-64px)] lg:grid-cols-2 lg:gap-10 lg:py-16">
          <div className="flex flex-col items-start">
            <Badge tone="gold">{c.hero.eyebrow}</Badge>
            <h1 className="type-display-xl mt-5 text-ink">
              <Highlight text={c.hero.headline} shimmer />
            </h1>
            <p className="type-body-lg mt-4 max-w-[34ch] text-ink-muted">{c.hero.sub}</p>
            <div className="mt-7 flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row sm:gap-6 md:mt-9">
              <Button href={entryHref} size="lg" block arrow data-cta="hero_primary" className="sm:w-auto">
                {heroCta}
              </Button>
              {freeHref && (
                <Button href={freeHref} variant="ghost" data-cta="hero_free_lesson">
                  {c.hero.secondaryCta}
                </Button>
              )}
            </div>
            <p className="type-small mt-3 w-full text-center text-ink-muted sm:text-left">{c.hero.trust.replace("{days}", String(days))}</p>
            <ul className={cn("mt-10 grid w-full", stats.length === 4 ? "grid-cols-2 gap-y-6 sm:grid-cols-4 sm:divide-x sm:divide-line" : "grid-cols-3 divide-x divide-line")}>
              {stats.map((s) => (
                <li key={s.label} className="px-3 first:pl-0">
                  <StatChip value={s.value} label={s.label} />
                </li>
              ))}
            </ul>
          </div>

          {heroHasReel ? (
            // The product IS the reel: two tilted phones, the back one dimmed.
            <div className="relative mx-auto w-[70%] max-w-[320px] py-6 lg:w-[78%]">
              {c.hero.peekPosterUrl && (
                <div aria-hidden className="phone-frame absolute inset-y-6 left-[18%] w-full rotate-[6deg] opacity-70">
                  <div className="relative h-full overflow-hidden rounded-[26px]">
                    <Image src={c.hero.peekPosterUrl} alt="" fill sizes="320px" unoptimized className="object-cover" />
                  </div>
                </div>
              )}
              <PhoneMockup src={c.hero.videoUrl} webmSrc={c.hero.videoWebmUrl} poster={c.hero.posterUrl} label={c.hero.reelLabel} tilt={-4} float className="relative" />
            </div>
          ) : (
            // No reel uploaded yet: never an empty phone. The four doubt-killers become the hero visual instead.
            <ul className="hidden flex-col gap-4 lg:flex" aria-label={c.hero.eyebrow}>
              {c.hero.doubtKillers.map((d, i) => (
                <li
                  key={d}
                  className="flex w-[86%] items-center gap-4 rounded-lg border border-line bg-surface-raised p-5"
                  style={{ marginLeft: `${[0, 10, 3, 14][i % 4]}%`, transform: `rotate(${[-2, 1.5, -1, 2][i % 4]}deg)` }}
                >
                  <span className="grid size-11 flex-none place-items-center rounded-md bg-gold-soft">
                    <Check aria-hidden className="size-5 text-gold-text" strokeWidth={2.5} />
                  </span>
                  <span className="type-body-lg text-ink">{d}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Phones (and desktop when a reel exists): the doubt-killers as a simple list under the hero */}
        <div className={cn("container-page relative z-[1] pb-16", !heroHasReel && "lg:hidden")}>
          <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            {c.hero.doubtKillers.map((d) => (
              <li key={d} className="flex items-start gap-3 text-ink">
                <Check aria-hidden className="mt-1 size-5 flex-none text-success" strokeWidth={2.5} />
                {d}
              </li>
            ))}
          </ul>
        </div>
      </section>
        </>
      )}

      {/* 2. REEL WALL — only when real sample reels have been added */}
      {c.reels.items.length > 0 && (
        <Section bend="left" className="bg-surface-raised">
          <SectionHeader eyebrow={c.reels.eyebrow} heading={c.reels.title} sub={c.reels.sub} className="reveal" />
          <ul className="no-scrollbar -mx-5 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2">
            {c.reels.items.map((r) => (
              <li key={r.src} className="w-[62%] flex-none snap-start sm:w-[36%] md:w-[23%]">
                <PhoneMockup src={r.src} webmSrc={r.webmSrc} poster={r.poster} label={r.label} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 3. PROBLEM — compact tiles, each pain icon crossed out in fire */}
      <Section bend="left">
        <SectionHeader heading={c.problem.title} className="reveal" />
        <ul className="mt-10 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          {c.problem.points.map((p) => (
            <li key={p.text} className="reveal flex flex-col gap-4 rounded-lg border border-line bg-surface-raised p-4 md:p-6">
              <span aria-hidden className="relative grid size-11 place-items-center rounded-md bg-surface-raised-2">
                <Icon name={p.icon} className="size-5 text-ink-muted" />
                <span className="absolute h-0.5 w-9 -rotate-45 rounded-pill bg-fire" />
              </span>
              <span className="type-body-s text-ink">{p.text}</span>
            </li>
          ))}
        </ul>
        <p className="type-heading reveal mt-12 text-center text-gold-text">{c.problem.answer}</p>
      </Section>

      {/* 4. WAYS CREATORS EARN — numbered cards on a raised band; honesty line right under it */}
      <Section bend="right" className="bg-surface-raised">
        <SectionHeader eyebrow={c.earn.eyebrow} heading={c.earn.title} className="reveal" />
        <ol className="mt-10 grid gap-4 md:grid-cols-2 md:gap-6">
          {c.earn.items.map((e, i) => (
            <li key={e.title} className="card-lift reveal flex gap-5 rounded-lg border border-line bg-surface p-6 md:p-8">
              <span aria-hidden className="type-heading w-10 flex-none text-gold-text tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="type-title text-ink">{e.title}</h3>
                <p className="type-body-s text-ink-muted">{e.desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <IncomeDisclaimer className="mx-auto mt-8 max-w-reading" />
      </Section>

      {/* 5. HOW IT WORKS — the flight path IS the timeline: it runs through the gold numbered nodes */}
      <section className="sky-horizon section-y relative">
        <FlightMeasured />
        <div className="container-page relative z-[1]">
          <SectionHeader eyebrow={c.howItWorks.eyebrow} heading={c.howItWorks.title} className="reveal" />
          <ol className="mt-12 flex flex-col gap-10 md:grid md:grid-cols-5 md:gap-6">
            {c.howItWorks.steps.map((s, i) => (
              <li key={s.title} className="reveal flex gap-5 md:flex-col md:gap-4">
                <span data-flight-anchor className="type-heading grid size-12 flex-none place-items-center rounded-pill border-[1.5px] border-gold bg-surface text-gold-text">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-1 pt-2 md:pt-0">
                  <h3 className="type-title text-ink">{s.title}</h3>
                  <p className="type-body-s text-ink-muted">{s.desc}</p>
                  {s.image && <Image src={s.image} alt="" width={320} height={200} unoptimized loading="lazy" className="mt-2 h-auto w-full max-w-[320px] rounded-lg border border-line" />}
                </div>
              </li>
            ))}
          </ol>
          <IncomeDisclaimer className="mx-auto mt-12 max-w-reading" />
        </div>
      </section>

      {/* 6. CURRICULUM — summary chips, then the modules inside one raised panel */}
      {course && lessons.length > 0 && (
        <Section id="curriculum" bend="left">
          <SectionHeader eyebrow={c.curriculum.eyebrow} heading={c.curriculum.title} className="reveal" />
          <ul className="reveal mt-6 flex flex-wrap justify-center gap-2 md:justify-start">
            {curriculumChips.map((chip) => (
              <li key={chip} className="type-small rounded-pill border border-line bg-surface-raised-2 px-4 py-2 font-semibold text-ink">
                {chip}
              </li>
            ))}
          </ul>
          <div className="reveal mt-8 rounded-sheet border border-line bg-surface-raised p-4 md:p-8">
            <Accordion>
              {course.modules.map((m, i) => (
                <CurriculumModule
                  key={m.id}
                  group="curriculum"
                  defaultOpen={i === 0}
                  title={c.curriculum.moduleLabel.replace("{n}", String(i + 1)).replace("{title}", m.title)}
                  lessons={m.lessons.map((l) => ({
                    title: l.title,
                    minutes: Math.round(l.durationSec / 60) || undefined,
                    state: l.isFreePreview ? ("free" as const) : ("locked" as const),
                    href: l.isFreePreview ? `/preview/${l.id}` : undefined,
                  }))}
                />
              ))}
            </Accordion>
          </div>
        </Section>
      )}

      {/* 7. BONUSES — product covers, slightly fanned */}
      <Section bend="right">
        <div className="rounded-sheet bg-gold-soft p-6 md:p-12">
          <SectionHeader eyebrow={c.bonuses.eyebrow} heading={c.bonuses.title} className="reveal" />
          <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-6">
            {c.bonuses.items.map((b, i) => (
              <li key={b.title} className="reveal flex flex-col gap-3">
                <div
                  aria-hidden
                  className="relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-lg border border-line bg-surface p-4 md:p-5"
                  style={{ transform: `rotate(${[-3, 2, -2, 3][i % 4]}deg)` }}
                >
                  <span className="grid size-11 place-items-center rounded-md bg-gold-soft">
                    <Icon name={b.icon} className="size-5 text-gold-text" />
                  </span>
                  <SpeedTrails className="absolute top-4 right-4 h-5 w-6 opacity-60" />
                  <span className="font-display text-[22px] leading-[1.05] tracking-[0.3px] text-ink uppercase md:text-[26px]">{b.title}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="type-title sr-only">{b.title}</h3>
                  <p className="type-body-s text-ink-muted">{b.desc}</p>
                </div>
              </li>
            ))}
          </ul>
          <IncomeDisclaimer className="mx-auto mt-10 max-w-reading" />
        </div>
      </Section>

      {/* 7b. STUDENT VIDEOS — two rows sliding in opposite directions; tap to watch. Hidden until the files are live. */}
      {studentWall.length > 0 && (
        <section id="student-videos" className="section-y relative scroll-mt-16 overflow-hidden">
          <div className="container-page">
            <SectionHeader eyebrow={wallCopy.students.eyebrow} heading={wallCopy.students.title} sub={wallCopy.students.sub} className="reveal" />
          </div>
          <div className="mt-8 md:mt-10">
            <VideoWall videos={studentWall} playLabel={wallCopy.play} closeLabel={wallCopy.close} />
          </div>
          <p className="type-small container-page mt-5 text-ink-muted">{ui.testimonial.resultsVary}</p>
        </section>
      )}

      {/* 8. STUDENT RESULTS — real only, hidden until at least 3 exist */}
      {proof.testimonials.length >= 3 && (
        <Section bend="left" className="bg-surface-raised">
          <SectionHeader eyebrow={c.testimonials.eyebrow} heading={c.testimonials.title} className="reveal" />
          <ul className="no-scrollbar -mx-5 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2">
            {proof.testimonials.map((t) => (
              <li key={t.id} className="flex w-[80%] flex-none snap-start sm:w-[45%] md:w-[31%]">
                <TestimonialCard
                  name={t.name}
                  handle={t.city ?? undefined}
                  reelThumbUrl={t.imageUrl ?? undefined}
                  videoUrl={t.videoUrl ?? undefined}
                  quote={t.quote}
                  result={t.result ?? undefined}
                  showIncomeDisclaimer={MONEY_WORDS.test(`${t.quote} ${t.result ?? ""}`)}
                />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* 8b. WHO IS BEHIND THIS — hidden until a real name + bio are filled in (Admin → Landing content) */}
      {c.team.name && c.team.bio && (
        <Section bend="right">
          <SectionHeader eyebrow={c.team.eyebrow} heading={c.team.title} className="reveal" />
          <div className="reveal mt-10 flex flex-col gap-6 rounded-lg border border-line bg-surface-raised p-6 md:flex-row md:items-center md:p-8">
            {c.team.photoUrl && <Image src={c.team.photoUrl} alt={c.team.name} width={160} height={160} unoptimized loading="lazy" className="size-32 flex-none rounded-lg object-cover md:size-40" />}
            <div className="flex flex-col items-start gap-2">
              <h3 className="type-heading text-ink">{c.team.name}</h3>
              {c.team.role && <p className="type-label text-gold-text">{c.team.role}</p>}
              <p className="max-w-reading whitespace-pre-line text-ink-muted">{c.team.bio}</p>
              {c.team.instagramUrl && (
                <a href={c.team.instagramUrl} target="_blank" rel="noopener" className="inline-flex min-h-12 items-center font-semibold text-gold-text underline decoration-2 underline-offset-4">
                  {c.team.instagramLabel}
                </a>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* 9. PRICING — sunrise begins: a big soft sun behind the cards */}
      <Section id="pricing" bend="left" className="sky-sunrise-start">
        <span aria-hidden className="sun-glow top-[30%]" />
        <div className="relative">
          <SectionHeader eyebrow={c.pricing.eyebrow} heading={c.pricing.title} align="center" className="reveal" />
          <Countdown deadline={deadline?.toISOString()} className="mt-6" />
          <div className="mt-14 grid items-stretch gap-8 md:grid-cols-3 md:gap-6">
            {tiers.map(({ product, price, next }) => {
              const featured = product.slug === "pro";
              const features = Array.isArray(product.features) ? (product.features as string[]) : [];
              // Only a REAL upcoming price is ever shown — never a made-up "original" price.
              const later = price.endsAt && next && next.amountPaise > price.amountPaise ? c.pricing.laterPrice.replace("{date}", formatIST(price.endsAt, "date")).replace("{price}", formatINR(next.amountPaise)) : null;
              const label = (product.kind === "SERVICE" ? c.pricing.serviceCta : c.pricing.cta).replace("{name}", product.name);
              return (
                <PriceCard
                  key={product.id}
                  featured={featured}
                  badge={featured ? c.pricing.featuredBadge : (product.tagline ?? undefined)}
                  name={product.name}
                  price={formatINR(price.amountPaise)}
                  priceNote={later ?? c.pricing.oneTime}
                  inclusions={features}
                  className={cn("reveal", featured && "order-first md:order-none")}
                  cta={
                    <Button href={product.kind === "SERVICE" ? "/done-with-you" : `/checkout/${product.slug}`} variant={featured ? "primary" : "secondary"} size={featured ? "lg" : "md"} block data-cta={`pricing_${product.slug}`}>
                      {label}
                    </Button>
                  }
                />
              );
            })}
          </div>
          {tiers.length === c.pricing.compareRows[0]?.values.length && <TierCompareTable className="mt-10" tiers={tiers.map((t) => t.product.name)} featuredIndex={tiers.findIndex((t) => t.product.slug === "pro")} rows={c.pricing.compareRows} />}
          <TrustRow className="mt-8 justify-center" refundDays={days} whatsappHref={wa} />
        </div>
      </Section>

      {/* 10. GUARANTEE */}
      <Section bend="right" className="sky-dusk">
        <GuaranteeBox days={days} className="reveal" />
      </Section>

      {/* 11. FAQ — narrow reading column */}
      <section id="faq" className="sky-dusk section-y relative scroll-mt-16">
        <FlightPath bend="left" />
        <div className="container-narrow relative z-[1]">
          <SectionHeader eyebrow={c.faq.eyebrow} heading={c.faq.title} className="reveal" />
          <Accordion className="mt-10">
            {c.faq.items.map((f) => (
              <AccordionItem key={f.q} group="faq" title={f.q}>
                {f.a.replace("{days}", String(days))}
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* 12. PARTNER RECRUITMENT — split card: night headline | gold-soft commission figure */}
      <Section bend="right" className="sky-dusk">
        <div className="reveal grid overflow-hidden rounded-sheet border border-line md:grid-cols-2">
          <div className="flex flex-col justify-center gap-4 bg-surface p-6 md:p-12">
            <p className="type-label self-start rounded-pill bg-gold-soft px-3 py-2 text-gold-text">{c.partner.eyebrow}</p>
            <h2 className="type-display text-ink">
              <Highlight text={c.partner.title} />
            </h2>
          </div>
          <div className="flex flex-col items-start gap-5 bg-gold-soft p-6 md:p-12">
            {maxCommissionPct > 0 && (
              <p className="type-stat text-gold-text">
                <CountUp value={`${maxCommissionPct}%`} />
              </p>
            )}
            <p className="type-body-lg text-ink">{c.partner.text.replace("{pct}", String(maxCommissionPct))}</p>
            <Button href="/partners" variant="secondary" arrow data-cta="partner_block">
              {c.partner.cta}
            </Button>
            <IncomeDisclaimer />
          </div>
        </div>
      </Section>

      {/* 13. FINAL CTA — full sunrise; the flight path arrives at the button with a spark */}
      <section id="final-cta" className="sky-sunrise film-grain section-y relative">
        <span aria-hidden className="sun-glow -bottom-[45%]" />
        <FlightMeasured mode="end" />
        <div className="container-page relative z-[1] flex flex-col items-center gap-6 text-center">
          <h2 className="type-display-xl text-ink">
            <Highlight text={c.finalCta.title} />
          </h2>
          <p className="type-body-lg max-w-reading text-ink-muted">{c.finalCta.sub}</p>
          <div data-flight-anchor className="mt-3 w-full sm:w-auto">
            <FlightSpark>
              <Button href={entryHref} size="lg" arrow block data-cta="final_cta" className="sm:w-auto">
                {heroCta}
              </Button>
            </FlightSpark>
          </div>
          <TrustRow className="justify-center" refundDays={days} whatsappHref={wa} />
        </div>
      </section>

      {/* 14. STICKY BUY BAR (mobile) — hidden while pricing, the final CTA or the footer is on screen */}
      {entry && (
        <StickyBuyBar
          price={entryPrice}
          note={c.stickyBar.note}
          hideOnIds={["pricing", "final-cta", "site-footer"]}
          cta={
            <Button href={entryHref} pill data-cta="sticky_bar">
              {c.stickyBar.cta}
            </Button>
          }
        />
      )}

      {freeHref && <LeadSheet freeLessonHref={freeHref} />}

      {/* Real orders only (city + time). Off by default: Admin → Settings → showRecentPurchases. */}
      <RecentPurchaseToast enabled={settings.showRecentPurchases} orders={recent} text={c.recentPurchase} />
    </main>
  );
}
