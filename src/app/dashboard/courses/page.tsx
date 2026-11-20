/** MY COURSES — every course the student owns, as cards. Each opens its own course page. */
import type { Metadata } from "next";
import { AppFrame } from "@/components/app/app-frame";
import { CourseCard } from "@/components/app/course-card";
import { EmptyState, Highlight } from "@/components/ui/basics";
import { Button } from "@/components/ui/button";
import t from "@/content/hi-Latn/student.json";
import { requireUser } from "@/server/auth";
import { getSettings, supportWhatsappHref } from "@/server/settings";
import { getMyLearning } from "@/server/student-app";

export const metadata: Metadata = { title: "My courses", robots: { index: false } };

export default async function MyCourses() {
  const user = await requireUser("/dashboard/courses");
  const [{ outlines, planName }, settings] = await Promise.all([getMyLearning(user.id), getSettings()]);
  const c = t.coursesPage;
  return (
    <AppFrame user={user} mode="student" active="courses" supportHref={supportWhatsappHref(settings)}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="type-heading text-ink">
            <Highlight text={c.title} />
          </h1>
          <p className="text-ink-muted">{c.sub}</p>
        </div>
        {outlines.length === 0 ? (
          <EmptyState
            text={c.empty}
            action={
              <Button href="/dashboard/explore" arrow>
                {c.emptyCta}
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {outlines.map((o) => (
              <CourseCard key={o.course.id} o={o} plan={planName(o)} primary />
            ))}
          </div>
        )}
      </div>
    </AppFrame>
  );
}
