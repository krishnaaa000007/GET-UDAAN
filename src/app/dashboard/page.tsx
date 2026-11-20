/**
 * STUDENT HOME (app). Order: greeting → continue watching → stats → my courses → next step → more courses.
 * Someone logged in who hasn't bought anything (and has no Done-with-you project) sees the landing page instead.
 * My Courses, Explore and Profile are their own pages under /dashboard/*.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CircleAlert, Play } from "lucide-react";
import { AppFrame } from "@/components/app/app-frame";
import { CatalogCard } from "@/components/app/catalog-card";
import { CourseCard } from "@/components/app/course-card";
import { Highlight, SpeedTrails } from "@/components/ui/basics";
import { Button } from "@/components/ui/button";
import { ProgressBar, StatCard } from "@/components/ui/data";
import t from "@/content/hi-Latn/student.json";
import { requireUser } from "@/server/auth";
import { getClientProject, SERVICE_STAGES, STAGE_DONE } from "@/server/service";
import { getSettings, supportWhatsappHref } from "@/server/settings";
import { getCatalogFor, getMyLearning, nextStep } from "@/server/student-app";
import { hasSharedResult } from "@/server/testimonials";
import { ShareResult } from "./share-result";

export const metadata: Metadata = { title: "Home", robots: { index: false } };

const d = t.dashboard;
const h = t.home;
const milestoneFor = (pct: number) => (pct >= 100 ? d.milestones["100"] : pct >= 75 ? d.milestones["75"] : pct >= 50 ? d.milestones["50"] : pct >= 25 ? d.milestones["25"] : null);

export default async function StudentHome({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser("/dashboard");
  const sp = await searchParams;
  const project = await getClientProject(user.id);
  const [learning, catalog, settings, sharedResult] = await Promise.all([getMyLearning(user.id), getCatalogFor(user.id), getSettings(), hasSharedResult(user.id)]);
  const { outlines, cont, streak, certificates, lessonsDone, lessonsTotal, planName } = learning;

  // Nothing bought yet → the landing page is their home (the header there shows "Mera account").
  // (If they were bounced from a page they are not allowed to open, Profile explains why.)
  if (outlines.length === 0 && !project) redirect(sp.denied ? "/dashboard/profile?denied=1" : "/");

  const firstName = user.name?.trim().split(/\s+/)[0];
  const main = outlines[0];
  const finished = outlines.find((o) => o.percent >= 100 && o.enrollment);
  const milestone = main ? milestoneFor(main.percent) : null;
  const step = nextStep(catalog, user.roles.includes("PARTNER"));
  const more = catalog.filter((c) => c.state !== "owned" && (step?.kind !== "buy" || c.slug !== step.item.slug)).slice(0, 3);
  const progressPct = lessonsTotal ? Math.round((lessonsDone / lessonsTotal) * 100) : 0;

  return (
    <AppFrame user={user} mode="student" active="home" supportHref={supportWhatsappHref(settings)}>
      <div className="flex flex-col gap-8">
        {sp.denied && (
          <p role="alert" className="flex items-start gap-2 rounded-sm border border-fire bg-surface-raised p-3 text-ink">
            <CircleAlert aria-hidden className="mt-0.5 size-5 flex-none text-fire" />
            {d.denied}
          </p>
        )}

        <div className="flex flex-col gap-1">
          <h1 className="type-heading text-ink">{firstName ? d.greeting.replace("{name}", firstName) : d.greetingNoName}</h1>
          <p className="text-ink-muted">{h.sub}</p>
        </div>

        {/* The one main action: continue watching (or the certificate when everything is done) */}
        {cont ? (
          <section className="flex flex-col gap-4 rounded-lg border-2 border-gold bg-gold-soft p-4 md:flex-row md:items-center md:gap-6 md:p-6">
            <a href={cont.href} aria-hidden tabIndex={-1} className="relative grid aspect-video w-full flex-none place-items-center overflow-hidden rounded-md bg-surface-sunken md:w-64">
              <SpeedTrails className="absolute top-3 left-3 h-6 w-7" />
              <span className="grid size-14 place-items-center rounded-pill bg-gold text-on-gold">
                <Play className="size-6" />
              </span>
            </a>
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

        {/* Numbers that go up */}
        {outlines.length > 0 && (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label={h.stats.lessons} value={`${lessonsDone}/${lessonsTotal}`} />
            <StatCard label={h.stats.progress} value={`${progressPct}%`} />
            <StatCard label={h.stats.streak} value={String(streak)} />
            <StatCard label={h.stats.certificates} value={String(certificates)} />
          </div>
        )}

        {milestone && (
          <p className="flex items-center gap-3 rounded-md bg-gold-soft p-4 font-semibold text-gold-text">
            <SpeedTrails className="flex-none" />
            {milestone}
          </p>
        )}

        {project && (
          <section className="flex flex-col items-start gap-2 rounded-lg border border-line bg-surface-raised p-4 md:p-6">
            <p className="type-label text-gold-text">{d.projectCard.eyebrow}</p>
            <h2 className="type-title text-ink">{d.projectCard.title}</h2>
            <p className="text-ink-muted">{project.stage >= STAGE_DONE ? d.projectCard.done : d.projectCard.stage.replace("{stage}", SERVICE_STAGES[project.stage].title)}</p>
            <Button href="/dashboard/project" variant="secondary" arrow>
              {d.projectCard.cta}
            </Button>
          </section>
        )}

        {/* My courses */}
        {outlines.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-3">
              <h2 className="type-heading text-ink">
                <Highlight text={h.myCourses} />
              </h2>
              <Link href="/dashboard/courses" className="type-small inline-flex min-h-11 flex-none items-center gap-1 font-semibold text-gold-text hover:underline">
                {h.seeAll}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {outlines.slice(0, 3).map((o) => (
                <CourseCard key={o.course.id} o={o} plan={planName(o)} />
              ))}
            </div>
          </section>
        )}

        {/* One suggested next step */}
        {step && (
          <section className="flex flex-col gap-3 rounded-lg border border-gold/50 bg-surface-raised p-5 md:flex-row md:items-center md:justify-between md:gap-6 md:p-6">
            <div className="flex flex-col gap-1">
              <p className="type-label text-gold-text">{h.next.eyebrow}</p>
              <h2 className="type-title text-ink">
                {step.kind === "partner" ? h.next.partnerTitle : step.item.state === "upgrade" ? h.next.upgrade.replace("{name}", step.item.name) : h.next.fresh.replace("{name}", step.item.name)}
              </h2>
              <p className="type-small text-ink-muted">{step.kind === "partner" ? h.next.partnerText : step.item.tagline}</p>
            </div>
            <Button href={step.kind === "partner" ? "/partners" : step.item.href} variant="secondary" arrow className="flex-none" data-cta="home_next_step">
              {step.kind === "partner" ? h.next.partnerCta : h.next.cta}
            </Button>
          </section>
        )}

        {/* Real testimonials come from real students: ask once they have watched a few lessons */}
        {main && main.doneCount >= 3 && <ShareResult alreadySent={sharedResult} />}

        {/* More from Get Udaan */}
        {more.length > 0 && (
          <section className="flex flex-col gap-4">
            <div className="flex items-end justify-between gap-3">
              <h2 className="type-heading text-ink">
                <Highlight text={h.more} />
              </h2>
              <Link href="/dashboard/explore" className="type-small inline-flex min-h-11 flex-none items-center gap-1 font-semibold text-gold-text hover:underline">
                {h.explore}
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((c) => (
                <CatalogCard key={c.slug} item={c} compact />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppFrame>
  );
}
