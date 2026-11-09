import { db } from "@/lib/db";
import { landingDefaults, type LandingSectionKey } from "@/content/landing";
import { getLandingContent } from "@/server/content";
import { ActionForm } from "@/components/admin/action-form";
import { addTestimonialAction, resetContentAction, saveContentAction, toggleTestimonialAction } from "../actions";

const LABELS: Record<LandingSectionKey, string> = {
  hero: "1. Hero",
  problem: "2. Problem",
  earn: "3. Ways creators earn",
  howItWorks: "4. How it works",
  curriculum: "5. Curriculum (titles; lessons come from Courses)",
  bonuses: "6. Bonuses",
  testimonials: "7. Testimonials (titles; items below)",
  pricing: "8. Pricing (titles; prices in Pricing)",
  guarantee: "9. Guarantee",
  faq: "10. FAQ",
  partner: "11. Partner block",
  stickyBar: "12. Sticky mobile bar",
};

export default async function AdminContent() {
  const [content, overrides, testimonials] = await Promise.all([getLandingContent(), db.contentBlock.findMany({ select: { key: true } }), db.testimonial.findMany({ orderBy: { createdAt: "desc" } })]);
  const edited = new Set(overrides.map((o) => o.key));
  const published = testimonials.filter((t) => t.published).length;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Landing content</h1>
      <p className="text-sm text-muted">
        Edit any section&apos;s text below (JSON format — keep the quotes and commas). Saving updates the live page within seconds. &ldquo;Reset&rdquo; returns a section to the default copy. Keep claims honest: no income promises, no fake numbers.
      </p>
      {(Object.keys(landingDefaults) as LandingSectionKey[]).map((key) => (
        <details key={key} className="card p-4">
          <summary className="cursor-pointer font-semibold">
            {LABELS[key]} {edited.has(key) && <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold">edited</span>}
          </summary>
          <ActionForm action={saveContentAction} className="mt-3 space-y-2" success="Saved — live page updated ✓">
            <input type="hidden" name="key" value={key} />
            <textarea name="json" defaultValue={JSON.stringify(content[key], null, 2)} rows={14} spellCheck={false} className="field min-h-0 py-3 font-mono text-xs" />
            <button className="btn-gold min-h-10 text-sm">Save section</button>
          </ActionForm>
          {edited.has(key) && (
            <form action={resetContentAction} className="mt-2">
              <input type="hidden" name="key" value={key} />
              <button className="text-xs text-muted underline">Reset to default</button>
            </form>
          )}
        </details>
      ))}

      <section className="card space-y-4 p-4">
        <h2 className="font-semibold">Testimonials — real students only</h2>
        <p className="text-sm text-muted">The section appears on the landing page only when at least 3 are published (now: {published}). Use real names/cities with the student&apos;s permission.</p>
        <ActionForm action={addTestimonialAction} className="grid gap-2 text-sm sm:grid-cols-2" success="Added ✓">
          <input name="name" required placeholder="Student name" className="field min-h-10" />
          <input name="city" placeholder="City" className="field min-h-10" />
          <input name="result" placeholder="Result (e.g. 1.2M views on reel 3)" className="field min-h-10 sm:col-span-2" />
          <input name="imageUrl" placeholder="Screenshot image URL (R2 public URL)" className="field min-h-10 sm:col-span-2" />
          <textarea name="quote" required placeholder="What they said" rows={3} className="field min-h-0 py-2 sm:col-span-2" />
          <button className="btn-ghost min-h-10 sm:col-span-2">Add testimonial</button>
        </ActionForm>
        <ul className="divide-y divide-line text-sm">
          {testimonials.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2">
              <span>{t.name}{t.city ? `, ${t.city}` : ""} — <span className="text-muted">{t.quote.slice(0, 80)}</span></span>
              <form action={toggleTestimonialAction}>
                <input type="hidden" name="id" value={t.id} />
                <button className="text-gold">{t.published ? "Hide" : "Publish"}</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
