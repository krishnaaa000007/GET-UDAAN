import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { formatIST } from "@/lib/time";
import { getAdminOverview } from "@/server/admin-stats";
import { approveDueCommissions } from "@/server/partners";

const RANGES = [1, 7, 30, 90];

export default async function AdminHome({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const days = RANGES.find((r) => String(r) === sp.range) ?? 30;
  const partnerId = typeof sp.partner === "string" && sp.partner ? sp.partner : undefined;
  await approveDueCommissions();
  const [o, recent, partners] = await Promise.all([
    getAdminOverview(days, partnerId),
    db.order.findMany({ where: { status: { not: "CREATED" } }, orderBy: { createdAt: "desc" }, take: 8, include: { partner: { select: { code: true } }, items: { select: { name: true } } } }),
    db.partner.findMany({ where: { status: "APPROVED" }, select: { id: true, code: true } }),
  ]);
  const m = o.money;
  const top = o.funnel[0].count || 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Overview</h1>
        <form className="flex flex-wrap gap-2 text-sm">
          <select name="range" defaultValue={days} className="field min-h-10 w-auto">
            {RANGES.map((r) => (
              <option key={r} value={r}>{r === 1 ? "Today (24h)" : `Last ${r} days`}</option>
            ))}
          </select>
          <select name="partner" defaultValue={partnerId ?? ""} className="field min-h-10 w-auto">
            <option value="">All sources</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>Partner: {p.code}</option>
            ))}
          </select>
          <button className="btn-ghost min-h-10">Apply</button>
        </form>
      </div>

      {(o.todo.pendingPartners > 0 || o.todo.openPayouts > 0) && (
        <div className="flex flex-wrap gap-2 text-sm">
          {o.todo.pendingPartners > 0 && <Link href="/admin/partners" className="rounded-full bg-gold/15 px-3 py-1 text-gold-text">{o.todo.pendingPartners} partner application(s) to review →</Link>}
          {o.todo.openPayouts > 0 && <Link href="/admin/payouts" className="rounded-full bg-gold/15 px-3 py-1 text-gold-text">{o.todo.openPayouts} withdrawal request(s) →</Link>}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Gross sales", m.gross, `${m.orders} orders`],
          ["Net revenue", m.net, "after GST, fees, refunds"],
          ["Partner share", m.partnerShare, "commissions (not reversed)"],
          ["Our share", m.ourShare, "net − partner share"],
          ["Refunds", m.refunded, ""],
          ["Gateway fees", m.fees, ""],
          ["GST collected", m.tax, ""],
        ].map(([label, v, hint]) => (
          <div key={label as string} className="card p-4">
            <p className="text-xs text-ink-muted">{label as string}</p>
            <p className="mt-1 text-2xl font-bold">{formatINR(v as number)}</p>
            {hint && <p className="text-[11px] text-ink-muted">{hint as string}</p>}
          </div>
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-semibold">Funnel</h2>
          <ul className="mt-4 space-y-3">
            {o.funnel.map((f, i) => {
              const prev = i > 0 ? o.funnel[i - 1].count : null;
              return (
                <li key={f.step}>
                  <div className="flex justify-between text-sm">
                    <span>{f.step}</span>
                    <span className="tabular-nums">
                      {f.count.toLocaleString("en-IN")}
                      {prev ? <span className="ml-2 text-xs text-ink-muted">{((f.count / prev) * 100).toFixed(1)}% of prev</span> : null}
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-surface-sunken">
                    <div className="h-2 rounded-full bg-gold" style={{ width: `${Math.max(1, (f.count / top) * 100)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-ink-muted">Abandoned checkouts (30+ min, unpaid): {o.todo.abandoned}. Recovery emails arrive in Phase 2.</p>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Revenue by product</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {o.byProduct.map((p) => (
              <li key={p.name} className="flex justify-between py-2">
                <span>{p.name}</span>
                <span className="tabular-nums">{formatINR(p.paise)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent orders</h2>
          <Link href="/admin/orders" className="text-sm text-gold-text">All orders →</Link>
        </div>
        <ul className="mt-3 divide-y divide-line text-sm">
          {recent.map((r) => (
            <li key={r.id} className="flex justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block truncate">#{r.number} {r.name} — {r.items.map((i) => i.name).join(" + ")}</span>
                <span className="text-xs text-ink-muted">{formatIST(r.createdAt)} • {r.status}{r.partner ? ` • via ${r.partner.code}` : ""}</span>
              </span>
              <span className="tabular-nums">{formatINR(r.totalPaise)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
