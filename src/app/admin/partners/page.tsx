import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { formatIST } from "@/lib/time";
import { ActionForm } from "@/components/admin/action-form";
import { PARTNER_RULES } from "@/config/partners";
import { getSettings } from "@/server/settings";
import { approvePartnerAction, freezePartnerAction, rejectPartnerAction, setPartnerRateAction, unfreezePartnerAction } from "../actions";

/** How long an application has waited; "late" after the approval target (red badge). */
function waited(d: Date) {
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  return { label: mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`, late: mins > PARTNER_RULES.approvalAlertAfterHours * 60 };
}

export default async function AdminPartners() {
  const [partners, products] = await Promise.all([
    db.partner.findMany({
      // applications: oldest first (they have waited longest)
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      include: { user: { select: { email: true } }, rates: true, _count: { select: { orders: { where: { status: "PAID" } }, clicks: true } } },
    }),
    db.product.findMany({ where: { active: true }, orderBy: { position: "asc" } }),
  ]);
  const [earned, refunded, settings] = await Promise.all([
    db.commission.groupBy({ by: ["partnerId"], where: { status: { not: "REVERSED" } }, _sum: { amountPaise: true } }),
    db.order.groupBy({ by: ["partnerId"], where: { partnerId: { not: null }, status: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] } }, _count: { _all: true } }),
    getSettings(),
  ]);
  const refundsBy = new Map(refunded.map((r) => [r.partnerId, r._count._all]));
  // refund rate = refunded orders / (paid + refunded) orders; flagged only when admin has set a threshold
  const refundInfo = (p: { id: string; _count: { orders: number } }) => {
    const refunds = refundsBy.get(p.id) ?? 0;
    const total = p._count.orders + refunds;
    const rate = total ? Math.round((refunds / total) * 100) : 0;
    const flagged = settings.refundFlagPct > 0 && total >= PARTNER_RULES.refundFlagMinSales && rate > settings.refundFlagPct;
    return { refunds, rate, flagged };
  };

  const earnedBy = new Map(earned.map((e) => [e.partnerId, e._sum.amountPaise ?? 0]));
  const pending = partners.filter((p) => p.status === "PENDING");
  const others = partners.filter((p) => p.status !== "PENDING");

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Partners</h1>

      <section>
        <h2 className="mb-3 font-semibold">
          Applications ({pending.length}) <span className="text-sm font-normal text-ink-muted">— target: approve within {PARTNER_RULES.approvalTargetHours} hours, oldest first</span>
        </h2>
        {pending.length === 0 && <p className="text-sm text-ink-muted">No pending applications.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {pending.map((p) => (
            <div key={p.id} className="card p-4">
              <p className="flex items-center justify-between gap-2 font-semibold">
                {p.displayName}
                <span className={`rounded-sm px-2 py-0.5 text-xs font-semibold ${waited(p.createdAt).late ? "bg-fire text-on-fire" : "bg-surface-raised-2 text-ink-muted"}`}>waiting {waited(p.createdAt).label}</span>
              </p>
              <p className="text-sm">
                <a className="text-gold-text underline" href={`https://instagram.com/${p.instagramHandle}`} target="_blank" rel="noopener">@{p.instagramHandle}</a> • {p.followers.toLocaleString("en-IN")} followers
              </p>
              <p className="text-xs text-ink-muted">{p.niche} • {p.user.email} • {p.phone} • applied {formatIST(p.createdAt, "date")}</p>
              <form action={approvePartnerAction} className="mt-3 flex gap-2">
                <input type="hidden" name="partnerId" value={p.id} />
                <input name="code" placeholder="Code (auto from handle)" className="field min-h-10 text-sm uppercase" />
                <button className="btn-gold min-h-10 shrink-0 px-4 text-sm">Approve</button>
              </form>
              <form action={rejectPartnerAction} className="mt-2 flex gap-2">
                <input type="hidden" name="partnerId" value={p.id} />
                <input name="reason" placeholder="Reason (sent to applicant)" className="field min-h-10 text-sm" />
                <button className="btn-ghost min-h-10 shrink-0 text-sm">Reject</button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">All partners</h2>
        <div className="space-y-3">
          {others.map((p) => (
            <details key={p.id} className="card p-4">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span>
                  <b>{p.code ?? "—"}</b> {p.displayName} <span className="text-xs text-ink-muted">@{p.instagramHandle} • {p.status}</span>
                </span>
                <span className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                  {p.frozenAt && <span className="rounded-sm bg-fire px-2 py-0.5 text-xs font-semibold text-on-fire">FROZEN</span>}
                  {refundInfo(p).flagged && <span className="rounded-sm border border-fire px-2 py-0.5 text-xs font-semibold text-fire">High refunds</span>}
                  {p._count.clicks} clicks • {p._count.orders} sales • {refundInfo(p).refunds} refunds ({refundInfo(p).rate}%) • {formatINR(earnedBy.get(p.id) ?? 0)} earned
                </span>
              </summary>
              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-2 text-sm font-semibold">Commission rate per product</p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {products.map((prod) => {
                    const override = p.rates.find((r) => r.productId === prod.id);
                    return (
                      <form key={prod.id} action={setPartnerRateAction} className="flex items-center gap-2 text-sm">
                        <input type="hidden" name="partnerId" value={p.id} />
                        <input type="hidden" name="productId" value={prod.id} />
                        <span className="w-28 shrink-0 truncate">{prod.name}</span>
                        <input name="ratePct" type="number" min={0} max={100} step="0.5" defaultValue={(override?.rateBps ?? prod.defaultCommissionBps) / 100} className="field min-h-9 w-20 px-2" aria-label={`${prod.name} commission %`} />
                        <span>%</span>
                        <button className="text-gold-text">Save</button>
                      </form>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-ink-muted">Changes apply to new sales only and are written to the audit log. Payout: {p.upiId ?? (p.bankAccountNumber ? `Bank ••${p.bankAccountNumber.slice(-4)} ${p.bankIfsc}` : "not set")}</p>
                {p.status === "APPROVED" &&
                  (p.frozenAt ? (
                    <form action={unfreezePartnerAction} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <input type="hidden" name="partnerId" value={p.id} />
                      <span className="text-fire">Frozen {formatIST(p.frozenAt, "datetime")}: {p.frozenReason}</span>
                      <button className="btn-ghost min-h-9 text-sm">Unfreeze (releases due commissions)</button>
                    </form>
                  ) : (
                    <ActionForm action={freezePartnerAction} className="mt-3 flex flex-wrap gap-2 text-sm" success="Frozen ✓">
                      <input type="hidden" name="partnerId" value={p.id} />
                      <input name="reason" required placeholder="Freeze reason (shown to the partner)" className="field min-h-9 flex-1 text-sm" />
                      <button className="btn-ghost min-h-9 shrink-0 text-sm">Freeze</button>
                    </ActionForm>
                  ))}
                {p.status === "REJECTED" && (
                  <form action={approvePartnerAction} className="mt-2">
                    <input type="hidden" name="partnerId" value={p.id} />
                    <button className="btn-ghost min-h-9 text-sm">Approve anyway</button>
                  </form>
                )}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
