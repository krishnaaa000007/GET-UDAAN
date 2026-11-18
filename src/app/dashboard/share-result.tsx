"use client";

import { CircleCheck } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/form";
import t from "@/content/hi-Latn/student.json";
import { cn } from "@/lib/cn";
import { shareResultAction, type ShareResultState } from "./actions";

const s = t.dashboard.shareResult;

/** "Share your result" card on the dashboard. Opens only when the student taps it, so it never gets in the way of learning. */
export function ShareResult({ alreadySent }: { alreadySent: boolean }) {
  const [state, action, pending] = useActionState<ShareResultState, FormData>(shareResultAction, null);
  const sent = alreadySent || state?.ok === true;
  const err = state && !state.ok ? state.errors : {};
  const v = state && !state.ok ? state.values : null;

  if (sent)
    return (
      <p role="status" className="flex items-start gap-2 rounded-md border border-line bg-surface-raised p-4 text-success">
        <CircleCheck aria-hidden className="mt-0.5 size-5 flex-none" />
        {s.thanks}
      </p>
    );

  return (
    <details open={state ? true : undefined} className="accordion-item group rounded-md border border-line bg-surface-raised">
      <summary className="flex min-h-14 cursor-pointer flex-col justify-center gap-1 rounded-md px-4 py-3">
        <span className="type-title text-ink">{s.title}</span>
        <span className="type-small text-ink-muted">{s.text}</span>
      </summary>
      <form action={action} noValidate className="flex flex-col gap-4 px-4 pb-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="share-quote" className="font-semibold text-ink">
            {s.quote}
          </label>
          <textarea
            id="share-quote"
            name="quote"
            rows={4}
            required
            maxLength={400}
            defaultValue={v?.quote}
            placeholder={s.quotePlaceholder}
            aria-invalid={err.quote ? true : undefined}
            className={cn("w-full rounded-input border bg-surface-raised-2 px-4 py-3 text-[16px] text-ink placeholder:text-ink-muted focus:border-gold", err.quote ? "border-fire" : "border-line")}
          />
          {err.quote && (
            <p role="alert" className="type-small text-fire">
              {err.quote}
            </p>
          )}
        </div>
        <Input label={s.result} name="result" maxLength={80} defaultValue={v?.result} placeholder={s.resultPlaceholder} hint={s.resultHint} />
        <Input label={s.city} name="city" maxLength={40} autoComplete="address-level2" defaultValue={v?.city} />
        <Input label={s.link} name="link" type="url" inputMode="url" defaultValue={v?.link} error={err.link} />
        <div>
          <Checkbox name="consent" label={s.consent} />
          {err.consent && (
            <p role="alert" className="type-small text-fire">
              {err.consent}
            </p>
          )}
        </div>
        {err.form && (
          <p role="alert" className="type-small text-fire">
            {err.form}
          </p>
        )}
        <Button type="submit" variant="secondary" block loading={pending}>
          {s.cta}
        </Button>
      </form>
    </details>
  );
}
