/**
 * PARTNER DASHBOARD (mobile-first). Only this partner's data; buyers masked.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { formatINR } from "@/lib/money";
import { formatIST, withinHours } from "@/lib/time";
import { requireUser } from "@/server/auth";
import { getPartnerDashboard } from "@/server/partner-dashboard";
import { getSettings } from "@/server/settings";
import { AppShell } from "@/components/app-shell";
import { EarningsChart } from "@/components/charts/earnings-chart";
import { CampaignLinkBuilder, CopyButton, PayoutDetailsForm, ShareButtons, WithdrawForm } from "./client";

export const metadata: Metadata = { title: "Partner dashboard", robots: { index: false } };

const RANGES = [7, 30, 90] as const;
const STATUS: Record<string, string> = { REQUESTED: "⏳ Requested", APPROVED: "👍 Approved", REJECTED: "✕ Rejected", PAID: "✅ Paid" };

export default async function PartnerPage({ searchParams }: PageProps<"/partner">) {
  const user = await requireUser("/partner");
  const partnerRow = await db.partner.findUnique({ where: { userId: user.id } });
  if (!partnerRow) {
    return (
      <AppShell user={user}>
        <main className="mx-auto max-w-md px-4 py-10 text-center">
          <p className="text-muted">Aapka partner account nahi hai.</p>
          <Link href="/partners" className="btn-gold mt-4">Partner ke liye apply karo</Link>
        </main>
      </AppShell>
    );
  }
  if (partnerRow.status !== "APPROVED") {
    return (
      <AppShell user={user}>
        <main className="mx-auto max-w-md px-4 py-10 text-center">
          <p className="text-4xl">{partnerRow.status === "PENDING" ? "⏳" : "✕"}</p>
          <h1 className="font-display mt-3 text-3xl">{partnerRow.status === "PENDING" ? "Application review mein hai" : "Application approve nahi hui"}</h1>
          <p className="mt-2 text-sm text-muted">{partnerRow.status === "PENDING" ? "24–48 ghante mein email aayega." : partnerRow.adminNote}</p>
        </main>
      </AppShell>
    );
  }

  const sp = await searchParams;
  const range = RANGES.find((r) => String(r) === sp.range) ?? 30;
  const [d, settings] = await Promise.all([getPartnerDashboard(partnerRow.id, range), getSettings()]);
  const link = `${env.appUrl}/?ref=${d.partner.code}`;
  const coupon = d.partner.coupons[0]?.code ?? null;
  const w = d.wallet;
  const detailsLocked = withinHours(partnerRow.payoutDetailsUpdatedAt, 24);
  const hasPayout = !!(partnerRow.upiId || (partnerRow.bankAccountNumber && partnerRow.bankIfsc));
  const openRequest = d.payouts.some((p) => p.status === "REQUESTED" || p.status === "APPROVED");
  const disabledReason = !hasPayout ? "Pehle neeche payout details add karein." : detailsLocked ? "Payout details abhi badle — 24 ghante baad withdraw kar payenge." : openRequest ? "Ek request pehle se process ho rahi hai." : null;

  // Milestone badges (motivation)
  const badges = [
    { n: 1, label: "Pehli sale" },
    { n: 10, label: "10 sales" },
    { n: 50, label: "50 sales" },
    { n: 100, label: "100 club" },
  ];
  const lifetimeSales = await db.order.count({ where: { partnerId: partnerRow.id, status: "PAID" } });

  return (
    <AppShell user={user}>
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-gold">@{partnerRow.instagramHandle}</p>
            <h1 className="font-display text-3xl">Partner dashboard</h1>
          </div>
          <nav className="flex rounded-xl border border-line p-1 text-sm" aria-label="Date range">
            {RANGES.map((r) => (
              <Link key={r} href={`/partner?range=${r}`} className={`rounded-lg px-3 py-1.5 ${r === range ? "bg-gold font-semibold text-ink" : "text-muted"}`}>
                {r} din
              </Link>
            ))}
          </nav>
        </div>

        {/* Wallet */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Available", w.availablePaise, "withdraw kar sakte ho", "text-gold"],
            ["Pending", w.pendingPaise, `${settings.refundWindowDays}-din refund window`, "text-white"],
            ["Requested", w.requestedPaise, "processing", "text-white"],
            ["Paid out", w.paidPaise, "lifetime", "text-white"],
          ].map(([label, v, hint, cls]) => (
            <div key={label as string} className="card p-4">
              <p className="text-xs text-muted">{label as string}</p>
              <p className={`mt-1 text-2xl font-bold ${cls}`}>{formatINR(v as number)}</p>
              <p className="text-[11px] text-muted">{hint as string}</p>
            </div>
          ))}
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            ["Clicks", d.totals.clicks.toLocaleString("en-IN")],
            ["Leads", d.totals.leads.toLocaleString("en-IN")],
            ["Sales", d.totals.sales.toLocaleString("en-IN")],
            ["Conversion", `${d.totals.conversionPct}%`],
            ["Earned", formatINR(d.totals.earningsPaise)],
          ].map(([l, v]) => (
            <div key={l} className="card p-4">
              <p className="text-xs text-muted">{l} ({range}d)</p>
              <p className="mt-1 text-xl font-semibold">{v}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          <div className="card p-4">
            <h2 className="text-sm font-semibold">Daily earnings (₹)</h2>
            <EarningsChart data={d.series} metric="earningsPaise" />
          </div>
          <div className="card p-4">
            <h2 className="text-sm font-semibold">Daily clicks</h2>
            <EarningsChart data={d.series} metric="clicks" />
          </div>
        </section>

        {/* Link & coupon */}
        <section className="card space-y-4 p-5">
          <h2 className="font-semibold">Aapka link & coupon</h2>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-panel-2 px-3 py-2 text-sm">{link}</code>
            <CopyButton text={link} label="Copy link" />
          </div>
          {coupon && (
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-panel-2 px-3 py-2 text-sm font-bold text-gold">{coupon}</code>
              <CopyButton text={coupon} label="Copy coupon" />
            </div>
          )}
          <ShareButtons link={link} coupon={coupon} />
          <div>
            <h3 className="mb-2 text-sm font-semibold">Har reel ke liye campaign link</h3>
            <CampaignLinkBuilder base={link} />
          </div>
        </section>

        {/* Campaigns */}
        <section className="card p-5">
          <h2 className="font-semibold">Kaunsi reel ne sabse zyada becha</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted">
                <tr>
                  <th className="py-2 font-medium">Campaign</th>
                  <th className="py-2 text-right font-medium">Clicks</th>
                  <th className="py-2 text-right font-medium">Sales</th>
                  <th className="py-2 text-right font-medium">Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {d.campaigns.map((c) => (
                  <tr key={c.campaign}>
                    <td className="py-2">{c.campaign}</td>
                    <td className="py-2 text-right tabular-nums">{c.clicks}</td>
                    <td className="py-2 text-right tabular-nums">{c.sales}</td>
                    <td className="py-2 text-right tabular-nums">{formatINR(c.earningsPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Sales */}
        <section className="card p-5">
          <h2 className="font-semibold">Sales</h2>
          <p className="text-xs text-muted">Privacy ke liye buyer ka naam/number chhupa hota hai.</p>
          <ul className="mt-3 divide-y divide-line">
            {d.sales.length === 0 && <li className="py-6 text-center text-sm text-muted">Is range mein abhi koi sale nahi. Ek nayi reel post karo! 🚀</li>}
            {d.sales.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate">
                    {s.product} <span className="text-muted">• {s.buyer}{s.city ? `, ${s.city}` : ""}</span>
                  </span>
                  <span className="text-xs text-muted">
                    {formatIST(s.paidAt, "date")} {s.campaign && `• ${s.campaign}`}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className={`block font-semibold ${s.commission?.status === "REVERSED" ? "text-muted line-through" : ""}`}>{s.commission ? formatINR(s.commission.amountPaise) : "—"}</span>
                  <span className="text-[11px] text-muted">
                    {s.commission?.status === "PENDING" ? `available ${formatIST(s.commission.availableAt, "date")}` : s.commission?.status === "REVERSED" ? "refunded" : "approved"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Withdraw */}
        <section className="grid gap-3 md:grid-cols-2">
          <div className="card p-5">
            <h2 className="font-semibold">Withdraw</h2>
            <p className="mt-1 mb-3 text-sm text-muted">Available: <b className="text-gold">{formatINR(w.availablePaise)}</b></p>
            <WithdrawForm availableRupees={Math.floor(w.availablePaise / 100)} minRupees={settings.minWithdrawalPaise / 100} tdsPct={settings.tdsBps / 100} disabledReason={disabledReason} />
            {d.payouts.length > 0 && (
              <ul className="mt-5 divide-y divide-line text-sm">
                {d.payouts.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3 py-2">
                    <span>
                      {STATUS[p.status]}
                      <span className="block text-xs text-muted">
                        {formatIST(p.requestedAt, "date")}
                        {p.reference ? ` • Ref ${p.reference}` : ""}
                        {p.rejectReason ? ` • ${p.rejectReason}` : ""}
                      </span>
                    </span>
                    <span className="text-right">
                      {formatINR(p.netPaise)}
                      {p.tdsPaise > 0 && <span className="block text-[11px] text-muted">TDS {formatINR(p.tdsPaise)}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card p-5">
            <h2 className="font-semibold">Payout details</h2>
            <p className="mt-1 mb-3 text-xs text-muted">Payment yahin bheja jayega. Badalne pe security ke liye 24 ghante withdrawal band rahega.</p>
            <PayoutDetailsForm initial={{ upiId: partnerRow.upiId ?? "", bankAccountName: partnerRow.bankAccountName ?? "", bankAccountNumber: partnerRow.bankAccountNumber ?? "", bankIfsc: partnerRow.bankIfsc ?? "" }} />
          </div>
        </section>

        {/* Badges + formula */}
        <section className="card p-5">
          <h2 className="font-semibold">Milestones</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b.n} className={`rounded-full border px-3 py-1 text-sm ${lifetimeSales >= b.n ? "border-gold bg-gold/15 text-gold" : "border-line text-muted"}`}>
                {lifetimeSales >= b.n ? "🏅" : "🔒"} {b.label}
              </span>
            ))}
          </div>
          <details className="mt-5 text-sm">
            <summary className="cursor-pointer font-semibold text-gold">Commission kaise calculate hoti hai?</summary>
            <div className="mt-2 space-y-1 text-muted">
              <p><b className="text-white">Commission = (buyer ne jo pay kiya − GST − Razorpay fee) × aapka rate</b></p>
              <p>Example: ₹499 course, aapke coupon se ₹49 off → ₹450 paid. Razorpay fee ~₹10.62 → base ₹439.38 × 50% = <b className="text-white">₹219.69</b></p>
              <p>Commission {settings.refundWindowDays} din Pending rehti hai (refund window). Uske baad Available ho jaati hai. Refund hone pe commission reverse hoti hai.</p>
              <p>Coupon use hua to sale hamesha coupon wale partner ki. Warna last click ({settings.attributionWindowDays} din tak) ko credit milta hai. Khud ki purchase pe commission nahi milti.</p>
            </div>
          </details>
        </section>
      </main>
    </AppShell>
  );
}
