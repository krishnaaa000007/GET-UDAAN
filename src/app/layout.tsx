import type { Metadata, Viewport } from "next";
import { Caveat, Plus_Jakarta_Sans, Poppins } from "next/font/google";
import "./globals.css";
import { siteUrl } from "@/lib/site-url";

// Fonts are self-hosted by Next at build time (no Google request from the phone) with display=swap.
// Only the Latin files are preloaded (Hinglish is Roman script). The Devanagari files are still shipped and the
// browser fetches them only when a page really shows Hindi script — this keeps slow-4G loads fast.
// Headings: Plus Jakarta Sans ExtraBold (Latin only — Hindi-script headings fall back to Poppins via --font-display).
const jakarta = Plus_Jakarta_Sans({ weight: ["600", "700", "800"], subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
// Handwritten notes ("Viral!") — decoration only, never for reading text.
const caveat = Caveat({ weight: ["700"], subsets: ["latin"], variable: "--font-caveat", display: "swap" });
const poppins = Poppins({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-poppins", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Get Udaan — Phone se Viral tak", template: "%s · Get Udaan" },
  description: "Sirf phone aur free AI tools se apna viral AI reel page banao — step by step, Hinglish mein. 40 lessons, 300+ prompts, income module.",
  openGraph: { siteName: "Get Udaan", locale: "en_IN", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#0f1b2d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hi-Latn" data-scroll-behavior="smooth" className={`${jakarta.variable} ${poppins.variable} ${caveat.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
