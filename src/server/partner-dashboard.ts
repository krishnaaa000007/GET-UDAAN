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
        commissions: { where: { partnerId, type: "SALE" }, select: { amountPaise: true, status: true, availableAt: true, basePaise: true, rateBps: true } },
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

/**
 * Leaderboard (only shown when admin turns it on): top 10 partners by paid sales in the last 30 days.
 * Other partners' handles are partly hidden and NO money amounts are shared — only rank and sales count.
 */
export async function getPartnerLeaderboard(partnerId: string) {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const rows = await db.order.groupBy({ by: ["partnerId"], where: { status: "PAID", partnerId: { not: null }, paidAt: { gte: since } }, _count: { _all: true } });
  const ranked = rows.filter((r) => r.partnerId).sort((a, b) => b._count._all - a._count._all);
  const top = ranked.slice(0, 10);
  const partners = await db.partner.findMany({ where: { id: { in: top.map((r) => r.partnerId as string) } }, select: { id: true, instagramHandle: true } });
  const handle = new Map(partners.map((p) => [p.id, p.instagramHandle]));
  const mask = (h: string) => `@${h.slice(0, 3)}${"*".repeat(Math.max(3, Math.min(6, h.length - 3)))}`;
  const myIndex = ranked.findIndex((r) => r.partnerId === partnerId);
  return {
    top: top.map((r, i) => ({ rank: i + 1, name: mask(handle.get(r.partnerId as string) ?? "partner"), sales: r._count._all, me: r.partnerId === partnerId })),
    me: myIndex >= 0 ? { rank: myIndex + 1, sales: ranked[myIndex]._count._all } : null,
  };
}

/** Lifetime earnings by kind (own sales vs team bonus), not counting reversed ones. For the Wallet tab. */
export async function getEarningsByType(partnerId: string) {
  const rows = await db.commission.groupBy({ by: ["type"], where: { partnerId, status: { not: "REVERSED" } }, _sum: { amountPaise: true } });
  const sum = (t: string) => rows.filter((r) => r.type === t).reduce((s, r) => s + (r._sum.amountPaise ?? 0), 0);
  return { salePaise: sum("SALE"), teamPaise: sum("TEAM_L1") + sum("TEAM_L2") };
}

/**
 * Team tab: the partners you invited (level 1) with what you earned from each, plus level 2 totals.
 * Shows only display names and counts — never their buyers, money or contact details.
 */
export async function getPartnerTeam(partnerId: string) {
  const level1 = await db.partner.findMany({
    where: { referredByPartnerId: partnerId, recruiterLockedAt: { not: null } },
    orderBy: { approvedAt: "desc" },
    select: { id: true, displayName: true, approvedAt: true, status: true },
  });
  const level2Count = await db.partner.count({ where: { referredByPartnerId: { in: level1.map((p) => p.id) }, recruiterLockedAt: { not: null } } });
  const bonuses = await db.commission.findMany({
    where: { partnerId, type: { in: ["TEAM_L1", "TEAM_L2"] }, status: { not: "REVERSED" } },
    select: { type: true, amountPaise: true, status: true, source: { select: { partnerId: true } } },
  });
  const fromL1 = new Map<string, { sales: number; paise: number }>();
  for (const b of bonuses.filter((x) => x.type === "TEAM_L1")) {
    const k = b.source?.partnerId ?? "";
    const v = fromL1.get(k) ?? { sales: 0, paise: 0 };
    fromL1.set(k, { sales: v.sales + 1, paise: v.paise + b.amountPaise });
  }
  const total = (f: (b: (typeof bonuses)[number]) => boolean) => bonuses.filter(f).reduce((s, b) => s + b.amountPaise, 0);
  return {
    level1: level1.map((p) => ({ ...p, ...(fromL1.get(p.id) ?? { sales: 0, paise: 0 }) })),
    level2Count,
    l1Paise: total((b) => b.type === "TEAM_L1"),
    l2Paise: total((b) => b.type === "TEAM_L2"),
    pendingPaise: total((b) => b.status === "PENDING"),
  };
}
