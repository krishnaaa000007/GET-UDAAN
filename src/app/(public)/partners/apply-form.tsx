"use client";

import { useActionState } from "react";
import { applyAction } from "./actions";

const Field = ({ label, ...p }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label className="block">
    <span className="mb-1 block text-sm text-muted">{label}</span>
    <input className="field" {...p} />
  </label>
);

export function ApplyForm() {
  const [state, action, pending] = useActionState(applyAction, { ok: false });
  if (state.ok)
    return (
      <div className="rounded-xl border border-good/40 bg-good/10 p-5 text-center">
        <p className="text-2xl">✅</p>
        <p className="mt-2 font-semibold">Application mil gayi!</p>
        <p className="mt-1 text-sm text-muted">Review ke baad aapko email aayega. Approve hone pe isi email se login karke dashboard dekh sakte hain.</p>
      </div>
    );
  return (
    <form action={action} className="space-y-3">
      <Field label="Naam" name="name" required autoComplete="name" />
      <Field label="Email" name="email" type="email" required autoComplete="email" inputMode="email" />
      <Field label="WhatsApp number" name="phone" required inputMode="numeric" autoComplete="tel-national" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Instagram handle" name="instagramHandle" required placeholder="@yourpage" />
        <Field label="Followers" name="followers" required inputMode="numeric" placeholder="50000" />
      </div>
      <Field label="Niche (optional)" name="niche" placeholder="AI animal / action reels" />
      <details className="rounded-xl border border-line p-3">
        <summary className="cursor-pointer text-sm font-semibold">Payout details (abhi ya baad mein)</summary>
        <div className="mt-3 space-y-3">
          <Field label="UPI ID" name="upiId" placeholder="name@okaxis" />
          <p className="text-center text-xs text-muted">ya bank account</p>
          <Field label="Account holder name" name="bankAccountName" />
          <Field label="Account number" name="bankAccountNumber" inputMode="numeric" />
          <Field label="IFSC" name="bankIfsc" placeholder="SBIN0001234" />
        </div>
      </details>
      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      <button className="btn-gold w-full" disabled={pending}>
        {pending ? "Bhej rahe hain…" : "Application bhejo"}
      </button>
    </form>
  );
}
