/** Landing content = code defaults + admin overrides (ContentBlock rows), section by section. */
import "server-only";
import { db } from "@/lib/db";
import { landingDefaults, type LandingContent, type LandingSectionKey } from "@/content/landing";

export async function getLandingContent(): Promise<LandingContent> {
  const rows = await db.contentBlock.findMany();
  const out = structuredClone(landingDefaults) as Record<string, unknown>;
  for (const r of rows) {
    if (r.key in landingDefaults && r.data && typeof r.data === "object") {
      out[r.key] = { ...(landingDefaults[r.key as LandingSectionKey] as object), ...(r.data as object) };
    }
  }
  return out as LandingContent;
}

/** Real numbers only — used for honest social proof. */
export async function getSocialProof() {
  const [students, testimonials] = await Promise.all([
    db.enrollment.count({ where: { revokedAt: null } }),
    db.testimonial.findMany({ where: { published: true }, orderBy: { position: "asc" } }),
  ]);
  return { students, testimonials };
}
