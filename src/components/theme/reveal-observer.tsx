"use client";

/**
 * Scroll reveal for every element with class "reveal" (brief §7): fade up 16px, 60ms stagger, once.
 * Order matters to avoid blinking: first mark what is already on screen as revealed,
 * THEN arm the hidden state for the rest. No JS / reduced motion = everything simply visible.
 * Re-scans on every client-side navigation.
 */
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;

    const els = [...document.querySelectorAll<HTMLElement>(".reveal")];
    // stagger index among .reveal siblings (capped so long lists don't wait forever)
    for (const el of els) {
      const sibs = el.parentElement ? [...el.parentElement.children].filter((c) => c.classList.contains("reveal")) : [el];
      el.style.setProperty("--reveal-i", String(Math.min(sibs.indexOf(el), 5)));
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-revealed");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.2 },
    );
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-revealed");
      else io.observe(el);
    }
    root.classList.add("reveal-armed");
    return () => {
      io.disconnect();
      root.classList.remove("reveal-armed");
    };
  }, [pathname]);
  return null;
}
