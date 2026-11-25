import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import ui from "@/content/hi-Latn/ui.json";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

type Common = {
  /** primary = the ONE gold button on a screen. secondary = ink outline. ghost = gold text link. */
  variant?: Variant;
  /** sm = 48px tall with less side padding (header), md = 48px tall, lg = 56px tall */
  size?: Size;
  /** Full width (mobile CTAs, checkout, bottom sheet) */
  block?: boolean;
  /** Pill shape — used in the sticky buy bar */
  pill?: boolean;
  /** Adds a small arrow after the label */
  arrow?: boolean;
  /** Shows a spinner and blocks clicks (stops double payments) */
  loading?: boolean;
  children: ReactNode;
  className?: string;
};

type AsButton = Common & Omit<ComponentProps<"button">, keyof Common> & { href?: undefined };
type AsLink = Common & Omit<ComponentProps<typeof Link>, keyof Common> & { href: string };

const base =
  "group/btn type-button inline-flex items-center justify-center gap-2 border-[1.5px] text-center transition-[transform,background-color,border-color,color] duration-150 ease-(--ease-out) active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:pointer-events-none aria-disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "border-transparent bg-gold text-on-gold font-bold shadow-glow-gold hover:bg-gold-deep",
  secondary: "border-ink/15 bg-surface-raised text-ink shadow-card hover:border-ink/40",
  ghost: "border-transparent bg-transparent px-2 text-gold-text underline decoration-2 underline-offset-4 hover:decoration-transparent",
};

// lg = the main CTA: 56px tall on phones, 60px (and at least 260px wide) on desktop
const sizes: Record<Size, string> = { sm: "min-h-12 px-4", md: "min-h-12 px-6", lg: "min-h-14 px-8 md:min-h-[60px] md:min-w-[260px]" };

export function buttonClass({ variant = "primary", size = "md", block, pill, className }: Partial<Common>) {
  // Every button is a pill (reference look). `pill` is kept for older call sites.
  void pill;
  return cn(base, variants[variant], variant === "ghost" ? "min-h-12" : sizes[size], "rounded-pill", block && "w-full", className);
}

export function Button(props: AsButton | AsLink) {
  const { variant, size, block, pill, arrow, loading, children, className, ...rest } = props;
  const cls = buttonClass({ variant, size, block, pill, className });
  const inner = (
    <>
      {loading && <LoaderCircle aria-hidden className="size-5 animate-spin" />}
      <span>{children}</span>
      {loading && <span className="sr-only">{ui.loading}</span>}
      {arrow && !loading && <ArrowRight aria-hidden className="size-5 transition-transform duration-150 ease-(--ease-out) group-hover/btn:translate-x-1" strokeWidth={2.5} />}
    </>
  );

  if (typeof rest.href === "string") {
    const linkProps = rest as Omit<AsLink, keyof Common>;
    return (
      <Link {...linkProps} className={cls} aria-disabled={loading || undefined}>
        {inner}
      </Link>
    );
  }
  const btnProps = rest as Omit<AsButton, keyof Common>;
  return (
    <button type="button" {...btnProps} className={cls} disabled={loading || btnProps.disabled} aria-busy={loading || undefined}>
      {inner}
    </button>
  );
}
