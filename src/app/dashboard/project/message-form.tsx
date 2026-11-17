"use client";

import { CircleAlert } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import t from "@/content/hi-Latn/student.json";
import { sendMessageAction, type MessageState } from "./actions";

const m = t.project.messages;

export function MessageForm() {
  const [state, action, pending] = useActionState<MessageState, FormData>(sendMessageAction, { ok: false });
  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="project-message" className="font-semibold text-ink">
        {m.label}
      </label>
      <textarea
        id="project-message"
        name="body"
        rows={3}
        maxLength={2000}
        required
        // After an error the text comes back; after a successful send the box is empty again.
        key={state.ok ? "sent" : "draft"}
        defaultValue={state.ok ? "" : state.draft}
        placeholder={m.placeholder}
        aria-invalid={state.error ? true : undefined}
        className="w-full rounded-sm border border-line bg-surface-sunken px-4 py-3 text-[16px] text-ink placeholder:text-ink-muted/70 focus:border-gold"
      />
      {state.error && (
        <p role="alert" className="type-small flex items-center gap-1 text-fire">
          <CircleAlert aria-hidden className="size-4 flex-none" />
          {state.error}
        </p>
      )}
      <Button type="submit" block arrow loading={pending} className="sm:w-auto sm:self-start">
        {m.send}
      </Button>
      <p className="type-small text-ink-muted">{m.hint}</p>
    </form>
  );
}
