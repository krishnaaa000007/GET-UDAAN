"use server";
/**
 * Admin server actions. EVERY action starts with requireAdmin() — never rely on the page being hidden.
 * Sensitive changes are written to the audit log.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/server/auth";
import { approvePartner, decideWithdrawal, freezePartner, rejectPartner, unfreezePartner } from "@/server/partners";
import { audit } from "@/server/audit";
import { DEFAULTS, setSetting, type SettingKey } from "@/server/settings";
import { landingDefaults, type LandingSectionKey } from "@/content/landing";

type Result = { ok: boolean; error?: string };
const fail = (e: unknown): Result => ({ ok: false, error: e instanceof Error ? e.message : String(e) });

export async function approvePartnerAction(form: FormData) {
  const admin = await requireAdmin();
  await approvePartner(admin.id, String(form.get("partnerId")), String(form.get("code") ?? "") || undefined);
  revalidatePath("/admin/partners");
  if (form.get("back") === "1") redirect("/admin/partners?done=approved");
}

export async function rejectPartnerAction(form: FormData) {
  const admin = await requireAdmin();
  await rejectPartner(admin.id, String(form.get("partnerId")), String(form.get("reason") || "Abhi aapka page humare criteria se match nahi karta."));
  revalidatePath("/admin/partners");
  if (form.get("back") === "1") redirect("/admin/partners?done=rejected");
}

export async function freezePartnerAction(_: unknown, form: FormData): Promise<Result> {
  const admin = await requireAdmin();
  const r = await freezePartner(admin.id, String(form.get("partnerId")), String(form.get("reason") ?? ""));
  revalidatePath("/admin/partners");
  return r;
}

export async function unfreezePartnerAction(form: FormData) {
  const admin = await requireAdmin();
  await unfreezePartner(admin.id, String(form.get("partnerId")));
  revalidatePath("/admin/partners");
}

export async function setPartnerRateAction(form: FormData) {
  const admin = await requireAdmin();
  const partnerId = String(form.get("partnerId"));
  const productId = String(form.get("productId"));
  const pct = Number(form.get("ratePct"));
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return;
  const before = await db.partnerCommissionRate.findUnique({ where: { partnerId_productId: { partnerId, productId } } });
  await db.partnerCommissionRate.upsert({
    where: { partnerId_productId: { partnerId, productId } },
    create: { partnerId, productId, rateBps: Math.round(pct * 100) },
    update: { rateBps: Math.round(pct * 100) },
  });
  await audit({ actorId: admin.id, action: "commission.rate_change", entity: "Partner", entityId: partnerId, before: { productId, rateBps: before?.rateBps ?? null }, after: { productId, rateBps: Math.round(pct * 100) } });
  revalidatePath("/admin/partners");
}

export async function payoutDecisionAction(_: unknown, form: FormData): Promise<Result> {
  const admin = await requireAdmin();
  const id = String(form.get("payoutId"));
  const action = String(form.get("action"));
  try {
    if (action === "approve") await decideWithdrawal(admin.id, id, { action: "approve" });
    else if (action === "reject") await decideWithdrawal(admin.id, id, { action: "reject", reason: String(form.get("reason") || "Rejected by admin") });
    else if (action === "paid") await decideWithdrawal(admin.id, id, { action: "paid", reference: String(form.get("reference") ?? "") });
    else return { ok: false, error: "Unknown action" };
  } catch (e) {
    return fail(e);
  }
  // Notify partner (email)
  const p = await db.payout.findUnique({ where: { id }, include: { partner: { include: { user: true } } } });
  if (p) {
    const { notify } = await import("@/server/notify");
    const { formatINR } = await import("@/lib/money");
    const subject = action === "paid" ? `Payment bhej diya: ${formatINR(p.netPaise)} ✅` : action === "approve" ? "Withdrawal approve ho gaya 👍" : "Withdrawal update";
    void notify(p.partner.user.email, "payoutUpdate", { name: p.partner.displayName, subject, status: p.status, amountPaise: p.netPaise, reference: p.reference, reason: p.rejectReason });
  }
  revalidatePath("/admin/payouts");
  return { ok: true };
}

const lessonSchema = z.object({
  lessonId: z.string(),
  title: z.string().trim().min(1).max(200),
  videoProvider: z.enum(["mux", "hls", "demo"]),
  videoRef: z.string().trim().max(200),
  durationMin: z.coerce.number().min(0).max(600),
  isFreePreview: z.string().optional(),
  published: z.string().optional(),
});

export async function updateLessonAction(_: unknown, form: FormData): Promise<Result> {
  await requireAdmin();
  const p = lessonSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  await db.lesson.update({
    where: { id: p.data.lessonId },
    data: { title: p.data.title, videoProvider: p.data.videoProvider, videoRef: p.data.videoRef || null, durationSec: Math.round(p.data.durationMin * 60), isFreePreview: !!p.data.isFreePreview, published: !!p.data.published },
  });
  revalidatePath("/admin/courses");
  revalidatePath("/");
  return { ok: true };
}

const priceSchema = z.object({
  productId: z.string(),
  amountRupees: z.coerce.number().int().min(1).max(1_000_000),
  label: z.string().trim().max(60).optional().default(""),
  endsAt: z.string().optional().default(""),
});

/** New price row = price change (old rows stay as history). Optional REAL deadline → countdown + auto switch back. */
export async function addPriceAction(_: unknown, form: FormData): Promise<Result> {
  const admin = await requireAdmin();
  const p = priceSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const endsAt = p.data.endsAt ? new Date(`${p.data.endsAt}:00+05:30`) : null; // admin types IST
  if (endsAt && (isNaN(endsAt.getTime()) || endsAt <= new Date())) return { ok: false, error: "Deadline future mein honi chahiye" };
  const row = await db.price.create({ data: { productId: p.data.productId, amountPaise: p.data.amountRupees * 100, label: p.data.label || null, endsAt } });
  await audit({ actorId: admin.id, action: "price.change", entity: "Product", entityId: p.data.productId, after: { amountPaise: row.amountPaise, label: row.label, endsAt } });
  revalidatePath("/admin/pricing");
  revalidatePath("/");
  return { ok: true };
}

const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/, "Code: 3-32 letters/numbers"),
  kind: z.enum(["PERCENT", "FLAT"]),
  value: z.coerce.number().positive(),
  maxUses: z.coerce.number().int().min(0).optional().default(0),
  endsAt: z.string().optional().default(""),
});

export async function createCouponAction(_: unknown, form: FormData): Promise<Result> {
  const admin = await requireAdmin();
  const p = couponSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  if (p.data.kind === "PERCENT" && p.data.value > 90) return { ok: false, error: "Max 90%" };
  try {
    await db.coupon.create({
      data: {
        code: p.data.code,
        kind: p.data.kind,
        value: p.data.kind === "PERCENT" ? Math.round(p.data.value * 100) : Math.round(p.data.value * 100),
        maxUses: p.data.maxUses || null,
        endsAt: p.data.endsAt ? new Date(`${p.data.endsAt}:00+05:30`) : null,
      },
    });
  } catch {
    return { ok: false, error: "Ye code pehle se hai" };
  }
  await audit({ actorId: admin.id, action: "coupon.create", entity: "Coupon", entityId: p.data.code, after: p.data });
  revalidatePath("/admin/pricing");
  return { ok: true };
}

export async function toggleCouponAction(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("couponId"));
  const c = await db.coupon.findUniqueOrThrow({ where: { id } });
  await db.coupon.update({ where: { id }, data: { active: !c.active } });
  await audit({ actorId: admin.id, action: "coupon.toggle", entity: "Coupon", entityId: id, before: { active: c.active }, after: { active: !c.active } });
  revalidatePath("/admin/pricing");
}

export async function saveContentAction(_: unknown, form: FormData): Promise<Result> {
  const admin = await requireAdmin();
  const key = String(form.get("key")) as LandingSectionKey;
  if (!(key in landingDefaults)) return { ok: false, error: "Unknown section" };
  let data: unknown;
  try {
    data = JSON.parse(String(form.get("json")));
  } catch (e) {
    return { ok: false, error: `JSON error: ${(e as Error).message}` };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, error: "Section must be a JSON object" };
  await db.contentBlock.upsert({ where: { key }, create: { key, data: data as never }, update: { data: data as never } });
  await audit({ actorId: admin.id, action: "content.update", entity: "ContentBlock", entityId: key });
  revalidatePath("/");
  return { ok: true };
}

export async function resetContentAction(form: FormData) {
  await requireAdmin();
  await db.contentBlock.deleteMany({ where: { key: String(form.get("key")) } });
  revalidatePath("/");
  revalidatePath("/admin/content");
}

export async function saveSettingsAction(_: unknown, form: FormData): Promise<Result> {
  const admin = await requireAdmin();
  const changes: Record<string, unknown> = {};
  for (const key of Object.keys(DEFAULTS) as SettingKey[]) {
    const def = DEFAULTS[key];
    if (typeof def === "boolean") changes[key] = form.get(key) === "on";
    else if (!form.has(key)) continue;
    else if (typeof def === "number") {
      const n = Number(form.get(key));
      if (!Number.isFinite(n) || n < 0) return { ok: false, error: `${key} must be a positive number` };
      changes[key] = n;
    } else changes[key] = String(form.get(key)).trim();
  }
  for (const [k, v] of Object.entries(changes)) await setSetting(k as SettingKey, v as never);
  await audit({ actorId: admin.id, action: "settings.update", entity: "Setting", after: changes });
  revalidatePath("/", "layout");
  return { ok: true };
}

const testimonialSchema = z.object({
  name: z.string().trim().min(1).max(80),
  city: z.string().trim().max(60).optional().default(""),
  quote: z.string().trim().min(5).max(600),
  result: z.string().trim().max(120).optional().default(""),
  imageUrl: z.string().trim().url().or(z.literal("")).optional().default(""),
  videoUrl: z.string().trim().url().or(z.literal("")).optional().default(""),
  proofUrl: z.string().trim().url().or(z.literal("")).optional().default(""),
  consent: z.literal("on", { message: "Tick consent: the student agreed to be featured" }),
});

export async function addTestimonialAction(_: unknown, form: FormData): Promise<Result> {
  const admin = await requireAdmin();
  const p = testimonialSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, error: p.error.issues[0].message };
  const { consent: _consent, ...d } = p.data;
  await db.testimonial.create({
    data: { ...d, city: d.city || null, result: d.result || null, imageUrl: d.imageUrl || null, videoUrl: d.videoUrl || null, proofUrl: d.proofUrl || null, consentAt: new Date(), published: true },
  });
  await audit({ actorId: admin.id, action: "testimonial.create", entity: "Testimonial", after: { name: p.data.name } });
  revalidatePath("/");
  revalidatePath("/admin/content");
  return { ok: true };
}

export async function toggleTestimonialAction(form: FormData) {
  await requireAdmin();
  const id = String(form.get("id"));
  const t = await db.testimonial.findUniqueOrThrow({ where: { id } });
  if (!t.published && !t.consentAt) return; // never publish without recorded consent
  await db.testimonial.update({ where: { id }, data: { published: !t.published } });
  revalidatePath("/");
  revalidatePath("/admin/content");
}
