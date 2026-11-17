/**
 * STUDENT DASHBOARD (DESIGN.md 7.6). ONE action: continue watching.
 * Order: greeting → continue card → numbers going up → milestone → my courses → downloads → profile.
 * Phone: bottom tab bar jumps to Home / Courses / Downloads / Profile on this page.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, Download, Lock, Play } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Accordion, CurriculumModule } from "@/components/ui/accordion";
import { Badge, EmptyState, Highlight, SpeedTrails, StatChip } from "@/components/ui/basics";
import { Button } from "@/components/ui/button";
import { ProgressBar, ProgressRing } from "@/components/ui/data";
import t from "@/content/hi-Latn/student.json";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { formatIST, timeAgo } from "@/lib/time";
import { requireUser } from "@/server/auth";
import { getCourseOutline, getLearningStreak } from "@/server/learning";
import { getClientProject, SERVICE_STAGES, STAGE_DONE } from "@/server/service";
import { getSettings } from "@/server/settings";
import { hasSharedResult } from "@/server/testimonials";
import { ShareResult } from "./share-result";

export const metadata: Metadata = { title: "My dashboard", robots: { index: false } };

const d = t.dashboard;
const milestoneFor = (pct: number) => (pct >= 100 ? d.milestones["100"] : pct >= 75 ? d.milestones["75"] : pct >= 50 ? d.milestones["50"] : pct >= 25 ? d.milestones["25"] : null);
const sectionTitle = "type-heading text-ink";

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser("/dashboard");
  const sp = await searchParams;
  const [enrollments, orders, sessions, settings, partner, streak, sharedResult] = await Promise.all([
    db.enrollment.findMany({ where: { userId: user.id, revokedAt: null }, include: { course: true } }),
    db.order.findMany({ where: { userId: user.id, status: { in: ["PAID", "REFUNDED", "PARTIALLY_REFUNDED"] } }, orderBy: { paidAt: "desc" }, include: { items: true } }),
    db.session.findMany({ where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" } }),
    getSettings(),
    db.partner.findUnique({ where: { userId: user.id }, select: { status: true } }),
    getLearningStreak(user.id),
    hasSharedResult(user.id),
  ]);
  const outlines = (await Promise.all(enrollments.map((e) => getCourseOutline(e.course.slug, user.id)))).filter((o) => o !== null);

  const lastProgress = await db.lessonProgress.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, include: { lesson: { include: { module: true } } } });
  // "Continue": the lesson you were on, or the next unfinished one.
  let cont: { href: string; title: string; course: string; lessonPct: number; started: boolean } | null = null;
  for (const o of outlines) {
    const resume = lastProgress && lastProgress.lesson.module.courseId === o.course.id && !lastProgress.completedAt ? o.lessons.find((l) => l.id === lastProgress.lessonId) : o.lessons.find((l) => l.unlocked && !l.completed);
    if (resume) {
      cont = {
        href: `/learn/${o.course.slug}/${resume.id}`,
        title: resume.title,
        course: o.course.title,
        lessonPct: resume.durationSec > 0 ? Math.min(100, (resume.positionSec / resume.durationSec) * 100) : 0,
        started: o.doneCount > 0 || resume.positionSec > 0,
      };
      break;
    }
  }
  const main = outlines[0];
  const finished = outlines.find((o) => o.percent >= 100 && o.enrollment);
  const milestone = main ? milestoneFor(main.percent) : null;
  const firstName = user.name?.trim().split(/\s+/)[0];
  // Done-with-you clients get a card that opens their project tracker.
  const project = user.roles.includes("SERVICE_CLIENT") ? await getClientProject(user.id) : null;
  const downloads = outlines.flatMap((o) => o.course.assets.map((a) => ({ ...a, locked: a.minTier === "PRO" && o.enrollment?.tier === "BASIC" })));

  return (
    <AppShell user={user} studentTabs>
      <main className="container-page flex flex-col gap-8 pt-6 pb-28 md:pb-12">
        {sp.denied && (
          <p role="alert" className="flex items-start gap-2 rounded-sm border border-fire bg-surface-raised p-3 text-ink">
            <CircleAlert aria-hidden className="mt-0.5 size-5 flex-none text-fire" />
            {d.denied}
          </p>
        )}
        <h1 className="type-heading text-ink">{firstName ? d.greeting.replace("{name}", firstName) : d.greetingNoName}</h1>

        {outlines.length === 0 ? (
          <EmptyState
            text={d.empty.text}
            action={
              <Button href="/#pricing" arrow>
                {d.empty.cta}
              </Button>
            }
          />
        ) : (
          <>
            {/* The one action: continue watching (or, when everything is done, the certificate) */}
            {cont ? (
              <section className="flex flex-col gap-4 rounded-lg border-2 border-gold bg-gold-soft p-4 md:flex-row md:items-center md:gap-6 md:p-6">
                <div aria-hidden className="relative grid aspect-video w-full flex-none place-items-center overflow-hidden rounded-md bg-surface-sunken md:w-64">
                  <SpeedTrails className="absolute top-3 left-3 h-6 w-7" />
                  <span className="grid size-14 place-items-center rounded-pill bg-surface-raised text-gold-text">
                    <Play className="size-6" />
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <p className="type-label text-gold-text">{cont.started ? d.continue.eyebrow : d.continue.eyebrowStart}</p>
                  <h2 className="type-title text-ink">{cont.title}</h2>
                  <p className="type-small text-ink-muted">{cont.course}</p>
                  {cont.lessonPct > 0 && <ProgressBar value={cont.lessonPct} label={d.continue.lessonProgress} />}
                  <Button href={cont.href} size="lg" block arrow className="md:w-auto md:self-start">
                    {cont.started ? d.continue.cta : d.continue.ctaStart}
                  </Button>
                </div>
              </section>
            ) : finished?.enrollment ? (
              <section className="flex flex-col items-start gap-3 rounded-lg border-2 border-gold bg-gold-soft p-6">
                <p className="type-label text-gold-text">{d.complete.eyebrow}</p>
                <h2 className="type-title text-ink">{d.complete.title}</h2>
                <Button href={`/certificate/${finished.enrollment.id}`} size="lg" block arrow className="md:w-auto">
                  {d.complete.cta}
                </Button>
              </section>
            ) : null}

            {project && (
              <section className="flex flex-col items-start gap-2 rounded-md border border-line bg-surface-raised p-4 md:p-6">
                <p className="type-label text-gold-text">{d.projectCard.eyebrow}</p>
                <h2 className="type-title text-ink">{d.projectCard.title}</h2>
                <p className="text-ink-muted">{project.stage >= STAGE_DONE ? d.projectCard.done : d.projectCard.stage.replace("{stage}", SERVICE_STAGES[project.stage].title)}</p>
                <Button href="/dashboard/project" variant="secondary" arrow>
                  {d.projectCard.cta}
                </Button>
              </section>
            )}

            {/* Numbers that go up */}
            {main && (
              <ul className="flex flex-wrap gap-2">
                {streak > 0 && (
                  <li>
                    <StatChip value={String(streak)} label={d.stats.streak} />
                  </li>
                )}
                <li>
                  <StatChip value={`${main.doneCount}/${main.lessons.length}`} label={d.stats.lessons} />
                </li>
                <li>
                  <StatChip value={`${main.percent}%`} label={d.stats.progress} />
                </li>
              </ul>
            )}

            {milestone && (
              <p className="flex items-center gap-3 rounded-md bg-gold-soft p-4 font-semibold text-gold-text">
                <SpeedTrails className="flex-none" />
                {milestone}
              </p>
            )}

            {/* My courses */}
            <section id="courses" className="flex scroll-mt-20 flex-col gap-4">
              <h2 className={sectionTitle}>
                <Highlight text={d.courses.title} />
              </h2>
              {outlines.map((o) => (
                <article key={o.course.id} className="flex flex-col gap-4 rounded-md border border-line bg-surface-raised p-4 md:p-6">
                  <div className="flex items-center gap-4">
                    <ProgressRing value={o.percent} />
                    <div className="flex min-w-0 flex-col items-start gap-1">
                      {o.enrollment && <Badge tone="gold">{o.enrollment.tier.replace(/_/g, " ")}</Badge>}
                      <h3 className="type-title text-ink">{o.course.title}</h3>
                      <p className="type-small text-ink-muted">{d.courses.lessonsDone.replace("{done}", String(o.doneCount)).replace("{total}", String(o.lessons.length))}</p>
                    </div>
                  </div>
                  <Accordion>
                    {o.modules.map((m, mi) => (
                      <CurriculumModule
                        key={m.id}
                        group={`course-${o.course.id}`}
                        title={d.courses.moduleLabel.replace("{n}", String(mi + 1)).replace("{title}", m.title)}
                        lessons={m.lessons.map((l) => ({
                          title: l.title,
                          minutes: Math.round(l.durationSec / 60) || undefined,
                          state: !l.unlocked ? ("locked" as const) : l.completed ? ("done" as const) : ("play" as const),
                          href: l.unlocked ? `/learn/${o.course.slug}/${l.id}` : undefined,
                        }))}
                      />
                    ))}
                  </Accordion>
                  {o.enrollment &&
                    (o.percent >= 100 ? (
                      <Button href={`/certificate/${o.enrollment.id}`} variant="secondary" className="self-start">
                        {d.courses.certificate}
                      </Button>
                    ) : (
                      <p className="type-small flex items-center gap-2 text-ink-muted">
                        <Lock aria-hidden className="size-5 flex-none" />
                        {d.courses.certificateLocked}
                      </p>
                    ))}
                </article>
              ))}
            </section>

            {/* Real testimonials come from real students: ask once they have actually watched a few lessons */}
            {main && main.doneCount >= 3 && <ShareResult alreadySent={sharedResult} />}

            {/* Downloads */}
            <section id="downloads" className="flex scroll-mt-20 flex-col gap-4">
              <h2 className={sectionTitle}>{d.downloads.title}</h2>
              {downloads.length === 0 ? (
                <p className="text-ink-muted">{d.downloads.empty}</p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {downloads.map((a) => (
                    <li key={a.id}>
                      {a.locked ? (
                        <span className="flex min-h-14 items-center gap-3 rounded-md border border-line p-3 text-ink-muted">
                          <Lock aria-hidden className="size-5 flex-none" />
                          {d.downloads.locked.replace("{title}", a.title)}
                        </span>
                      ) : (
                        <a href={`/api/assets/${a.id}`} aria-label={d.downloads.download.replace("{title}", a.title)} className="flex min-h-14 items-center gap-3 rounded-md border border-line bg-surface-raised p-3 text-ink transition-colors duration-150 hover:border-gold">
                          <Download aria-hidden className="size-5 flex-none text-gold-text" />
                          {a.title}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {/* Profile: purchases + devices */}
        <section id="profile" className="flex scroll-mt-20 flex-col gap-4">
          <h2 className={sectionTitle}>{d.profile.title}</h2>
          {orders.length > 0 && (
            <div className="rounded-md border border-line bg-surface-raised p-4 md:p-6">
              <h3 className="type-title text-ink">{d.profile.purchases}</h3>
              <ul className="mt-2 divide-y divide-line">
                {orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="flex min-w-0 flex-col">
                      <span className="text-ink">{o.items.map((i) => i.name).join(" + ")}</span>
                      <span className="type-small text-ink-muted">
                        {d.profile.order.replace("{number}", String(o.number))}
                        {o.paidAt ? ` • ${formatIST(o.paidAt, "date")}` : ""}
                        {o.status === "REFUNDED" ? ` • ${d.profile.refunded}` : o.status === "PARTIALLY_REFUNDED" ? ` • ${d.profile.partRefunded}` : ""}
                      </span>
                    </span>
                    <span className="flex-none font-semibold text-ink">{formatINR(o.totalPaise)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="rounded-md border border-line bg-surface-raised p-4 md:p-6">
            <h3 className="type-title text-ink">{d.profile.devices.replace("{n}", String(sessions.length)).replace("{max}", String(settings.maxDevices))}</h3>
            <p className="type-small mt-1 text-ink-muted">{d.profile.devicesHint.replace("{max}", String(settings.maxDevices))}</p>
            <ul className="mt-3 flex flex-col gap-2">
              {sessions.map((s) => (
                <li key={s.id} className="flex justify-between gap-3">
                  <span className="text-ink">
                    {s.deviceLabel} {s.id === user.sessionId && <b className="text-gold-text">({d.profile.thisDevice})</b>}
                  </span>
                  <span className="type-small flex-none text-ink-muted">{timeAgo(s.lastSeenAt)}</span>
                </li>
              ))}
            </ul>
          </div>
          {!partner && (
            <p className="text-ink-muted">
              {d.profile.partner}{" "}
              <Link href="/partners" className="inline-flex min-h-12 items-center font-semibold text-gold-text underline underline-offset-4">
                {d.profile.partnerCta}
              </Link>
            </p>
          )}
        </section>
      </main>
    </AppShell>
  );
}
