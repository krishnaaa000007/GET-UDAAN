/** Numbers for the admin overview: revenue split and funnel, for a date range. */
import "server-only";
import { db } from "@/lib/db";

export async function getAdminOverview(days: number, partnerId?: string) {
  const since = new Date(Date.now() - days * 86_400_000);
  const pf = partnerId ? { partnerId } : {};
  const [paid, refunds, commissions, visitors, leads, checkouts, purchases, pendingPartners, openPayouts, abandoned] = await Promise.all([
    db.order.findMany({ where: { ...pf, paidAt: { gte: since }, status: { in: ["PAID", "REFUNDED", "PARTIALLY_REFUNDED"] } }, select: { totalPaise: true, taxPaise: true, gatewayFeePaise: true, items: { select: { name: true, unitPaise: true } } } }),
    db.refund.aggregate({ where: { status: "processed", createdAt: { gte: since }, ...(partnerId ? { order: { partnerId } } : {}) }, _sum: { amountPaise: true } }),
    db.commission.aggregate({ where: { ...pf, createdAt: { gte: since }, status: { not: "REVERSED" } }, _sum: { amountPaise: true } }),
    db.funnelEvent.findMany({ where: { ...pf, name: "page_view", createdAt: { gte: since } }, select: { visitorId: true }, distinct: ["visitorId"] }),
    db.lead.count({ where: { ...pf, createdAt: { gte: since } } }),
    db.funnelEvent.count({ where: { ...pf, name: "checkout_start", createdAt: { gte: since } } }),
    db.funnelEvent.count({ where: { ...pf, name: "payment_success", createdAt: { gte: since } } }),
    db.partner.count({ where: { status: "PENDING" } }),
    db.payout.count({ where: { status: { in: ["REQUESTED", "APPROVED"] } } }),
    db.checkout.count({ where: { status: { in: ["OPEN", "ABANDONED"] }, updatedAt: { gte: since, lte: new Date(Date.now() - 30 * 60_000) } } }),
  ]);

  const gross = paid.reduce((s, o) => s + o.totalPaise, 0);
  const tax = paid.reduce((s, o) => s + o.taxPaise, 0);
  const fees = paid.reduce((s, o) => s + (o.gatewayFeePaise ?? 0), 0);
  const refunded = refunds._sum.amountPaise ?? 0;
  const partnerShare = commissions._sum.amountPaise ?? 0;
  const net = gross - tax - fees - refunded;

  const byProduct = new Map<string, number>();
  for (const o of paid) for (const i of o.items) byProduct.set(i.name, (byProduct.get(i.name) ?? 0) + i.unitPaise);

  const funnel = [
    { step: "Visitors", count: visitors.length },
    { step: "Leads", count: leads },
    { step: "Checkouts", count: checkouts },
    { step: "Purchases", count: purchases },
  ];
  return {
    money: { gross, tax, fees, refunded, net, partnerShare, ourShare: net - partnerShare, orders: paid.length },
    byProduct: [...byProduct.entries()].map(([name, paise]) => ({ name, paise })).sort((a, b) => b.paise - a.paise),
    funnel,
    todo: { pendingPartners, openPayouts, abandoned },
  };
}
