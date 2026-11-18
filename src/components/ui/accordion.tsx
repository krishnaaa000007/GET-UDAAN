// Accordion + CurriculumModule. Built on the browser's own <details> element:
// works without JavaScript, keyboard-friendly, and very light for slow phones.
import Link from "next/link";
import { Check, Lock, Play, Plus } from "lucide-react";
import type { ReactNode } from "react";
import ui from "@/content/hi-Latn/ui.json";
import { cn } from "@/lib/cn";
import { Badge } from "./basics";

export function Accordion({ children, className }: { children: ReactNode; className?: string }) {
  // Rows separated by 1px lines (brief §5.7). Put it inside a raised panel when it needs a background.
  return <div className={cn("flex flex-col border-t border-line", className)}>{children}</div>;
}

/**
 * One row. Give all rows the same `group` name to allow only one open at a time.
 */
export function AccordionItem({
  title,
  meta,
  children,
  group,
  defaultOpen = false,
  className,
}: {
  title: ReactNode;
  /** Small muted text under the title, e.g. "8 lessons • 64 min" */
  meta?: ReactNode;
  children: ReactNode;
  group?: string;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details name={group} open={defaultOpen} className={cn("accordion-item group border-b border-line", className)}>
      <summary className="flex min-h-16 cursor-pointer items-center justify-between gap-4 rounded-sm px-1 py-4 md:px-2">
        <span className="flex flex-col">
          <span className="font-semibold text-ink">{title}</span>
          {meta && <span className="type-small text-ink-muted">{meta}</span>}
        </span>
        {/* plus turns into an × when open */}
        <Plus aria-hidden className="size-5 flex-none text-ink-muted transition-transform duration-250 ease-(--ease-out) group-open:rotate-45 group-open:text-gold-text" />
      </summary>
      <div className="type-body-s px-1 pb-5 text-ink-muted md:px-2">{children}</div>
    </details>
  );
}

export type CurriculumLesson = {
  title: string;
  minutes?: number;
  /** play = can watch · done = finished (green tick) · locked = buy first · free = free preview */
  state: "play" | "locked" | "free" | "done";
  /** Highlights the lesson being watched right now */
  current?: boolean;
  href?: string;
};

export function CurriculumModule({ title, lessons, group, defaultOpen }: { title: string; lessons: CurriculumLesson[]; group?: string; defaultOpen?: boolean }) {
  const total = lessons.reduce((sum, l) => sum + (l.minutes ?? 0), 0);
  const meta = `${lessons.length} ${ui.curriculum.lessons}${total ? ` • ${total} ${ui.curriculum.min}` : ""}`;
  return (
    <AccordionItem title={title} meta={meta} group={group} defaultOpen={defaultOpen}>
      <ul className="flex flex-col">
        {lessons.map((l) => {
          const row = (
            <>
              {l.state === "locked" ? (
                <Lock aria-hidden className="size-5 flex-none text-ink-muted" />
              ) : l.state === "done" ? (
                <Check aria-hidden className="size-5 flex-none text-success" strokeWidth={2.5} />
              ) : (
                <Play aria-hidden className="size-5 flex-none text-gold-text" />
              )}
              <span className={cn("flex-1", l.state === "locked" ? "text-ink-muted" : l.current ? "font-semibold text-gold-text" : "text-ink")}>{l.title}</span>
              {l.state === "done" && <span className="sr-only">{ui.curriculum.done}</span>}
              {l.state === "locked" && <span className="sr-only">{ui.curriculum.locked}</span>}
              {l.state === "free" && <Badge tone="fire">{ui.curriculum.freePreview}</Badge>}
              {l.minutes ? (
                <span className="type-small flex-none rounded-pill bg-surface-sunken px-2.5 py-1 text-ink-muted tabular-nums">
                  {l.minutes} {ui.curriculum.min}
                </span>
              ) : null}
            </>
          );
          const cls = "flex min-h-12 items-center gap-3 border-t border-line py-2";
          return (
            <li key={l.title}>
              {l.href && l.state !== "locked" ? (
                <Link href={l.href} aria-current={l.current ? "page" : undefined} className={cn(cls, "rounded-sm")}>
                  {row}
                </Link>
              ) : (
                <div className={cls}>{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </AccordionItem>
  );
}
