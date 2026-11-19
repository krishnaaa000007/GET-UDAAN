/**
 * ADMIN — partner team tree: who invited whom (locked at approval), with sales and team bonus per partner.
 * Partners with no recruiter are the roots. Depth is capped as a safety net (cycles are blocked at approval).
 */
import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { getSettings } from "@/server/settings";

type Node = { id: string; displayName: string; code: string | null; status: string; frozen: boolean; sales: number; teamPaise: number; children: Node[] };

export default async function AdminTeamTree() {
  const [partners, sales, bonuses, settings] = await Promise.all([
    db.partner.findMany({
      where: { status: { in: ["APPROVED", "PENDING"] } },
      orderBy: { approvedAt: "asc" },
      select: { id: true, displayName: true, code: true, status: true, frozenAt: true, referredByPartnerId: true, recruiterLockedAt: true },
    }),
    db.order.groupBy({ by: ["partnerId"], where: { partnerId: { not: null }, status: "PAID" }, _count: { _all: true } }),
    db.commission.groupBy({ by: ["partnerId"], where: { type: { in: ["TEAM_L1", "TEAM_L2"] }, status: { not: "REVERSED" } }, _sum: { amountPaise: true } }),
    getSettings(),
  ]);
  const salesBy = new Map(sales.map((s) => [s.partnerId, s._count._all]));
  const bonusBy = new Map(bonuses.map((b) => [b.partnerId, b._sum.amountPaise ?? 0]));
  const nodes = new Map<string, Node>(
    partners.map((p) => [p.id, { id: p.id, displayName: p.displayName, code: p.code, status: p.status, frozen: !!p.frozenAt, sales: salesBy.get(p.id) ?? 0, teamPaise: bonusBy.get(p.id) ?? 0, children: [] }]),
  );
  const roots: Node[] = [];
  for (const p of partners) {
    const parent = p.referredByPartnerId ? nodes.get(p.referredByPartnerId) : undefined;
    if (parent && parent.id !== p.id) parent.children.push(nodes.get(p.id)!);
    else roots.push(nodes.get(p.id)!);
  }
  const withTeams = roots.filter((r) => r.children.length > 0);
  const solo = roots.length - withTeams.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Team tree</h1>
        <Link href="/admin/partners" className="btn-ghost min-h-10 text-sm">
          ← Partners
        </Link>
      </div>
      <p className="text-sm text-ink-muted">
        Team bonus is <b className={settings.teamBonusEnabled ? "text-success" : "text-fire"}>{settings.teamBonusEnabled ? "ON" : "OFF"}</b> (Settings → teamBonusEnabled). Only 2 levels ever earn a bonus; deeper rows are shown for
        information. {solo} partner(s) have no team yet and are not listed.
      </p>
      {withTeams.length === 0 ? (
        <p className="card p-4 text-ink-muted">No teams yet. A team starts when an approved partner&apos;s invite code is used on an application that you approve.</p>
      ) : (
        <ul className="card space-y-1 p-4 text-sm">
          {withTeams.map((n) => (
            <Branch key={n.id} node={n} depth={0} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Branch({ node, depth }: { node: Node; depth: number }) {
  if (depth > 20) return null;
  return (
    <li>
      <div className="flex flex-wrap items-center gap-2 py-1">
        {depth > 0 && <span className="text-ink-muted">{depth === 1 ? "L1" : depth === 2 ? "L2" : `L${depth}`}</span>}
        <span className="font-semibold">{node.displayName}</span>
        {node.code && <span className="text-ink-muted">{node.code}</span>}
        {node.status !== "APPROVED" && <span className="rounded-sm bg-surface-raised-2 px-2 text-xs">{node.status}</span>}
        {node.frozen && <span className="rounded-sm bg-fire px-2 text-xs text-on-fire">FROZEN</span>}
        <span className="text-ink-muted">
          • {node.sales} sales • team bonus {formatINR(node.teamPaise)} • {node.children.length} invited
        </span>
      </div>
      {node.children.length > 0 && (
        <ul className="ml-4 border-l border-line pl-4">
          {node.children.map((c) => (
            <Branch key={c.id} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
