/** Default share image (home and any page without its own). */
import t from "@/content/hi-Latn/landing.json";
import { OG_SIZE, OG_TYPE, ogImage } from "@/lib/og";

export const alt = "Get Udaan — Phone se Viral tak";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default function Image() {
  return ogImage({ eyebrow: t.hero.eyebrow, title: t.hero.headline, sub: t.hero.sub });
}
