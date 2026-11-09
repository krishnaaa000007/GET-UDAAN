/**
 * Legal pages required by Razorpay for activation: Terms, Privacy, Refund, Contact.
 * ⚠️ These are a starting template — have a lawyer/CA review before going live.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSettings } from "@/server/settings";

const PAGES = ["terms", "privacy", "refund", "contact"] as const;
type PageKey = (typeof PAGES)[number];
const TITLES: Record<PageKey, string> = { terms: "Terms of Use", privacy: "Privacy Policy", refund: "Refund & Cancellation Policy", contact: "Contact Us" };

const P = ({ children }: { children: React.ReactNode }) => <p className="mt-3 text-zinc-300">{children}</p>;
const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-8 text-lg font-semibold text-white">{children}</h2>;

export function generateStaticParams() {
  return PAGES.map((page) => ({ page }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[page]">): Promise<Metadata> {
  const { page } = await params;
  return { title: TITLES[page as PageKey] ?? "Legal" };
}

export default async function LegalPage({ params }: PageProps<"/legal/[page]">) {
  const { page } = await params;
  if (!PAGES.includes(page as PageKey)) notFound();
  const s = await getSettings();
  const seller = s.sellerLegalName;

  const body: Record<PageKey, React.ReactNode> = {
    terms: (
      <>
        <P>These terms govern your use of the {seller} website and courses. By buying or using a course you agree to them.</P>
        <H>Licence</H>
        <P>When you buy a course you get a personal, non-transferable licence to watch it for your own learning. You may not share your login, re-upload, record, resell or distribute any course video, prompt pack, PDF or template.</P>
        <H>Account sharing</H>
        <P>An account can be logged in on at most {s.maxDevices} devices at once. Videos carry a watermark that identifies the account. Sharing course content or login details leads to account removal <b>without refund</b>.</P>
        <H>No income guarantee</H>
        <P>We teach skills and methods. Any examples of earnings are illustrative; results vary and depend on your effort, niche, consistency and third-party platform rules. We do not guarantee any income, views or followers.</P>
        <H>Third-party tools</H>
        <P>The course uses third-party AI and editing tools whose features, pricing and terms may change. Follow each platform&apos;s rules, and do not create content that infringes others&apos; rights or is misleading or harmful.</P>
        <H>Partners</H>
        <P>Partner (affiliate) commissions are governed by the partner dashboard terms: commissions are pending during the refund window, reversed on refunds, and paid on approved withdrawal requests. We may withhold commission for fraud, self-referral or spam.</P>
        <H>Liability & law</H>
        <P>To the extent permitted by law our liability is limited to the amount you paid for the course. These terms are governed by the laws of India.</P>
      </>
    ),
    privacy: (
      <>
        <P>{seller} collects only what we need to sell and deliver courses.</P>
        <H>What we collect</H>
        <P>Name, email, phone (WhatsApp) number, order and payment status (card/UPI details are handled by Razorpay — we never see or store them), course progress, and basic device/usage data. IP addresses are stored only as one-way hashes for fraud and click de-duplication.</P>
        <H>Why</H>
        <P>To give you course access, send receipts and login links, provide support, prevent account sharing and fraud, credit partners for referrals, and (if you opted in) send course-related messages. You can unsubscribe from marketing messages any time.</P>
        <H>Who sees it</H>
        <P>Our team and service providers that run the platform (hosting, database, email, payments, video). Partners never see buyers&apos; contact details — only a masked initial and city. We do not sell your data.</P>
        <H>Cookies</H>
        <P>We use essential cookies (login, checkout, referral tracking) and, if enabled, Meta Pixel / Google Analytics for measuring ads.</P>
        <H>Your rights</H>
        <P>You can ask to access, correct or delete your data by writing to {s.supportEmail}. We keep order records as required by tax law.</P>
      </>
    ),
    refund: (
      <>
        <P><b>{s.refundWindowDays}-day refund:</b> If you&apos;re not happy with a course, message us on WhatsApp ({s.supportWhatsapp}) or email ({s.supportEmail}) within {s.refundWindowDays} days of purchase with your order number. We refund the full amount — no questions asked.</P>
        <P>Refunds are processed to the original payment method within 5–7 working days after approval (bank timelines may vary). Course access ends when a refund is issued.</P>
        <P>Refunds are not available after {s.refundWindowDays} days, or for accounts removed for sharing content. Done-with-you service refunds are prorated based on work already delivered.</P>
        <P>Failed payments where money was debited are reversed automatically by the bank/Razorpay, usually within 5–7 working days.</P>
      </>
    ),
    contact: (
      <>
        <P><b>{seller}</b></P>
        {s.sellerAddress && <P>{s.sellerAddress}</P>}
        {s.gstin && <P>GSTIN: {s.gstin}</P>}
        <P>WhatsApp: {s.supportWhatsapp}</P>
        <P>Email: {s.supportEmail}</P>
        <P>We usually reply within 24 hours (Mon–Sat).</P>
      </>
    ),
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-sm leading-relaxed">
      <h1 className="font-display text-3xl text-white">{TITLES[page as PageKey]}</h1>
      <p className="mt-1 text-xs text-muted">Last updated: November 2026</p>
      {body[page as PageKey]}
    </main>
  );
}
