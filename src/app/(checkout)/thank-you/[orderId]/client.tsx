"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Polls until the webhook marks the order PAID (usually 2–10 seconds). */
export function WaitForPayment({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    let tries = 0;
    const t = setInterval(async () => {
      tries++;
      if (tries === 15) setSlow(true);
      try {
        const r = await fetch(`/api/orders/${orderId}/status`, { cache: "no-store" }).then((x) => x.json());
        if (r.status === "PAID") {
          clearInterval(t);
          router.refresh();
        }
      } catch {
        /* keep trying */
      }
      if (tries > 90) clearInterval(t);
    }, 2000);
    return () => clearInterval(t);
  }, [orderId, router]);

  return (
    <div>
      <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-line border-t-gold" />
      <h1 className="font-display mt-6 text-3xl">Payment confirm ho raha hai…</h1>
      <p className="mt-2 text-muted">Is page ko band mat kijiye. Isme kuch second lagte hain.</p>
      {slow && (
        <p className="mt-4 text-sm text-muted">
          Zyada time lag raha hai? Paisa kat gaya ho to chinta mat kijiye — confirmation email aa jayega. Phir bhi problem ho to WhatsApp support pe order details bhejiye.
        </p>
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
    const t = setTimeout(fire, 2500);
    return () => clearTimeout(t);
  }, [orderId, valuePaise]);
  return null;
}
