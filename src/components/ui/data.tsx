// Progress + dashboard numbers: ProgressBar, ProgressRing, StatCard.
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import ui from "@/content/hi-Latn/ui.json";
import { cn } from "@/lib/cn";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function ProgressBar({ value, label = ui.progress.label, showLabel = true, className }: { value: number; label?: string; showLabel?: boolean; className?: string }) {
  const v = clamp(value);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className="h-2 flex-1 overflow-hidden rounded-pill bg-line">
        <div className="h-full rounded-pill bg-gold transition-[width] duration-200 ease-out" style={{ width: `${v}%` }} />
      </div>
      {showLabel && <span className="type-small w-10 flex-none text-right font-semibold text-ink">{v}%</span>}
    </div>
  );
}

export function ProgressRing({ value, size = 64, label = ui.progress.label, className }: { value: number; size?: number; label?: string; className?: string }) {
  const v = clamp(value);
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className={cn("relative grid flex-none place-items-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 60 60" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="30" cy="30" r={r} fill="none" strokeWidth="6" className="stroke-line" />
        <circle cx="30" cy="30" r={r} fill="none" strokeWidth="6" strokeLinecap="round" className="stroke-gold" strokeDasharray={c} strokeDashoffset={c - (c * v) / 100} />
      </svg>
      <span className="type-small font-semibold text-ink">{v}%</span>
    </div>
  );
}

/** Tiny line chart drawn as SVG (no chart library needed). */
function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${((i / (points.length - 1)) * 100).toFixed(1)} ${(28 - ((p - min) / span) * 24).toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden className="h-8 w-full">
      <path d={d} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" className="stroke-ink-muted/50" />
    </svg>
  );
}

/**
 * Dashboard number card. A fall is shown in calm grey, never red — we don't shame people.
 * `featured` = the one big gold card (e.g. partner "Total earnings").
 */
export function StatCard({
  label,
  value,
  delta,
  spark,
  icon: Icon,
  featured = false,
  className,
}: {
  /** Optional gold icon tile above the number (reference look). */
  icon?: LucideIcon;
  label: string;
  /** Already formatted, e.g. "₹12,450" or "318" */
  value: string;
  /** Change vs the previous period, e.g. { text: "12%", direction: "up" } */
  delta?: { text: string; direction: "up" | "down" };
  spark?: number[];
  featured?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 rounded-lg p-4", featured ? "border-2 border-gold bg-gold-soft" : "border border-line bg-surface-raised shadow-card", className)}>
      {Icon && (
        <span aria-hidden className="mb-1 grid size-10 place-items-center rounded-pill bg-gold-chip text-on-gold">
          <Icon className="size-5" strokeWidth={2.2} />
        </span>
      )}
      <span className="type-label text-ink-muted">{label}</span>
      <span className={cn(featured ? "type-price text-gold-text" : "type-heading text-ink")}>{value}</span>
      {delta && (
        <span className={cn("type-small inline-flex items-center gap-1", delta.direction === "up" ? "text-success" : "text-ink-muted")}>
          {delta.direction === "up" ? <TrendingUp aria-hidden className="size-4" /> : <TrendingDown aria-hidden className="size-4" />}
          {delta.text} {delta.direction === "up" ? ui.statCard.up : ui.statCard.down}
          <span className="text-ink-muted">· {ui.statCard.vsPrevious}</span>
        </span>
      )}
      {spark && <Sparkline points={spark} />}
    </div>
  );
}
