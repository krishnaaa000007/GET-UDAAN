"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth";
import { requestWithdrawal } from "@/server/partners";

/** The partner is ALWAYS resolved from the logged-in session — never from form input. */
async function myPartner() {
  const user = await requireRole("PARTNER", "/partner");
  const partner = await db.partner.findUnique({ where: { userId: user.id } });
  if (!partner || partner.status !== "APPROVED") throw new Error("Not an approved partner");
  return partner;
}

export async function withdrawAction(_: unknown, form: FormData): Promise<{ ok: boolean; error?: string }> {
  const partner = await myPartner();
  const rupees = Number(String(form.get("amount") ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(rupees) || rupees <= 0) return { ok: false, error: "Sahi amount daaliye" };
  const r = await requestWithdrawal(partner.id, Math.round(rupees * 100));
  if (r.ok) revalidatePath("/partner");
  return r;
}

const payoutSchema = z.object({
  upiId: z.string().trim().max(80).refine((s) => s === "" || /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(s), "UPI ID jaise name@okaxis"),
  bankAccountName: z.string().trim().max(80),
  bankAccountNumber: z.string().trim().max(30).refine((s) => s === "" || /^\d{6,20}$/.test(s), "Sahi account number"),
  bankIfsc: z.string().trim().toUpperCase().refine((s) => s === "" || /^[A-Z]{4}0[A-Z0-9]{6}$/.test(s), "Sahi IFSC"),
});

export async function updatePayoutDetailsAction(_: unknown, form: FormData): Promise<{ ok: boolean; error?: string }> {
  const partner = await myPartner();
  const parsed = payoutSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (!d.upiId && !(d.bankAccountNumber && d.bankIfsc)) return { ok: false, error: "UPI ID ya bank details (account + IFSC) daaliye" };
  await db.partner.update({
    where: { id: partner.id },
    data: { upiId: d.upiId || null, bankAccountName: d.bankAccountName || null, bankAccountNumber: d.bankAccountNumber || null, bankIfsc: d.bankIfsc || null, payoutDetailsUpdatedAt: new Date() },
  });
  revalidatePath("/partner");
  return { ok: true };
}
