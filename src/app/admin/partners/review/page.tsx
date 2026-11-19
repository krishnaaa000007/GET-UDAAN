/**
 * One-tap review page linked from the admin's "new partner application" email.
 * The link carries a signed, 48-hour token; the page itself still requires an admin login (admin layout).
 * Opening the page changes nothing — only pressing Approve / Reject does (email scanners can't approve by accident).
 */
import Link from "next/link";
import { db } from "@/lib/db";
import { formatIST } from "@/lib/time";
import { verifyPartnerDecisionToken } from "@/server/partners";
import { approvePartnerAction, rejectPartnerAction } from "../../actions";

export default async function ReviewApplication({ searchParams }: PageProps<"/admin/partners/review">) {
  const sp = await searchParams;
  const id = typeof sp.t === "string" ? verifyPartnerDecisionToken(sp.t) : null;
  const p = id ? await db.partner.findUnique({ where: { id }, include: { user: { select: { email: true } } } }) : null;

  if (!p)
    return (
      <div className="card max-w-lg space-y-3 p-6">
        <h1 className="font-display text-2xl">Link expired or invalid</h1>
        <p className="text-sm text-ink-muted">Review links work for 48 hours. Open the applications list instead.</p>
        <Link href="/admin/partners" className="btn-ghost">Open applications</Link>
      </div>
    );

  return (
    <div className="card max-w-lg space-y-4 p-6">
      <h1 className="font-display text-2xl">Partner application</h1>
      <div className="space-y-1 text-sm">
        <p className="text-lg font-semibold">{p.displayName}</p>
        <p>
          <a className="text-gold-text underline" href={`https://instagram.com/${p.instagramHandle}`} target="_blank" rel="noopener">@{p.instagramHandle}</a> • {p.followers.toLocaleString("en-IN")} followers
        </p>
        <p className="text-ink-muted">{p.niche || "—"} • {p.user.email} • {p.phone}</p>
        <p className="text-ink-muted">Applied {formatIST(p.createdAt, "datetime")} • status {p.status}</p>
      </div>
      {p.status === "PENDING" ? (
        <>
          <form action={approvePartnerAction}>
            <input type="hidden" name="partnerId" value={p.id} />
            <input type="hidden" name="back" value="1" />
            <button className="btn-gold min-h-14 w-full text-lg">Approve</button>
          </form>
          <form action={rejectPartnerAction} className="flex gap-2">
            <input type="hidden" name="partnerId" value={p.id} />
            <input type="hidden" name="back" value="1" />
            <input name="reason" placeholder="Reason (sent to applicant)" className="field min-h-12 text-sm" />
            <button className="btn-ghost min-h-12 shrink-0">Reject</button>
          </form>
        </>
      ) : (
        <p className="text-sm">Already decided. <Link href="/admin/partners" className="text-gold-text underline">Back to partners</Link></p>
      )}
    </div>
  );
}
