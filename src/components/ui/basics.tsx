// Small display-only building blocks: Badge, StatChip, SectionHeader, SpeedTrails,
// IncomeDisclaimer, GuaranteeBox, TrustRow, EmptyState, Skeleton, Watermark.
import Link from "next/link";
import { Check, Info, MessageCircle, RotateCcw, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import ui from "@/content/hi-Latn/ui.json";
import { cn } from "@/lib/cn";

/* ---------- SpeedTrails: the brand motif (short-long-short bars, tilted −20°) ---------- */
export function SpeedTrails({ className, animated = false }: { className?: string; animated?: boolean }) {
  return (
    <svg viewBox="0 0 48 40" aria-hidden className={cn("h-6 w-7 text-gold-text", className)} fill="currentColor">
      <g transform="rotate(-20 24 20)" className={animated ? "animate-trail" : undefined}>
        <rect x="16" y="3" width="24" height="8" rx="4" />
        <rect x="4" y="16" width="36" height="8" rx="4" />
        <rect x="16" y="29" width="24" height="8" rx="4" />
      </g>
    </svg>
  );
}

/* ---------- Badge ---------- */
type BadgeTone = "gold" | "solid" | "fire" | "success" | "neutral";
const badgeTones: Record<BadgeTone, string> = {
  gold: "bg-gold-soft text-gold-text",
  solid: "bg-gold text-on-gold",
  fire: "bg-fire text-on-fire",
  success: "border border-success text-success",
  neutral: "border border-line bg-surface-raised text-ink-muted",
};

/** tone "success" always shows a tick so the meaning never depends on colour alone. */
export function Badge({ tone = "gold", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("type-label inline-flex items-center gap-1 rounded-sm px-2 py-1", badgeTones[tone], className)}>
      {tone === "success" && <Check aria-hidden className="size-3.5" strokeWidth={3} />}
      {children}
    </span>
  );
}

/* ---------- StatChip ---------- */
export function StatChip({ value, label, className }: { value: string; label: string; className?: string }) {
  return (
    <div className={cn("inline-flex flex-col items-start rounded-pill border border-line bg-surface-raised px-4 py-2", className)}>
      <span className="font-display text-[22px] leading-none text-gold-text">{value}</span>
      <span className="type-label text-ink-muted">{label}</span>
    </div>
  );
}

/* ---------- SectionHeader ---------- */
/**
 * Eyebrow + Anton heading + optional sub line.
 * To make a word gold, wrap it in *stars* in the heading text: "PHONE SE *VIRAL* TAK".
 */
export function SectionHeader({
  eyebrow,
  heading,
  sub,
  as: Tag = "h2",
  size = "display",
  align = "left",
  className,
}: {
  eyebrow?: string;
  heading: string;
  sub?: ReactNode;
  as?: "h1" | "h2" | "h3";
  size?: "display-xl" | "display" | "heading";
  align?: "left" | "center";
  className?: string;
}) {
  const sizeClass = { "display-xl": "type-display-xl", display: "type-display", heading: "type-heading" }[size];
  return (
    <div className={cn("flex flex-col gap-3", align === "center" && "items-center text-center", className)}>
      {eyebrow && <p className="type-label text-gold-text">{eyebrow}</p>}
      <Tag className={cn(sizeClass, "text-balance text-ink")}>
        <Highlight text={heading} />
      </Tag>
      {sub && <p className="type-body-lg max-w-reading text-ink-muted">{sub}</p>}
    </div>
  );
}

/** Turns "PHONE SE *VIRAL* TAK" into text with the starred word in gold. */
export function Highlight({ text }: { text: string }) {
  const parts = text.split("*");
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <span key={i} className="text-gold-text">
            {p}
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}

/* ---------- IncomeDisclaimer: MUST sit under every income mention ---------- */
export function IncomeDisclaimer({ className }: { className?: string }) {
  return (
    <p role="note" className={cn("type-small flex items-start gap-2 rounded-sm border border-dashed border-line bg-surface-sunken px-4 py-3 text-ink-muted", className)}>
      <Info aria-hidden className="mt-0.5 size-[18px] flex-none" />
      <span>
        <strong className="font-semibold text-ink">{ui.incomeDisclaimer.strong}</strong> {ui.incomeDisclaimer.text}
      </span>
    </p>
  );
}

/* ---------- GuaranteeBox ---------- */
export function GuaranteeBox({ days, policyHref = "/legal/refund", className }: { days: number; policyHref?: string; className?: string }) {
  const fill = (s: string) => s.replaceAll("{days}", String(days));
  return (
    <div className={cn("flex flex-col items-start gap-4 rounded-lg border border-line bg-surface-raised p-6 md:flex-row md:items-center md:gap-6 md:p-8", className)}>
      <ShieldCheck aria-hidden className="size-14 flex-none text-gold-text" strokeWidth={1.5} />
      <div className="flex flex-col gap-2">
        <h3 className="type-heading text-ink">{fill(ui.guarantee.title)}</h3>
        <p className="text-ink-muted">{fill(ui.guarantee.text)}</p>
        <Link href={policyHref} className="inline-flex min-h-12 items-center self-start text-gold-text underline underline-offset-4">
          {ui.guarantee.link}
        </Link>
      </div>
    </div>
  );
}

/* ---------- TrustRow ---------- */
/** Pass refundDays / whatsappHref from real settings. Items without data are left out. */
export function TrustRow({ refundDays, whatsappHref, className }: { refundDays?: number; whatsappHref?: string; className?: string }) {
  const item = "type-small inline-flex items-center gap-2 text-ink-muted";
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-6 gap-y-2", className)}>
      <li className={item}>
        <ShieldCheck aria-hidden className="size-5" />
        <span>
          {ui.trust.secure} • {ui.trust.methods}
        </span>
      </li>
      {refundDays ? (
        <li className={item}>
          <RotateCcw aria-hidden className="size-5" />
          {ui.trust.refund.replace("{days}", String(refundDays))}
        </li>
      ) : null}
      {whatsappHref ? (
        <li>
          <a href={whatsappHref} target="_blank" rel="noopener" className={cn(item, "min-h-12 underline underline-offset-4")}>
            <MessageCircle aria-hidden className="size-5" />
            {ui.trust.support}
          </a>
        </li>
      ) : null}
    </ul>
  );
}

/* ---------- EmptyState: one sentence + one next step ---------- */
export function EmptyState({ text, action, className }: { text: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center gap-4 rounded-md border border-line bg-surface-raised px-6 py-10 text-center", className)}>
      <SpeedTrails className="h-10 w-12" />
      <p className="max-w-sm text-ink-muted">{text}</p>
      {action}
    </div>
  );
}

/* ---------- Skeleton: give it the same size as the real thing (no layout shift) ---------- */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("shimmer rounded-sm", className)} />;
}

/* ---------- Watermark: faint repeating text over the video player ---------- */
export function Watermark({ text, className }: { text: string; className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 z-10 grid select-none grid-cols-2 place-items-center overflow-hidden", className)}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="type-small -rotate-20 whitespace-nowrap text-ink/25">
          {text}
        </span>
      ))}
    </div>
  );
}
