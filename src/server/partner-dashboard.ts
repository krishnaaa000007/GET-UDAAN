/**
 * Data for the partner dashboard. SECURITY: takes partnerId from the session only,
 * and returns buyer info MASKED (first initial + city). Never email/phone.
 */
import "server-only";
import { db } from "@/lib/db";
import { maskName } from "@/lib/mask";
import { istDayKey } from "@/lib/time";
import { approveDueCommissions, getWallet } from "@/server/partners";

export async function getPartnerDashboard(partnerId: string, days: number) {
  await approveDueCommissions(partnerId);
  const since = new Date(Date.now() - days * 86_400_000);

  const [partner, wallet, clicks, leads, orders, payouts] = await Promise.all([
    db.partner.findUniqueOrThrow({ where: { id: partnerId }, include: { coupons: { where: { active: true }, select: { code: true, kind: true, value: true } } } }),
    getWallet(partnerId),
    db.click.findMany({ where: { partnerId, isDuplicate: false, createdAt: { gte: since } }, select: { createdAt: true, campaign: true } }),
    db.lead.count({ where: { partnerId, createdAt: { gte: since } } }),
    db.order.findMany({
      where: { partnerId, status: { in: ["PAID", "REFUNDED", "PARTIALLY_REFUNDED"] }, paidAt: { gte: since } },
      orderBy: { paidAt: "desc" },
      select: {
        id: true,
        number: true,
        name: true,
        city: true,
        status: true,
        paidAt: true,
        campaign: true,
        totalPaise: true,
        items: { select: { name: true } },
        commissions: { where: { partnerId }, select: { amountPaise: true, status: true, availableAt: true, basePaise: true, rateBps: true } },
      },
    }),
    db.payout.findMany({ where: { partnerId }, orderBy: { requestedAt: "desc" }, take: 20 }),
  ]);

  const paidOrders = orders.filter((o) => o.status === "PAID");
  const earningsOf = (o: (typeof orders)[number]) => o.commissions.filter((c) => c.status !== "REVERSED").reduce((s, c) => s + c.amountPaise, 0);

  // Daily series (IST days)
  const series = new Map<string, { day: string; clicks: number; sales: number; earningsPaise: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const key = istDayKey(new Date(Date.now() - i * 86_400_000));
    series.set(key, { day: key, clicks: 0, sales: 0, earningsPaise: 0 });
  }
  for (const c of clicks) {
    const s = series.get(istDayKey(c.createdAt));
    if (s) s.clicks++;
  }
  for (const o of paidOrders) {
    const s = series.get(istDayKey(o.paidAt!));
    if (s) {
      s.sales++;
      s.earningsPaise += earningsOf(o);
    }
  }

  // Per-campaign ("which reel sold most")
  const camp = new Map<string, { campaign: string; clicks: number; sales: number; earningsPaise: number }>();
  const bucket = (c: string | null) => {
    const k = c || "(no campaign)";
    if (!camp.has(k)) camp.set(k, { campaign: k, clicks: 0, sales: 0, earningsPaise: 0 });
    return camp.get(k)!;
  };
  for (const c of clicks) bucket(c.campaign).clicks++;
  for (const o of paidOrders) {
    const b = bucket(o.campaign);
    b.sales++;
    b.earningsPaise += earningsOf(o);
  }

  return {
    partner: { id: partner.id, code: partner.code, status: partner.status, displayName: partner.displayName, upiId: partner.upiId, hasBank: !!partner.bankAccountNumber, coupons: partner.coupons },
    wallet,
    totals: {
      clicks: clicks.length,
      leads,
      sales: paidOrders.length,
      conversionPct: clicks.length ? Math.round((paidOrders.length / clicks.length) * 1000) / 10 : 0,
      earningsPaise: paidOrders.reduce((s, o) => s + earningsOf(o), 0),
    },
    series: [...series.values()],
    campaigns: [...camp.values()].sort((a, b) => b.sales - a.sales || b.clicks - a.clicks),
    // MASKED buyer info only
    sales: orders.map((o) => ({
      id: o.id,
      ref: `#${o.number}`,
      buyer: maskName(o.name),
      city: o.city,
      product: o.items.map((i) => i.name).join(" + "),
      paidAt: o.paidAt!.toISOString(),
      campaign: o.campaign,
      orderStatus: o.status,
      commission: o.commissions[0] ?? null,
    })),
    payouts: payouts.map((p) => ({ id: p.id, status: p.status, grossPaise: p.grossPaise, tdsPaise: p.tdsPaise, netPaise: p.netPaise, reference: p.reference, rejectReason: p.rejectReason, requestedAt: p.requestedAt.toISOString(), paidAt: p.paidAt?.toISOString() ?? null })),
  };
}

export type PartnerDashboard = Awaited<ReturnType<typeof getPartnerDashboard>>;
