/** Course access, lesson playback and progress. Access is checked here on EVERY call. */
import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { hashIp } from "@/lib/crypto";
import { maskEmail, maskPhone } from "@/lib/mask";
import { TIER_RANK } from "@/server/catalog";
import { videoProviderFor, type PlaybackSource } from "@/server/video/provider";
import { signedDownloadUrl } from "@/server/storage";
import type { Tier } from "@/generated/prisma/enums";

export function tierAllows(enrolled: Tier | null | undefined, required: Tier): boolean {
  return !!enrolled && TIER_RANK[enrolled] >= TIER_RANK[required];
}

export async function getActiveEnrollment(userId: string, courseId: string) {
  const e = await db.enrollment.findUnique({ where: { userId_courseId: { userId, courseId } } });
  return e && !e.revokedAt ? e : null;
}

/** Full course outline + per-lesson lock state + progress for one student. */
export async function getCourseOutline(courseSlug: string, userId: string | null) {
  const course = await db.course.findUnique({
    where: { slug: courseSlug },
    include: {
      modules: {
        orderBy: { position: "asc" },
        include: { lessons: { where: { published: true }, orderBy: { position: "asc" }, include: { assets: true } } },
      },
      assets: { where: { lessonId: null } },
    },
  });
  if (!course) return null;
  const enrollment = userId ? await getActiveEnrollment(userId, course.id) : null;
  const progress = userId
    ? await db.lessonProgress.findMany({ where: { userId, lesson: { module: { courseId: course.id } } } })
    : [];
  const byLesson = new Map(progress.map((p) => [p.lessonId, p]));

  const modules = course.modules.map((m) => ({
    ...m,
    lessons: m.lessons.map((l) => ({
      ...l,
      unlocked: l.isFreePreview || tierAllows(enrollment?.tier, m.minTier),
      completed: !!byLesson.get(l.id)?.completedAt,
      positionSec: byLesson.get(l.id)?.positionSec ?? 0,
    })),
  }));
  const all = modules.flatMap((m) => m.lessons);
  const done = all.filter((l) => l.completed).length;
  return { course, enrollment, modules, lessons: all, percent: all.length ? Math.round((done / all.length) * 100) : 0, doneCount: done };
}

export type LessonView = {
  lesson: { id: string; title: string; body: string | null; durationSec: number; upsellProductSlug: string | null };
  playback: PlaybackSource;
  watermark: string;
  startAt: number;
};

/** Returns playback ONLY if the user may watch this lesson; logs a playback event for abuse detection. */
export async function getLessonForPlayback(lessonId: string, user: { id: string; email: string; phone: string | null; sessionId: string }): Promise<LessonView | null> {
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, include: { module: true } });
  if (!lesson || !lesson.published) return null;
  if (!lesson.isFreePreview) {
    const e = await getActiveEnrollment(user.id, lesson.module.courseId);
    if (!tierAllows(e?.tier, lesson.module.minTier)) return null;
  }
  const { provider, ref } = videoProviderFor(lesson);
  const playback = await provider.getPlayback(ref);
  const progress = await db.lessonProgress.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId } } });

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await db.playbackEvent.create({
    data: { userId: user.id, lessonId, sessionId: user.sessionId, event: "start", positionSec: progress?.positionSec ?? 0, ipHash: hashIp(ip), city: decodeURIComponent(h.get("x-vercel-ip-city") ?? "") || null },
  });

  return {
    lesson: { id: lesson.id, title: lesson.title, body: lesson.body, durationSec: lesson.durationSec, upsellProductSlug: lesson.upsellProductSlug },
    playback,
    watermark: user.phone ? maskPhone(user.phone) : maskEmail(user.email),
    startAt: progress?.completedAt ? 0 : (progress?.positionSec ?? 0),
  };
}

/** Save playback position. Marks complete at 90% watched. */
export async function saveProgress(userId: string, lessonId: string, positionSec: number, durationSec: number) {
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, include: { module: true } });
  if (!lesson) return { ok: false as const };
  if (!lesson.isFreePreview) {
    const e = await getActiveEnrollment(userId, lesson.module.courseId);
    if (!tierAllows(e?.tier, lesson.module.minTier)) return { ok: false as const };
  }
  const pos = Math.max(0, Math.min(Math.floor(positionSec), 60 * 60 * 5));
  const dur = durationSec > 0 ? durationSec : lesson.durationSec;
  const complete = dur > 0 && pos >= dur * 0.9;
  const existing = await db.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } });
  const newlyCompleted = complete && !existing?.completedAt;
  await db.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId, positionSec: pos, completedAt: complete ? new Date() : null },
    update: { positionSec: pos, ...(newlyCompleted ? { completedAt: new Date() } : {}) },
  });
  if (newlyCompleted) {
    await db.funnelEvent.create({ data: { name: "lesson_completed", userId, props: { lessonId } } });
  }
  return { ok: true as const, completed: complete, newlyCompleted };
}

export async function getAssetDownloadUrl(assetId: string, userId: string): Promise<string | null> {
  const asset = await db.asset.findUnique({ where: { id: assetId }, include: { lesson: { include: { module: true } } } });
  if (!asset) return null;
  const courseId = asset.courseId ?? asset.lesson?.module.courseId;
  if (!courseId) return null;
  const e = await getActiveEnrollment(userId, courseId);
  if (!tierAllows(e?.tier, asset.minTier)) return null;
  const ext = asset.storageKey.split(".").pop();
  return signedDownloadUrl(asset.storageKey, `${asset.title}.${ext}`);
}
