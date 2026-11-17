"use client";

// Browser-side pieces of the lesson page: the player, the "Mark complete" toggle and the lesson-list drawer.
import { Check, CircleCheck, List } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { ProtectedPlayer } from "@/components/player/protected-player";
import { Button } from "@/components/ui/button";
import { BottomSheet, toast, ToastRegion } from "@/components/ui/interactive";
import t from "@/content/hi-Latn/student.json";
import { cn } from "@/lib/cn";
import { setLessonCompleteAction } from "./actions";

type PlayerProps = React.ComponentProps<typeof ProtectedPlayer>;

/**
 * Video (sticks to the top of the phone screen while you scroll the notes) +
 * a row with the "Mark complete" toggle and the next-lesson button.
 */
export function LessonPlayer({ nextHref, initialCompleted, header, ...player }: PlayerProps & { nextHref: string | null; initialCompleted: boolean; header: ReactNode }) {
  const router = useRouter();
  const [done, setDone] = useState(initialCompleted);
  const [justFinished, setJustFinished] = useState(false);
  const [pending, start] = useTransition();

  function toggle() {
    const want = !done;
    start(async () => {
      const r = await setLessonCompleteAction(player.lessonId, want);
      if (!r.ok) {
        toast.error(t.lesson.markError);
        return;
      }
      setDone(want);
      setJustFinished(want);
      router.refresh(); // update ticks + progress in the lesson list
    });
  }

  return (
    <>
      <ToastRegion />
      <div className="sticky top-0 z-20 bg-surface lg:static">
        <ProtectedPlayer
          {...player}
          onComplete={() => {
            setDone(true);
            setJustFinished(true);
            router.refresh();
          }}
        />
      </div>
      <div className="flex flex-col gap-4 px-4 pt-4 md:px-0">
        {header}
        {justFinished && (
          <p role="status" className="flex items-center gap-2 rounded-md border border-success bg-surface-raised p-3 text-success animate-fade-up">
            <CircleCheck aria-hidden className="size-5 flex-none" />
            {t.lesson.doneBanner}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={toggle}
            disabled={pending}
            aria-pressed={done}
            className={cn(
              "type-button inline-flex min-h-12 items-center justify-center gap-2 rounded-md border-2 px-6 transition-colors duration-150 active:scale-[.98] disabled:opacity-60",
              done ? "border-success text-success" : "border-ink text-ink hover:border-gold-text hover:text-gold-text",
            )}
          >
            <span aria-hidden className={cn("grid size-5 place-items-center rounded-sm border-2", done ? "border-success" : "border-ink-muted")}>
              {done && <Check className="size-4" strokeWidth={3} />}
            </span>
            {done ? t.lesson.completed : t.lesson.markComplete}
          </button>
          <Button href={nextHref ?? "/dashboard"} arrow className="sm:flex-1" data-cta={nextHref ? "lesson_next" : "lesson_to_dashboard"}>
            {nextHref ? t.lesson.next : t.lesson.toDashboard}
          </Button>
        </div>
      </div>
    </>
  );
}

/** Phones: a button that opens the full lesson list in a bottom sheet. (Desktop shows the list in a side column.) */
export function LessonDrawer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <Button variant="secondary" block onClick={() => setOpen(true)}>
        <span className="inline-flex items-center gap-2">
          <List aria-hidden className="size-5" />
          {t.lesson.allLessons}
        </span>
      </Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={t.lesson.outlineTitle}>
        {children}
      </BottomSheet>
    </div>
  );
}
