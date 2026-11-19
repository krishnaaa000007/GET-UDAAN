import { db } from "@/lib/db";
import { formatIST } from "@/lib/time";
import { landingDefaults, type LandingSectionKey } from "@/content/landing";
import { getLandingContent } from "@/server/content";
import { ActionForm } from "@/components/admin/action-form";
import { addTestimonialAction, resetContentAction, saveContentAction, toggleTestimonialAction } from "../actions";

const LABELS: Record<LandingSectionKey, string> = {
  hero: "1. Hero (add the sample reel video + poster URLs here)",
  reels: "2. Reel wall (hidden until you add items)",
  problem: "3. Problem",
  earn: "4. Ways creators earn",
  howItWorks: "5. How it works",
  curriculum: "6. Curriculum (titles; lessons come from Courses)",
  bonuses: "7. Bonuses",
  testimonials: "8. Student results (titles; items below)",
  team: "8b. Who is behind Get Udaan (hidden until you fill in name + bio)",
  recentPurchase: "Recent purchase pop-up text (switch it on in Settings)",
  pricing: "9. Pricing (titles + compare table; prices in Pricing)",
  faq: "10. FAQ",
  partner: "11. Partner block",
  finalCta: "12. Final CTA",
  stickyBar: "13. Sticky mobile bar",
};

export default async function AdminContent() {
  const [content, overrides, testimonials] = await Promise.all([getLandingContent(), db.contentBlock.findMany({ select: { key: true } }), db.testimonial.findMany({ orderBy: { createdAt: "desc" } })]);
  const edited = new Set(overrides.map((o) => o.key));
  const published = testimonials.filter((t) => t.published).length;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Landing content</h1>
      <p className="text-sm text-ink-muted">
        Edit any section&apos;s text below (JSON format — keep the quotes and commas). Saving updates the live page within seconds. &ldquo;Reset&rdquo; returns a section to the default copy. Keep claims honest: no income promises, no fake numbers.
      </p>
      {(Object.keys(landingDefaults) as LandingSectionKey[]).map((key) => (
        <details key={key} className="card p-4">
          <summary className="cursor-pointer font-semibold">
            {LABELS[key]} {edited.has(key) && <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold-text">edited</span>}
          </summary>
          <ActionForm action={saveContentAction} className="mt-3 space-y-2" success="Saved — live page updated ✓">
            <input type="hidden" name="key" value={key} />
            <textarea name="json" defaultValue={JSON.stringify(content[key], null, 2)} rows={14} spellCheck={false} className="field min-h-0 py-3 font-mono text-xs" />
            <button className="btn-gold min-h-10 text-sm">Save section</button>
          </ActionForm>
          {edited.has(key) && (
            <form action={resetContentAction} className="mt-2">
              <input type="hidden" name="key" value={key} />
              <button className="text-xs text-ink-muted underline">Reset to default</button>
            </form>
          )}
        </details>
      ))}

      <section className="card space-y-4 p-4">
        <h2 className="font-semibold">Testimonials — real students only</h2>
        <p className="text-sm text-ink-muted">The section appears on the landing page only when at least 3 are published (now: {published}). Use real names/cities with the student&apos;s permission.</p>
        <ActionForm action={addTestimonialAction} className="grid gap-2 text-sm sm:grid-cols-2" success="Added ✓">
          <input name="name" required placeholder="Student name" className="field min-h-10" />
          <input name="city" placeholder="City" className="field min-h-10" />
          <input name="result" placeholder="Result (e.g. 1.2M views on reel 3)" className="field min-h-10 sm:col-span-2" />
          <input name="imageUrl" placeholder="Screenshot image URL (R2 public URL)" className="field min-h-10 sm:col-span-2" />
          <input name="videoUrl" placeholder="Video URL (optional)" className="field min-h-10 sm:col-span-2" />
          <input name="proofUrl" placeholder="Proof link you checked (never shown publicly)" className="field min-h-10 sm:col-span-2" />
          <textarea name="quote" required placeholder="What they said" rows={3} className="field min-h-0 py-2 sm:col-span-2" />
          <label className="flex items-start gap-2 sm:col-span-2">
            <input type="checkbox" name="consent" required className="mt-1" />
            <span>The student agreed (in writing) to be featured with this name, quote and media. The date is saved.</span>
          </label>
          <button className="btn-ghost min-h-10 sm:col-span-2">Add testimonial</button>
        </ActionForm>
        <ul className="divide-y divide-line text-sm">
          {testimonials.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2">
              <span>
                {t.name}{t.city ? `, ${t.city}` : ""} — <span className="text-ink-muted">{t.quote.slice(0, 80)}</span>
                <span className="block text-xs text-ink-muted">
                  {t.consentAt ? `Consent ${formatIST(t.consentAt, "date")}` : "No consent recorded"}
                  {t.videoUrl ? " • video" : ""}
                  {t.proofUrl && (
                    <>
                      {" • "}
                      <a href={t.proofUrl} target="_blank" rel="noopener noreferrer" className="underline">proof</a>
                    </>
                  )}
                </span>
              </span>
              {t.published || t.consentAt ? (
                <form action={toggleTestimonialAction}>
                  <input type="hidden" name="id" value={t.id} />
                  <button className="text-gold-text">{t.published ? "Hide" : "Publish"}</button>
                </form>
              ) : (
                <span className="text-xs text-ink-muted">Needs consent</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
