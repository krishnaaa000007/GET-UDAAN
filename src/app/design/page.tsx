// Living style guide: every token, type style and component, in both themes.
// DEV ONLY — this page returns 404 on the live site.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Logo, type LogoVariant } from "@/components/logo";
import { Accordion, AccordionItem, CurriculumModule } from "@/components/ui/accordion";
import { Badge, EmptyState, GuaranteeBox, IncomeDisclaimer, SectionHeader, Skeleton, SpeedTrails, StatChip, TrustRow, Watermark } from "@/components/ui/basics";
import { Button } from "@/components/ui/button";
import { PriceCard, TestimonialCard, TierCompareTable } from "@/components/ui/commerce";
import { ProgressBar, ProgressRing, StatCard } from "@/components/ui/data";
import { Countdown, ReelPlayer, Toast } from "@/components/ui/interactive";
import { FormDemo, LoadingButtonDemo, SheetDemo, ToastDemo } from "./demos";

export const metadata: Metadata = { title: "Design system", robots: { index: false, follow: false } };

const COLORS = [
  ["surface", "bg-surface", "Page background"],
  ["surface-raised", "bg-surface-raised", "Cards, sheets, sticky bar"],
  ["surface-sunken", "bg-surface-sunken", "Inputs, prompt boxes"],
  ["line", "bg-line", "Borders, dividers"],
  ["ink", "bg-ink", "Main text"],
  ["ink-muted", "bg-ink-muted", "Secondary text"],
  ["gold", "bg-gold", "FILL only: primary CTA"],
  ["gold-deep", "bg-gold-deep", "Hover / pressed gold"],
  ["on-gold", "bg-on-gold", "Text on gold"],
  ["gold-text", "bg-gold-text", "Gold used as text"],
  ["gold-soft", "bg-gold-soft", "Tinted backgrounds"],
  ["fire", "bg-fire", "REAL urgency only"],
  ["success", "bg-success", "Paid, done (with ✓)"],
] as const;

const TYPE = [
  ["display-xl", "type-display-xl", "PHONE SE VIRAL TAK"],
  ["display", "type-display", "UDAAN BHARO"],
  ["heading", "type-heading", "KAISE KAAM KARTA HAI"],
  ["price", "type-price", "₹499"],
  ["title", "type-title", "Pehli reel aaj hi banao"],
  ["body-lg", "type-body-lg", "Sirf phone aur free AI tools se apna viral AI reel page banao."],
  ["body", "type-body", "Har lesson 5–10 minute ka hai, slow internet pe bhi chalega."],
  ["small", "type-small", "Results vary. Income ki koi guarantee nahi hai."],
  ["label", "type-label", "Bonus • 300+ prompts"],
  ["button", "type-button", "Abhi Join Karo"],
] as const;

// Demo only: a deadline 3 days after the dev server started.
const DEMO_DEADLINE = new Date(Date.now() + 3 * 86400_000).toISOString();

const LOGOS: Array<[LogoVariant, string]> = [
  ["on-dark", "bg-surface"],
  ["mono-white", "bg-surface"],
  ["stacked-on-dark", "bg-surface"],
  ["mark", "bg-surface"],
  ["mono-ink", "bg-gold"],
];

function Block({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-line py-8">
      <div>
        <h3 className="type-title text-ink">{title}</h3>
        {note && <p className="type-small text-ink-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

/** Everything that must look right in BOTH themes is rendered through this. */
function Showcase({ id }: { id: string }) {
  return (
    <>
      <Block title="Colours" note="Only these tokens. Never a raw hex in a page.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {COLORS.map(([name, cls, use]) => (
            <div key={name} className="overflow-hidden rounded-md border border-line bg-surface-raised">
              <div className={`${cls} h-14 border-b border-line`} />
              <div className="p-3">
                <div className="font-semibold text-ink">{name}</div>
                <div className="type-small text-ink-muted">{use}</div>
              </div>
            </div>
          ))}
        </div>
      </Block>

      <Block title="Type styles" note="Anton = headlines, prices, numbers (always UPPERCASE). Poppins = everything else.">
        <div className="flex flex-col gap-4">
          {TYPE.map(([name, cls, sample]) => (
            <div key={name} className="flex flex-col gap-1">
              <span className="type-label text-ink-muted">{name}</span>
              <span className={`${cls} text-ink`}>{sample}</span>
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <span className="type-label text-ink-muted">heading-hi (Hindi script → Poppins 800)</span>
            <span className="type-heading-hi text-ink">फ़ोन से वायरल तक</span>
          </div>
        </div>
      </Block>

      <Block title="Button" note="ONE primary (gold) button per screen. This guide shows it once, here.">
        <div className="flex flex-wrap items-center gap-3">
          <Button arrow>Abhi Join Karo</Button>
          <Button variant="secondary">Free Lesson Dekho</Button>
          <Button variant="ghost">Curriculum Dekho</Button>
          <Button variant="secondary" size="lg">
            Large Button
          </Button>
          <LoadingButtonDemo />
          <Button variant="secondary" disabled>
            Disabled
          </Button>
        </div>
      </Block>

      <Block title="Badge · StatChip · SpeedTrails">
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="gold">Bonus</Badge>
          <Badge tone="solid">Most Popular</Badge>
          <Badge tone="fire">Live</Badge>
          <Badge tone="success">Completed</Badge>
          <Badge tone="neutral">Free Preview</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatChip value="40+" label="Video lessons" />
          <StatChip value="300+" label="AI prompts" />
          <StatChip value="₹0" label="Tools ka kharcha" />
          <SpeedTrails />
          <SpeedTrails animated />
        </div>
      </Block>

      <Block title="SectionHeader">
        <SectionHeader eyebrow="Hinglish • Phone se • Free tools" heading="PHONE SE *VIRAL* TAK" sub="Sirf phone aur free AI tools se apna viral AI reel page banao — step by step, Hinglish mein." />
      </Block>

      <Block title="PriceCard + TierCompareTable" note="Featured card = gold-soft + gold border. Here its button is shown as secondary so this guide keeps one primary button.">
        <div className="grid gap-4 md:grid-cols-3">
          <PriceCard
            featured
            badge="Most Popular"
            name="Pro"
            price="₹1,999"
            priceNote="one-time"
            inclusions={["Basic ka sab kuch", "Community access", "Monthly naye prompts", "Live Q&A"]}
            cta={
              <Button variant="secondary" block>
                Pro Join Karo
              </Button>
            }
          />
          <PriceCard
            badge="Basic"
            name="Course"
            price="₹499"
            priceNote="one-time"
            inclusions={["40+ video lessons", "300+ prompt pack", "PDF guide + story templates"]}
            cta={
              <Button variant="secondary" block>
                Basic Lo
              </Button>
            }
          />
          <PriceCard
            badge="Premium"
            name="Done-with-you"
            price="₹14,999"
            priceNote="one-time"
            inclusions={["Pro ka sab kuch", "Team ke saath character + pehli videos", "1-on-1 calls"]}
            cta={
              <Button variant="secondary" block>
                Slot Book Karo
              </Button>
            }
          />
        </div>
        <TierCompareTable
          tiers={["Basic", "Pro", "Done-with-you"]}
          featuredIndex={1}
          rows={[
            { feature: "Video lessons", values: ["40+", "40+", "40+"] },
            { feature: "Prompt pack", values: [true, true, true] },
            { feature: "Community", values: [false, true, true] },
            { feature: "1-on-1 calls", values: [false, false, true] },
          ]}
        />
      </Block>

      <Block title="Accordion + CurriculumModule">
        <div className="grid gap-6 md:grid-cols-2">
          <Accordion>
            <AccordionItem group={`faq-${id}`} title="Laptop chahiye?" defaultOpen>
              Nahi. Poora course phone se ho jaata hai.
            </AccordionItem>
            <AccordionItem group={`faq-${id}`} title="Kya income guarantee hai?">
              Nahi. Hum sikhate hain; kamaai aapki mehnat aur consistency par depend karti hai.
            </AccordionItem>
          </Accordion>
          <Accordion>
            <CurriculumModule
              title="Module 1 — Character banao"
              defaultOpen
              lessons={[
                { title: "Apna bhai character design karo", minutes: 8, state: "free", href: "#" },
                { title: "Free AI tools setup", minutes: 6, state: "play", href: "#" },
                { title: "Consistent character ka secret", minutes: 9, state: "locked" },
              ]}
            />
          </Accordion>
        </div>
      </Block>

      <Block title="IncomeDisclaimer · GuaranteeBox · TrustRow">
        <IncomeDisclaimer className="max-w-reading" />
        <GuaranteeBox days={7} />
        <TrustRow refundDays={7} whatsappHref="#" />
      </Block>

      <Block title="TestimonialCard" note="SAMPLE DATA for layout only. On the real site this shows only real students, and the section stays hidden until 3 exist.">
        <div className="grid gap-4 md:grid-cols-3">
          <TestimonialCard name="Sample Student" handle="@sample.handle" quote="Sample quote — yahan real student ka apna experience aayega." result="Sample result" />
        </div>
      </Block>

      <Block title="Progress + StatCard">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard featured label="Total earnings" value="₹12,450" delta={{ text: "18%", direction: "up" }} spark={[2, 4, 3, 6, 5, 8, 9]} />
          <StatCard label="Clicks" value="318" delta={{ text: "4%", direction: "down" }} spark={[9, 7, 8, 6, 7, 5, 6]} />
          <div className="flex flex-col gap-4 rounded-md border border-line bg-surface-raised p-4">
            <ProgressBar value={45} />
            <div className="flex items-center gap-4">
              <ProgressRing value={25} />
              <ProgressRing value={75} />
            </div>
          </div>
        </div>
        <IncomeDisclaimer className="max-w-reading" />
      </Block>

      <Block title="Toast · EmptyState · Skeleton">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Toast tone="success" text="Payment ho gaya" />
            <Toast tone="error" text="Payment complete nahi hua" />
            <Toast tone="info" text="Naya lesson aa gaya hai" />
          </div>
          <EmptyState
            text="Abhi koi sale nahi aayi. Apna link share karo — pehli sale door nahi."
            action={
              <Button variant="secondary" href="#">
                Link Copy Karo
              </Button>
            }
          />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-24 w-full rounded-md" />
          </div>
        </div>
      </Block>
    </>
  );
}

export default function DesignPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main lang="en" className="pb-24">
      <header className="container-page flex flex-col gap-4 py-8">
        <Logo href={null} priority />
        <h1 className="type-display text-ink">
          Design <span className="text-gold-text">system</span>
        </h1>
        <p className="type-body-lg max-w-reading text-ink-muted">Every token, type style and component used on getudaan.com. This page is only visible while developing. The rules live in DESIGN.md.</p>
      </header>

      <div className="container-page">
        <Block title="Logo" note="Official SVG files only. Never retype, recolour or stretch.">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {LOGOS.map(([v, bg]) => (
              <div key={v} className={`${bg} flex min-h-28 flex-col items-center justify-center gap-3 rounded-md border border-line p-4`}>
                <Logo href={null} variant={v} className={v.startsWith("stacked") || v === "mark" ? "h-14" : "h-7"} />
                <span className={`type-small ${bg === "bg-gold" ? "text-on-gold" : "text-ink-muted"}`}>{v}</span>
              </div>
            ))}
          </div>
        </Block>

        <h2 className="type-heading pt-8 text-gold-text">Night theme (default)</h2>
        <Showcase id="night" />

        <Block title="Interactive (try them)" note="Bottom sheet, toasts, form fields, countdown, reel player.">
          <div className="flex flex-wrap items-center gap-3">
            <SheetDemo />
          </div>
          <ToastDemo />
          <FormDemo />
          <div className="flex flex-col items-start gap-2">
            <span className="type-small text-ink-muted">Countdown — demo deadline 3 days from now. On real pages it shows ONLY for a real admin-set deadline.</span>
            <Countdown deadline={DEMO_DEADLINE} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="type-small text-ink-muted">ReelPlayer + Watermark — poster only here; add a real reel file to see it play.</span>
            <div className="relative w-56">
              <ReelPlayer src="/brand/sample-reel.mp4" poster="/brand/getudaan-app-icon.png" label="Sample reel" />
              <Watermark text="Get Udaan • demo" />
            </div>
          </div>
        </Block>
      </div>

      <div data-theme="day" className="mt-8 py-8">
        <div className="container-page">
          <Logo href={null} variant="on-light" />
          <h2 className="type-heading pt-6 text-gold-text">Day theme (invoices, emails, certificate)</h2>
          <Showcase id="day" />
        </div>
      </div>
    </main>
  );
}
