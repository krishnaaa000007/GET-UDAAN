import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { formatIST } from "@/lib/time";
import { getWallet } from "@/server/partners";
import { ActionForm } from "@/components/admin/action-form";
import { payoutDecisionAction } from "../actions";

export default async function AdminPayouts() {
  const payouts = await db.payout.findMany({ orderBy: { requestedAt: "desc" }, take: 100, include: { partner: true } });
  const open = payouts.filter((p) => p.status === "REQUESTED" || p.status === "APPROVED");
  const done = payouts.filter((p) => p.status === "PAID" || p.status === "REJECTED");
  const wallets = new Map(await Promise.all(open.map(async (p) => [p.partnerId, await getWallet(p.partnerId)] as const)));
  const month = new Date().toISOString().slice(0, 7);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Withdrawal requests</h1>
        <div className="flex gap-2 text-sm">
          <a className="btn-ghost min-h-10" href={`/api/admin/export/payouts?month=${month}`}>⬇ This month CSV</a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page */}
          <a className="btn-ghost min-h-10" href="/api/admin/export/payouts">⬇ All CSV</a>
        </div>
      </div>
      <p className="text-sm text-ink-muted">Flow: <b>Approve</b> → pay the partner from your bank/UPI app → <b>Mark paid</b> with the UTR. The partner is emailed at each step. Every action is audit-logged.</p>

      <div className="grid gap-3 lg:grid-cols-2">
        {open.length === 0 && <p className="text-sm text-ink-muted">No open requests 🎉</p>}
        {open.map((p) => {
          const m = p.method as { type: string; upiId?: string; name?: string; account?: string; ifsc?: string };
          const w = wallets.get(p.partnerId);
          return (
            <div key={p.id} className="card space-y-3 p-4">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.partner.displayName} <span className="text-xs text-ink-muted">@{p.partner.instagramHandle}</span></p>
                  <p className="text-xs text-ink-muted">Requested {formatIST(p.requestedAt)} • <b className="text-gold-text">{p.status}</b></p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{formatINR(p.netPaise)}</p>
                  <p className="text-xs text-ink-muted">gross {formatINR(p.grossPaise)} • TDS {formatINR(p.tdsPaise)}</p>
                </div>
              </div>
              <div className="rounded-xl bg-surface-sunken p-3 text-sm">
                <p className="text-xs text-ink-muted">Pay to</p>
                {m.type === "upi" ? <p className="font-mono">{m.upiId}</p> : <p className="font-mono">{m.name} • {m.account} • {m.ifsc}</p>}
              </div>
              {w && w.availablePaise < 0 && <p className="text-sm text-fire">⚠ Partner wallet would go negative (refunds since request). Consider rejecting.</p>}
              {p.status === "REQUESTED" ? (
                <div className="flex flex-wrap gap-2">
                  <ActionForm action={payoutDecisionAction}>
                    <input type="hidden" name="payoutId" value={p.id} />
                    <button name="action" value="approve" className="btn-gold min-h-10 text-sm">Approve</button>
                  </ActionForm>
                  <ActionForm action={payoutDecisionAction} className="flex flex-1 gap-2">
                    <input type="hidden" name="payoutId" value={p.id} />
                    <input name="reason" placeholder="Reject reason" className="field min-h-10 text-sm" />
                    <button name="action" value="reject" className="btn-ghost min-h-10 shrink-0 text-sm">Reject</button>
                  </ActionForm>
                </div>
              ) : (
                <ActionForm action={payoutDecisionAction} className="flex gap-2" success="Marked paid ✓">
                  <input type="hidden" name="payoutId" value={p.id} />
                  <input name="reference" required placeholder="UTR / transaction ref" className="field min-h-10 text-sm" />
                  <button name="action" value="paid" className="btn-gold min-h-10 shrink-0 text-sm">Mark paid</button>
                </ActionForm>
              )}
            </div>
          );
        })}
      </div>

      <section className="card overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-line text-left text-xs text-ink-muted">
            <tr>{["Requested", "Partner", "Status", "Net", "TDS", "Reference", "Paid"].map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {done.map((p) => (
              <tr key={p.id}>
                <td className="p-3">{formatIST(p.requestedAt, "date")}</td>
                <td className="p-3">{p.partner.displayName}</td>
                <td className="p-3">{p.status}{p.rejectReason ? ` — ${p.rejectReason}` : ""}</td>
                <td className="p-3 tabular-nums">{formatINR(p.netPaise)}</td>
                <td className="p-3 tabular-nums">{formatINR(p.tdsPaise)}</td>
                <td className="p-3 font-mono text-xs">{p.reference}</td>
                <td className="p-3">{p.paidAt ? formatIST(p.paidAt, "date") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
