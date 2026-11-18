"use client";

/**
 * A number that counts up once (800ms) the first time it scrolls into view: "300+" goes 0 → 300, then "+".
 * The real value is in the HTML from the start (search engines, no-JS, screen readers);
 * reduced-motion visitors just see it. Values without digits, or 0, are shown as they are.
 */
import { useEffect, useRef } from "react";

export function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    const m = value.match(/^(\D*)(\d[\d,]*)(.*)$/);
    if (!el || !m || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const [, pre, digits, post] = m;
    const target = Number(digits.replace(/,/g, ""));
    if (!target) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / 800);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = `${pre}${Math.round(target * eased).toLocaleString("en-IN")}${post}`;
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);
  return (
    <span ref={ref} className="tabular-nums">
      {value}
    </span>
  );
}
