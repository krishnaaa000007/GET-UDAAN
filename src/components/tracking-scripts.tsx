import Script from "next/script";

/**
 * Meta Pixel + GA4, loaded with `lazyOnload` (after the page is fully loaded)
 * so they never hurt LCP. Purchases are ALSO sent server-side (Conversions API).
 */
export function TrackingScripts({ pixelId, ga4Id }: { pixelId?: string | null; ga4Id?: string | null }) {
  return (
    <>
      {pixelId && (
        <Script id="meta-pixel" strategy="lazyOnload">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId.replace(/\D/g, "")}');fbq('track','PageView');`}
        </Script>
      )}
      {ga4Id && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`} strategy="lazyOnload" />
          <Script id="ga4" strategy="lazyOnload">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga4Id.replace(/[^A-Z0-9-]/gi, "")}');`}
          </Script>
        </>
      )}
    </>
  );
}
