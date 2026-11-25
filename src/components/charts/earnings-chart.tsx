"use client";

/**
 * Daily earnings as a saffron line over a soft gold area (one series, one axis, no legend — the title names it).
 * Colours come from the design tokens; gridlines use the `line` colour.
 */
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { day: string; clicks: number; sales: number; earningsPaise: number };

const fmtDay = (d: string) => new Date(`${d}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const inr = (p: number) => `₹${(p / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export function EarningsChart({ data, label }: { data: Point[]; label: string }) {
  const rows = data.map((d) => ({ ...d, value: d.earningsPaise / 100 }));
  return (
    <div className="h-56 w-full" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fill: "var(--ink-muted)", fontSize: 13 }} axisLine={false} tickLine={false} minTickGap={28} />
          <YAxis tick={{ fill: "var(--ink-muted)", fontSize: 13 }} axisLine={false} tickLine={false} allowDecimals={false} width={52} />
          <Tooltip
            cursor={{ stroke: "var(--line)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as Point;
              return (
                <div className="type-small rounded-sm border border-line bg-surface-raised px-3 py-2 text-ink shadow-lift">
                  <div className="font-semibold">{fmtDay(p.day)}</div>
                  <div className="text-ink-muted">
                    Clicks: <span className="text-ink">{p.clicks}</span>
                  </div>
                  <div className="text-ink-muted">
                    Sales: <span className="text-ink">{p.sales}</span>
                  </div>
                  <div className="text-ink-muted">
                    Earnings: <span className="text-gold-text">{inr(p.earningsPaise)}</span>
                  </div>
                </div>
              );
            }}
          />
          <Area type="monotone" dataKey="value" stroke="var(--saffron)" strokeWidth={2.5} fill="var(--gold)" fillOpacity={0.2} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
