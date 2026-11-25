"use client";

// Small interactive "islands": ReelPlayer, StickyBuyBar, BottomSheet, Countdown,
// RecentPurchaseToast, Toast. Kept tiny on purpose — public pages must stay light on JS.
import { CircleAlert, CircleCheck, Info, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import ui from "@/content/hi-Latn/ui.json";
import { cn } from "@/lib/cn";

/* ---------- ReelPlayer ---------- */
/**
 * 9:16 reel. Shows the poster first, loads the video only when it comes on screen,
 * plays muted in a loop, pauses when scrolled away. Sound only after the user taps.
 */
export function ReelPlayer({ src, webmSrc, poster, label, className }: { src: string; webmSrc?: string; poster: string; /** What the reel shows, for screen readers */ label: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const userPaused = useRef(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !calm && !userPaused.current) v.play().catch(() => {});
        else if (!entry.isIntersecting) v.pause();
      },
      { threshold: 0.5 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  function toggle() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      v.play().catch(() => {});
    } else {
      userPaused.current = true;
      v.pause();
    }
  }

  const round = "grid size-12 place-items-center rounded-pill bg-surface/80 text-ink";
  return (
    <div className={cn("relative aspect-[9/16] w-full overflow-hidden rounded-md bg-surface-sunken", className)}>
      <video ref={ref} muted={muted} loop playsInline preload="none" poster={poster} aria-label={label} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} className="size-full object-cover">
        {webmSrc && <source src={webmSrc} type="video/webm" />}
        <source src={src} type="video/mp4" />
      </video>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-surface/80" />
      <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2">
        <button type="button" onClick={toggle} aria-label={playing ? ui.reel.pause : ui.reel.play} className={round}>
          {playing ? <Pause aria-hidden className="size-5" /> : <Play aria-hidden className="size-5" />}
        </button>
        <button type="button" onClick={() => setMuted((m) => !m)} aria-pressed={!muted} className="type-small inline-flex min-h-12 items-center gap-2 rounded-pill bg-surface/80 px-4 text-ink">
          {muted ? <VolumeX aria-hidden className="size-5" /> : <Volume2 aria-hidden className="size-5" />}
          {muted ? ui.reel.soundOn : ui.reel.soundOff}
        </button>
      </div>
    </div>
  );
}

/* ---------- StickyBuyBar ---------- */
/**
 * Mobile-only bar at the bottom. Appears after the element with id `afterId` (the hero) scrolls away,
 * hides while any element listed in `hideOnIds` (e.g. pricing, final CTA) is on screen so two gold buttons never show together,
 * and hides whenever a bottom sheet / dialog is open.
 * `cta` = a <Button pill> (primary).
 */
export function StickyBuyBar({ price, note, cta, afterId = "hero", hideOnIds }: { price: string; note: string; cta: ReactNode; afterId?: string; hideOnIds?: string[] }) {
  const hideKey = (hideOnIds ?? []).join(",");
  const [show, setShow] = useState(false);
  useEffect(() => {
    const after = document.getElementById(afterId);
    const hideOn = (hideKey ? hideKey.split(",") : []).map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (!after) return;
    let afterVisible = true;
    const hiding = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === after) afterVisible = e.isIntersecting;
        else if (e.isIntersecting) hiding.add(e.target);
        else hiding.delete(e.target);
      }
      setShow(!afterVisible && hiding.size === 0);
    });
    io.observe(after);
    hideOn.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [afterId, hideKey]);

  return (
    <div
      inert={!show}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/92 px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-md transition-transform duration-250 ease-(--ease-out) md:hidden [body:has(dialog[open])_&]:hidden",
        show ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="flex min-h-12 items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="type-price-sm text-ink">{price}</div>
          <div className="type-small truncate text-ink-muted">{note}</div>
        </div>
        {cta}
      </div>
    </div>
  );
}

/* ---------- BottomSheet ---------- */
/**
 * Mobile: slides up from the bottom. Desktop: centered modal.
 * Uses the browser's <dialog>, which traps focus and closes on ESC by itself.
 */
export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // tap on the dark backdrop
      }}
      aria-label={title}
      className="sheet fixed inset-x-0 top-auto bottom-0 m-0 w-full max-w-none rounded-t-sheet border border-line bg-surface-raised p-0 text-ink open:animate-sheet-in max-h-[88dvh] overflow-y-auto md:inset-0 md:m-auto md:max-w-md md:rounded-sheet"
    >
      <div className="relative px-4 pt-3 pb-[max(24px,env(safe-area-inset-bottom))] md:p-6">
        <div aria-hidden className="mx-auto mb-3 h-1.5 w-10 rounded-pill bg-line md:hidden" />
        <div className="flex items-start justify-between gap-3">
          <h2 className="type-title pt-2 text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label={ui.sheet.close} className="grid size-12 flex-none place-items-center rounded-pill text-ink-muted hover:text-ink">
            <X aria-hidden className="size-6" />
          </button>
        </div>
        <div className="mt-2">{children}</div>
      </div>
    </dialog>
  );
}

/* ---------- Countdown ---------- */
/**
 * Shows ONLY when a real deadline is passed in (set by admin). No deadline or deadline passed = nothing.
 * Never fake this.
 */
export function Countdown({ deadline, label = ui.countdown.label, className }: { deadline?: string | Date | null; label?: string; className?: string }) {
  const end = deadline ? new Date(deadline).getTime() : null;
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!end) return;
    const first = setTimeout(() => setNow(Date.now()), 0);
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [end]);
  if (!end || now === null || now >= end) return null;

  const s = Math.floor((end - now) / 1000);
  const parts = [
    { n: Math.floor(s / 86400), unit: ui.countdown.days },
    { n: Math.floor((s % 86400) / 3600), unit: ui.countdown.hours },
    { n: Math.floor((s % 3600) / 60), unit: ui.countdown.minutes },
    { n: s % 60, unit: ui.countdown.seconds },
  ];
  return (
    <div role="timer" className={cn("flex flex-col items-center gap-2", className)}>
      <span className="type-label text-fire">{label}</span>
      <div className="flex gap-2">
        {parts.map((p) => (
          <div key={p.unit} className="flex min-w-16 flex-col items-center rounded-md border border-line bg-surface-raised px-3 py-2 shadow-card">
            <span className="type-heading text-ink tabular-nums">{String(p.n).padStart(2, "0")}</span>
            <span className="type-label text-ink-muted">{p.unit}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- RecentPurchaseToast ---------- */
/**
 * REAL orders only. Pass real recent orders from the server (city + minutes ago) and the admin on/off setting.
 * Shows one at a time, at most one every 20 seconds, and stops forever once dismissed.
 */
export function RecentPurchaseToast({ orders, enabled, text }: { orders: Array<{ city: string; at: string }>; enabled: boolean; /** Templates with {city} and {n} */ text: { minutes: string; hours: string } }) {
  const [now, setNow] = useState<number | null>(null);
  const [index, setIndex] = useState(-1);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (!enabled || dismissed || orders.length === 0) return;
    let i = -1;
    const next = () => {
      i += 1;
      setNow(Date.now());
      setIndex(i < orders.length ? i : -1);
    };
    const first = setTimeout(next, 8000);
    const loop = setInterval(next, 20000);
    return () => {
      clearTimeout(first);
      clearInterval(loop);
    };
  }, [enabled, dismissed, orders.length]);

  const order = orders[index];
  if (!enabled || dismissed || !order || now === null) return null;
  const mins = Math.max(1, Math.round((now - new Date(order.at).getTime()) / 60000));
  const message = (mins < 60 ? text.minutes.replace("{n}", String(mins)) : text.hours.replace("{n}", String(Math.round(mins / 60)))).replace("{city}", order.city);
  return (
    <div role="status" className="fixed bottom-24 left-4 z-30 flex max-w-[calc(100vw-32px)] items-center gap-2 rounded-md border border-line bg-surface-raised py-1 pr-1 pl-4 shadow-lift animate-fade-up md:bottom-6 [body:has(dialog[open])_&]:hidden">
      <CircleCheck aria-hidden className="size-5 flex-none text-success" />
      <span className="type-small text-ink">{message}</span>
      <button type="button" onClick={() => setDismissed(true)} aria-label={ui.recentPurchase.dismiss} className="grid size-12 flex-none place-items-center text-ink-muted">
        <X aria-hidden className="size-5" />
      </button>
    </div>
  );
}

/* ---------- Toast ---------- */
type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; tone: ToastTone; text: string };

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Call from anywhere in client code: toast.success("Link copy ho gaya") */
export const toast = {
  show(tone: ToastTone, text: string) {
    const id = nextId++;
    items = [...items, { id, tone, text }];
    emit();
    setTimeout(() => toast.dismiss(id), 4000);
  },
  success: (text: string) => toast.show("success", text),
  error: (text: string) => toast.show("error", text),
  info: (text: string) => toast.show("info", text),
  dismiss(id: number) {
    items = items.filter((t) => t.id !== id);
    emit();
  },
};

const toneIcon = { success: CircleCheck, error: CircleAlert, info: Info };
const toneColor = { success: "text-success", error: "text-fire", info: "text-gold-text" };

/** One message box. Always icon + word + text, never colour alone. */
export function Toast({ tone, text, onDismiss }: { tone: ToastTone; text: string; onDismiss?: () => void }) {
  const Icon = toneIcon[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className="flex items-center gap-3 rounded-md border border-line bg-surface-raised py-1 pr-1 pl-4 shadow-lift animate-fade-up">
      <Icon aria-hidden className={cn("size-5 flex-none", toneColor[tone])} />
      <p className="flex-1 py-2 text-ink">
        <strong className={cn("font-semibold", toneColor[tone])}>{ui.toast[tone]}:</strong> {text}
      </p>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label={ui.toast.dismiss} className="grid size-12 flex-none place-items-center text-ink-muted">
          <X aria-hidden className="size-5" />
        </button>
      )}
    </div>
  );
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const empty: ToastItem[] = [];

/** Put <ToastRegion /> once in a layout; it shows whatever `toast.*` sends. */
export function ToastRegion() {
  const list = useSyncExternalStore(
    subscribe,
    () => items,
    () => empty,
  );
  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md flex-col gap-2 *:pointer-events-auto">
      {list.map((t) => (
        <Toast key={t.id} tone={t.tone} text={t.text} onDismiss={() => toast.dismiss(t.id)} />
      ))}
    </div>
  );
}
