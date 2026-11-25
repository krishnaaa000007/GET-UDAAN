/**
 * LESSON PAGE (DESIGN.md 7.6). ONE action: go to the next lesson.
 * Phone order: video (sticks to the top) → lesson number + title → mark complete + next →
 * all-lessons drawer → notes → resources → contextual upgrade.
 * Desktop: the lesson list sits in a column on the right.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Accordion, CurriculumModule } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/data";
import t from "@/content/hi-Latn/student.json";
import { requireUser } from "@/server/auth";
import { getProductWithPrice } from "@/server/catalog";
import { getCourseOutline, getLessonForPlayback, tierAllows } from "@/server/learning";
import { LessonDrawer, LessonPlayer } from "./lesson-client";

export const metadata: Metadata = { title: "Lesson", robots: { index: false } };

const L = t.lesson;

export default async function LessonPage({ params }: PageProps<"/learn/[course]/[lesson]">) {
  const { course: courseSlug, lesson: lessonId } = await params;
  const user = await requireUser(`/learn/${courseSlug}/${lessonId}`);
  const outline = await getCourseOutline(courseSlug, user.id);
  if (!outline) notFound();

  const idx = outline.lessons.findIndex((l) => l.id === lessonId);
  if (idx === -1) notFound();
  const current = outline.lessons[idx];
  if (!current.unlocked) redirect(outline.enrollment ? `/checkout/pro` : `/#pricing`);

  const view = await getLessonForPlayback(lessonId, user);
  if (!view) redirect("/dashboard");

  const prev = outline.lessons.slice(0, idx).reverse().find((l) => l.unlocked);
  const next = outline.lessons.slice(idx + 1).find((l) => l.unlocked);
  const href = (id: string) => `/learn/${courseSlug}/${id}`;

  // Contextual upgrade (e.g. after the income module → done-with-you), only if they don't already have that tier.
  const upsell = view.lesson.upsellProductSlug ? await getProductWithPrice(view.lesson.upsellProductSlug) : null;
  const showUpsell = upsell?.product.tier && !tierAllows(outline.enrollment?.tier, upsell.product.tier);

  // The full lesson list. `where` keeps the accordion groups of the drawer and the side column apart.
  const lessonList = (where: string) => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-ink">{outline.course.title}</p>
        <ProgressBar value={outline.percent} />
      </div>
      <Accordion>
        {outline.modules.map((m, mi) => (
          <CurriculumModule
            key={m.id}
            group={`outline-${where}`}
            defaultOpen={m.lessons.some((l) => l.id === lessonId)}
            title={L.moduleLabel.replace("{n}", String(mi + 1)).replace("{title}", m.title)}
            lessons={m.lessons.map((l) => ({
              title: l.title,
              minutes: Math.round(l.durationSec / 60) || undefined,
              state: !l.unlocked ? ("locked" as const) : l.completed ? ("done" as const) : ("play" as const),
              current: l.id === lessonId,
              href: l.unlocked ? href(l.id) : undefined,
            }))}
          />
        ))}
      </Accordion>
    </div>
  );

  return (
    <AppShell user={user} wide sticky={false}>
      <main className="mx-auto grid w-full max-w-7xl gap-8 pb-12 md:px-6 md:pt-6 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          <LessonPlayer
            key={view.lesson.id}
            lessonId={view.lesson.id}
            source={view.playback}
            watermark={view.watermark}
            startAt={view.startAt}
            title={view.lesson.title}
            viewerId={user.id}
            nextHref={next ? href(next.id) : null}
            initialCompleted={current.completed}
            header={
              <div className="flex flex-col gap-1">
                <p className="type-label text-gold-text">{L.count.replace("{n}", String(idx + 1)).replace("{total}", String(outline.lessons.length))}</p>
                <h1 className="type-title text-ink">{view.lesson.title}</h1>
              </div>
            }
          />

          <div className="flex flex-col gap-6 px-4 md:px-0">
            {prev && (
              <Link href={href(prev.id)} className="inline-flex min-h-12 items-center gap-2 self-start font-semibold text-ink-muted hover:text-ink">
                <ArrowLeft aria-hidden className="size-5" />
                {L.prev}
              </Link>
            )}

            <LessonDrawer>{lessonList("drawer")}</LessonDrawer>

            {view.lesson.body && (
              <section className="flex flex-col gap-2">
                <h2 className="type-title text-ink">{L.notes}</h2>
                <p className="max-w-reading whitespace-pre-line text-ink-muted">{view.lesson.body}</p>
              </section>
            )}

            {current.assets.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="type-title text-ink">{L.resources}</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {current.assets.map((a) => (
                    <li key={a.id}>
                      <a href={`/api/assets/${a.id}`} className="flex min-h-14 items-center gap-3 rounded-md border border-line bg-surface-raised p-3 text-ink transition-colors duration-150 hover:border-gold shadow-card">
                        <Download aria-hidden className="size-5 flex-none text-gold-text" />
                        {a.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {showUpsell && upsell && (
              <section className="flex flex-col items-start gap-3 rounded-lg bg-gold-soft p-6">
                <p className="type-label text-gold-text">{L.upsell.eyebrow}</p>
                <h2 className="type-title text-ink">{L.upsell.title}</h2>
                <p className="text-ink-muted">{L.upsell.text}</p>
                <Button href={upsell.product.kind === "SERVICE" ? "/done-with-you" : `/checkout/${upsell.product.slug}`} variant="secondary" data-cta="lesson_upsell">
                  {L.upsell.cta.replace("{name}", upsell.product.name)}
                </Button>
              </section>
            )}
          </div>
        </div>

        {/* Desktop: lesson list always visible */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-md border border-line bg-surface-raised p-4 shadow-card">{lessonList("side")}</div>
        </aside>
      </main>
    </AppShell>
  );
}
