import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { formatIST } from "@/lib/time";
import type { OrderStatus } from "@/generated/prisma/enums";

const STATUSES: OrderStatus[] = ["PAID", "CREATED", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"];

export default async function AdminOrders({ searchParams }: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const orders = await db.order.findMany({
    where: {
      ...(status ? { status } : { status: { not: "CREATED" } }),
      ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { items: true, partner: { select: { code: true } }, coupon: { select: { code: true } }, commissions: { select: { amountPaise: true, status: true } } },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Orders</h1>
        <a href={`/api/admin/export/orders${status ? `?status=${status}` : ""}`} className="btn-ghost min-h-10 text-sm">⬇ CSV export</a>
      </div>
      <form className="flex flex-wrap gap-2 text-sm">
        <input name="q" defaultValue={q} placeholder="Search email / phone / name" className="field min-h-10 max-w-xs" />
        <select name="status" defaultValue={status ?? ""} className="field min-h-10 w-auto">
          <option value="">All (except unpaid)</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button className="btn-ghost min-h-10">Filter</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-line text-left text-xs text-ink-muted">
            <tr>
              {["#", "Date (IST)", "Buyer", "Items", "Total", "Fee", "Status", "Source", "Commission"].map((h) => (
                <th key={h} className="p-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="p-3 tabular-nums">{o.number}</td>
                <td className="p-3 whitespace-nowrap">{formatIST(o.paidAt ?? o.createdAt)}</td>
                <td className="p-3">
                  {o.name}
                  <span className="block text-xs text-ink-muted">{o.email} • {o.phone}</span>
                </td>
                <td className="p-3">{o.items.map((i) => i.name).join(" + ")}</td>
                <td className="p-3 tabular-nums">
                  {formatINR(o.totalPaise)}
                  {o.coupon && <span className="block text-xs text-ink-muted">{o.coupon.code} −{formatINR(o.discountPaise)}</span>}
                </td>
                <td className="p-3 tabular-nums text-ink-muted">{o.gatewayFeePaise != null ? formatINR(o.gatewayFeePaise) : "—"}</td>
                <td className="p-3">{o.status}</td>
                <td className="p-3">
                  {o.partner ? `${o.partner.code} (${o.attributionSource.toLowerCase()})` : "direct"}
                  {o.campaign && <span className="block text-xs text-ink-muted">{o.campaign}</span>}
                  {o.utmSource && <span className="block text-xs text-ink-muted">utm: {o.utmSource}/{o.utmCampaign}</span>}
                </td>
                <td className="p-3 tabular-nums">{o.commissions[0] ? `${formatINR(o.commissions[0].amountPaise)} ${o.commissions[0].status.toLowerCase()}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-muted">Refunds: Phase 2 adds a Refund button here (via Razorpay API). Until then, refund from the Razorpay dashboard — the webhook marks the order refunded and reverses the commission automatically.</p>
    </div>
  );
}
