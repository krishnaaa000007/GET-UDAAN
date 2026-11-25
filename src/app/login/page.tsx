import type { Metadata } from "next";
import Link from "next/link";
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

/** Student | Partner tabs only choose where you land after login. It is still ONE account: someone with
 *  both roles switches inside the app. A new partner's "signup" is the application on /partners. */
const MODES = {
  student: {
    title: "Login karein",
    sub: "Apne courses, progress aur downloads tak pahunchein.",
    home: "/dashboard",
    newText: "Naye ho? Pehle course dekho",
    newHref: "/#pricing",
  },
  partner: {
    title: "Partner login",
    sub: "Apni sales, commission aur wallet dekhein.",
    home: "/partner",
    newText: "Abhi partner nahi ho? Apply karo — free hai",
    newHref: "/partners#apply",
  },
} as const;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const asked = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : null;
  const mode: keyof typeof MODES = sp.as === "partner" || (!sp.as && asked?.startsWith("/partner")) ? "partner" : "student";
  const m = MODES[mode];
  // A page that sent the person here wins; otherwise the tab decides where they land.
  const next = asked && !(sp.as && (asked === "/dashboard" || asked === "/partner")) ? asked : m.home;
  if (await getCurrentUser()) redirect(next);
  const reason = typeof sp.reason === "string" ? REASONS[sp.reason] : undefined;
  const tabHref = (k: keyof typeof MODES) => `/login?as=${k}${asked && asked !== "/dashboard" && asked !== "/partner" ? `&next=${encodeURIComponent(asked)}` : ""}`;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-6">
      <Logo variant="on-light" />
      <div className="mt-8 card p-6">
        <div role="tablist" aria-label="Login as" className="mb-6 grid grid-cols-2 rounded-pill border border-line bg-surface-sunken p-1 text-sm font-semibold">
          {(Object.keys(MODES) as (keyof typeof MODES)[]).map((k) => (
            <Link
              key={k}
              href={tabHref(k)}
              role="tab"
              aria-selected={k === mode}
              replace
              className={`inline-flex min-h-10 items-center justify-center rounded-pill px-3 transition-colors duration-150 ${k === mode ? "bg-gold text-on-gold" : "text-ink-muted hover:text-ink"}`}
            >
              {k === "student" ? "Student" : "Partner"}
            </Link>
          ))}
        </div>
        <h1 className="font-display text-3xl">{m.title}</h1>
        <p className="mt-1 mb-6 text-sm text-ink-muted">{m.sub}</p>
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
        <LoginForm key={mode} next={next} />
        <p className="mt-6 border-t border-line pt-4 text-center text-sm text-ink-muted">
          <Link href={m.newHref} className="inline-flex min-h-11 items-center font-semibold text-gold-text underline underline-offset-4">
            {m.newText}
          </Link>
        </p>
      </div>
    </main>
  );
}
