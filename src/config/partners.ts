/**
 * Partner programme rules — the single source of truth (functionality brief §1).
 * Numbers that admin may change later are only DEFAULTS here; the live value is in Admin → Settings.
 * Anything still unknown is null and the UI hides it — never invent these.
 */
export const PARTNER_RULES = {
  /** Default sale commission per tier (bps; 5000 = 50%). Each product row stores its live rate; per-partner overrides allowed. */
  saleCommissionBps: { BASIC: 5000, PRO: 5000, DONE_WITH_YOU: 2500 },
  /** Commission moves pending → available this long after the sale. */
  commissionReleaseMinutes: 60,
  /** A partner click keeps credit this long. */
  attributionWindowDays: 30,
  /** Partner link and invite link cookies. */
  refCookieDays: 30,
  inviteCookieDays: 30,
  /** Refunds are handled and absorbed by Get Udaan: a refund does NOT take back a commission or team bonus. */
  refundsAbsorbed: true,
  /** Minimum withdrawal (paise). */
  minWithdrawalPaise: 50_000,
  /** Team bonus: % of the commission earned by partners you recruited. 2 levels only, paid by Get Udaan on top. */
  teamBonus: { levels: 2, l1Bps: 1000, l2Bps: 500 },
  /** Target time for approving a new partner. */
  approvalTargetHours: "1–2",
  /** Alert admin when an application waits longer than this. */
  approvalAlertAfterHours: 2,
  // ---- [FILL] values: null = not given yet, hidden everywhere ----
  /** e.g. "1–2 working days" */
  payoutTime: null as string | null,
  /** Flag partners whose refund rate is above this % (over at least refundFlagMinSales sales). */
  refundFlagPct: null as number | null,
  refundFlagMinSales: 20,
} as const;

/** "50%" from 5000 bps */
export const pct = (bps: number) => `${Math.round(bps / 100)}%`;

/** "1 ghante", "2 ghante", "30 min" — how long until a commission reaches the wallet. */
export function releaseLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = minutes / 60;
  return Number.isInteger(h) ? `${h} ghante` : `${Math.round(minutes)} min`;
}
