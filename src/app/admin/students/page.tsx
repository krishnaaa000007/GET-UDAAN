import { db } from "@/lib/db";
import { daysAgo, formatIST } from "@/lib/time";

export default async function AdminStudents({ searchParams }: PageProps<"/admin/students">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const students = await db.user.findMany({
    where: { roles: { some: { role: "STUDENT" } }, ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }, { name: { contains: q, mode: "insensitive" } }] } : {}) },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      enrollments: { include: { course: { select: { title: true } } } },
      _count: { select: { progress: { where: { completedAt: { not: null } } }, sessions: { where: { revokedAt: null } } } },
    },
  });
  // Sharing signal: many distinct IPs in the last 24h
  const since = daysAgo(1);
  const ipCounts = await db.playbackEvent.groupBy({ by: ["userId", "ipHash"], where: { createdAt: { gte: since } } });
  const ipsPerUser = new Map<string, number>();
  for (const r of ipCounts) ipsPerUser.set(r.userId, (ipsPerUser.get(r.userId) ?? 0) + 1);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Students</h1>
      <form>
        <input name="q" defaultValue={q} placeholder="Search email / phone / name" className="field min-h-10 max-w-xs text-sm" />
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line text-left text-xs text-ink-muted">
            <tr>{["Student", "Enrolment", "Lessons done", "Active devices", "IPs (24h)", "Joined"].map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {students.map((s) => {
              const ips = ipsPerUser.get(s.id) ?? 0;
              return (
                <tr key={s.id}>
                  <td className="p-3">{s.name ?? "—"}<span className="block text-xs text-ink-muted">{s.email} • {s.phone}</span></td>
                  <td className="p-3">{s.enrollments.map((e) => `${e.tier}${e.revokedAt ? " (revoked)" : ""}`).join(", ") || "—"}</td>
                  <td className="p-3 tabular-nums">{s._count.progress}</td>
                  <td className="p-3 tabular-nums">{s._count.sessions}</td>
                  <td className={`p-3 tabular-nums ${ips >= 4 ? "font-bold text-fire" : ""}`}>{ips}{ips >= 4 ? " ⚠ check sharing" : ""}</td>
                  <td className="p-3">{formatIST(s.createdAt, "date")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
