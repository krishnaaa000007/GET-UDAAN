import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { formatIST } from "@/lib/time";
import { activePrice } from "@/server/pricing";
import { ActionForm } from "@/components/admin/action-form";
import { addPriceAction, createCouponAction, toggleCouponAction } from "../actions";

export default async function AdminPricing() {
  const [products, coupons] = await Promise.all([
    db.product.findMany({ orderBy: { position: "asc" }, include: { prices: { orderBy: { startsAt: "desc" } } } }),
    db.coupon.findMany({ orderBy: { createdAt: "desc" }, include: { partner: { select: { code: true } } } }),
  ]);
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="font-display text-3xl">Pricing</h1>
        <p className="text-sm text-ink-muted">
          A new price applies immediately. Add a <b>deadline</b> only for a REAL launch offer: the landing page shows a countdown and the price switches back automatically when it ends. Price history is kept for audit.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {products.map((p) => {
            const cur = activePrice(p.prices);
            return (
              <div key={p.id} className="card p-4">
                <div className="flex justify-between">
                  <p className="font-semibold">{p.name} <span className="text-xs text-ink-muted">/{p.slug} • {p.kind}</span></p>
                  <p className="text-xl font-bold">{cur ? formatINR(cur.amountPaise) : "—"}</p>
                </div>
                {cur?.endsAt && <p className="text-xs text-gold-text">{cur.label ?? "Offer"} ends {formatIST(cur.endsAt)}</p>}
                <ActionForm action={addPriceAction} className="mt-3 grid grid-cols-2 gap-2 text-sm" success="Price updated ✓">
                  <input type="hidden" name="productId" value={p.id} />
                  <input name="amountRupees" type="number" min={1} required placeholder="New price ₹" className="field min-h-10" />
                  <input name="label" placeholder="Label (e.g. Launch price)" className="field min-h-10" />
                  <label className="col-span-2 text-xs text-ink-muted">
                    Deadline (IST, optional)
                    <input name="endsAt" type="datetime-local" className="field mt-1 min-h-10" />
                  </label>
                  <button className="btn-ghost col-span-2 min-h-10">Set price</button>
                </ActionForm>
                <details className="mt-2 text-xs text-ink-muted">
                  <summary className="cursor-pointer">History ({p.prices.length})</summary>
                  <ul className="mt-1 space-y-1">
                    {p.prices.map((r) => (
                      <li key={r.id}>{formatINR(r.amountPaise)} from {formatIST(r.startsAt)}{r.endsAt ? ` to ${formatIST(r.endsAt)}` : ""} {r.label ? `(${r.label})` : ""}</li>
                    ))}
                  </ul>
                </details>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Coupons</h2>
        <ActionForm action={createCouponAction} className="card grid gap-2 p-4 text-sm sm:grid-cols-6" success="Coupon created ✓">
          <input name="code" required placeholder="CODE" className="field min-h-10 uppercase sm:col-span-2" />
          <select name="kind" className="field min-h-10">
            <option value="PERCENT">% off</option>
            <option value="FLAT">₹ off</option>
          </select>
          <input name="value" type="number" step="0.01" required placeholder="10" className="field min-h-10" />
          <input name="maxUses" type="number" min={0} placeholder="Max uses" className="field min-h-10" />
          <input name="endsAt" type="datetime-local" className="field min-h-10" aria-label="Expires (IST)" />
          <button className="btn-gold min-h-10 sm:col-span-6">Create coupon</button>
        </ActionForm>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="border-b border-line text-left text-xs text-ink-muted">
              <tr>{["Code", "Discount", "Partner", "Used", "Expires", "Status", ""].map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td className="p-3 font-mono">{c.code}</td>
                  <td className="p-3">{c.kind === "PERCENT" ? `${c.value / 100}%` : formatINR(c.value)}</td>
                  <td className="p-3">{c.partner?.code ?? "—"}</td>
                  <td className="p-3">{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
                  <td className="p-3">{c.endsAt ? formatIST(c.endsAt, "date") : "—"}</td>
                  <td className="p-3">{c.active ? "Active" : "Off"}</td>
                  <td className="p-3">
                    <form action={toggleCouponAction}>
                      <input type="hidden" name="couponId" value={c.id} />
                      <button className="text-gold-text">{c.active ? "Disable" : "Enable"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
