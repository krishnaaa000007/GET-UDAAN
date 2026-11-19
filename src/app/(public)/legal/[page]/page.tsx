/**
 * Legal pages required by Razorpay for activation: Terms, Privacy, Refund, Contact — plus Partner Terms.
 * Every number on the Partner Terms page comes from config/settings, so the page always matches what the code does.
 * ⚠️ These are a starting template — have a lawyer/CA review before going live.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PARTNER_RULES } from "@/config/partners";
import { formatINR } from "@/lib/money";
import { getSettings } from "@/server/settings";

const PAGES = ["terms", "privacy", "refund", "contact", "partners"] as const;
type PageKey = (typeof PAGES)[number];
const TITLES: Record<PageKey, string> = { terms: "Terms of Use", privacy: "Privacy Policy", refund: "Refund & Cancellation Policy", contact: "Contact Us", partners: "Partner Terms" };

const P = ({ children }: { children: React.ReactNode }) => <p className="mt-3 text-ink-muted">{children}</p>;
const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-8 text-lg font-semibold text-ink">{children}</h2>;

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
  // Real contact details only; with none set yet, point to the Contact page instead of showing a fake number.
  const contactText = [s.supportWhatsapp && `WhatsApp ${s.supportWhatsapp}`, s.supportEmail && `email ${s.supportEmail}`].filter(Boolean).join(" or ") || "via our Contact page";
  const releaseText = s.commissionReleaseMinutes % 60 === 0 ? `${s.commissionReleaseMinutes / 60} hour(s)` : `${s.commissionReleaseMinutes} minutes`;
  const refundText = s.absorbRefunds ? "is not taken back if the buyer is later refunded (Get Udaan bears refunds)" : "is reversed if the order is refunded";

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
        <P>Partner (affiliate) commissions are governed by the{" "}
          <Link href="/legal/partners" className="underline">
            Partner Terms
          </Link>
          : a commission becomes available in the partner&apos;s wallet {releaseText} after the sale, {refundText}, and is paid on approved withdrawal requests. We may withhold commission for fraud, self-referral or spam.</P>
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
        <P>You can ask to access, correct or delete your data by writing to us ({contactText}). We keep order records as required by tax law.</P>
      </>
    ),
    refund: (
      <>
        <P><b>{s.refundWindowDays}-day refund:</b> If you&apos;re not happy with a course, message us ({contactText}) within {s.refundWindowDays} days of purchase with your order number. We refund the full amount — no questions asked.</P>
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
        {s.supportWhatsapp && <P>WhatsApp: {s.supportWhatsapp}</P>}
        {s.supportEmail && <P>Email: {s.supportEmail}</P>}
        <P>We usually reply within 24 hours (Mon–Sat).</P>
      </>
    ),
    partners: (
      <>
        <P>These terms apply to everyone in the {seller} partner (affiliate) programme, together with our general Terms of Use.</P>
        <H>Joining</H>
        <P>Joining is free — there is no fee, purchase or deposit needed to become or stay a partner. We review every application and may approve or reject it. You must give true details.</P>
        <H>What you earn</H>
        <P>
          You earn a commission on each course sale made through your link or your partner coupon. The commission is your rate (shown in your dashboard for each product) × the amount the buyer paid after GST and the payment gateway fee. A sale is
          credited to the partner whose link was clicked last within {s.attributionWindowDays} days before the purchase; using a partner&apos;s coupon credits that partner.
        </P>
        <H>When you get paid</H>
        <P>
          A commission becomes available in your wallet {releaseText} after the sale. You can request a withdrawal once your available balance is at least {formatINR(s.minWithdrawalPaise)}.
          {s.payoutTimeText ? ` Approved withdrawals are paid in ${s.payoutTimeText}.` : ""}
          {s.tdsBps > 0 ? ` TDS of ${s.tdsBps / 100}% is deducted where the law requires it.` : ""} Changing your payout details pauses withdrawals for 24 hours, to protect your account.
        </P>
        <H>Refunds</H>
        <P>Buyers can get a refund within {s.refundWindowDays} days. Your commission {refundText}.</P>
        <H>Team bonus</H>
        {s.teamBonusEnabled ? (
          <P>
            When a creator you invited (with your invite link or code) is approved as a partner, you get a team bonus of {PARTNER_RULES.teamBonus.l1Bps / 100}% of the commission they earn on each sale (level 1), and{" "}
            {PARTNER_RULES.teamBonus.l2Bps / 100}% of the commission earned by partners they invite (level 2). Only these two levels exist. The bonus is paid by {seller} on top — it is never taken out of
            anyone&apos;s commission. It comes only from real course sales: nothing is paid for joining, inviting or recruiting itself, and a bonus is never paid on another bonus. Bonuses follow the same release and
            refund rules as commissions. Who invited you is fixed when you are approved and cannot be changed later. Inviting yourself or creating circular invites is not allowed.
          </P>
        ) : (
          <P>A team bonus is not offered at the moment. If we start one, it will be added to these terms first.</P>
        )}
        <H>Not allowed</H>
        <P>
          Buying through your own link or coupon (self-purchase) earns nothing. Also not allowed: spam, fake accounts or reviews, misleading income claims, and anything that
          breaks Instagram&apos;s or other platforms&apos; rules. We may withhold commission earned this way.
        </P>
        <H>Account review (freeze)</H>
        <P>
          If we see unusual activity (for example many refunds), we may put your account under review. While it is under review, new commissions stay pending and withdrawals pause; we show you the reason. When
          the review ends, due commissions are released. Serious or repeated abuse can lead to removal from the programme.
        </P>
        <H>Changes</H>
        <P>We may change rates or these terms for future sales by updating this page and telling you in your dashboard or by email. Commission already earned is not reduced by a change.</P>
        <H>Contact</H>
        <P>Questions about the programme: {contactText}.</P>
      </>
    ),
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 text-sm leading-relaxed">
      <h1 className="font-display text-3xl text-ink">{TITLES[page as PageKey]}</h1>
      <p className="mt-1 text-xs text-ink-muted">Last updated: November 2026</p>
      {body[page as PageKey]}
    </main>
  );
}
