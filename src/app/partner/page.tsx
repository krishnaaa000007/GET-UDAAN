/**
 * PARTNER DASHBOARD (DESIGN.md 7.7) — the most motivating screen on the site.
 * ONE action: share your link (the gold "Link Copy Karo" button).
 * Only this partner's data; buyers are masked.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { Crown, Lock, MousePointerClick, Percent, ShoppingBag, Trophy, UserPlus } from "lucide-react";
import { AppFrame } from "@/components/app/app-frame";
import { EarningsChart } from "@/components/charts/earnings-chart";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Badge, EmptyState, Highlight, SpeedTrails } from "@/components/ui/basics";
import { Button } from "@/components/ui/button";
import { ProgressBar, StatCard } from "@/components/ui/data";
import t from "@/content/hi-Latn/partner.json";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { PARTNER_RULES, releaseLabel } from "@/config/partners";
import { formatINR } from "@/lib/money";
import { formatIST, withinHours } from "@/lib/time";
import { requireUser } from "@/server/auth";
import { getEarningsByType, getPartnerDashboard, getPartnerLeaderboard, getPartnerTeam } from "@/server/partner-dashboard";
import { getSettings, supportWhatsappHref } from "@/server/settings";
import { CampaignLinkBuilder, CopyLine, CountUp, NewSalesBanner, PayoutDetailsForm, QuickActions, WithdrawForm } from "./client";

export const metadata: Metadata = { title: "Partner dashboard", robots: { index: false } };

const RANGES = [7, 30, 90] as const;
const TABS = ["overview", "sales", "team", "wallet"] as const;
type Tab = (typeof TABS)[number];
const D = t.dashboard;
const h2 = "type-heading text-ink";
const card = "rounded-md border border-line bg-surface-raised p-4 md:p-6";

function Notice({ title, text, cta }: { title: string; text?: string | null; cta?: { href: string; label: string } }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <SpeedTrails className="h-10 w-12" />
      <h1 className="type-display text-ink">
        <Highlight text={title} />
      </h1>
      {text && <p className="type-body-lg max-w-reading text-ink-muted">{text}</p>}
      {cta && (
        <Button href={cta.href} arrow>
          {cta.label}
        </Button>
      )}
    </div>
  );
}

export default async function PartnerPage({ searchParams }: PageProps<"/partner">) {
  const user = await requireUser("/partner");
  const partnerRow = await db.partner.findUnique({ where: { userId: user.id } });
  if (!partnerRow)
    return (
      <AppFrame user={user} mode="partner" partnerNav={false}>
        <div className="py-10">
          <EmptyState
            text={D.none.text}
            action={
              <Button href="/partners#apply" arrow>
                {D.none.cta}
              </Button>
            }
          />
        </div>
      </AppFrame>
    );
  if (partnerRow.status !== "APPROVED")
    return (
      <AppFrame user={user} mode="partner" partnerNav={false}>{partnerRow.status === "PENDING" ? <Notice title={D.pending.title} text={D.pending.text.replace("{approval}", PARTNER_RULES.approvalTargetHours)} /> : <Notice title={D.rejected.title} text={partnerRow.adminNote} />}</AppFrame>
    );

  const sp = await searchParams;
  const range = RANGES.find((r) => String(r) === sp.range) ?? 30;
  const [d, settings, lifetimeSales, byType] = await Promise.all([
    getPartnerDashboard(partnerRow.id, range),
    getSettings(),
    db.order.count({ where: { partnerId: partnerRow.id, status: "PAID" } }),
    getEarningsByType(partnerRow.id),
  ]);
  // Team tab only while the team bonus is switched on (or if this partner already earned team bonus).
  const showTeam = settings.teamBonusEnabled || byType.teamPaise > 0;
  const tabs = TABS.filter((x) => x !== "team" || showTeam);
  const tab: Tab = tabs.find((x) => x === sp.tab) ?? "overview";
  const team = tab === "team" ? await getPartnerTeam(partnerRow.id) : null;
  const release = releaseLabel(settings.commissionReleaseMinutes);
  const board = settings.showLeaderboard ? await getPartnerLeaderboard(partnerRow.id) : null;

  const link = `${env.appUrl}/?ref=${d.partner.code}`;
  const coupon = d.partner.coupons[0]?.code ?? null;
  const w = d.wallet;
  const lifetimeEarnings = w.availablePaise + w.pendingPaise + w.requestedPaise + w.paidPaise;
  const detailsLocked = withinHours(partnerRow.payoutDetailsUpdatedAt, 24);
  const hasPayout = !!(partnerRow.upiId || (partnerRow.bankAccountNumber && partnerRow.bankIfsc));
  const openRequest = d.payouts.some((p) => p.status === "REQUESTED" || p.status === "APPROVED");
  const disabledReason = partnerRow.frozenAt ? D.frozen.withdraw : !hasPayout ? D.withdraw.needDetails : detailsLocked ? D.withdraw.locked : openRequest ? D.withdraw.open : null;
  const best = d.campaigns.find((c) => c.sales > 0)?.campaign;
  const couponLine = coupon ? D.promo.couponLine.replace("{code}", coupon) : "";
  const split = [
    ["available", w.availablePaise],
    ["pending", w.pendingPaise],
    ["requested", w.requestedPaise],
    ["paid", w.paidPaise],
  ] as const;
  const stats = [
    { label: D.stats.clicks, value: d.totals.clicks.toLocaleString("en-IN"), spark: d.series.map((s) => s.clicks) },
    { label: D.stats.leads, value: d.totals.leads.toLocaleString("en-IN") },
    { label: D.stats.sales, value: d.totals.sales.toLocaleString("en-IN"), spark: d.series.map((s) => s.sales) },
    { label: D.stats.conversion, value: `${d.totals.conversionPct}%` },
  ];

  return (
    <AppFrame user={user} mode="partner" active={tab === "overview" ? "p-home" : tab === "sales" ? "p-sales" : tab === "team" ? "p-team" : "p-wallet"} showTeam={showTeam} supportHref={supportWhatsappHref(settings)}>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <p className="type-label text-gold-text">@{partnerRow.instagramHandle}</p>
          <h1 className="type-heading text-ink">
            <Highlight text={D.title} />
          </h1>
        </div>

        {partnerRow.frozenAt && (
          <p role="alert" className="rounded-md border border-fire bg-surface-raised p-4 text-ink">
            <strong className="text-fire">{D.frozen.title}</strong> {D.frozen.text}
            {partnerRow.frozenReason ? ` ${D.frozen.reason.replace("{reason}", partnerRow.frozenReason)}` : ""}
          </p>
        )}

        <NewSalesBanner partnerId={partnerRow.id} sales={d.sales.filter((s) => s.commission && s.commission.status !== "REVERSED").map((s) => ({ paidAt: s.paidAt, amountPaise: s.commission!.amountPaise }))} />


        {tab === "overview" && (
          <>
        {/* Total earnings — the screen's one bright moment: a navy card with the big gold number */}
        <section data-theme="night" className="flex flex-col gap-4 rounded-lg p-4 md:p-6">
          <div className="flex flex-col gap-1">
            <span className="type-label text-ink-muted">{D.total}</span>
            <span className="type-display-xl text-gold-text tabular-nums">
              <CountUp paise={lifetimeEarnings} />
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {split.map(([key, paise]) => (
              <div key={key} className="rounded-md border border-line bg-surface-raised p-3 shadow-card">
                <dt className="type-label text-ink-muted">{D.split[key]}</dt>
                <dd className="type-title text-ink">{formatINR(paise)}</dd>
                <dd className="type-small text-ink-muted">{D.splitHint[key].replace("{release}", releaseLabel(settings.commissionReleaseMinutes))}</dd>
              </div>
            ))}
          </dl>
        </section>

        <QuickActions link={link} coupon={coupon} />

        {/* Numbers for the chosen range */}
        <section className="flex flex-col gap-4">
          <nav aria-label={D.rangeLabel} className="flex gap-2">
            {RANGES.map((r) => (
              <Link
                key={r}
                href={`/partner?range=${r}`}
                aria-current={r === range ? "true" : undefined}
                className={cn("type-button inline-flex min-h-12 items-center rounded-pill border-2 px-4", r === range ? "border-gold bg-gold text-on-gold" : "border-line bg-surface-raised text-ink-muted hover:text-ink")}
              >
                {D.range.replace("{n}", String(r))}
              </Link>
            ))}
          </nav>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {stats.map((s, i) => (
              <StatCard key={s.label} icon={[MousePointerClick, UserPlus, ShoppingBag, Percent][i]} label={s.label} value={s.value} spark={s.spark} />
            ))}
          </div>
          <div className={card}>
            <h2 className="type-title text-ink">{D.chart}</h2>
            <EarningsChart data={d.series} label={D.chartLabel} />
          </div>
        </section>

          </>
        )}

        {tab === "sales" && (
          <>
        {/* Which reel sold the most */}
        <section className="flex flex-col gap-4">
          <h2 className={h2}>
            <Highlight text={D.campaigns.title} />
          </h2>
          <div className={card}>
            {d.campaigns.length === 0 ? (
              <p className="text-ink-muted">{D.campaigns.empty}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="type-label text-ink-muted">
                      <th scope="col" className="py-2 pr-3">
                        {D.campaigns.campaign}
                      </th>
                      <th scope="col" className="py-2 pr-3 text-right">
                        {D.campaigns.clicks}
                      </th>
                      <th scope="col" className="py-2 pr-3 text-right">
                        {D.campaigns.sales}
                      </th>
                      <th scope="col" className="py-2 text-right">
                        {D.campaigns.earned}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.campaigns.map((c) => (
                      <tr key={c.campaign} className="border-t border-line">
                        <th scope="row" className="py-3 pr-3 font-normal text-ink">
                          <span className="inline-flex flex-wrap items-center gap-2">
                            {c.campaign}
                            {c.campaign === best && (
                              <Badge tone="solid">
                                <Crown aria-hidden className="size-3.5" />
                                {D.campaigns.best}
                              </Badge>
                            )}
                          </span>
                        </th>
                        <td className="py-3 pr-3 text-right text-ink tabular-nums">{c.clicks}</td>
                        <td className="py-3 pr-3 text-right text-ink tabular-nums">{c.sales}</td>
                        <td className="py-3 text-right text-ink tabular-nums">{formatINR(c.earningsPaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-4 border-t border-line pt-4">
              <CampaignLinkBuilder base={link} />
            </div>
          </div>
        </section>

        {/* Sales — buyers are masked */}
        <section className="flex flex-col gap-4">
          <div>
            <h2 className={h2}>{D.salesList.title}</h2>
            <p className="type-small text-ink-muted">{D.salesList.privacy}</p>
          </div>
          {d.sales.length === 0 ? (
            <EmptyState text={D.salesList.empty} />
          ) : (
            <ul className={cn(card, "divide-y divide-line py-0 md:py-0")}>
              {d.sales.map((s) => {
                const st = s.commission?.status;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="flex min-w-0 flex-col">
                      <span className="text-ink">
                        {s.buyer}
                        {s.city ? `, ${s.city}` : ""} <span className="text-ink-muted">• {s.product}</span>
                      </span>
                      <span className="type-small text-ink-muted">
                        {formatIST(s.paidAt, "date")}
                        {s.campaign ? ` • ${s.campaign}` : ""}
                        {st === "PENDING" && s.commission ? ` • ${D.salesList.availableOn.replace("{time}", formatIST(s.commission.availableAt, "time"))}` : ""}
                      </span>
                    </span>
                    <span className="flex flex-none flex-col items-end gap-1">
                      <span className={cn("font-semibold tabular-nums", st === "REVERSED" ? "text-ink-muted line-through" : "text-ink")}>{s.commission ? formatINR(s.commission.amountPaise) : "—"}</span>
                      {st && <Badge tone={st === "REVERSED" ? "neutral" : st === "PENDING" ? "gold" : "success"}>{st === "REVERSED" ? D.salesList.refunded : st === "PENDING" ? D.salesList.pending : st === "PAID" ? D.salesList.paid : D.salesList.approved}</Badge>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

          </>
        )}

        {tab === "overview" && (
          <>
        {/* Milestones: locked ones are greyed and show how far along you are */}
        <section className="flex flex-col gap-4">
          <h2 className={h2}>{D.milestones.title}</h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {D.milestones.items.map((m) => {
              const have = m.kind === "sales" ? lifetimeSales : lifetimeEarnings;
              const done = have >= m.target;
              return (
                <li key={m.label} className={cn("flex flex-col gap-2 rounded-md p-4", done ? "border-2 border-gold bg-gold-soft" : "border border-line bg-surface-raised")}>
                  {done ? <Trophy aria-hidden className="size-6 text-gold-text" /> : <Lock aria-hidden className="size-6 text-ink-muted" />}
                  <span className={cn("type-title", done ? "text-gold-text" : "text-ink-muted")}>{m.label}</span>
                  {done ? <span className="type-small text-ink-muted">{D.milestones.unlocked}</span> : <ProgressBar value={(have / m.target) * 100} label={m.label} />}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Leaderboard (admin switch) */}
        {board && board.top.length > 0 && (
          <section className="flex flex-col gap-4">
            <div>
              <h2 className={h2}>{D.leaderboard.title}</h2>
              <p className="type-small text-ink-muted">{D.leaderboard.sub}</p>
            </div>
            <ol className={cn(card, "divide-y divide-line py-0 md:py-0")}>
              {board.top.map((r) => (
                <li key={r.rank} className={cn("flex items-center justify-between gap-3 py-3", r.me && "font-semibold text-gold-text")}>
                  <span className="flex items-center gap-3">
                    <span className="type-title w-10 text-ink-muted">{D.leaderboard.rank.replace("{n}", String(r.rank))}</span>
                    <span className={r.me ? "text-gold-text" : "text-ink"}>{r.me ? D.leaderboard.you : r.name}</span>
                  </span>
                  <span className="type-small text-ink-muted">{D.leaderboard.sales.replace("{n}", String(r.sales))}</span>
                </li>
              ))}
              {board.me && board.me.rank > 10 && (
                <li className="flex items-center justify-between gap-3 py-3 font-semibold text-gold-text">
                  <span className="flex items-center gap-3">
                    <span className="type-title w-10">{D.leaderboard.rank.replace("{n}", String(board.me.rank))}</span>
                    {D.leaderboard.you}
                  </span>
                  <span className="type-small text-ink-muted">{D.leaderboard.sales.replace("{n}", String(board.me.sales))}</span>
                </li>
              )}
            </ol>
          </section>
        )}

        {/* Promo kit */}
        <section className="flex flex-col gap-4">
          <h2 className={h2}>
            <Highlight text={D.promo.title} />
          </h2>
          <div className={cn(card, "flex flex-col gap-4")}>
            <h3 className="type-title text-ink">{D.promo.captions}</h3>
            <ul className="flex flex-col gap-2">
              {D.promo.captionItems.map((c) => (
                <CopyLine key={c} text={c.replace("{coupon}", couponLine).trim()} />
              ))}
            </ul>
            <h3 className="type-title text-ink">{D.promo.hooks}</h3>
            <ul className="flex flex-col gap-2">
              {D.promo.hookItems.map((c) => (
                <CopyLine key={c} text={c} />
              ))}
            </ul>
          </div>
        </section>

          </>
        )}

        {tab === "team" && team && (
          <section className="flex flex-col gap-4">
            <div>
              <h2 className={h2}>
                <Highlight text={D.team.title} />
              </h2>
              <p className="type-small text-ink-muted">{D.team.sub}</p>
            </div>
            <div className={cn(card, "flex flex-col gap-3")}>
              <h3 className="type-title text-ink">{D.team.inviteTitle}</h3>
              <ul>
                <CopyLine text={`${env.appUrl}/j/${d.partner.code}`} />
              </ul>
              <p className="type-small text-ink-muted">{D.team.inviteHint}</p>
              <p className="type-small text-ink-muted">
                {D.team.rules.replace("{l1}", String(PARTNER_RULES.teamBonus.l1Bps / 100)).replace("{l2}", String(PARTNER_RULES.teamBonus.l2Bps / 100)).replace("{release}", release)}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {(
                [
                  [D.team.l1, team.l1Paise],
                  [D.team.l2, team.l2Paise],
                  [D.team.pending, team.pendingPaise],
                ] as const
              ).map(([label, paise]) => (
                <div key={label} className="rounded-md border border-line bg-surface-raised p-3 shadow-card">
                  <dt className="type-label text-ink-muted">{label}</dt>
                  <dd className="type-title text-ink tabular-nums">{formatINR(paise)}</dd>
                </div>
              ))}
            </dl>
            {team.level1.length === 0 ? (
              <EmptyState text={D.team.empty} />
            ) : (
              <ul className={cn(card, "divide-y divide-line py-0 md:py-0")}>
                {team.level1.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 py-3">
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-ink">{m.displayName}</span>
                      <span className="type-small text-ink-muted">
                        {m.status === "APPROVED" && m.approvedAt ? D.team.joined.replace("{date}", formatIST(m.approvedAt, "date")) : D.team.waiting}
                        {" • "}
                        {D.team.sales.replace("{n}", String(m.sales))}
                      </span>
                    </span>
                    <span className="font-semibold text-ink tabular-nums">{formatINR(m.paise)}</span>
                  </li>
                ))}
              </ul>
            )}
            {team.level2Count > 0 && <p className="type-small text-ink-muted">{D.team.level2Count.replace("{n}", String(team.level2Count))}</p>}
          </section>
        )}

        {tab === "wallet" && (
          <>
        <section className="flex flex-col gap-3">
          <h2 className={h2}>{D.walletSplit.title}</h2>
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-line bg-surface-raised p-3 shadow-card">
              <dt className="type-label text-ink-muted">{D.walletSplit.sale}</dt>
              <dd className="type-title text-ink tabular-nums">{formatINR(byType.salePaise)}</dd>
            </div>
            {showTeam && (
              <div className="rounded-md border border-line bg-surface-raised p-3 shadow-card">
                <dt className="type-label text-ink-muted">{D.walletSplit.team}</dt>
                <dd className="type-title text-ink tabular-nums">{formatINR(byType.teamPaise)}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Withdraw + payout details */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className={cn(card, "flex flex-col gap-4")}>
            <h2 className={h2}>{D.withdraw.title}</h2>
            <p className="text-ink-muted">{D.withdraw.available.replace("{amount}", formatINR(w.availablePaise))}</p>
            <WithdrawForm availableRupees={Math.floor(w.availablePaise / 100)} minRupees={settings.minWithdrawalPaise / 100} tdsPct={settings.tdsBps / 100} disabledReason={disabledReason} />
            {d.payouts.length > 0 && (
              <div>
                <h3 className="type-title text-ink">{D.withdraw.history}</h3>
                <ul className="divide-y divide-line">
                  {d.payouts.map((p) => (
                    <li key={p.id} className="flex justify-between gap-3 py-3">
                      <span className="flex flex-col">
                        <span className="text-ink">{D.withdraw.status[p.status as keyof typeof D.withdraw.status] ?? p.status}</span>
                        <span className="type-small text-ink-muted">
                          {formatIST(p.requestedAt, "date")}
                          {p.reference ? ` • ${D.withdraw.ref.replace("{ref}", p.reference)}` : ""}
                          {p.rejectReason ? ` • ${p.rejectReason}` : ""}
                        </span>
                      </span>
                      <span className="flex flex-col items-end">
                        <span className="font-semibold text-ink tabular-nums">{formatINR(p.netPaise)}</span>
                        {p.tdsPaise > 0 && <span className="type-small text-ink-muted">{D.withdraw.tdsCut.replace("{amount}", formatINR(p.tdsPaise))}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className={cn(card, "flex flex-col gap-4")}>
            <h2 className={h2}>{D.payoutDetails.title}</h2>
            <p className="type-small text-ink-muted">{D.payoutDetails.hint}</p>
            <PayoutDetailsForm initial={{ upiId: partnerRow.upiId ?? "", bankAccountName: partnerRow.bankAccountName ?? "", bankAccountNumber: partnerRow.bankAccountNumber ?? "", bankIfsc: partnerRow.bankIfsc ?? "" }} />
          </div>
        </section>

        <Accordion>
          <AccordionItem title={D.formula.title}>
            <div className="flex flex-col gap-2">
              {D.formula.lines.map((line) => (
                <p key={line}>{line.replace("{release}", releaseLabel(settings.commissionReleaseMinutes)).replace("{refundLine}", settings.absorbRefunds ? D.formula.refundAbsorbed : D.formula.refundReversed).replace("{window}", String(settings.attributionWindowDays))}</p>
              ))}
            </div>
          </AccordionItem>
        </Accordion>
          </>
        )}
      </div>
    </AppFrame>
  );
}
