/** Free preview lessons (marked "free preview" in admin) — watchable without buying. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { videoProviderFor } from "@/server/video/provider";
import { listProducts } from "@/server/catalog";
import { ProtectedPlayer } from "@/components/player/protected-player";
import { CtaLink } from "@/components/landing/client-bits";

export const metadata: Metadata = { title: "Free lesson" };

export default async function PreviewPage({ params }: PageProps<"/preview/[lessonId]">) {
  const { lessonId } = await params;
  const lesson = await db.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson || !lesson.isFreePreview || !lesson.published) notFound();
  const { provider, ref } = videoProviderFor(lesson);
  const source = await provider.getPlayback(ref);
  const entry = (await listProducts()).find((p) => p.product.kind === "COURSE_TIER");

  return (
    <main className="mx-auto max-w-3xl pb-16 sm:px-4 sm:pt-4">
      <ProtectedPlayer lessonId={lesson.id} source={source} watermark="ReelBhai Academy • Free preview" startAt={0} title={lesson.title} viewerId="anonymous" saveProgress={false} />
      <div className="px-4 sm:px-0">
        <p className="mt-4 text-xs text-gold">FREE LESSON</p>
        <h1 className="mt-1 text-xl font-semibold">{lesson.title}</h1>
        <div className="card mt-6 p-5">
          <h2 className="font-display text-2xl">Pasand aaya? Poora course unlock karo</h2>
          <p className="mt-1 text-sm text-muted">40 lessons, 300+ prompts, templates aur income module — lifetime access.</p>
          {entry && (
            <CtaLink href={`/checkout/${entry.product.slug}`} id="preview_upgrade" className="btn-gold mt-4 w-full">
              Course join karo — {formatINR(entry.price.amountPaise)} →
            </CtaLink>
          )}
        </div>
      </div>
    </main>
  );
}
