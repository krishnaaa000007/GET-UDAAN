/**
 * APP FRAME — the logged-in "web app" shell for students and partners.
 *  - Desktop (lg+): fixed left sidebar (logo, Student ⇄ Partner switch, menu, account + logout).
 *  - Phone: slim top bar (logo + switch) and a bottom tab bar, like a native app.
 * Every menu item is its own page. Admin keeps its own layout; the lesson player keeps AppShell.
 */
import Link from "next/link";
import { BookOpen, Compass, House, LogOut, MessageCircle, MessagesSquare, ReceiptIndianRupee, Shield, Sparkles, User, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Logo } from "@/components/logo";
import t from "@/content/hi-Latn/student.json";
import { cn } from "@/lib/cn";
import type { CurrentUser } from "@/server/auth";

const a = t.app;

export type StudentKey = "home" | "courses" | "project" | "explore" | "profile";
export type PartnerKey = "p-home" | "p-sales" | "p-team" | "p-wallet";
/** `short`: label for the phone tab bar, where 5 tabs share the width. */
type Item = { key: StudentKey | PartnerKey; href: string; label: string; short?: string; icon: LucideIcon };

const STUDENT: Item[] = [
  { key: "home", href: "/dashboard", label: a.nav.home, icon: House },
  { key: "courses", href: "/dashboard/courses", label: a.nav.courses, short: a.nav.coursesShort, icon: BookOpen },
  { key: "explore", href: "/dashboard/explore", label: a.nav.explore, icon: Compass },
  { key: "profile", href: "/dashboard/profile", label: a.nav.profile, icon: User },
];

function partnerItems(showTeam: boolean): Item[] {
  return [
    { key: "p-home", href: "/partner", label: a.nav.pHome, icon: House },
    { key: "p-sales", href: "/partner?tab=sales", label: a.nav.pSales, icon: ReceiptIndianRupee },
    ...(showTeam ? [{ key: "p-team" as const, href: "/partner?tab=team", label: a.nav.pTeam, icon: Users }] : []),
    { key: "p-wallet", href: "/partner?tab=wallet", label: a.nav.pWallet, icon: Wallet },
  ];
}

export function AppFrame({
  user,
  mode,
  active,
  children,
  showTeam = false,
  partnerNav = true,
  supportHref,
}: {
  user: CurrentUser;
  mode: "student" | "partner";
  active?: StudentKey | PartnerKey;
  children: React.ReactNode;
  /** Partner mode: show the Team tab (only while the team bonus is on). */
  showTeam?: boolean;
  /** Partner mode: false for "not approved yet" pages, which get no partner menu. */
  partnerNav?: boolean;
  /** wa.me link when a real support number is set; hidden otherwise. */
  supportHref?: string;
}) {
  const isPartner = user.roles.includes("PARTNER");
  const isAdmin = user.roles.includes("ADMIN");
  // Done-for-you buyers get a "Project" item (their page to work with the team).
  const studentItems = user.roles.includes("SERVICE_CLIENT")
    ? [...STUDENT.slice(0, 2), { key: "project" as const, href: "/dashboard/project", label: a.nav.project, icon: MessagesSquare }, ...STUDENT.slice(2)]
    : STUDENT;
  const items = mode === "student" ? studentItems : partnerNav ? partnerItems(showTeam) : [];
  const firstName = user.name?.trim().split(/\s+/)[0];

  // Only people with both roles get the switch.
  const switcher = isPartner ? (
    <div role="group" aria-label={a.switchLabel} className="grid grid-cols-2 rounded-pill border border-line bg-surface-sunken p-1 text-sm font-semibold">
      {(["student", "partner"] as const).map((m) => (
        <Link
          key={m}
          href={m === "student" ? "/dashboard" : "/partner"}
          aria-current={m === mode ? "page" : undefined}
          className={cn("inline-flex min-h-9 items-center justify-center rounded-pill px-3 transition-colors duration-150", m === mode ? "bg-gold text-on-gold" : "text-ink-muted hover:text-ink")}
        >
          {m === "student" ? a.student : a.partner}
        </Link>
      ))}
    </div>
  ) : null;

  const extra: { href: string; label: string; icon: LucideIcon; external?: boolean }[] = [
    ...(mode === "student" && !isPartner ? [{ href: "/partners", label: a.becomePartner, icon: Sparkles }] : []),
    ...(supportHref ? [{ href: supportHref, label: a.support, icon: MessageCircle, external: true }] : []),
    ...(isAdmin ? [{ href: "/admin", label: a.admin, icon: Shield }] : []),
  ];

  return (
    <div className="min-h-dvh bg-surface">
      {/* ── Desktop sidebar ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface-raised lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo href={mode === "student" ? "/dashboard" : "/partner"} />
        </div>
        {switcher && <div className="px-4 pb-2">{switcher}</div>}
        <nav aria-label={a.navLabel} className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
          {items.map((it) => (
            <Link
              key={it.key}
              href={it.href}
              aria-current={it.key === active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-md px-3 font-semibold transition-colors duration-150",
                it.key === active ? "bg-gold-soft text-gold-text" : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
              )}
            >
              <it.icon aria-hidden className="size-5 flex-none" />
              {it.label}
            </Link>
          ))}
          {extra.length > 0 && <div className="my-3 border-t border-line" />}
          {extra.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              {...(e.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
            >
              <e.icon aria-hidden className="size-5 flex-none" />
              {e.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 border-t border-line p-4">
          <span aria-hidden className="grid size-10 flex-none place-items-center rounded-pill bg-gold-soft font-bold text-gold-text">
            {(firstName ?? user.email).slice(0, 1).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-semibold text-ink">{user.name ?? firstName ?? "Account"}</span>
            <span className="type-small truncate text-ink-muted">{user.email}</span>
          </span>
          <form action="/auth/logout" method="post">
            <button aria-label={a.logout} title={a.logout} className="grid size-10 place-items-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink">
              <LogOut aria-hidden className="size-5" />
            </button>
          </form>
        </div>
      </aside>

      {/* ── Phone top bar ── */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
        <Logo href={mode === "student" ? "/dashboard" : "/partner"} variant="mark" className="h-8" />
        {switcher ?? (
          <form action="/auth/logout" method="post">
            <button className="inline-flex min-h-11 items-center gap-2 rounded-sm px-2 text-sm font-semibold text-ink-muted hover:text-ink">
              <LogOut aria-hidden className="size-4" />
              {a.logout}
            </button>
          </form>
        )}
      </header>

      <div className="lg:pl-64">
        <main className={cn("mx-auto w-full max-w-5xl px-4 pt-5 md:px-8 lg:pt-8", items.length ? "pb-28 lg:pb-12" : "pb-12")}>{children}</main>
      </div>

      {/* ── Phone bottom tabs ── */}
      {items.length > 0 && (
        <nav aria-label={a.tabsLabel} className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface-raised pb-[env(safe-area-inset-bottom)] shadow-lift lg:hidden [body:has(dialog[open])_&]:hidden">
          <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
            {items.map((it) => (
              <li key={it.key}>
                <Link
                  href={it.href}
                  aria-current={it.key === active ? "page" : undefined}
                  className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5", it.key === active ? "text-gold-text" : "text-ink-muted hover:text-ink")}
                >
                  <it.icon aria-hidden className="size-6" />
                  <span className="type-small font-semibold whitespace-nowrap">{it.short ?? it.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
