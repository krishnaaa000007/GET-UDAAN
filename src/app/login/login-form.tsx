"use client";

import { useActionState, useState } from "react";
import { sendCodeAction, verifyCodeAction } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [sent, sendAction, sending] = useActionState(sendCodeAction, { ok: false });
  const [verify, verifyAction, verifying] = useActionState(verifyCodeAction, { ok: false });
  const [editEmail, setEditEmail] = useState(false);
  const step = sent.ok && !editEmail ? "code" : "email";

  if (step === "email") {
    return (
      <form action={(f) => { setEditEmail(false); sendAction(f); }} className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink-muted">Email address</span>
          <input name="email" type="email" inputMode="email" autoComplete="email" required className="field" placeholder="aap@gmail.com" defaultValue={sent.email} />
        </label>
        {sent.error && <p className="text-sm text-fire">{sent.error}</p>}
        <button className="btn-gold w-full" disabled={sending}>
          {sending ? "Bhej rahe hain…" : "Login code bhejo"}
        </button>
        <p className="text-center text-xs text-ink-muted">Password ki zarurat nahi — hum aapke email pe 6 digit ka code bhejenge.</p>
      </form>
    );
  }

  return (
    <form action={verifyAction} className="space-y-4">
      <input type="hidden" name="email" value={sent.email} />
      <input type="hidden" name="next" value={next} />
      <p className="text-sm text-ink-muted">
        Code bheja gaya: <b className="text-ink">{sent.email}</b>{" "}
        <button type="button" className="text-gold-text underline" onClick={() => setEditEmail(true)}>
          badlein
        </button>
      </p>
      <label className="block">
        <span className="mb-1.5 block text-sm text-ink-muted">6 digit code</span>
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          autoFocus
          className="field text-center text-2xl tracking-[0.5em]"
          placeholder="••••••"
        />
      </label>
      {verify.error && <p className="text-sm text-fire">{verify.error}</p>}
      <button className="btn-gold w-full" disabled={verifying}>
        {verifying ? "Check kar rahe hain…" : "Login karein"}
      </button>
      <p className="text-center text-xs text-ink-muted">Email nahi dikha? Spam/Promotions folder check karein.</p>
    </form>
  );
}
