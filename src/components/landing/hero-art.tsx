/**
 * Small hand-made illustrations for the landing page (reference look, Nov 2026).
 * All inline SVG: no image downloads, crisp on every screen, colours from the design tokens.
 * Decorative only, so every piece is aria-hidden.
 */
import { cn } from "@/lib/cn";

/** Generic red "video platform" tile with a play triangle (where reels get posted). */
export function PlayTile({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 64 48" className={cn("drop-shadow-md", className)}>
      <rect x="2" y="2" width="60" height="44" rx="12" fill="#ff1f1f" transform="rotate(-8 32 24)" />
      <path d="M26 15 L44 24 L26 33 Z" fill="#fff" transform="rotate(-8 32 24)" />
    </svg>
  );
}

/** Generic gradient "photo app" tile with a camera ring. */
export function CameraTile({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 56 56" className={cn("drop-shadow-md", className)}>
      <defs>
        <linearGradient id="cam-g" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#ffb627" />
          <stop offset="0.45" stopColor="#ff3d6e" />
          <stop offset="1" stopColor="#8a3ffc" />
        </linearGradient>
      </defs>
      <g transform="rotate(8 28 28)">
        <rect x="4" y="4" width="48" height="48" rx="14" fill="url(#cam-g)" />
        <rect x="14" y="14" width="28" height="28" rx="9" fill="none" stroke="#fff" strokeWidth="4" />
        <circle cx="28" cy="28" r="6.5" fill="none" stroke="#fff" strokeWidth="4" />
        <circle cx="37" cy="19" r="2.2" fill="#fff" />
      </g>
    </svg>
  );
}

/** Offer-card art: a phone playing a reel, two platform tiles and a rising bar chart, on a soft gold disc. */
export function OfferArt({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 200 200" className={className}>
      <circle cx="104" cy="108" r="88" fill="var(--gold)" opacity="0.28" />
      <g transform="rotate(14 104 96)">
        <rect x="70" y="30" width="72" height="128" rx="14" fill="var(--ink)" />
        <rect x="76" y="38" width="60" height="112" rx="9" fill="#3b82f6" />
        <rect x="76" y="38" width="60" height="112" rx="9" fill="url(#offer-screen)" />
        <circle cx="106" cy="94" r="15" fill="#fff" />
        <path d="M101 86 L114 94 L101 102 Z" fill="#7c3aed" />
      </g>
      <defs>
        <linearGradient id="offer-screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <g transform="translate(34 18) rotate(-10)">
        <rect width="40" height="30" rx="8" fill="#ff1f1f" />
        <path d="M16 9 L27 15 L16 21 Z" fill="#fff" />
      </g>
      <g transform="translate(30 92) rotate(10)">
        <rect width="30" height="30" rx="9" fill="#ff7a3d" />
        <rect x="7" y="7" width="16" height="16" rx="5" fill="none" stroke="#fff" strokeWidth="3" />
        <circle cx="15" cy="15" r="3.5" fill="none" stroke="#fff" strokeWidth="3" />
      </g>
      <g transform="translate(132 54) rotate(12)">
        <rect width="32" height="32" rx="9" fill="url(#cam-o)" />
        <rect x="8" y="8" width="16" height="16" rx="5" fill="none" stroke="#fff" strokeWidth="3" />
        <circle cx="16" cy="16" r="3.5" fill="none" stroke="#fff" strokeWidth="3" />
      </g>
      <defs>
        <linearGradient id="cam-o" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#ffb627" />
          <stop offset="0.5" stopColor="#ff3d6e" />
          <stop offset="1" stopColor="#8a3ffc" />
        </linearGradient>
      </defs>
      <g fill="#2563eb">
        <rect x="128" y="168" width="12" height="22" rx="2" />
        <rect x="144" y="156" width="12" height="34" rx="2" />
        <rect x="160" y="140" width="12" height="50" rx="2" />
        <rect x="176" y="124" width="12" height="66" rx="2" />
      </g>
      <path d="M124 150 C 146 140, 160 124, 186 102" stroke="#2563eb" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M176 100 L188 100 L186 112" stroke="#2563eb" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Handwritten note with a gold underline, e.g. "Viral!" next to the creator photo. */
export function HandNote({ children, className }: { children: string; className?: string }) {
  return (
    <span aria-hidden className={cn("inline-block -rotate-12 font-hand text-[28px] leading-none font-bold text-ink", className)}>
      {children}
      <svg viewBox="0 0 100 12" preserveAspectRatio="none" className="absolute -bottom-2 left-1 h-2.5 w-[90%] text-gold">
        <path d="M2 9 C 30 3, 60 2, 98 5" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/** Line-drawn crown (final CTA doodle). */
export function CrownDoodle({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 80 60" className={cn("text-gold", className)} fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M8 48 L4 16 L24 32 L40 6 L56 32 L76 16 L72 48 Z" />
      <path d="M10 56 L70 56" />
    </svg>
  );
}

/** Line-drawn paper plane with a dashed loop trail (final CTA doodle). */
export function PlaneDoodle({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 140 100" className={cn("text-ink", className)} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round">
      <path d="M134 6 L62 40 L84 50 Z M134 6 L84 50 L92 78 L100 56" />
      <path d="M60 62 C 40 80, 20 70, 28 56 C 34 46, 48 52, 40 64 C 32 76, 14 84, 4 90" strokeDasharray="4 7" opacity="0.8" />
    </svg>
  );
}

/** Sketchy rising bar chart with an arrow (final CTA doodle). */
export function ChartDoodle({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 130 120" className={cn("text-ink", className)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
      <path d="M6 114 L124 114" />
      <rect x="14" y="86" width="16" height="28" />
      <rect x="40" y="70" width="16" height="44" />
      <rect x="66" y="52" width="16" height="62" />
      <rect x="92" y="32" width="16" height="82" />
      <path d="M10 74 C 40 60, 70 40, 112 10" />
      <path d="M98 10 L114 8 L110 24" />
    </svg>
  );
}

/** Big puffy cream clouds along the bottom edge of a navy section. */
export function Clouds({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 1440 200" preserveAspectRatio="none" className={className}>
      <path
        fill="var(--cloud, #fff8f0)"
        d="M0 200 V150 C 90 140 150 168 240 150 C 330 120 420 160 520 148 C 600 140 640 168 720 160 C 800 150 840 120 920 118 C 960 70 1040 60 1080 96 C 1110 40 1200 30 1240 80 C 1270 40 1360 40 1380 96 C 1410 90 1430 100 1440 104 V200 Z"
      />
      <path
        fill="var(--cloud, #fff8f0)"
        opacity="0.6"
        d="M860 200 V140 C 900 100 960 96 990 120 C 1030 80 1100 84 1120 118 C 1160 96 1220 100 1240 130 C 1300 110 1380 120 1440 140 V200 Z"
      />
    </svg>
  );
}
