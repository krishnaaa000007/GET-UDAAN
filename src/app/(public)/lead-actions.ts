"use server";

// Saves a free-lesson opt-in (a "lead"): name + WhatsApp number + consent.
// If the visitor came from a partner link, the partner is remembered on the lead.
import { cookies, headers } from "next/headers";
import shell from "@/content/hi-Latn/shell.json";
import { hashIp } from "@/lib/crypto";
import { db } from "@/lib/db";
import { cleanIndianMobile } from "@/lib/phone";
import { decodeRefCookie } from "@/server/attribution";
import { rateLimit } from "@/server/rate-limit";

type Values = { name: string; phone: string; consent: boolean };
// On an error we send back what the visitor typed, so the form does not go blank.
export type LeadResult = { ok: true } | { ok: false; values: Values; errors: { name?: string; phone?: string; consent?: string; form?: string } } | null;

const E = shell.leadSheet.errors;

export async function submitLeadAction(_prev: LeadResult, form: FormData): Promise<LeadResult> {
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const phone = cleanIndianMobile(String(form.get("phone") ?? "")); // "+91 98765 43210" → "9876543210"
  const consent = form.get("consent") === "on";
  const values: Values = { name, phone, consent };

  const errors: { name?: string; phone?: string; consent?: string } = {};
  if (name.length < 2) errors.name = E.name;
  if (!/^[6-9]\d{9}$/.test(phone)) errors.phone = E.phone;
  if (!consent) errors.consent = E.consent;
  if (Object.keys(errors).length) return { ok: false, values, errors };

  try {
    const h = await headers();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const rl = await rateLimit(`lead:${hashIp(ip) ?? "anon"}`, 10, 60 * 60);
    if (!rl.ok) return { ok: false, values, errors: { form: E.rate } };

    const jar = await cookies();
    const visitorId = jar.get("rb_vid")?.value ?? null;
    const ref = decodeRefCookie(jar.get("rb_ref")?.value);
    const partner = ref ? await db.partner.findUnique({ where: { code: ref.code }, select: { id: true, status: true } }) : null;
    const credited = partner?.status === "APPROVED" ? partner : null;
    const visitor = visitorId ? await db.visitor.findUnique({ where: { id: visitorId }, select: { utmSource: true, utmMedium: true, utmCampaign: true } }) : null;

    await db.lead.create({
      data: {
        name,
        phone,
        visitorId,
        partnerId: credited?.id ?? null,
        clickId: credited ? (ref?.clickId ?? null) : null,
        campaign: credited ? (ref?.campaign ?? null) : null,
        utmSource: visitor?.utmSource ?? null,
        utmMedium: visitor?.utmMedium ?? null,
        utmCampaign: visitor?.utmCampaign ?? null,
        consentAt: new Date(),
      },
    });
    return { ok: true };
  } catch (e) {
    console.error("lead save failed", e);
    return { ok: false, values, errors: { form: E.generic } };
  }
}
