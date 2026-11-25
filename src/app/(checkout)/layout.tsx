// Distraction-free layout for checkout, payment and thank-you pages: logo + "Secure checkout" only.
// No menu and no footer links, so nothing pulls the buyer away from paying.
import { Lock, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { TrackingScripts } from "@/components/tracking-scripts";
import t from "@/content/hi-Latn/checkout.json";
import { getSettings } from "@/server/settings";

export default async function CheckoutLayout({ children }: LayoutProps<"/">) {
  const s = await getSettings();
  return (
    <>
      <header data-theme="night" className="border-b border-line bg-surface">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Logo priority />
          <span className="type-small inline-flex flex-none items-center gap-2 whitespace-nowrap text-ink-muted">
            <Lock aria-hidden className="size-5" />
            {t.secure}
          </span>
        </div>
      </header>
      {children}
      {/* Navy trust strip at the very bottom (reference look). */}
      <div data-slot="secureStrip" className="relative mt-12">
        <svg aria-hidden viewBox="0 0 1440 80" preserveAspectRatio="none" className="block h-10 w-full md:h-14">
          <path d="M0 80 V40 C 240 0 480 70 720 40 C 960 10 1200 60 1440 24 V80 Z" fill="var(--gold)" />
          <path d="M0 80 V56 C 240 20 480 86 720 56 C 960 26 1200 76 1440 40 V80 Z" fill="#0f1b2d" />
        </svg>
        <div data-theme="night" className="bg-surface">
          <p className="container-page type-body-lg flex min-h-16 items-center justify-center gap-3 pb-4 font-semibold whitespace-nowrap text-ink">
            <span aria-hidden className="hidden h-px w-24 bg-line sm:block" />
            <ShieldCheck aria-hidden className="size-7 text-gold-text" />
            {t.secureStrip}
            <span aria-hidden className="hidden h-px w-24 bg-line sm:block" />
          </p>
        </div>
      </div>
      <TrackingScripts pixelId={s.metaPixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID} ga4Id={s.ga4Id || process.env.NEXT_PUBLIC_GA4_ID} />
    </>
  );
}
