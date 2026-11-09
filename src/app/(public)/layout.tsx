import Link from "next/link";
import { Logo } from "@/components/logo";
import { TrackingScripts } from "@/components/tracking-scripts";
import { getSettings } from "@/server/settings";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const s = await getSettings();
  const wa = s.supportWhatsapp.replace(/\D/g, "");
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/60 bg-ink/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Logo />
          <Link href="/login" className="text-sm font-medium text-muted hover:text-white">
            Login
          </Link>
        </div>
      </header>
      {children}
      <footer className="border-t border-line px-4 pt-10 pb-28 text-sm text-muted md:pb-10">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs">AI animal reels banana seekho — phone se, free tools se, Hinglish mein.</p>
          </div>
          <nav className="grid gap-2">
            <Link href="/legal/terms">Terms of use</Link>
            <Link href="/legal/privacy">Privacy policy</Link>
            <Link href="/legal/refund">Refund policy</Link>
            <Link href="/legal/contact">Contact us</Link>
          </nav>
          <div className="grid gap-2">
            <Link href="/partners">Partner program</Link>
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener">
              WhatsApp support: {s.supportWhatsapp}
            </a>
            <span>{s.supportEmail}</span>
          </div>
        </div>
        <p className="mx-auto mt-8 max-w-5xl text-xs">
          © {new Date().getFullYear()} {s.sellerLegalName}. Results vary — koi income guarantee nahi. Instagram, YouTube aur Facebook apni companies ke trademarks hain; hum unse affiliated nahi hain.
        </p>
      </footer>
      <TrackingScripts pixelId={s.metaPixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID} ga4Id={s.ga4Id || process.env.NEXT_PUBLIC_GA4_ID} />
    </>
  );
}
