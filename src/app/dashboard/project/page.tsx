/**
 * DONE-WITH-YOU CLIENT TRACKER (DESIGN.md 7.8) — feels like an order tracker.
 * ONE action: message the team. Order: where am I (stage stepper with files) → talk to the team.
 */
import type { Metadata } from "next";
import { Check, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge, EmptyState, Highlight, SpeedTrails } from "@/components/ui/basics";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/data";
import t from "@/content/hi-Latn/student.json";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { formatIST } from "@/lib/time";
import { requireUser } from "@/server/auth";
import { getClientProject, SERVICE_STAGES, STAGE_DONE } from "@/server/service";
import { MessageForm } from "./message-form";

export const metadata: Metadata = { title: "Project tracker", robots: { index: false } };

const p = t.project;

export default async function ProjectPage() {
  const user = await requireUser("/dashboard/project");
  const project = await getClientProject(user.id);

  if (!project)
    return (
      <AppShell user={user} studentTabs>
        <main className="container-page flex flex-col gap-6 pt-6 pb-28 md:pb-12">
          <h1 className="type-heading text-ink">
            <Highlight text={p.none.title} />
          </h1>
          <EmptyState
            text={p.none.text}
            action={
              <Button href="/done-with-you" arrow>
                {p.none.cta}
              </Button>
            }
          />
        </main>
      </AppShell>
    );

  const order = await db.order.findUnique({ where: { id: project.orderId }, select: { number: true } });
  const allDone = project.stage >= STAGE_DONE;

  return (
    <AppShell user={user} studentTabs>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-6 pb-28 md:px-6 md:pb-12">
        <header className="flex flex-col gap-2">
          <p className="type-label text-gold-text">{p.eyebrow}</p>
          <h1 className="type-heading text-ink">
            <Highlight text={p.title} />
          </h1>
          {order && <p className="type-small text-ink-muted">{p.order.replace("{number}", String(order.number))}</p>}
          <ProgressBar value={(Math.min(project.stage, STAGE_DONE) / STAGE_DONE) * 100} />
        </header>

        {allDone && (
          <p role="status" className="flex items-center gap-3 rounded-md bg-gold-soft p-4 font-semibold text-gold-text">
            <SpeedTrails className="flex-none" />
            {p.allDone}
          </p>
        )}

        {/* Stage stepper: done = green tick, current = gold, upcoming = grey. Files sit under their stage. */}
        <ol className="flex flex-col">
          {SERVICE_STAGES.map((s, i) => {
            const state = i < project.stage ? "done" : i === project.stage ? "current" : "upcoming";
            const files = project.files.filter((f) => f.stage === i);
            return (
              <li key={s.title} className="relative flex gap-4 pb-8 last:pb-0" aria-current={state === "current" ? "step" : undefined}>
                {i < SERVICE_STAGES.length - 1 && <span aria-hidden className={cn("absolute top-12 bottom-0 left-6 w-px", state === "done" ? "bg-success" : "bg-line")} />}
                <span
                  aria-hidden
                  className={cn(
                    "type-heading grid size-12 flex-none place-items-center rounded-pill border-2",
                    state === "done" && "border-success text-success",
                    state === "current" && "border-gold bg-gold-soft text-gold-text",
                    state === "upcoming" && "border-line text-ink-muted",
                  )}
                >
                  {state === "done" ? <Check className="size-6" strokeWidth={3} /> : i + 1}
                </span>
                <div className={cn("flex min-w-0 flex-1 flex-col gap-2 rounded-md p-4", state === "current" ? "border-2 border-gold bg-surface-raised" : "border border-line bg-surface-raised")}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className={cn("type-title", state === "upcoming" ? "text-ink-muted" : "text-ink")}>{s.title}</h2>
                    <Badge tone={state === "done" ? "success" : state === "current" ? "gold" : "neutral"}>{p.stages[state]}</Badge>
                  </div>
                  <p className="text-ink-muted">{s.desc}</p>
                  {files.length > 0 ? (
                    <ul className="flex flex-col gap-2 pt-1">
                      {files.map((f) => (
                        <li key={f.id}>
                          <a href={f.url} target="_blank" rel="noopener noreferrer" aria-label={p.fileOpen.replace("{title}", f.title)} className="flex min-h-12 items-center gap-3 rounded-sm border border-line bg-surface-sunken px-3 text-ink transition-colors duration-150 hover:border-gold">
                            <ExternalLink aria-hidden className="size-5 flex-none text-gold-text" />
                            <span className="min-w-0 flex-1 truncate">{f.title}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    state === "current" && <p className="type-small text-ink-muted">{p.filesNone}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {/* Message thread */}
        <section className="flex flex-col gap-4">
          <h2 className="type-heading text-ink">
            <Highlight text={p.messages.title} />
          </h2>
          {project.messages.length === 0 ? (
            <p className="text-ink-muted">{p.messages.empty}</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {project.messages.map((msg) => (
                <li key={msg.id} className={cn("flex max-w-[88%] flex-col gap-1 rounded-md p-3", msg.fromTeam ? "self-start border border-line bg-surface-raised" : "self-end bg-gold-soft")}>
                  <span className={cn("type-label", msg.fromTeam ? "text-gold-text" : "text-ink-muted")}>{msg.fromTeam ? p.messages.team : p.messages.you}</span>
                  <p className="break-words whitespace-pre-line text-ink">{msg.body}</p>
                  <span className="type-small text-ink-muted">{formatIST(msg.createdAt, "datetime")}</span>
                </li>
              ))}
            </ol>
          )}
          <MessageForm />
        </section>
      </main>
    </AppShell>
  );
}
