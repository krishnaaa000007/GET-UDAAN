/** PROFILE — account details, purchases, logged-in devices, partner link, logout. */
import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, LogOut } from "lucide-react";
import { AppFrame } from "@/components/app/app-frame";
import { Highlight } from "@/components/ui/basics";
import t from "@/content/hi-Latn/student.json";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { formatIST, timeAgo } from "@/lib/time";
import { requireUser } from "@/server/auth";
import { getSettings, supportWhatsappHref } from "@/server/settings";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

const card = "rounded-lg border border-line bg-surface-raised p-4 md:p-6";

export default async function Profile({ searchParams }: PageProps<"/dashboard/profile">) {
  const sp = await searchParams;
  const user = await requireUser("/dashboard/profile");
  const [row, orders, sessions, settings, partner] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: user.id }, select: { phone: true, googleSub: true } }),
    db.order.findMany({ where: { userId: user.id, status: { in: ["PAID", "REFUNDED", "PARTIALLY_REFUNDED"] } }, orderBy: { paidAt: "desc" }, include: { items: true } }),
    db.session.findMany({ where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" } }),
    getSettings(),
    db.partner.findUnique({ where: { userId: user.id }, select: { status: true } }),
  ]);
  const d = t.dashboard.profile;
  const p = t.profilePage;
  const masked = row.phone ? `${row.phone.slice(0, 2)}XXXXX${row.phone.slice(-3)}` : null;

  return (
    <AppFrame user={user} mode="student" active="profile" supportHref={supportWhatsappHref(settings)}>
      <div className="flex flex-col gap-6">
        {sp.denied && (
          <p role="alert" className="flex items-start gap-2 rounded-sm border border-fire bg-surface-raised p-3 text-ink">
            <CircleAlert aria-hidden className="mt-0.5 size-5 flex-none text-fire" />
            {t.dashboard.denied}
          </p>
        )}
        <h1 className="type-heading text-ink">
          <Highlight text={p.title} />
        </h1>

        <section className={card}>
          <h2 className="type-title text-ink">{p.account}</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="type-label text-ink-muted">{p.name}</dt>
              <dd className="text-ink">{user.name ?? p.notSet}</dd>
            </div>
            <div className="min-w-0">
              <dt className="type-label text-ink-muted">{p.email}</dt>
              <dd className="truncate text-ink">{user.email}</dd>
              {row.googleSub && <dd className="type-small text-ink-muted">{p.google}</dd>}
            </div>
            <div>
              <dt className="type-label text-ink-muted">{p.phone}</dt>
              <dd className="text-ink">
                {masked ?? (
                  <Link href="/auth/complete?next=/dashboard/profile" className="font-semibold text-gold-text underline underline-offset-4">
                    {p.addPhone}
                  </Link>
                )}
              </dd>
            </div>
          </dl>
        </section>

        {orders.length > 0 && (
          <section className={card}>
            <h2 className="type-title text-ink">{d.purchases}</h2>
            <ul className="mt-2 divide-y divide-line">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="text-ink">{o.items.map((i) => i.name).join(" + ")}</span>
                    <span className="type-small text-ink-muted">
                      {d.order.replace("{number}", String(o.number))}
                      {o.paidAt ? ` • ${formatIST(o.paidAt, "date")}` : ""}
                      {o.status === "REFUNDED" ? ` • ${d.refunded}` : o.status === "PARTIALLY_REFUNDED" ? ` • ${d.partRefunded}` : ""}
                    </span>
                  </span>
                  <span className="flex-none font-semibold text-ink tabular-nums">{formatINR(o.totalPaise)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className={card}>
          <h2 className="type-title text-ink">{d.devices.replace("{n}", String(sessions.length)).replace("{max}", String(settings.maxDevices))}</h2>
          <p className="type-small mt-1 text-ink-muted">{d.devicesHint.replace("{max}", String(settings.maxDevices))}</p>
          <ul className="mt-3 flex flex-col gap-2">
            {sessions.map((s) => (
              <li key={s.id} className="flex justify-between gap-3">
                <span className="text-ink">
                  {s.deviceLabel} {s.id === user.sessionId && <b className="text-gold-text">({d.thisDevice})</b>}
                </span>
                <span className="type-small flex-none text-ink-muted">{timeAgo(s.lastSeenAt)}</span>
              </li>
            ))}
          </ul>
        </section>

        {!partner && (
          <p className="text-ink-muted">
            {d.partner}{" "}
            <Link href="/partners" className="inline-flex min-h-12 items-center font-semibold text-gold-text underline underline-offset-4">
              {d.partnerCta}
            </Link>
          </p>
        )}

        <form action="/auth/logout" method="post" className="lg:hidden">
          <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-line font-semibold text-ink-muted hover:text-ink">
            <LogOut aria-hidden className="size-5" />
            {t.app.logout}
          </button>
        </form>
      </div>
    </AppFrame>
  );
}
