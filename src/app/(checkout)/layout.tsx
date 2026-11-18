// Distraction-free layout for checkout, payment and thank-you pages: logo + "Secure checkout" only.
// No menu and no footer links, so nothing pulls the buyer away from paying.
import { Lock } from "lucide-react";
import { Logo } from "@/components/logo";
import { TrackingScripts } from "@/components/tracking-scripts";
import t from "@/content/hi-Latn/checkout.json";
import { getSettings } from "@/server/settings";

export default async function CheckoutLayout({ children }: LayoutProps<"/">) {
  const s = await getSettings();
  return (
    <>
      <header className="border-b border-line">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Logo priority />
          <span className="type-small inline-flex flex-none items-center gap-2 whitespace-nowrap text-ink-muted">
            <Lock aria-hidden className="size-5" />
            {t.secure}
          </span>
        </div>
      </header>
      {children}
      <TrackingScripts pixelId={s.metaPixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID} ga4Id={s.ga4Id || process.env.NEXT_PUBLIC_GA4_ID} />
    </>
  );
}
