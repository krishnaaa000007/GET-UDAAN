"use client";

import { useId, useState } from "react";
import t from "@/content/hi-Latn/partner.json";

const inr = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

/** Slider: sales per month → estimated commission. `perSalePaise` is worked out on the server from real prices. */
export function CommissionCalculator({ perSalePaise }: { perSalePaise: number }) {
  const id = useId();
  const [sales, setSales] = useState(20);
  const c = t.landing.calc;
  return (
    <div className="flex flex-col gap-4">
      <label htmlFor={id} className="font-semibold text-ink">
        {c.slider}
      </label>
      <input id={id} type="range" min={1} max={200} step={1} value={sales} onChange={(e) => setSales(Number(e.target.value))} aria-valuetext={c.sales.replace("{n}", String(sales))} className="h-12 w-full cursor-pointer accent-gold" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <span className="type-title text-ink">{c.sales.replace("{n}", String(sales))}</span>
        <span className="flex flex-col items-end">
          <span className="type-label text-ink-muted">{c.estimate}</span>
          <output htmlFor={id} className="type-price text-gold-text">
            {inr(sales * perSalePaise)}
          </output>
        </span>
      </div>
    </div>
  );
}
