// Selling components: PriceCard, TierCompareTable, TestimonialCard.
import Image from "next/image";
import { Check, X } from "lucide-react";
import type { ReactNode } from "react";
import ui from "@/content/hi-Latn/ui.json";
import { cn } from "@/lib/cn";
import { Badge, IncomeDisclaimer } from "./basics";

/* ---------- PriceCard ---------- */
/**
 * Order inside the card: what you get → price → CTA.
 * `cta` should be a <Button>: variant="primary" ONLY on the featured card, "secondary" on the others.
 */
export function PriceCard({
  badge,
  name,
  price,
  priceNote,
  inclusions,
  cta,
  featured = false,
  className,
}: {
  badge?: string;
  name: string;
  /** Already formatted, e.g. "₹499" */
  price: string;
  /** e.g. "one-time" */
  priceNote?: string;
  inclusions: string[];
  cta: ReactNode;
  featured?: boolean;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "relative flex flex-col gap-5 rounded-lg p-6 md:p-8",
        featured ? "border-[1.5px] border-gold bg-surface-raised shadow-glow-gold md:-translate-y-4" : "border border-line bg-surface-raised",
        className,
      )}
    >
      {badge &&
        (featured ? (
          // ribbon across the top edge of the recommended plan
          <Badge tone="solid" className="absolute -top-4 left-6">
            {badge}
          </Badge>
        ) : (
          <Badge tone="neutral" className="self-start">
            {badge}
          </Badge>
        ))}
      <h3 className={cn("type-heading text-ink", featured && badge && "pt-2")}>{name}</h3>
      <ul className="type-body-s flex flex-col gap-3">
        {inclusions.map((line) => (
          <li key={line} className="flex gap-3 text-ink-muted">
            <Check aria-hidden className="mt-0.5 size-5 flex-none text-success" strokeWidth={2.5} />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-1 border-t border-line pt-5">
        <span className="type-stat text-gold-text">{price}</span>
        {priceNote && <span className="type-small text-ink-muted">{priceNote}</span>}
      </div>
      {cta}
    </article>
  );
}

/* ---------- TierCompareTable ---------- */
export type CompareRow = { feature: string; values: Array<boolean | string> };

function CompareValue({ v }: { v: boolean | string }) {
  if (typeof v === "string") return <span className="text-ink">{v}</span>;
  return v ? (
    <span className="inline-flex items-center gap-1 text-success">
      <Check aria-hidden className="size-5" strokeWidth={2.5} />
      <span className="type-small">{ui.compare.included}</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-ink-muted">
      <X aria-hidden className="size-5" />
      <span className="type-small">{ui.compare.notIncluded}</span>
    </span>
  );
}

/** Mobile: a "Compare" toggle that opens one card per plan. Desktop: a normal table. */
export function TierCompareTable({ tiers, rows, featuredIndex, className }: { tiers: string[]; rows: CompareRow[]; featuredIndex?: number; className?: string }) {
  return (
    <div className={className}>
      {/* Mobile */}
      <details className="accordion-item md:hidden">
        <summary className="type-button flex min-h-12 cursor-pointer items-center justify-center rounded-md border-[1.5px] border-ink/20 px-6 text-ink">{ui.compare.toggle}</summary>
        <div className="mt-4 flex flex-col gap-4">
          {tiers.map((tier, t) => (
            <div key={tier} className={cn("rounded-lg p-4", t === featuredIndex ? "border-[1.5px] border-gold bg-surface-raised" : "border border-line bg-surface-raised")}>
              <h4 className="type-heading mb-3 text-ink">{tier}</h4>
              <ul className="flex flex-col gap-2">
                {rows.map((r) => (
                  <li key={r.feature} className="flex items-start justify-between gap-4">
                    <span className="text-ink-muted">{r.feature}</span>
                    <span className="flex-none text-right">
                      <CompareValue v={r.values[t]} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
      {/* Desktop */}
      <table className="hidden w-full border-collapse text-left md:table">
        <thead>
          <tr>
            <th scope="col" className="type-label border-b border-line p-4 text-ink-muted">
              {ui.compare.feature}
            </th>
            {tiers.map((tier, t) => (
              <th key={tier} scope="col" className={cn("type-heading border-b border-line p-4", t === featuredIndex ? "bg-gold-soft text-gold-text" : "text-ink")}>
                {tier}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.feature}>
              <th scope="row" className="border-b border-line p-4 font-normal text-ink-muted">
                {r.feature}
              </th>
              {r.values.map((v, t) => (
                <td key={t} className={cn("border-b border-line p-4", t === featuredIndex && "bg-gold-soft")}>
                  <CompareValue v={v} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- TestimonialCard: REAL students only (with permission) ---------- */
export function TestimonialCard({
  name,
  handle,
  avatarUrl,
  reelThumbUrl,
  videoUrl,
  quote,
  result,
  showIncomeDisclaimer = false,
  className,
}: {
  name: string;
  handle?: string;
  avatarUrl?: string;
  reelThumbUrl?: string;
  /** Real video testimonial (opens in a new tab). Only shown when set. */
  videoUrl?: string;
  quote: string;
  /** Short real result, e.g. "12k followers in 2 months" */
  result?: string;
  /** Turn on when the quote or result talks about money */
  showIncomeDisclaimer?: boolean;
  className?: string;
}) {
  return (
    <figure className={cn("flex w-full flex-col gap-4 rounded-lg border border-line bg-surface-raised p-6", className)}>
      {reelThumbUrl && (
        <div className="relative aspect-[9/16] w-full overflow-hidden rounded-md bg-surface-sunken">
          <Image src={reelThumbUrl} alt="" fill sizes="(max-width: 768px) 80vw, 320px" unoptimized className="object-cover" />
        </div>
      )}
      <blockquote className="text-ink">“{quote}”</blockquote>
      {videoUrl && (
        <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="type-button inline-flex min-h-12 items-center gap-2 self-start text-gold-text underline underline-offset-4">
          {ui.testimonial.watchVideo}
        </a>
      )}
      {result && (
        <Badge tone="gold" className="self-start">
          {result}
        </Badge>
      )}
      <figcaption className="flex items-center gap-3">
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" width={40} height={40} unoptimized className="size-10 rounded-pill object-cover" />
        ) : (
          <span aria-hidden className="grid size-10 place-items-center rounded-pill bg-gold-soft font-bold text-gold-text">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="flex flex-col">
          <span className="font-semibold text-ink">{name}</span>
          {handle && <span className="type-small text-ink-muted">{handle}</span>}
        </span>
      </figcaption>
      {showIncomeDisclaimer ? <IncomeDisclaimer /> : <p className="type-small text-ink-muted">{ui.testimonial.resultsVary}</p>}
    </figure>
  );
}
