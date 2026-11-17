import Link from "next/link";
import { requireAdmin } from "@/server/auth";
import { AppShell } from "@/components/app-shell";

const NAV = [
  ["/admin", "Overview"],
  ["/admin/orders", "Orders"],
  ["/admin/partners", "Partners"],
  ["/admin/payouts", "Withdrawals"],
  ["/admin/students", "Students"],
  ["/admin/projects", "DWY projects"],
  ["/admin/courses", "Courses"],
  ["/admin/pricing", "Pricing & coupons"],
  ["/admin/content", "Landing content"],
  ["/admin/settings", "Settings"],
] as const;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin(); // every /admin page is server-side protected
  return (
    <AppShell user={user} wide>
      <div className="mx-auto max-w-7xl px-4 py-4">
        <nav className="no-scrollbar -mx-4 mb-5 flex gap-1 overflow-x-auto px-4 text-sm">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-ink-muted hover:border-gold hover:text-ink">
              {label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </AppShell>
  );
}
