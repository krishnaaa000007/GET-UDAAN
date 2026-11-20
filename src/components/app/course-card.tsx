/** A course the student owns: progress ring, tier, lessons done, and one button. Used on Home and My Courses. */
import { Badge, SpeedTrails } from "@/components/ui/basics";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/ui/data";
import t from "@/content/hi-Latn/student.json";
import type { Outline } from "@/server/student-app";

/** `primary`: gold button for an in-progress course (only where nothing else on screen is gold). */
export function CourseCard({ o, plan, primary = false }: { o: Outline; plan: string; primary?: boolean }) {
  const h = t.home;
  const c = t.coursesPage;
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface-raised">
      <div aria-hidden className="relative flex h-24 items-end bg-gradient-to-br from-gold-soft to-surface-sunken p-4">
        <SpeedTrails className="absolute top-4 right-4 h-6 w-7 opacity-70" />
        {plan && <Badge tone="solid">{plan}</Badge>}
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-4">
          <ProgressRing value={o.percent} size={56} />
          <div className="flex min-w-0 flex-col">
            <h3 className="type-title text-ink">{o.course.title}</h3>
            <p className="type-small text-ink-muted">
              {c.lessons.replace("{done}", String(o.doneCount)).replace("{total}", String(o.lessons.length))} • {c.modules.replace("{n}", String(o.modules.length))}
            </p>
          </div>
        </div>
        <Button href={`/dashboard/courses/${o.course.slug}`} variant={primary && o.percent > 0 && o.percent < 100 ? "primary" : "secondary"} block arrow className="mt-auto">
          {o.percent > 0 && o.percent < 100 ? h.continueCourse : h.open}
        </Button>
      </div>
    </article>
  );
}
