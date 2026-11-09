"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/track";

/** Fires one page_view per page load. */
export function PageView({ props }: { props?: Record<string, unknown> }) {
  useEffect(() => {
    track("page_view", props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

/** A link that records a cta_click before navigating. */
export function CtaLink({ href, id, className, children }: { href: string; id: string; className?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={className} onClick={() => track("cta_click", { id, href })}>
      {children}
    </Link>
  );
}

/**
 * Mobile sticky buy bar: appears only after the hero (#hero) scrolls out of view,
 * and hides again when the pricing section is on screen (no double CTA).
 */
export function StickyBuyBar({ priceLabel, href, ctaText }: { priceLabel: string; href: string; ctaText: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("hero");
    const pricing = document.getElementById("pricing");
    if (!hero) return;
    let heroVisible = true;
    let pricingVisible = false;
    const update = () => setShow(!heroVisible && !pricingVisible);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) heroVisible = e.isIntersecting;
        if (e.target === pricing) pricingVisible = e.isIntersecting;
      }
      update();
    });
    io.observe(hero);
    if (pricing) io.observe(pricing);
    return () => io.disconnect();
  }, []);

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 md:hidden ${show ? "translate-y-0" : "translate-y-full"}`}
    >
      <div className="mx-auto flex max-w-md items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted">Lifetime access</div>
          <div className="text-xl font-bold text-white">{priceLabel}</div>
        </div>
        <CtaLink href={href} id="sticky_bar" className="btn-gold flex-1">
          {ctaText} →
        </CtaLink>
      </div>
    </div>
  );
}

/** Countdown ONLY for a real admin-set deadline. Renders nothing after it passes. */
export function Countdown({ endsAt, nextPriceLabel }: { endsAt: string; nextPriceLabel: string | null }) {
  const end = new Date(endsAt).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, []);
  if (now === null || now >= end) return null;
  const s = Math.floor((end - now) / 1000);
  const parts = [
    [Math.floor(s / 86400), "din"],
    [Math.floor((s % 86400) / 3600), "ghante"],
    [Math.floor((s % 3600) / 60), "min"],
    [s % 60, "sec"],
  ] as const;
  return (
    <div className="rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-center text-sm">
      <span className="text-gold">Launch price khatam hone mein: </span>
      <span className="font-semibold tabular-nums text-white">
        {parts.map(([v, l]) => `${v} ${l}`).join(" : ")}
      </span>
      {nextPriceLabel && <div className="text-xs text-muted">Uske baad price {nextPriceLabel} ho jayega.</div>}
    </div>
  );
}

/**
 * Hero sample reel: muted, looping, plays only when visible, and never downloads
 * on Data Saver / 2G connections (the poster image is shown instead).
 */
export function HeroVideo({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [allow, setAllow] = useState(false);
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData || /2g/.test(conn?.effectiveType ?? "")) return;
    // Wait until the page is idle so the video never competes with first paint.
    const start = () => setAllow(true);
    if ("requestIdleCallback" in window) (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(start);
    else setTimeout(start, 1200);
  }, []);
  useEffect(() => {
    const v = ref.current;
    if (!v || !allow) return;
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()));
    io.observe(v);
    return () => io.disconnect();
  }, [allow]);
  return (
    <video
      ref={ref}
      className="h-full w-full object-cover"
      poster={poster || undefined}
      muted
      loop
      playsInline
      preload="none"
      src={allow ? src : undefined}
      aria-label="Sample AI reel"
    />
  );
}
