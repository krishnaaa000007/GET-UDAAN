import Link from "next/link";
import { Logo } from "@/components/logo";
import type { CurrentUser } from "@/server/auth";

/** Header for logged-in areas (student / partner / admin). Shows only the links the user's roles allow. */
export function AppShell({ user, children, wide = false }: { user: CurrentUser; children: React.ReactNode; wide?: boolean }) {
  const links = [
    { href: "/dashboard", label: "Courses", show: true },
    { href: "/partner", label: "Partner", show: user.roles.includes("PARTNER") },
    { href: "/admin", label: "Admin", show: user.roles.includes("ADMIN") },
  ].filter((l) => l.show);
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/60 bg-ink/90 backdrop-blur">
        <div className={`mx-auto flex h-14 items-center justify-between gap-3 px-4 ${wide ? "max-w-7xl" : "max-w-5xl"}`}>
          <Logo href="/dashboard" />
          <nav className="flex items-center gap-1 text-sm">
            {links.length > 1 &&
              links.map((l) => (
                <Link key={l.href} href={l.href} className="rounded-lg px-2.5 py-1.5 text-muted hover:bg-panel hover:text-white">
                  {l.label}
                </Link>
              ))}
            <form action="/auth/logout" method="post">
              <button className="rounded-lg px-2.5 py-1.5 text-muted hover:bg-panel hover:text-white">Logout</button>
            </form>
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}
