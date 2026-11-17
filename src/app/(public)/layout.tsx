// Shell for all public pages: header, partner banner, page, footer.
import { PartnerBanner } from "@/components/shell/partner-banner";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";
import { TrackingScripts } from "@/components/tracking-scripts";
import { getSettings } from "@/server/settings";

export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const s = await getSettings();
  return (
    <>
      <SiteHeader />
      <PartnerBanner />
      {children}
      <SiteFooter settings={s} />
      <TrackingScripts pixelId={s.metaPixelId || process.env.NEXT_PUBLIC_META_PIXEL_ID} ga4Id={s.ga4Id || process.env.NEXT_PUBLIC_GA4_ID} />
    </>
  );
}
