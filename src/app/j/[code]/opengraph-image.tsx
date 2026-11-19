/** Personal share card for an invite link: "X ne aapko ... invite bheja". Generic card for unknown codes. */
import t from "@/content/hi-Latn/partner.json";
import { OG_SIZE, OG_TYPE, ogImage } from "@/lib/og";
import { inviteSub, inviteTitle, inviterFor } from "./invite";

export const alt = "Get Udaan partner invite";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const inviter = await inviterFor(code);
  if (!inviter) return ogImage({ eyebrow: t.landing.eyebrow, title: t.landing.title, sub: t.landing.sub });
  return ogImage({ eyebrow: "Partner invite", title: inviteTitle(inviter.name), sub: inviteSub });
}
