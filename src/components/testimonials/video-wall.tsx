"use client";

/**
 * VIDEO WALL — real video testimonials in two rows that slide in opposite directions (top ←, bottom →).
 *  - Cards show a still frame + play button; nothing downloads until someone taps play (keeps phones fast).
 *  - Tap → the video plays with sound in a popup; the rows pause while it is open, and on hover.
 *  - Reduced-motion users get rows they can swipe instead of sliding ones (see .marquee in globals.css).
 */
import { Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export type WallVideo = { id: string; src: string; poster: string; label: string };

/** Repeat a row until it is long enough to fill wide screens, then the CSS loop doubles it. */
function fill<T>(row: T[], min: number): T[] {
  if (row.length === 0) return row;
  const out: T[] = [];
  while (out.length < min) out.push(...row);
  return out;
}

export function VideoWall({ videos, closeLabel, playLabel }: { videos: WallVideo[]; closeLabel: string; playLabel: string }) {
  const [open, setOpen] = useState<WallVideo | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Two rows: alternate videos so each row mixes different people.
  const rows = [videos.filter((_, i) => i % 2 === 0), videos.filter((_, i) => i % 2 === 1)].filter((r) => r.length > 0);
  if (rows.length === 1 && videos.length > 1) rows.push([...videos].reverse());

  return (
    <div className="flex flex-col gap-4 md:gap-5" data-testid="video-wall">
      {rows.map((row, ri) => {
        const cards = fill(row, 8);
        return (
          <div key={ri} className="marquee overflow-hidden" data-paused={open ? "" : undefined}>
            <ul className="marquee-track flex gap-3 md:gap-4" data-dir={ri % 2 === 0 ? "left" : "right"} style={{ ["--marquee-dur" as string]: `${cards.length * 5}s` }}>
              {[...cards, ...cards].map((v, i) => (
                // The second copy only exists for the seamless loop: hidden from screen readers and keyboard.
                <li key={`${v.id}-${i}`} aria-hidden={i >= cards.length || undefined} className="w-[38vw] max-w-[200px] flex-none scroll-ml-4 snap-start sm:w-[190px] md:w-[210px] md:max-w-none">
                  <button
                    type="button"
                    tabIndex={i >= cards.length ? -1 : undefined}
                    onClick={() => setOpen(v)}
                    aria-label={`${playLabel}: ${v.label}`}
                    data-cta={`video_testimonial_${v.id}`}
                    className="group relative block aspect-[9/16] w-full overflow-hidden rounded-lg border border-line bg-surface-sunken text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- remote poster on R2; plain lazy img keeps it light */}
                    <img src={v.poster} alt="" loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                    <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <span aria-hidden className="absolute top-1/2 left-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-pill bg-gold text-on-gold shadow-lift transition-transform duration-150 group-hover:scale-110">
                      <Play className="size-5 translate-x-px" fill="currentColor" />
                    </span>
                    <span className="type-small absolute bottom-3 left-3 rounded-pill bg-black/55 px-2.5 py-1 font-semibold text-white">{v.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(null); // tap outside the video closes it
        }}
        className="sheet m-auto w-[min(92vw,420px)] overflow-visible bg-transparent p-0"
      >
        {open && (
          <div className="relative">
            <video
              key={open.id}
              src={open.src}
              poster={open.poster}
              controls
              autoPlay
              playsInline
              preload="auto"
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
              className="aspect-[9/16] max-h-[82dvh] w-full rounded-lg bg-black object-contain"
            />
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label={closeLabel}
              className={cn("absolute -top-3 -right-3 grid size-11 place-items-center rounded-pill border border-line bg-surface-raised text-ink shadow-lift hover:text-gold-text")}
            >
              <X aria-hidden className="size-5" />
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
}
