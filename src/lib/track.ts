"use client";

/**
 * Client-side funnel events. Uses sendBeacon so it never slows the page or blocks navigation.
 * Also forwards to Meta Pixel / GA4 if they're loaded.
 */
type Win = Window & { fbq?: (...a: unknown[]) => void; gtag?: (...a: unknown[]) => void };

const META_EVENTS: Record<string, string> = { lead_optin: "Lead", checkout_start: "InitiateCheckout", cta_click: "ViewContent" };

export function track(name: string, props: Record<string, unknown> = {}) {
  try {
    const body = JSON.stringify({ name, path: location.pathname, props });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else void fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
    const w = window as Win;
    if (META_EVENTS[name]) w.fbq?.("track", META_EVENTS[name], props);
    w.gtag?.("event", name, props);
  } catch {
    /* tracking must never break the page */
  }
}
