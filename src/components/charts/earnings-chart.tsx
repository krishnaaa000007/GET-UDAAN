"use client";

/**
 * Single-series daily bar chart (one axis, no legend — the title names it).
 * Thin bars with 4px rounded tops, recessive grid, hover tooltip with clicks/sales/earnings.
 */
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Point = { day: string; clicks: number; sales: number; earningsPaise: number };

const fmtDay = (d: string) => new Date(`${d}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const inr = (p: number) => `₹${(p / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export function EarningsChart({ data, metric }: { data: Point[]; metric: "earningsPaise" | "clicks" }) {
  const rows = data.map((d) => ({ ...d, value: metric === "earningsPaise" ? d.earningsPaise / 100 : d.clicks }));
  return (
    <div className="h-48 w-full" role="img" aria-label={metric === "earningsPaise" ? "Daily earnings chart" : "Daily clicks chart"}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="#2a2a35" strokeDasharray="0" />
          <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fill: "#a3a3b2", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis tick={{ fill: "#a3a3b2", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={48} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as Point;
              return (
                <div className="rounded-lg border border-line bg-panel-2 px-3 py-2 text-xs text-white shadow-lg">
                  <div className="mb-1 font-semibold">{fmtDay(p.day)}</div>
                  <div className="text-muted">Clicks: <span className="text-white">{p.clicks}</span></div>
                  <div className="text-muted">Sales: <span className="text-white">{p.sales}</span></div>
                  <div className="text-muted">Earnings: <span className="text-white">{inr(p.earningsPaise)}</span></div>
                </div>
              );
            }}
          />
          <Bar dataKey="value" fill={metric === "earningsPaise" ? "#ffb627" : "#7c7c8c"} radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
