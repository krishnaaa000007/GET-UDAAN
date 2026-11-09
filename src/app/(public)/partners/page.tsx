/** Partner program page + application form. */
import type { Metadata } from "next";
import { getSettings } from "@/server/settings";
import { ApplyForm } from "./apply-form";

export const metadata: Metadata = { title: "Partner program", description: "Apne Instagram page se ReelBhai Academy promote karo aur har sale pe commission kamao." };

export default async function PartnersPage() {
  const s = await getSettings();
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm font-medium text-gold">ReelBhai Partner Program</p>
      <h1 className="font-display mt-2 text-4xl md:text-5xl">Apne page se kamao — har sale pe commission</h1>
      <p className="mt-4 text-zinc-300">AI animal / action reels ka page chalate ho? Apne followers ko course recommend karo. Aapko milega:</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {[
          ["💸", "Course pe 50% commission", "Net amount pe (GST aur gateway fee ke baad). Done-with-you pe 25%."],
          ["🔗", "Apna link + coupon", "Followers ko discount, aapko credit. Har reel ke liye alag campaign link."],
          ["📊", "Live dashboard", "Clicks, sales, earnings — kaunsi reel ne kitna becha, sab dikhega."],
          ["🏦", "Withdraw on request", `Refund window (${s.refundWindowDays} din) ke baad earning available — UPI/bank pe withdraw karo.`],
        ].map(([icon, t, d]) => (
          <li key={t} className="card p-4">
            <div className="text-2xl">{icon}</div>
            <p className="mt-1 font-semibold">{t}</p>
            <p className="text-sm text-muted">{d}</p>
          </li>
        ))}
      </ul>
      <section className="card mt-10 p-6">
        <h2 className="font-display text-2xl">Apply karo</h2>
        <p className="mt-1 mb-5 text-sm text-muted">24–48 ghante mein review. Approve hone pe email pe link aur coupon milega.</p>
        <ApplyForm />
      </section>
    </main>
  );
}
