"use client";

/**
 * The gold flight path, measured version. Draws from the left gutter at the top of its section,
 * through every element marked `data-flight-anchor` (e.g. the numbered step nodes), and then:
 *  - mode "through": on to the bottom of the section, back in the gutter, so the next section continues it;
 *  - mode "end": stops at the left edge of the (single) anchor — the final CTA button.
 * Measures once on mount and again only when the section resizes (no per-frame layout reads).
 * The drawing animation itself is CSS (.flight-measured in globals.css).
 */
import { useEffect, useRef, useState } from "react";

function gutterCenter(width: number) {
  const w = width < 768 ? 20 : width < 1280 ? 32 : Math.max(32, (width - 1200) / 2);
  return w / 2;
}

export function FlightMeasured({ mode = "through" }: { mode?: "through" | "end" }) {
  const ref = useRef<SVGSVGElement>(null);
  const [geo, setGeo] = useState<{ w: number; h: number; d: string } | null>(null);

  useEffect(() => {
    const svg = ref.current;
    const host = svg?.parentElement;
    if (!svg || !host) return;

    const build = () => {
      const box = host.getBoundingClientRect();
      const W = box.width;
      const H = box.height;
      const gx = gutterCenter(W);
      const anchors = [...host.querySelectorAll<HTMLElement>("[data-flight-anchor]")]
        .filter((el) => el.offsetParent !== null)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.left - box.left + r.width / 2, y: r.top - box.top + r.height / 2, left: r.left - box.left };
        });
      if (anchors.length === 0) return setGeo({ w: W, h: H, d: `M${gx} 0 L${gx} ${H}` });

      const a = anchors[0];
      const z = anchors[anchors.length - 1];
      let d: string;
      if (mode === "end") {
        const endX = Math.max(gx + 4, a.left - 6);
        d = `M${gx} 0 L${gx} ${Math.max(0, a.y - 90)} C${gx} ${a.y - 30} ${gx} ${a.y} ${endX} ${a.y}`;
      } else if (Math.abs(a.x - z.x) < 24) {
        // vertical timeline (phones): jog from the gutter to the node column, straight through, jog back
        d = `M${gx} 0 L${gx} ${Math.max(0, a.y - 90)} C${gx} ${a.y - 40} ${a.x} ${a.y - 50} ${a.x} ${a.y} L${z.x} ${z.y} C${z.x} ${z.y + 45} ${gx} ${z.y + 35} ${gx} ${z.y + 80} L${gx} ${H}`;
      } else {
        // horizontal row (desktop): down the left gutter, across the nodes, out to the right gutter,
        // down the right side, and back to the left gutter through the empty bottom padding.
        const rx = W - gx;
        d = `M${gx} 0 L${gx} ${Math.max(0, a.y - 80)} C${gx} ${a.y - 20} ${a.x - 60} ${a.y} ${a.x} ${a.y} L${z.x} ${z.y} L${rx - 40} ${z.y} C${rx} ${z.y} ${rx} ${z.y + 40} ${rx} ${z.y + 80} L${rx} ${H - 100} C${rx} ${H - 30} ${gx} ${H - 70} ${gx} ${H}`;
      }
      setGeo({ w: W, h: H, d });
    };

    build();
    const ro = new ResizeObserver(() => build());
    ro.observe(host);
    return () => ro.disconnect();
  }, [mode]);

  return (
    <svg ref={ref} className="flight-measured" viewBox={geo ? `0 0 ${geo.w} ${geo.h}` : "0 0 1 1"} preserveAspectRatio="none" aria-hidden focusable="false">
      {geo && <path d={geo.d} pathLength={1} />}
    </svg>
  );
}

/** Wraps the final CTA: a small gold spark burst once, the first time it is fully on screen. */
export function FlightSpark({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("is-sparked");
          io.disconnect();
        }
      },
      { threshold: 0.9 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const dirs = [
    [-22, -18],
    [-28, 0],
    [-22, 18],
    [-8, -26],
    [-8, 26],
    [10, -22],
    [10, 22],
  ];
  return (
    <span ref={ref} className="spark-host inline-flex w-full sm:w-auto">
      {children}
      {dirs.map(([x, y], i) => (
        <span key={i} aria-hidden className="spark" style={{ "--sx": `${x}px`, "--sy": `${y}px`, animationDelay: `${i * 25}ms` } as React.CSSProperties} />
      ))}
    </span>
  );
}
