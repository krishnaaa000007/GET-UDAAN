"use server";

// A student shares their own result. It is saved UNPUBLISHED — it appears on the website only after
// an admin checks it and presses Publish (Admin → Landing content → Testimonials).
import t from "@/content/hi-Latn/student.json";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/server/auth";
import { audit } from "@/server/audit";
import { hasSharedResult } from "@/server/testimonials";

const E = t.dashboard.shareResult.errors;

export type ShareResultState =
  | { ok: true }
  | { ok: false; values: { quote: string; result: string; city: string; link: string }; errors: { quote?: string; link?: string; consent?: string; form?: string } }
  | null;

export async function shareResultAction(_prev: ShareResultState, form: FormData): Promise<ShareResultState> {
  const user = await getCurrentUser();
  const values = {
    quote: String(form.get("quote") ?? "").trim().slice(0, 400),
    result: String(form.get("result") ?? "").trim().slice(0, 80),
    city: String(form.get("city") ?? "").trim().slice(0, 40),
    link: String(form.get("link") ?? "").trim().slice(0, 300),
  };
  if (!user) return { ok: false, values, errors: { form: E.generic } };

  const errors: { quote?: string; link?: string; consent?: string } = {};
  if (values.quote.length < 20) errors.quote = E.quote;
  if (values.link && !/^https:\/\/\S+$/.test(values.link)) errors.link = E.link;
  if (form.get("consent") !== "on") errors.consent = E.consent;
  if (Object.keys(errors).length) return { ok: false, values, errors };

  try {
    // Only real, enrolled students can send one, and only once.
    const enrolled = await db.enrollment.count({ where: { userId: user.id, revokedAt: null } });
    if (!enrolled) return { ok: false, values, errors: { form: E.generic } };
    if (await hasSharedResult(user.id)) return { ok: false, values, errors: { form: E.rate } };

    const row = await db.testimonial.create({
      data: { name: user.name?.trim() || "Student", city: values.city || null, quote: values.quote, result: values.result || null, proofUrl: values.link || null, consentAt: new Date(), published: false },
    });
    await audit({
      actorId: user.id,
      action: "testimonial.submit",
      entity: "Testimonial",
      entityId: row.id,
      after: { consent: true, consentAt: new Date().toISOString(), link: values.link || null, email: user.email },
    });
    return { ok: true };
  } catch (e) {
    console.error("share result failed", e);
    return { ok: false, values, errors: { form: E.generic } };
  }
}
