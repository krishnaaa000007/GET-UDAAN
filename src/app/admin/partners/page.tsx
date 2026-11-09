import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { formatIST } from "@/lib/time";
import { approvePartnerAction, rejectPartnerAction, setPartnerRateAction } from "../actions";

export default async function AdminPartners() {
  const [partners, products] = await Promise.all([
    db.partner.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      include: { user: { select: { email: true } }, rates: true, _count: { select: { orders: { where: { status: "PAID" } }, clicks: true } } },
    }),
    db.product.findMany({ where: { active: true }, orderBy: { position: "asc" } }),
  ]);
  const earned = await db.commission.groupBy({ by: ["partnerId"], where: { status: { not: "REVERSED" } }, _sum: { amountPaise: true } });
  const earnedBy = new Map(earned.map((e) => [e.partnerId, e._sum.amountPaise ?? 0]));
  const pending = partners.filter((p) => p.status === "PENDING");
  const others = partners.filter((p) => p.status !== "PENDING");

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Partners</h1>

      <section>
        <h2 className="mb-3 font-semibold">Applications ({pending.length})</h2>
        {pending.length === 0 && <p className="text-sm text-muted">No pending applications.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {pending.map((p) => (
            <div key={p.id} className="card p-4">
              <p className="font-semibold">{p.displayName}</p>
              <p className="text-sm">
                <a className="text-gold underline" href={`https://instagram.com/${p.instagramHandle}`} target="_blank" rel="noopener">@{p.instagramHandle}</a> • {p.followers.toLocaleString("en-IN")} followers
              </p>
              <p className="text-xs text-muted">{p.niche} • {p.user.email} • {p.phone} • applied {formatIST(p.createdAt, "date")}</p>
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
                  <b>{p.code ?? "—"}</b> {p.displayName} <span className="text-xs text-muted">@{p.instagramHandle} • {p.status}</span>
                </span>
                <span className="text-sm text-muted">
                  {p._count.clicks} clicks • {p._count.orders} sales • {formatINR(earnedBy.get(p.id) ?? 0)} earned
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
                        <button className="text-gold">Save</button>
                      </form>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted">Changes apply to new sales only and are written to the audit log. Payout: {p.upiId ?? (p.bankAccountNumber ? `Bank ••${p.bankAccountNumber.slice(-4)} ${p.bankIfsc}` : "not set")}</p>
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
