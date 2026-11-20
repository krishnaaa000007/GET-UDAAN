/** ONE COURSE — progress, continue button, modules + lessons, this course's downloads, certificate. Owners only. */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, Lock } from "lucide-react";
import Link from "next/link";
import { AppFrame } from "@/components/app/app-frame";
import { Accordion, CurriculumModule } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/basics";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/data";
import t from "@/content/hi-Latn/student.json";
import { requireUser } from "@/server/auth";
import { getCourseOutline } from "@/server/learning";
import { getSettings, supportWhatsappHref } from "@/server/settings";

export const metadata: Metadata = { title: "Course", robots: { index: false } };

export default async function CoursePage({ params }: PageProps<"/dashboard/courses/[slug]">) {
  const { slug } = await params;
  const user = await requireUser(`/dashboard/courses/${slug}`);
  const [o, settings] = await Promise.all([getCourseOutline(slug, user.id), getSettings()]);
  if (!o) notFound();
  if (!o.enrollment) redirect("/dashboard/explore"); // not theirs: show what they can buy
  const d = t.dashboard;
  const c = t.coursesPage;
  const next = o.lessons.find((l) => l.unlocked && !l.completed);
  const downloads = o.course.assets.map((a) => ({ ...a, locked: a.minTier === "PRO" && o.enrollment?.tier === "BASIC" }));

  return (
    <AppFrame user={user} mode="student" active="courses" supportHref={supportWhatsappHref(settings)}>
      <div className="flex flex-col gap-6">
        <Link href="/dashboard/courses" className="type-small inline-flex min-h-11 items-center gap-1 self-start font-semibold text-ink-muted hover:text-ink">
          <ArrowLeft aria-hidden className="size-4" />
          {c.back}
        </Link>

        <header className="flex flex-col gap-4 rounded-lg border border-line bg-surface-raised p-4 md:flex-row md:items-center md:p-6">
          <ProgressRing value={o.percent} size={72} />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            <Badge tone="gold">{o.enrollment.tier.replace(/_/g, " ")}</Badge>
            <h1 className="type-heading text-ink">{o.course.title}</h1>
            <p className="type-small text-ink-muted">{d.courses.lessonsDone.replace("{done}", String(o.doneCount)).replace("{total}", String(o.lessons.length))}</p>
          </div>
          {next ? (
            <Button href={`/learn/${o.course.slug}/${next.id}`} size="lg" arrow className="md:flex-none">
              {o.doneCount > 0 ? d.continue.cta : d.continue.ctaStart}
            </Button>
          ) : o.percent >= 100 ? (
            <Button href={`/certificate/${o.enrollment.id}`} size="lg" arrow className="md:flex-none">
              {d.courses.certificate}
            </Button>
          ) : null}
        </header>

        <section className="flex flex-col gap-3">
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
          {o.percent < 100 && (
            <p className="type-small flex items-center gap-2 text-ink-muted">
              <Lock aria-hidden className="size-5 flex-none" />
              {d.courses.certificateLocked}
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="type-title text-ink">{c.downloads}</h2>
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
      </div>
    </AppFrame>
  );
}
