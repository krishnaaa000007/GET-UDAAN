/**
 * Short partner invite link: getudaan.com/j/CODE.
 * A tiny page (not a plain redirect) so WhatsApp/Instagram show a personal share card
 * ("X ne aapko invite bheja"). Browsers move on at once to /partners?invite=CODE#apply,
 * where the proxy remembers the code for 30 days and the apply form pre-fills it.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { inviteSub, inviteTitle, inviterFor } from "./invite";

export async function generateMetadata({ params }: PageProps<"/j/[code]">): Promise<Metadata> {
  const { code } = await params;
  const inviter = await inviterFor(code);
  if (!inviter) return { title: "Partner program", robots: { index: false } };
  const title = inviteTitle(inviter.name).replace(/\*/g, "");
  return { title, description: inviteSub, robots: { index: false }, openGraph: { title, description: inviteSub } };
}

export default async function InviteRedirect({ params }: PageProps<"/j/[code]">) {
  const { code } = await params;
  const inviter = await inviterFor(code);
  const to = inviter ? `/partners?invite=${encodeURIComponent(inviter.code)}#apply` : "/partners";
  return (
    <main className="container-page py-16 text-center">
      <meta httpEquiv="refresh" content={`0;url=${to}`} />
      <Link href={to} className="text-gold-text underline underline-offset-4">
        Partner program kholo →
      </Link>
    </main>
  );
}
