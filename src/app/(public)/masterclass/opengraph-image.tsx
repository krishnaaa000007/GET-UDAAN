/** Share image for /masterclass. */
import t from "@/content/hi-Latn/masterclass.json";
import { OG_SIZE, OG_TYPE, ogImage } from "@/lib/og";

export const alt = "Get Udaan free masterclass";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default function Image() {
  return ogImage({ eyebrow: t.eyebrow, title: t.title, sub: t.sub });
}
