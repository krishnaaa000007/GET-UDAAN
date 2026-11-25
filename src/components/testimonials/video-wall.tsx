"use client";

/**
 * VIDEO WALL — real video testimonials in ONE row, in the order they are saved in
 * content/hi-Latn/video-testimonials.json (student-01, student-02, …).
 *  - The row drifts slowly to the left by itself, but it is a real scroll area: people can swipe / drag /
 *    use the arrows to go back to earlier videos. Drifting pauses on hover, touch, focus or while a video
 *    plays, and starts again a few seconds after the visitor lets go.
 *  - The list is repeated three times and the scroll position is quietly shifted by one copy when it nears
 *    either end, so it loops forever in both directions without a visible jump.
 *  - Cards show a still frame + play button; nothing downloads until someone taps play (keeps phones fast).
 *  - Tap → the video plays right inside its card (no popup), with sound and controls. One at a time; it
 *    stops when it scrolls out of view or ends.
 *  - Reduced-motion visitors get no drifting, just the swipeable row.
 */
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type WallVideo = { id: string; src: string; poster: string; label: string };

const COPIES = 3; // the middle copy is the "real" one; the outer two make the loop seamless both ways
const SPEED = 28; // px per second while drifting
const RESUME_AFTER = 2500; // ms after the last touch/hover before drifting again

export function VideoWall({ videos, playLabel, prevLabel = "Pichhla video", nextLabel = "Agla video" }: { videos: WallVideo[]; playLabel: string; closeLabel?: string; prevLabel?: string; nextLabel?: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState<number | null>(null); // index in the tripled list
  const playingRef = useRef<number | null>(null);
  const holdUntil = useRef(0); // drifting is paused until this time (ms)
  const hovering = useRef(false);

  const n = videos.length;
  const cards = Array.from({ length: COPIES }, () => videos).flat();

  /** Width of one copy of the list (distance between card i and card i + n). */
  const copyWidth = useCallback(() => {
    const el = scroller.current;
    if (!el || n === 0) return 0;
    const items = el.querySelectorAll<HTMLElement>("[data-card]");
    if (items.length <= n) return 0;
    return items[n].offsetLeft - items[0].offsetLeft;
  }, [n]);

  /** Keep the scroll position inside the middle copy so both directions can go on forever. */
  const wrap = useCallback(() => {
    const el = scroller.current;
    const w = copyWidth();
    if (!el || !w) return;
    if (el.scrollLeft < w * 0.5) el.scrollLeft += w;
    else if (el.scrollLeft > w * 1.5) el.scrollLeft -= w;
  }, [copyWidth]);

  const hold = useCallback((ms = RESUME_AFTER) => {
    holdUntil.current = Math.max(holdUntil.current, performance.now() + ms);
  }, []);

  const start = (i: number) => {
    playingRef.current = i;
    setPlaying(i);
  };
  const stop = useCallback(() => {
    playingRef.current = null;
    setPlaying(null);
    hold();
  }, [hold]);

  // Start on the middle copy, so the first card shown is video 01 and "back" is possible right away.
  useEffect(() => {
    const el = scroller.current;
    const w = copyWidth();
    if (el && w) el.scrollLeft = w;
  }, [copyWidth]);

  // Slow drift to the left.
  useEffect(() => {
    if (n === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = performance.now();
    let carry = 0; // sub-pixel remainder, so slow speeds still move smoothly
    const tick = (now: number) => {
      const el = scroller.current;
      const dt = Math.min(250, now - last); // time-based, so slow/throttled phones still drift at the same speed
      last = now;
      if (el && playingRef.current === null && !hovering.current && now > holdUntil.current && !document.hidden) {
        carry += (SPEED * dt) / 1000;
        const step = Math.floor(carry);
        if (step >= 1) {
          carry -= step;
          el.scrollLeft += step;
          wrap();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n, wrap]);

  // Stop the playing video when it scrolls out of view.
  useEffect(() => {
    const el = scroller.current;
    if (!el || playing === null) return;
    const card = el.querySelectorAll<HTMLElement>("[data-card]")[playing];
    if (!card) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) stop();
    }, { root: el, threshold: 0.4 });
    io.observe(card);
    return () => io.disconnect();
  }, [playing, stop]);

  /** Arrow buttons: move by about one card. */
  function nudge(dir: -1 | 1) {
    const el = scroller.current;
    const card = el?.querySelector<HTMLElement>("[data-card]");
    if (!el || !card) return;
    hold(4000);
    el.scrollBy({ left: dir * (card.offsetWidth + 16), behavior: "smooth" });
  }

  if (n === 0) return null;

  return (
    <div className="relative" data-testid="video-wall">
      <div
        ref={scroller}
        onScroll={wrap}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") hovering.current = true;
        }}
        onPointerLeave={() => {
          hovering.current = false;
          hold(800);
        }}
        onPointerDown={() => hold()}
        onTouchStart={() => hold()}
        onWheel={() => hold()}
        onFocusCapture={() => hold(6000)}
        className="no-scrollbar overflow-x-auto overscroll-x-contain px-4 md:px-8"
      >
        <ul className="flex w-max gap-3 py-2 md:gap-4">
          {cards.map((v, i) => {
            const copy = Math.floor(i / n);
            const hidden = copy !== 1; // only the middle copy is read out / tabbable
            const isPlaying = playing === i;
            return (
              <li key={`${v.id}-${i}`} data-card aria-hidden={hidden || undefined} className="w-[42vw] max-w-[220px] flex-none sm:w-[200px] md:w-[220px] md:max-w-none">
                <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg border border-line bg-bezel shadow-card">
                  {isPlaying ? (
                    <video
                      key={`${v.id}-${i}`}
                      src={v.src}
                      poster={v.poster}
                      controls
                      autoPlay
                      playsInline
                      preload="auto"
                      controlsList="nodownload noremoteplayback"
                      disablePictureInPicture
                      onEnded={stop}
                      onContextMenu={(e) => e.preventDefault()}
                      aria-label={v.label}
                      className="size-full bg-black object-cover"
                    />
                  ) : (
                    <button
                      type="button"
                      tabIndex={hidden ? -1 : undefined}
                      onClick={() => start(i)}
                      aria-label={`${playLabel}: ${v.label} ${(i % n) + 1}`}
                      data-cta={`video_testimonial_${v.id}`}
                      className="group absolute inset-0 block text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- remote poster on R2; plain lazy img keeps it light */}
                      <img src={v.poster} alt="" loading="lazy" decoding="async" draggable={false} className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <span aria-hidden className="absolute top-1/2 left-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-pill bg-gold text-on-gold shadow-glow-gold transition-transform duration-150 group-hover:scale-110">
                        <Play className="size-6 translate-x-px" fill="currentColor" />
                      </span>
                      <span className="type-small absolute bottom-3 left-3 rounded-pill bg-black/55 px-2.5 py-1 font-semibold text-white">{v.label}</span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Desktop arrows (phones just swipe). */}
      <button
        type="button"
        onClick={() => nudge(-1)}
        aria-label={prevLabel}
        className="absolute top-1/2 left-2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-pill border border-line bg-surface-raised text-ink shadow-lift transition-colors hover:bg-gold hover:text-on-gold md:grid"
      >
        <ChevronLeft aria-hidden className="size-6" />
      </button>
      <button
        type="button"
        onClick={() => nudge(1)}
        aria-label={nextLabel}
        className="absolute top-1/2 right-2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-pill border border-line bg-surface-raised text-ink shadow-lift transition-colors hover:bg-gold hover:text-on-gold md:grid"
      >
        <ChevronRight aria-hidden className="size-6" />
      </button>
    </div>
  );
}
