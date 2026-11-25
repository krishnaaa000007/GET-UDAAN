/**
 * /auth/complete — first-time Google sign-in sends the person here to add a WhatsApp number.
 * Shown only when the logged-in user has no phone on file; a user who already has one is sent on.
 */
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/form";
import { db } from "@/lib/db";
import { requireUser } from "@/server/auth";
import { savePhoneAction } from "./actions";

export const metadata: Metadata = { title: "Account complete", robots: { index: false } };

export default async function CompleteProfilePage({ searchParams }: PageProps<"/auth/complete">) {
  const sp = await searchParams;
  const nextRaw = typeof sp.next === "string" ? sp.next : "/dashboard";
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";
  const u = await requireUser(`/auth/complete?next=${encodeURIComponent(next)}`);
  const row = await db.user.findUniqueOrThrow({ where: { id: u.id }, select: { phone: true } });
  if (row.phone) redirect(next);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-6">
      <Logo variant="on-light" />
      <div className="card mt-10 p-6">
        <h1 className="font-display text-3xl">Ek aur step</h1>
        <p className="mt-1 mb-6 text-sm text-ink-muted">Apna WhatsApp number daalein — course updates, receipts aur alerts isi par aayenge.</p>
        <form action={savePhoneAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <PhoneInput label="WhatsApp number" name="phone" required />
          <Button type="submit" block arrow data-cta="auth_complete_phone">
            Save karo
          </Button>
          <p className="text-center text-xs text-ink-muted">Hum aapka number kabhi sell nahi karte.</p>
        </form>
      </div>
    </main>
  );
}
