"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { SpeedTrails } from "@/components/ui/basics";
import t from "@/content/hi-Latn/checkout.json";
import { track } from "@/lib/track";

/** Polls until the webhook marks the order PAID (usually 2–10 seconds). */
export function WaitForPayment({ orderId, whatsappHref }: { orderId: string; whatsappHref?: string }) {
  const router = useRouter();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    let tries = 0;
    const timer = setInterval(async () => {
      tries++;
      if (tries === 15) setSlow(true);
      try {
        const r = await fetch(`/api/orders/${orderId}/status`, { cache: "no-store" }).then((x) => x.json());
        if (r.status === "PAID") {
          clearInterval(timer);
          router.refresh();
        }
      } catch {
        /* keep trying */
      }
      if (tries > 90) clearInterval(timer);
    }, 2000);
    return () => clearInterval(timer);
  }, [orderId, router]);

  return (
    <div role="status" className="flex flex-col items-center gap-4 text-center">
      <SpeedTrails animated className="h-12 w-14" />
      <h1 className="type-heading text-ink">{t.waiting.title}</h1>
      <p className="text-ink-muted">{t.waiting.text}</p>
      {slow && whatsappHref && (
        <>
          <p className="type-small text-ink-muted">{t.waiting.slow}</p>
          <a href={whatsappHref} target="_blank" rel="noopener" className="type-button inline-flex min-h-12 items-center gap-2 text-gold-text underline underline-offset-4">
            <MessageCircle aria-hidden className="size-5" />
            {t.waiting.whatsapp}
          </a>
        </>
      )}
    </div>
  );
}

/** Browser-side Purchase event; event_id = order id so Meta de-duplicates with the server-side event. */
export function PurchasePixel({ orderId, valuePaise }: { orderId: string; valuePaise: number }) {
  useEffect(() => {
    const key = `rb_px_${orderId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode */
    }
    const w = window as Window & { fbq?: (...a: unknown[]) => void; gtag?: (...a: unknown[]) => void };
    const fire = () => {
      w.fbq?.("track", "Purchase", { value: valuePaise / 100, currency: "INR" }, { eventID: orderId });
      w.gtag?.("event", "purchase", { transaction_id: orderId, value: valuePaise / 100, currency: "INR" });
    };
    // Pixels load lazily; give them a moment.
    const timer = setTimeout(fire, 2500);
    return () => clearTimeout(timer);
  }, [orderId, valuePaise]);
  return null;
}

// 16 pieces flying out in a circle. Colours come from the tokens.
const PIECES = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2;
  const dist = 90 + (i % 4) * 28;
  return { dx: Math.round(Math.cos(angle) * dist), dy: Math.round(Math.sin(angle) * dist - 30), rot: (i % 2 ? 1 : -1) * (180 + i * 20), color: ["bg-gold", "bg-gold-deep", "bg-ink"][i % 3], delay: (i % 4) * 40 };
});

/**
 * Gold confetti, ONCE per order (not again on refresh). Wraps the big tick.
 * People who turned on "reduce motion" see no animation at all (global CSS rule).
 */
export function ConfettiOnce({ orderId, children }: { orderId: string; children: ReactNode }) {
  const [burst, setBurst] = useState(false);
  useEffect(() => {
    const key = `gu_confetti_${orderId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode: still celebrate */
    }
    const timer = setTimeout(() => setBurst(true), 0);
    return () => clearTimeout(timer);
  }, [orderId]);
  return (
    <div className="relative">
      {burst && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {PIECES.map((p, i) => (
            <span key={i} className={`confetti-piece ${p.color}`} style={{ "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, "--rot": `${p.rot}deg`, animationDelay: `${p.delay}ms` } as React.CSSProperties} />
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

/** WhatsApp share link that also records a share_click. */
export function ShareLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener" className={className} onClick={() => track("share_click", { where: "thank_you", channel: "whatsapp" })}>
      {children}
    </a>
  );
}
