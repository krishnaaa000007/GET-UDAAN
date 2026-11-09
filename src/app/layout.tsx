import type { Metadata, Viewport } from "next";
import { Anton, Poppins } from "next/font/google";
import "./globals.css";

// Fonts are self-hosted by Next at build time (no Google request from the phone) with display=swap.
const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton", display: "swap" });
const poppins = Poppins({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-poppins", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "ReelBhai Academy — AI Animal Reels banana seekho", template: "%s · ReelBhai Academy" },
  description: "Phone se, free AI tools se viral 'Bhai' style AI animal reels banana seekho. 40 lessons, 300+ prompts, income module.",
  openGraph: { siteName: "ReelBhai Academy", locale: "en_IN", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hi-Latn" data-scroll-behavior="smooth" className={`${anton.variable} ${poppins.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
