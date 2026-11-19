/**
 * ADMIN — refund report: refunds per partner (rate, money refunded, commission Get Udaan still paid)
 * and the latest refunds. Use it to spot partners to freeze.
 */
import Link from "next/link";
import { PARTNER_RULES } from "@/config/partners";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { formatIST } from "@/lib/time";
import { getSettings } from "@/server/settings";

export default async function AdminRefunds() {
  const [settings, partners, paid, refundedOrders, latest] = await Promise.all([
    getSettings(),
    db.partner.findMany({ where: { status: "APPROVED" }, select: { id: true, code: true, displayName: true, frozenAt: true } }),
    db.order.groupBy({ by: ["partnerId"], where: { partnerId: { not: null }, status: "PAID" }, _count: { _all: true } }),
    db.order.findMany({
      where: { partnerId: { not: null }, status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] } },
      select: { partnerId: true, refunds: { where: { status: "processed" }, select: { amountPaise: true } }, commissions: { where: { status: { not: "REVERSED" } }, select: { amountPaise: true } } },
    }),
    db.refund.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { order: { select: { number: true, name: true, partner: { select: { code: true } } } } } }),
  ]);
  const paidBy = new Map(paid.map((p) => [p.partnerId, p._count._all]));
  const rows = partners
    .map((p) => {
      const mine = refundedOrders.filter((o) => o.partnerId === p.id);
      const refunds = mine.length;
      const total = (paidBy.get(p.id) ?? 0) + refunds;
      const rate = total ? Math.round((refunds / total) * 100) : 0;
      return {
        ...p,
        total,
        refunds,
        rate,
        refundedPaise: mine.reduce((s, o) => s + o.refunds.reduce((a, r) => a + r.amountPaise, 0), 0),
        keptPaise: mine.reduce((s, o) => s + o.commissions.reduce((a, c) => a + c.amountPaise, 0), 0),
        flagged: settings.refundFlagPct > 0 && total >= PARTNER_RULES.refundFlagMinSales && rate > settings.refundFlagPct,
      };
    })
    .filter((r) => r.refunds > 0)
    .sort((a, b) => b.rate - a.rate || b.refunds - a.refunds);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Refund report</h1>
      <p className="text-sm text-ink-muted">
        Refunds absorbed: <b>{settings.absorbRefunds ? "ON — partners keep commission and team bonus on refunded sales" : "OFF — refunds take the commission back"}</b>. High-refund flag:{" "}
        {settings.refundFlagPct > 0 ? `above ${settings.refundFlagPct}% with ${PARTNER_RULES.refundFlagMinSales}+ sales` : "not set (Settings → refundFlagPct)"}. Freeze a partner from{" "}
        <Link href="/admin/partners" className="underline">
          Partners
        </Link>
        .
      </p>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line text-left text-xs text-ink-muted">
            <tr>
              {["Partner", "Sales", "Refunds", "Rate", "Refunded", "Commission still paid", ""].map((h) => (
                <th key={h} className="p-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="p-3">
                  {r.displayName} <span className="text-ink-muted">{r.code}</span>
                </td>
                <td className="p-3 tabular-nums">{r.total}</td>
                <td className="p-3 tabular-nums">{r.refunds}</td>
                <td className={`p-3 tabular-nums ${r.flagged ? "font-semibold text-fire" : ""}`}>{r.rate}%</td>
                <td className="p-3 tabular-nums">{formatINR(r.refundedPaise)}</td>
                <td className="p-3 tabular-nums">{formatINR(r.keptPaise)}</td>
                <td className="p-3">
                  {r.frozenAt && <span className="rounded-sm bg-fire px-2 py-0.5 text-xs text-on-fire">FROZEN</span>}
                  {r.flagged && <span className="ml-1 rounded-sm border border-fire px-2 py-0.5 text-xs text-fire">High refunds</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-4 text-ink-muted">No partner sales have been refunded.</p>}
      </div>
      <h2 className="font-semibold">Latest refunds</h2>
      <ul className="card divide-y divide-line text-sm">
        {latest.map((r) => (
          <li key={r.id} className="flex flex-wrap justify-between gap-2 p-3">
            <span>
              #{r.order.number} {r.order.name} <span className="text-ink-muted">{r.order.partner?.code ?? "direct"}</span>
            </span>
            <span className="tabular-nums">
              {formatINR(r.amountPaise)} <span className="text-ink-muted">• {formatIST(r.createdAt)}</span>
            </span>
          </li>
        ))}
        {latest.length === 0 && <li className="p-3 text-ink-muted">No refunds yet.</li>}
      </ul>
    </div>
  );
}
