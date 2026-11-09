/** STUDENT DASHBOARD: continue watching, my courses + progress, downloads, purchases, devices. */
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { formatIST, timeAgo } from "@/lib/time";
import { requireUser } from "@/server/auth";
import { getCourseOutline } from "@/server/learning";
import { getSettings } from "@/server/settings";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = { title: "My dashboard", robots: { index: false } };

function milestone(pct: number) {
  if (pct >= 100) return "🏆 Course complete! Ab apni series shuru karo.";
  if (pct >= 75) return "🔥 Bas thoda aur — finish line saamne hai!";
  if (pct >= 50) return "💪 Aadha course ho gaya. Shandaar!";
  if (pct >= 25) return "🚀 Badhiya start! Momentum mat todna.";
  if (pct > 0) return "👏 Pehla kadam le liya. Roz 1 lesson ka target rakho.";
  return "👋 Lesson 1 se shuru karo — sirf 6 minute ka hai.";
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser("/dashboard");
  const sp = await searchParams;
  const [enrollments, orders, sessions, settings, partner] = await Promise.all([
    db.enrollment.findMany({ where: { userId: user.id, revokedAt: null }, include: { course: true } }),
    db.order.findMany({ where: { userId: user.id, status: { in: ["PAID", "REFUNDED", "PARTIALLY_REFUNDED"] } }, orderBy: { paidAt: "desc" }, include: { items: true } }),
    db.session.findMany({ where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" } }),
    getSettings(),
    db.partner.findUnique({ where: { userId: user.id }, select: { status: true } }),
  ]);
  const outlines = (await Promise.all(enrollments.map((e) => getCourseOutline(e.course.slug, user.id)))).filter((o) => o !== null);

  const lastProgress = await db.lessonProgress.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, include: { lesson: { include: { module: { include: { course: true } } } } } });
  // "Continue": the lesson you were on, or the next unfinished one.
  let cont: { href: string; title: string; course: string } | null = null;
  for (const o of outlines) {
    const resume = lastProgress && lastProgress.lesson.module.courseId === o.course.id && !lastProgress.completedAt ? o.lessons.find((l) => l.id === lastProgress.lessonId) : o.lessons.find((l) => l.unlocked && !l.completed);
    if (resume) {
      cont = { href: `/learn/${o.course.slug}/${resume.id}`, title: resume.title, course: o.course.title };
      break;
    }
  }

  return (
    <AppShell user={user}>
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {sp.denied && <p className="rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm text-bad">Us page ka access aapke account mein nahi hai.</p>}
        <h1 className="font-display text-3xl">Namaste{user.name ? `, ${user.name.split(" ")[0]}` : ""} 👋</h1>

        {cont && (
          <Link href={cont.href} className="card flex items-center gap-4 border-gold/60 p-4 transition hover:bg-panel-2">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gold text-2xl text-ink">▶</span>
            <span className="min-w-0">
              <span className="block text-xs text-gold">Continue watching</span>
              <span className="block truncate font-semibold">{cont.title}</span>
              <span className="block text-xs text-muted">{cont.course}</span>
            </span>
          </Link>
        )}

        {outlines.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-muted">Abhi aapke account mein koi course nahi hai.</p>
            <p className="mt-1 text-xs text-muted">Payment kiya tha? Usi email se login karein jo checkout pe daala tha.</p>
            <Link href="/#pricing" className="btn-gold mt-4">
              Course dekho →
            </Link>
          </div>
        ) : (
          outlines.map((o) => (
            <section key={o.course.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">{o.enrollment?.tier.replace(/_/g, " ")}</span>
                  <h2 className="mt-2 text-xl font-semibold">{o.course.title}</h2>
                </div>
                <span className="font-display text-3xl text-gold">{o.percent}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel-2">
                <div className="h-full rounded-full bg-gold" style={{ width: `${o.percent}%` }} />
              </div>
              <p className="mt-2 text-sm text-muted">
                {o.doneCount}/{o.lessons.length} lessons • {milestone(o.percent)}
              </p>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-gold">Saare lessons dekho</summary>
                <ol className="mt-3 space-y-4">
                  {o.modules.map((m, mi) => (
                    <li key={m.id}>
                      <p className="text-xs text-muted">Module {mi + 1}</p>
                      <p className="font-semibold">{m.title}</p>
                      <ul className="mt-1">
                        {m.lessons.map((l) => (
                          <li key={l.id}>
                            {l.unlocked ? (
                              <Link href={`/learn/${o.course.slug}/${l.id}`} className="flex items-center gap-2 py-1.5 text-sm hover:text-gold">
                                <span className={l.completed ? "text-good" : "text-muted"}>{l.completed ? "✓" : "○"}</span>
                                {l.title}
                              </Link>
                            ) : (
                              <span className="flex items-center gap-2 py-1.5 text-sm text-muted">🔒 {l.title}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </details>
              {o.course.assets.length > 0 && (
                <div className="mt-5 border-t border-line pt-4">
                  <h3 className="text-sm font-semibold">Downloads</h3>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {o.course.assets.map((a) => {
                      const locked = a.minTier === "PRO" && o.enrollment?.tier === "BASIC";
                      return (
                        <li key={a.id}>
                          {locked ? (
                            <span className="flex items-center gap-2 rounded-xl border border-line p-3 text-sm text-muted">🔒 {a.title} (Pro)</span>
                          ) : (
                            <a href={`/api/assets/${a.id}`} className="flex items-center gap-2 rounded-xl border border-line p-3 text-sm hover:border-gold">
                              ⬇ {a.title}
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>
          ))
        )}

        {orders.length > 0 && (
          <section className="card p-5">
            <h2 className="font-semibold">Purchase history</h2>
            <ul className="mt-3 divide-y divide-line text-sm">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                  <span>
                    <span className="block">{o.items.map((i) => i.name).join(" + ")}</span>
                    <span className="text-xs text-muted">
                      #{o.number} • {o.paidAt ? formatIST(o.paidAt, "date") : ""} {o.status !== "PAID" && <b className="text-bad">• {o.status.replace("_", " ").toLowerCase()}</b>}
                    </span>
                  </span>
                  <span className="font-semibold">{formatINR(o.totalPaise)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card p-5">
          <h2 className="font-semibold">Logged-in devices ({sessions.length}/{settings.maxDevices})</h2>
          <p className="mt-1 text-xs text-muted">Ek account max {settings.maxDevices} devices pe chal sakta hai. Naye device pe login karne se sabse purana device logout ho jata hai.</p>
          <ul className="mt-3 space-y-2 text-sm">
            {sessions.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>
                  {s.deviceLabel} {s.id === user.sessionId && <b className="text-gold">(ye device)</b>}
                </span>
                <span className="text-muted">{timeAgo(s.lastSeenAt)}</span>
              </li>
            ))}
          </ul>
        </section>

        {!partner && (
          <p className="text-center text-sm text-muted">
            Instagram page chalate ho?{" "}
            <Link href="/partners" className="text-gold underline">
              Partner bano aur har sale pe kamao
            </Link>
          </p>
        )}
      </main>
    </AppShell>
  );
}
