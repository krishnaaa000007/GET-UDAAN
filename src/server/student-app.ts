/**
 * Data for the student app (Home, My Courses, Explore, Profile). Everything is for ONE logged-in user.
 * Built for many courses: every published course + every active product shows up automatically.
 */
import "server-only";
import { db } from "@/lib/db";
import { listProducts } from "@/server/catalog";
import { getCourseOutline, getLearningStreak, tierAllows } from "@/server/learning";

export type Outline = NonNullable<Awaited<ReturnType<typeof getCourseOutline>>>;

/** Courses the user can open (active enrolments), with progress, plus the lesson to continue. */
export async function getMyLearning(userId: string) {
  const enrollments = await db.enrollment.findMany({ where: { userId, revokedAt: null }, include: { course: true }, orderBy: { createdAt: "asc" } });
  const outlines = (await Promise.all(enrollments.map((e) => getCourseOutline(e.course.slug, userId)))).filter((o): o is Outline => o !== null);
  const [streak, lastProgress, certificates] = await Promise.all([
    getLearningStreak(userId),
    db.lessonProgress.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" }, include: { lesson: { include: { module: true } } } }),
    Promise.resolve(outlines.filter((o) => o.percent >= 100).length),
  ]);

  // "Continue": the lesson you were on, else the next unfinished one in your first course.
  let cont: { href: string; title: string; course: string; lessonPct: number; started: boolean } | null = null;
  const ordered = lastProgress ? [...outlines].sort((a, b) => Number(b.course.id === lastProgress.lesson.module.courseId) - Number(a.course.id === lastProgress.lesson.module.courseId)) : outlines;
  for (const o of ordered) {
    const resume =
      lastProgress && lastProgress.lesson.module.courseId === o.course.id && !lastProgress.completedAt
        ? o.lessons.find((l) => l.id === lastProgress.lessonId)
        : o.lessons.find((l) => l.unlocked && !l.completed);
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

  const lessonsDone = outlines.reduce((s, o) => s + o.doneCount, 0);
  const lessonsTotal = outlines.reduce((s, o) => s + o.lessons.length, 0);
  return { outlines, cont, streak, certificates, lessonsDone, lessonsTotal };
}

/**
 * Everything Get Udaan sells, marked for this user: owned, upgrade (same course, higher tier), or new.
 * Order bumps (ADDON) are left out — they are sold inside checkout only.
 */
export async function getCatalogFor(userId: string) {
  const [products, enrollments, project] = await Promise.all([
    listProducts(),
    db.enrollment.findMany({ where: { userId, revokedAt: null }, select: { courseId: true, tier: true } }),
    db.serviceProject.findFirst({ where: { userId }, select: { id: true } }),
  ]);
  const tierOf = new Map(enrollments.map((e) => [e.courseId, e.tier]));
  return products
    .filter((p) => p.product.kind !== "ADDON")
    .map((p) => {
      const pr = p.product;
      let state: "owned" | "upgrade" | "new" = "new";
      if (pr.kind === "SERVICE") state = project ? "owned" : "new";
      else if (pr.courseId && pr.tier) {
        const have = tierOf.get(pr.courseId);
        state = have && tierAllows(have, pr.tier) ? "owned" : have ? "upgrade" : "new";
      }
      return {
        slug: pr.slug,
        name: pr.name,
        tagline: pr.tagline,
        kind: pr.kind,
        features: (Array.isArray(pr.features) ? pr.features : []) as string[],
        pricePaise: p.price.amountPaise,
        href: pr.kind === "SERVICE" ? "/done-with-you" : `/checkout/${pr.slug}`,
        state,
      };
    });
}

export type CatalogItem = Awaited<ReturnType<typeof getCatalogFor>>[number];

/** The one "next step" we suggest on Home: an upgrade, then a new course/service, else the partner programme. */
export function nextStep(catalog: CatalogItem[], isPartner: boolean): { kind: "buy"; item: CatalogItem } | { kind: "partner" } | null {
  const upgrade = catalog.find((c) => c.state === "upgrade" && c.kind === "COURSE_TIER");
  if (upgrade) return { kind: "buy", item: upgrade };
  const fresh = catalog.find((c) => c.state === "new");
  if (fresh) return { kind: "buy", item: fresh };
  return isPartner ? null : { kind: "partner" };
}
