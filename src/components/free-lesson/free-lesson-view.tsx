/**
 * FREE LESSON PAGE (DESIGN.md 7.3) — used by /free-lesson and /preview/[lessonId].
 * ONE job: get the viewer to upgrade to the full course.
 * Order: video → title + progress hint → upgrade card → notes → 20 free prompts → next step.
 */
import { Download } from "lucide-react";
import { notFound } from "next/navigation";
import { FunnelTracker } from "@/components/landing/islands";
import { ProtectedPlayer } from "@/components/player/protected-player";
import { Badge, Highlight, SectionHeader, TrustRow } from "@/components/ui/basics";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/data";
import { StickyBuyBar } from "@/components/ui/interactive";
import t from "@/content/hi-Latn/free-lesson.json";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { listProducts } from "@/server/catalog";
import { getSettings } from "@/server/settings";
import { videoProviderFor } from "@/server/video/provider";
import { PromptList } from "./prompt-list";

/** The first published free-preview lesson of the first published course (or null). */
export async function findFirstFreeLessonId(): Promise<string | null> {
  const course = await db.course.findFirst({
    where: { published: true },
    orderBy: { createdAt: "asc" },
    select: { modules: { orderBy: { position: "asc" }, select: { lessons: { where: { published: true, isFreePreview: true }, orderBy: { position: "asc" }, select: { id: true }, take: 1 } } } },
  });
  return course?.modules.flatMap((m) => m.lessons)[0]?.id ?? null;
}

export async function FreeLessonView({ lessonId }: { lessonId: string }) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { select: { course: { select: { modules: { orderBy: { position: "asc" }, select: { lessons: { where: { published: true }, orderBy: { position: "asc" }, select: { id: true } } } } } } } } },
  });
  if (!lesson || !lesson.isFreePreview || !lesson.published) notFound();

  const { provider, ref } = videoProviderFor(lesson);
  const [source, products, settings] = await Promise.all([provider.getPlayback(ref), listProducts(), getSettings()]);
  const entry = products.find((p) => p.product.kind === "COURSE_TIER");

  // Real numbers: how many lessons the course has, and how many are still locked for this viewer.
  const total = lesson.module.course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const remaining = Math.max(0, total - 1);
  const price = entry ? formatINR(entry.price.amountPaise) : "";
  const fill = (s: string) => s.replace("{remaining}", String(remaining)).replace("{price}", price).replace("{total}", String(total)).replace("{n}", "1");
  const checkoutHref = entry ? `/checkout/${entry.product.slug}` : "/#pricing";
  const wa = `https://wa.me/${settings.supportWhatsapp.replace(/\D/g, "")}`;

  return (
    <main className="pb-12">
      <FunnelTracker />

      {/* Video: edge to edge on phones */}
      <div className="mx-auto max-w-3xl md:px-6 md:pt-6">
        <ProtectedPlayer lessonId={lesson.id} source={source} watermark={t.watermark} startAt={0} title={lesson.title} viewerId="anonymous" saveProgress={false} />
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 pt-6 md:px-6">
        <header className="flex flex-col items-start gap-3">
          <Badge tone="gold">{t.eyebrow}</Badge>
          <h1 className="type-title text-ink">{lesson.title}</h1>
          {total > 0 && (
            <div className="flex w-full max-w-sm flex-col gap-1">
              <span className="type-small text-ink-muted">{fill(t.progress)}</span>
              <ProgressBar value={(1 / total) * 100} label={t.progressLabel} showLabel={false} />
            </div>
          )}
        </header>

        {/* The one action on this page */}
        {entry && (
          <section id="upgrade" className="flex flex-col items-start gap-4 rounded-lg border-2 border-gold bg-gold-soft p-6 md:p-8">
            <h2 className="type-heading text-ink">
              <Highlight text={t.upgrade.title} />
            </h2>
            <p className="type-body-lg text-ink">{fill(t.upgrade.text)}</p>
            <Button href={checkoutHref} size="lg" block arrow data-cta="free_lesson_upgrade" className="sm:w-auto">
              {fill(t.upgrade.cta)}
            </Button>
            <TrustRow refundDays={settings.refundWindowDays} whatsappHref={wa} />
          </section>
        )}

        {lesson.body && (
          <section className="flex flex-col gap-2">
            <h2 className="type-title text-ink">{t.notesTitle}</h2>
            <p className="max-w-reading whitespace-pre-line text-ink-muted">{lesson.body}</p>
          </section>
        )}

        <section id="prompts" className="flex scroll-mt-20 flex-col gap-4">
          <SectionHeader eyebrow={t.prompts.eyebrow} heading={t.prompts.title} sub={t.prompts.text} size="heading" />
          <PromptList />
          <Button href="/free-lesson/prompts" variant="secondary" block prefetch={false} data-cta="free_prompts_download" className="sm:w-auto sm:self-start">
            <span className="inline-flex items-center gap-2">
              <Download aria-hidden className="size-5" />
              {t.prompts.download}
            </span>
          </Button>
        </section>

        <Button href="/#curriculum" variant="ghost" className="self-start" data-cta="free_lesson_curriculum">
          {t.next}
        </Button>
      </div>

      {/* Phones: the buy bar shows whenever the upgrade card itself is not on screen (never two gold buttons). */}
      {entry && (
        <StickyBuyBar
          price={price}
          note={fill(t.upgrade.stickyNote)}
          afterId="upgrade"
          cta={
            <Button href={checkoutHref} pill data-cta="free_lesson_sticky">
              {t.upgrade.stickyCta}
            </Button>
          }
        />
      )}
    </main>
  );
}
