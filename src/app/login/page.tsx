import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/server/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Login", robots: { index: false } };

const REASONS: Record<string, string> = {
  device: "Aapka account kisi aur device pe login hua, isliye yahan se logout ho gaya. (Ek account max 2 devices pe chal sakta hai.)",
  expired: "Login link expire ho gaya ya pehle use ho chuka hai. Neeche apna email daal kar naya code mangaiye.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/dashboard";
  if (await getCurrentUser()) redirect(next);
  const reason = typeof sp.reason === "string" ? REASONS[sp.reason] : undefined;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-6">
      <Logo />
      <div className="mt-10 card p-6">
        <h1 className="font-display text-3xl">Login karein</h1>
        <p className="mt-1 mb-6 text-sm text-ink-muted">Apne course, progress aur downloads tak pahunchein.</p>
        {reason && <p className="mb-4 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm text-gold-text">{reason}</p>}
        <LoginForm next={next} />
      </div>
    </main>
  );
}
