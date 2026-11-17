"use client";

// Browser-side pieces of the partner dashboard: quick actions, count-up, new-sale banner,
// campaign link builder, promo captions, withdraw and payout forms.
import { Copy, Link2, MessageCircle, Share2, Ticket } from "lucide-react";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { toast, ToastRegion } from "@/components/ui/interactive";
import t from "@/content/hi-Latn/partner.json";
import { track } from "@/lib/track";
import { updatePayoutDetailsAction, withdrawAction } from "./actions";

const d = t.dashboard;
const inr = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

async function copy(text: string, okMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(okMessage);
  } catch {
    toast.error(d.actions.copyFailed);
  }
}

/** Sticky row on phones: Copy Link (the ONE gold button) · Copy Coupon · WhatsApp · Instagram. */
export function QuickActions({ link, coupon }: { link: string; coupon: string | null }) {
  const a = d.actions;
  const message = a.shareMessage.replace("{coupon}", coupon ? a.shareCoupon.replace("{code}", coupon) : "").replace("{link}", link);
  // Three equal tiles: icon on top, short label below — fits a 360px phone.
  const tile = "type-small flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md border-2 border-ink px-2 font-semibold text-ink transition-colors duration-150 hover:border-gold-text hover:text-gold-text active:scale-[.98]";
  return (
    <>
      <ToastRegion />
      <div role="group" aria-label={a.label} className="sticky top-16 z-20 -mx-4 flex flex-col gap-2 border-b border-line bg-surface px-4 py-3 md:static md:mx-0 md:border-0 md:p-0">
        <Button block arrow={false} onClick={() => copy(link, a.linkCopied)}>
          <span className="inline-flex items-center gap-2">
            <Link2 aria-hidden className="size-5" />
            {a.copyLink}
          </span>
        </Button>
        <div className={coupon ? "grid grid-cols-3 gap-2" : "grid grid-cols-2 gap-2"}>
          {coupon && (
            <button type="button" onClick={() => copy(coupon, a.couponCopied)} className={tile}>
              <Ticket aria-hidden className="size-5" />
              <span className="sr-only">{a.copyCoupon}</span>
              <span aria-hidden className="max-w-full truncate">{coupon}</span>
            </button>
          )}
          <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener" onClick={() => track("share_click", { to: "whatsapp" })} className={tile}>
            <MessageCircle aria-hidden className="size-5" />
            {a.whatsapp}
          </a>
          <button
            type="button"
            onClick={async () => {
              track("share_click", { to: "native" });
              // Phones open the share sheet (Instagram is in it); computers copy the message instead.
              if (navigator.share) await navigator.share({ text: message }).catch(() => {});
              else await copy(message, a.captionCopied);
            }}
            className={tile}
          >
            <Share2 aria-hidden className="size-5" />
            {a.instagram}
          </button>
        </div>
      </div>
    </>
  );
}

/** Big number that counts up once when the page opens (no animation if "reduce motion" is on). */
export function CountUp({ paise }: { paise: number }) {
  const [shown, setShown] = useState(paise);
  useEffect(() => {
    if (paise <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      setShown(Math.round(paise * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paise]);
  return <span className="tabular-nums">{inr(shown)}</span>;
}

/** "🎉 2 nayi sales! +₹998" — only for sales that arrived since this partner's last visit on this device. */
export function NewSalesBanner({ partnerId, sales }: { partnerId: string; sales: Array<{ paidAt: string; amountPaise: number }> }) {
  const [fresh, setFresh] = useState<{ n: number; amount: number } | null>(null);
  useEffect(() => {
    const key = `gu_partner_seen_${partnerId}`;
    let last = 0;
    try {
      last = Number(localStorage.getItem(key)) || 0;
      localStorage.setItem(key, String(Date.now()));
    } catch {
      return;
    }
    if (!last) return; // first visit on this device: nothing to compare with
    const news = sales.filter((s) => new Date(s.paidAt).getTime() > last);
    const timer = setTimeout(() => setFresh(news.length ? { n: news.length, amount: news.reduce((sum, s) => sum + s.amountPaise, 0) } : null), 0);
    return () => clearTimeout(timer);
  }, [partnerId, sales]);
  if (!fresh) return null;
  return (
    <p role="status" className="type-title rounded-md bg-gold-soft p-4 text-gold-text animate-fade-up">
      {(fresh.n === 1 ? d.newSale : d.newSales).replace("{n}", String(fresh.n)).replace("{amount}", inr(fresh.amount))}
    </p>
  );
}

export function CampaignLinkBuilder({ base }: { base: string }) {
  const [name, setName] = useState("");
  const clean = name.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  const link = clean ? `${base}&c=${clean}` : base;
  const c = d.campaigns;
  return (
    <div className="flex flex-col gap-3">
      <Input label={c.builder} hint={c.builderHint} placeholder={c.builderPlaceholder} value={name} onChange={(e) => setName(e.target.value)} autoCapitalize="none" />
      <div className="flex items-center gap-2">
        <code className="type-small min-w-0 flex-1 truncate rounded-sm bg-surface-sunken px-3 py-3 text-ink">{link}</code>
        <Button variant="secondary" size="sm" onClick={() => copy(link, d.actions.linkCopied)}>
          {c.copy}
        </Button>
      </div>
    </div>
  );
}

/** One caption / hook with a Copy button. */
export function CopyLine({ text }: { text: string }) {
  return (
    <li className="flex flex-col rounded-sm border border-line bg-surface-sunken px-4 pt-2 sm:flex-row sm:items-start sm:gap-3 sm:pr-2 sm:pb-2">
      <p className="flex-1 py-2 text-ink select-all">{text}</p>
      <button type="button" onClick={() => copy(text, d.actions.captionCopied)} className="type-small inline-flex min-h-12 flex-none items-center gap-1 self-end rounded-sm px-3 font-semibold text-gold-text sm:self-start">
        <Copy aria-hidden className="size-5" />
        {d.promo.copy}
      </button>
    </li>
  );
}

function FormNote({ tone, children }: { tone: "error" | "ok" | "muted"; children: ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`type-small ${tone === "error" ? "text-fire" : tone === "ok" ? "text-success" : "text-ink-muted"}`}>
      {children}
    </p>
  );
}

export function WithdrawForm({ availableRupees, minRupees, tdsPct, disabledReason }: { availableRupees: number; minRupees: number; tdsPct: number; disabledReason: string | null }) {
  const [state, action, pending] = useActionState(withdrawAction, { ok: false });
  const [amt, setAmt] = useState(String(Math.max(0, Math.floor(availableRupees))));
  const w = d.withdraw;
  const n = Number(amt) || 0;
  const tds = Math.floor(n * tdsPct) / 100;
  const rupees = (v: number) => `₹${v.toLocaleString("en-IN")}`;
  if (state.ok) return <FormNote tone="ok">{w.sent}</FormNote>;
  return (
    <form action={action} className="flex flex-col gap-3">
      <Input
        label={w.amount}
        name="amount"
        inputMode="numeric"
        value={amt}
        onChange={(e) => setAmt(e.target.value.replace(/[^\d]/g, ""))}
        hint={`${tdsPct > 0 ? `${w.tds.replace("{pct}", String(tdsPct)).replace("{tds}", rupees(tds)).replace("{net}", rupees(n - tds))} ` : ""}${w.min.replace("{min}", rupees(minRupees))}`}
        error={state.error}
      />
      {disabledReason && <FormNote tone="muted">{disabledReason}</FormNote>}
      <Button type="submit" variant="secondary" block loading={pending} disabled={!!disabledReason || n < minRupees || n > availableRupees}>
        {w.cta}
      </Button>
    </form>
  );
}

export function PayoutDetailsForm({ initial }: { initial: { upiId: string; bankAccountName: string; bankAccountNumber: string; bankIfsc: string } }) {
  const [state, action, pending] = useActionState(updatePayoutDetailsAction, { ok: false });
  // Controlled fields, so what the partner typed stays put if the server finds a mistake.
  const [v, setV] = useState(initial);
  const p = d.payoutDetails;
  const set = (k: keyof typeof initial) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form action={action} className="flex flex-col gap-3">
      <Input label={p.upi} name="upiId" placeholder="name@okaxis" autoCapitalize="none" value={v.upiId} onChange={set("upiId")} />
      <p className="type-small text-center text-ink-muted">{p.or}</p>
      <Input label={p.bankName} name="bankAccountName" value={v.bankAccountName} onChange={set("bankAccountName")} />
      <Input label={p.bankNumber} name="bankAccountNumber" inputMode="numeric" value={v.bankAccountNumber} onChange={set("bankAccountNumber")} />
      <Input label={p.bankIfsc} name="bankIfsc" autoCapitalize="characters" value={v.bankIfsc} onChange={set("bankIfsc")} />
      {state.error && <FormNote tone="error">{state.error}</FormNote>}
      {state.ok && <FormNote tone="ok">{p.saved}</FormNote>}
      <Button type="submit" variant="secondary" block loading={pending}>
        {p.save}
      </Button>
    </form>
  );
}
