"use client";

import { useEffect, useState } from "react";
import shell from "@/content/hi-Latn/shell.json";

type Banner = { handle: string | null; code: string; off: string };

/**
 * Slim gold-soft bar under the header for visitors who came from a partner link or coupon.
 * It asks the server (which reads the visitor's cookies) for the REAL coupon and discount —
 * if there is none, nothing is shown. Done in the browser so the landing page itself stays cached and fast.
 */
export function PartnerBanner() {
  const [b, setB] = useState<Banner | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/partner-banner", { cache: "no-store" })
      .then((r) => (r.status === 200 ? r.json() : null))
      .then((data: Banner | null) => {
        if (alive && data?.code) setB(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  if (!b) return null;
  const text = (b.handle ? shell.banner.partner.replace("{handle}", b.handle) : shell.banner.coupon).replace("{code}", b.code).replace("{off}", b.off);
  return (
    <div role="status" className="border-b border-line bg-gold-soft animate-fade-up">
      <p className="container-page type-small py-2 text-center font-semibold text-gold-text">{text}</p>
    </div>
  );
}
