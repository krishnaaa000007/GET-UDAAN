import Image from "next/image";
import Link from "next/link";
import ui from "@/content/hi-Latn/ui.json";
import { cn } from "@/lib/cn";

/**
 * The Get Udaan logo. Always uses the official SVG files from /public/brand —
 * never retype the wordmark in a font or recolour it.
 *
 * on-dark  = default (night pages)        on-light = invoices, emails, certificate
 * mono-*   = over photos / over gold      stacked-* = square spaces
 * mark     = gold mark only (watermark, loaders)
 */
const FILES = {
  "on-dark": { src: "/brand/getudaan-horizontal-on-dark.svg", w: 666, h: 100 },
  "on-light": { src: "/brand/getudaan-horizontal-on-light.svg", w: 666, h: 100 },
  "mono-white": { src: "/brand/getudaan-horizontal-mono-white.svg", w: 666, h: 100 },
  "mono-ink": { src: "/brand/getudaan-horizontal-mono-ink.svg", w: 666, h: 100 },
  "stacked-on-dark": { src: "/brand/getudaan-stacked-on-dark.svg", w: 538, h: 282 },
  "stacked-on-light": { src: "/brand/getudaan-stacked-on-light.svg", w: 538, h: 282 },
  mark: { src: "/brand/getudaan-mark-gold.svg", w: 120, h: 120 },
} as const;

export type LogoVariant = keyof typeof FILES;

type Props = {
  /** Where the logo links to. Pass null for a plain image (no link). */
  href?: string | null;
  variant?: LogoVariant;
  /** Height classes. Default = 28px on mobile, 36px on desktop (header size). */
  className?: string;
  priority?: boolean;
};

export function Logo({ href = "/", variant = "on-dark", className, priority = false }: Props) {
  const f = FILES[variant];
  const img = (
    <Image
      src={f.src}
      alt={ui.brand.name}
      width={f.w}
      height={f.h}
      unoptimized
      priority={priority}
      className={cn("w-auto", className ?? "h-7 md:h-9")}
    />
  );
  if (href === null) return img;
  return (
    <Link href={href} aria-label={ui.brand.homeLabel} className="inline-flex min-h-12 items-center rounded-sm">
      {img}
    </Link>
  );
}
