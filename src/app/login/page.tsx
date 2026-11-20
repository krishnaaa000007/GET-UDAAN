import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/server/auth";
import { googleEnabled } from "@/server/google-oauth";
import { GoogleButton } from "@/components/auth/google-button";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Login", robots: { index: false } };

const REASONS: Record<string, string> = {
  device: "Aapka account kisi aur device pe login hua, isliye yahan se logout ho gaya. (Ek account max 2 devices pe chal sakta hai.)",
  expired: "Login link expire ho gaya ya pehle use ho chuka hai. Neeche apna email daal kar naya code mangaiye.",
  google_failed: "Google se login nahi ho paya. Dobara try karein ya email code use karein.",
  google_cancelled: "Google login cancel kar diya. Phir se try karein ya email code use karein.",
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
        {googleEnabled() && (
          <>
            <GoogleButton next={next} label="Google se login karein" />
            <div className="my-5 flex items-center gap-3 text-xs text-ink-muted">
              <span className="h-px flex-1 bg-line" aria-hidden />
              <span>ya email code se</span>
              <span className="h-px flex-1 bg-line" aria-hidden />
            </div>
          </>
        )}
        <LoginForm next={next} />
      </div>
    </main>
  );
}
