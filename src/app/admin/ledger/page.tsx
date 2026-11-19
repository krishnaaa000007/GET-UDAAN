/**
 * ADMIN — partner wallet ledger (read-only). Every money movement, newest first; filter by partner code.
 * Rows are never edited: corrections are new ADJUSTMENT rows.
 */
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { formatIST } from "@/lib/time";
import { normalizeCode } from "@/server/attribution";

export default async function AdminLedger({ searchParams }: PageProps<"/admin/ledger">) {
  const sp = await searchParams;
  const code = normalizeCode(typeof sp.code === "string" ? sp.code : "");
  const partner = code ? await db.partner.findUnique({ where: { code }, select: { id: true, displayName: true } }) : null;
  const rows = await db.partnerLedger.findMany({
    where: code ? { partnerId: partner?.id ?? "-" } : {},
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { partner: { select: { code: true, displayName: true } } },
  });
  const commissionIds = rows.map((r) => r.commissionId).filter((x): x is string => !!x);
  const commissions = await db.commission.findMany({ where: { id: { in: commissionIds } }, select: { id: true, type: true, order: { select: { number: true } } } });
  const cBy = new Map(commissions.map((c) => [c.id, c]));
  const balance = partner ? ((await db.partnerLedger.aggregate({ where: { partnerId: partner.id }, _sum: { amountPaise: true } }))._sum.amountPaise ?? 0) : null;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Partner ledger</h1>
      <form className="flex flex-wrap gap-2 text-sm">
        <input name="code" defaultValue={code ?? ""} placeholder="Partner code (e.g. LIONBHAI)" className="field min-h-10 max-w-xs" />
        <button className="btn-ghost min-h-10">Filter</button>
      </form>
      {code && !partner && <p className="text-fire">No partner with code {code}.</p>}
      {partner && balance !== null && (
        <p className="text-sm">
          {partner.displayName}: ledger balance <b className="tabular-nums">{formatINR(balance)}</b> (approved commissions − paid withdrawals ± adjustments)
        </p>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line text-left text-xs text-ink-muted">
            <tr>
              {["Date (IST)", "Partner", "Type", "Amount", "From", "Note"].map((h) => (
                <th key={h} className="p-3 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => {
              const c = r.commissionId ? cBy.get(r.commissionId) : undefined;
              return (
                <tr key={r.id}>
                  <td className="p-3 whitespace-nowrap">{formatIST(r.createdAt)}</td>
                  <td className="p-3">{r.partner.code ?? r.partner.displayName}</td>
                  <td className="p-3">{r.type}</td>
                  <td className={`p-3 tabular-nums ${r.amountPaise < 0 ? "text-fire" : ""}`}>{formatINR(r.amountPaise)}</td>
                  <td className="p-3 text-ink-muted">{c ? `${c.type} • order #${c.order.number}` : r.payoutId ? "withdrawal" : "—"}</td>
                  <td className="p-3 text-ink-muted">{r.note ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-4 text-ink-muted">No ledger rows yet.</p>}
      </div>
      <p className="text-xs text-ink-muted">Showing the latest 300 rows.</p>
    </div>
  );
}
