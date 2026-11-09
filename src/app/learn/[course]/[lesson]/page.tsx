/** LESSON PAGE (mobile-first): player → title/notes → downloads → next → contextual upgrade → lesson list. */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { getCourseOutline, getLessonForPlayback, tierAllows } from "@/server/learning";
import { getProductWithPrice } from "@/server/catalog";
import { formatINR } from "@/lib/money";
import { AppShell } from "@/components/app-shell";
import { LessonPlayer } from "./lesson-client";

export const metadata: Metadata = { title: "Lesson", robots: { index: false } };

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

  return (
    <AppShell user={user} wide>
      <main className="mx-auto grid max-w-7xl gap-6 px-0 pb-10 sm:px-4 sm:pt-4 lg:grid-cols-[1fr_340px]">
        <div>
          <LessonPlayer
            lessonId={view.lesson.id}
            source={view.playback}
            watermark={view.watermark}
            startAt={view.startAt}
            title={view.lesson.title}
            viewerId={user.id}
            nextHref={next ? href(next.id) : null}
          />
          <div className="px-4 sm:px-0">
            <p className="mt-4 text-xs text-gold">
              Lesson {idx + 1} / {outline.lessons.length}
            </p>
            <h1 className="mt-1 text-xl font-semibold">{view.lesson.title}</h1>
            {view.lesson.body && <p className="mt-2 text-sm whitespace-pre-line text-zinc-300">{view.lesson.body}</p>}

            {current.assets.length > 0 && (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {current.assets.map((a) => (
                  <li key={a.id}>
                    <a href={`/api/assets/${a.id}`} className="flex items-center gap-2 rounded-xl border border-line p-3 text-sm hover:border-gold">
                      ⬇ {a.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex gap-3">
              {prev && (
                <Link href={href(prev.id)} className="btn-ghost flex-1">
                  ← Pichla
                </Link>
              )}
              {next ? (
                <Link href={href(next.id)} className="btn-gold flex-[2]">
                  Agla lesson →
                </Link>
              ) : (
                <Link href="/dashboard" className="btn-gold flex-[2]">
                  Dashboard pe jao
                </Link>
              )}
            </div>

            {showUpsell && upsell && (
              <div className="card mt-6 border-gold/50 p-5">
                <p className="text-xs font-semibold text-gold">AAGE KA STEP</p>
                <h2 className="mt-1 text-lg font-semibold">Chahte ho humari team aapka page banaye?</h2>
                <p className="mt-1 text-sm text-muted">{upsell.product.tagline}. Character design, pehli videos aur growth plan — saath mein.</p>
                <Link href={`/checkout/${upsell.product.slug}`} className="btn-ghost mt-4 w-full">
                  {upsell.product.name} dekho — {formatINR(upsell.price.amountPaise)}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Lesson list */}
        <aside className="px-4 sm:px-0">
          <div className="card overflow-hidden lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
            <div className="border-b border-line p-4">
              <p className="text-sm font-semibold">{outline.course.title}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel-2">
                <div className="h-full bg-gold" style={{ width: `${outline.percent}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted">{outline.percent}% complete</p>
            </div>
            {outline.modules.map((m, mi) => (
              <details key={m.id} open={m.lessons.some((l) => l.id === lessonId)} className="border-b border-line last:border-0">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
                  {mi + 1}. {m.title}
                </summary>
                <ul className="pb-2">
                  {m.lessons.map((l) => (
                    <li key={l.id}>
                      {l.unlocked ? (
                        <Link href={href(l.id)} className={`flex gap-2 px-4 py-2 text-sm ${l.id === lessonId ? "bg-gold/10 text-gold" : "text-zinc-300 hover:text-white"}`}>
                          <span className={l.completed ? "text-good" : "text-muted"}>{l.completed ? "✓" : "○"}</span>
                          {l.title}
                        </Link>
                      ) : (
                        <span className="flex gap-2 px-4 py-2 text-sm text-muted">🔒 {l.title}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </aside>
      </main>
    </AppShell>
  );
}
