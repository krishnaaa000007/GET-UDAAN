import Link from "next/link";
import { BookOpen, Download, House, User } from "lucide-react";
import { Logo } from "@/components/logo";
import t from "@/content/hi-Latn/student.json";
import { cn } from "@/lib/cn";
import type { CurrentUser } from "@/server/auth";

const navLink = "inline-flex min-h-12 items-center rounded-sm px-2 font-semibold md:px-3 text-ink-muted transition-colors duration-150 hover:text-ink";

/**
 * Header for logged-in areas (student / partner / admin). Shows only the links the user's roles allow.
 *  - sticky={false}: header scrolls away (lesson page, where the VIDEO sticks to the top instead)
 *  - studentTabs: adds the phone bottom tab bar (Home, Courses, Downloads, Profile)
 */
export function AppShell({ user, children, wide = false, sticky = true, studentTabs = false }: { user: CurrentUser; children: React.ReactNode; wide?: boolean; sticky?: boolean; studentTabs?: boolean }) {
  const s = t.shell;
  const links = [
    { href: "/dashboard", label: s.courses, show: true },
    { href: "/partner", label: s.partner, show: user.roles.includes("PARTNER") },
    { href: "/admin", label: s.admin, show: user.roles.includes("ADMIN") },
  ].filter((l) => l.show);
  const tabs = [
    { href: "/dashboard", label: s.tabs.home, icon: House },
    { href: "/dashboard#courses", label: s.tabs.courses, icon: BookOpen },
    { href: "/dashboard#downloads", label: s.tabs.downloads, icon: Download },
    { href: "/dashboard#profile", label: s.tabs.profile, icon: User },
  ];
  return (
    <>
      <header className={cn("z-30 border-b border-line bg-surface", sticky && "sticky top-0")}>
        <div className={cn("mx-auto flex h-16 w-full items-center justify-between gap-3 px-4 md:px-6", wide ? "max-w-7xl" : "max-w-[1120px]")}>
          {/* Phones with extra menu links get the small mark so the links fit; everyone else gets the full logo. */}
          <span className={links.length > 1 ? "md:hidden" : "hidden"}>
            <Logo href="/dashboard" variant="mark" className="h-9" />
          </span>
          <span className={links.length > 1 ? "hidden md:block" : undefined}>
            <Logo href="/dashboard" />
          </span>
          <nav aria-label={s.navLabel} className="flex items-center">
            {links.length > 1 &&
              links.map((l) => (
                <Link key={l.href} href={l.href} className={navLink}>
                  {l.label}
                </Link>
              ))}
            <form action="/auth/logout" method="post">
              <button className={navLink}>{s.logout}</button>
            </form>
          </nav>
        </div>
      </header>
      {children}
      {studentTabs && (
        <nav aria-label={s.tabsLabel} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface-raised pb-[env(safe-area-inset-bottom)] shadow-lift md:hidden [body:has(dialog[open])_&]:hidden">
          <ul className="grid grid-cols-4">
            {tabs.map((tab) => (
              <li key={tab.label}>
                <Link href={tab.href} className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-ink-muted hover:text-ink">
                  <tab.icon aria-hidden className="size-6" />
                  <span className="type-small">{tab.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}
