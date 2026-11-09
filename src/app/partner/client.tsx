"use client";

import { useActionState, useState } from "react";
import { track } from "@/lib/track";
import { updatePayoutDetailsAction, withdrawAction } from "./actions";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost min-h-10 px-3 text-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          /* old browsers */
        }
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? "✓ Copied" : label}
    </button>
  );
}

export function ShareButtons({ link, coupon }: { link: string; coupon: string | null }) {
  const msg = `AI se viral 'Bhai' reels banana seekho 🦁 Phone se, free tools se.${coupon ? ` Coupon ${coupon} se discount milega.` : ""} 👉 ${link}`;
  return (
    <div className="flex flex-wrap gap-2">
      <a className="btn-ghost min-h-10 px-3 text-sm" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener" onClick={() => track("share_click", { to: "whatsapp" })}>
        WhatsApp pe share
      </a>
      <button
        type="button"
        className="btn-ghost min-h-10 px-3 text-sm"
        onClick={async () => {
          track("share_click", { to: "native" });
          if (navigator.share) await navigator.share({ text: msg }).catch(() => {});
          else await navigator.clipboard.writeText(msg).catch(() => {});
        }}
      >
        Instagram / more
      </button>
    </div>
  );
}

export function CampaignLinkBuilder({ base }: { base: string }) {
  const [c, setC] = useState("");
  const clean = c.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  const link = clean ? `${base}&c=${clean}` : base;
  return (
    <div className="space-y-2">
      <input className="field" placeholder="reel23 (har reel ka alag naam)" value={c} onChange={(e) => setC(e.target.value)} aria-label="Campaign name" />
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg bg-panel-2 px-3 py-2 text-xs">{link}</code>
        <CopyButton text={link} label="Copy" />
      </div>
    </div>
  );
}

export function WithdrawForm({ availableRupees, minRupees, tdsPct, disabledReason }: { availableRupees: number; minRupees: number; tdsPct: number; disabledReason: string | null }) {
  const [state, action, pending] = useActionState(withdrawAction, { ok: false });
  const [amt, setAmt] = useState(String(Math.max(0, Math.floor(availableRupees))));
  const n = Number(amt) || 0;
  const tds = Math.floor(n * tdsPct) / 100;
  if (state.ok) return <p className="rounded-xl border border-good/40 bg-good/10 p-3 text-sm text-good">✓ Withdrawal request bhej di. Admin approve karke pay karega — aapko email aayega.</p>;
  return (
    <form action={action} className="space-y-3">
      <div className="flex gap-2">
        <span className="field flex w-12 shrink-0 items-center justify-center px-0 text-muted">₹</span>
        <input name="amount" className="field" inputMode="numeric" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^\d]/g, ""))} aria-label="Withdrawal amount" />
      </div>
      <p className="text-xs text-muted">
        {tdsPct > 0 ? `TDS ${tdsPct}% (₹${tds.toLocaleString("en-IN")}) katega → aapko milega ₹${(n - tds).toLocaleString("en-IN")}. ` : ""}Minimum ₹{minRupees}.
      </p>
      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      {disabledReason && <p className="text-sm text-muted">{disabledReason}</p>}
      <button className="btn-gold w-full" disabled={pending || !!disabledReason || n < minRupees || n > availableRupees}>
        {pending ? "Bhej rahe hain…" : "Withdraw request bhejo"}
      </button>
    </form>
  );
}

export function PayoutDetailsForm({ initial }: { initial: { upiId: string; bankAccountName: string; bankAccountNumber: string; bankIfsc: string } }) {
  const [state, action, pending] = useActionState(updatePayoutDetailsAction, { ok: false });
  return (
    <form action={action} className="space-y-2">
      <input name="upiId" className="field" placeholder="UPI ID (name@okaxis)" defaultValue={initial.upiId} aria-label="UPI ID" />
      <p className="text-center text-xs text-muted">ya bank account</p>
      <input name="bankAccountName" className="field" placeholder="Account holder name" defaultValue={initial.bankAccountName} aria-label="Account holder name" />
      <input name="bankAccountNumber" className="field" placeholder="Account number" inputMode="numeric" defaultValue={initial.bankAccountNumber} aria-label="Account number" />
      <input name="bankIfsc" className="field uppercase" placeholder="IFSC" defaultValue={initial.bankIfsc} aria-label="IFSC" />
      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      {state.ok && <p className="text-sm text-good">✓ Save ho gaya. Security ke liye agle 24 ghante withdrawal band rahega.</p>}
      <button className="btn-ghost w-full" disabled={pending}>
        Save payout details
      </button>
    </form>
  );
}
