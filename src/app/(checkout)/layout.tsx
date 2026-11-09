// Distraction-free layout for checkout, payment and thank-you pages (no menu, no footer links).
import { Logo } from "@/components/logo";
import { TrackingScripts } from "@/components/tracking-scripts";
import { getSettings } from "@/server/settings";

export default async function CheckoutLayout({ children }: LayoutProps<"/">) {
  const s = await getSettings();
  return (
    <>
      <header className="border-b border-line/60">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
          <Logo />
          <span className="text-xs text-muted">🔒 Secure checkout</span>
        </div>
      </header>
      {children}
      <TrackingScripts pixelId={s.metaPixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID} ga4Id={s.ga4Id || process.env.NEXT_PUBLIC_GA4_ID} />
    </>
  );
}
