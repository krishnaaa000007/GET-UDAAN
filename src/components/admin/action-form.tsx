"use client";

import { useActionState } from "react";

type Result = { ok: boolean; error?: string };

/** A form bound to a server action that returns {ok, error}; shows the result inline. */
export function ActionForm({
  action,
  children,
  className = "",
  success = "Saved ✓",
}: {
  action: (prev: Result, form: FormData) => Promise<Result>;
  children: React.ReactNode;
  className?: string;
  success?: string;
}) {
  const [state, run, pending] = useActionState(action, { ok: false });
  return (
    <form action={run} className={className}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state.error && <p className="mt-2 text-sm text-fire">{state.error}</p>}
      {state.ok && !pending && <p className="mt-2 text-sm text-success">{success}</p>}
    </form>
  );
}
