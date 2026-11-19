/** Share image for /partners. */
import t from "@/content/hi-Latn/partner.json";
import { OG_SIZE, OG_TYPE, ogImage } from "@/lib/og";

export const alt = "Get Udaan partner program";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default function Image() {
  return ogImage({ eyebrow: t.landing.eyebrow, title: t.landing.title, sub: t.landing.sub });
}
