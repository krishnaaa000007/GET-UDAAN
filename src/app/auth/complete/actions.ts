"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth";

const phoneSchema = z
  .string()
  .transform((s) => s.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, ""))
  .refine((s) => /^[6-9]\d{9}$/.test(s), "10 digit ka sahi mobile number daaliye");

export async function savePhoneAction(form: FormData): Promise<void> {
  const u = await requireUser("/auth/complete");
  const phone = phoneSchema.safeParse(String(form.get("phone") ?? ""));
  if (!phone.success) redirect("/auth/complete?err=phone");
  await db.user.update({ where: { id: u.id }, data: { phone: phone.data } });
  const nextRaw = String(form.get("next") ?? "/dashboard");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";
  redirect(next);
}
