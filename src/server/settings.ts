/**
 * Admin-editable settings with safe defaults. Stored in the Setting table (key → JSON).
 * Add a new setting: add it to DEFAULTS below; it appears in Admin → Settings automatically.
 */
import "server-only";
import { db } from "@/lib/db";
import { PARTNER_RULES } from "@/config/partners";
import { SITE } from "@/config/site";

export const DEFAULTS = {
  /** Days a partner click / lead keeps credit for a later sale */
  attributionWindowDays: PARTNER_RULES.attributionWindowDays,
  /** Buyer refund guarantee, in days (NOT the partner commission wait — that is commissionReleaseMinutes) */
  refundWindowDays: SITE.refundGuaranteeDays as number,
  /** Minutes after a sale before the partner's commission moves from pending to available */
  commissionReleaseMinutes: PARTNER_RULES.commissionReleaseMinutes as number,
  /** true = refunds are absorbed by Get Udaan (commission and team bonus stay). false = a refund takes the commission back. */
  absorbRefunds: PARTNER_RULES.refundsAbsorbed as boolean,
  /** Team bonus (10% / 5% of recruits' commission). OFF until the legal check is done. */
  teamBonusEnabled: false,
  /** Flag partners whose refund rate is above this %, over 20+ sales. 0 = not set yet (no flag). */
  refundFlagPct: (PARTNER_RULES.refundFlagPct ?? 0) as number,
  /** Payout time shown to partners, e.g. "1–2 working days". Empty = hidden. */
  payoutTimeText: (PARTNER_RULES.payoutTime ?? "") as string,
  /** Max logged-in devices per account */
  maxDevices: 2,
  gstRegistered: false,
  gstin: "",
  sellerLegalName: "Get Udaan",
  sellerAddress: "",
  /** Real support contact. Empty = hidden everywhere (never show a fake number). */
  supportWhatsapp: "",
  supportEmail: "",
  /** Masterclass video (YouTube link or .mp4 URL). Empty = the video and the home masterclass block stay hidden. */
  masterclassVideoUrl: "",
  /** Discount for partner coupons created on approval, in bps (1000 = 10%) */
  partnerCouponDiscountBps: 1000,
  /** TDS on partner withdrawals, bps. 0 = not set (hidden). Confirm rate + threshold with your CA. */
  tdsBps: 0,
  /** Minimum partner withdrawal, paise */
  minWithdrawalPaise: PARTNER_RULES.minWithdrawalPaise as number,
  /** Show "Someone from Pune joined 5 min ago" from REAL orders */
  showRecentPurchases: false,
  /** Show "X students joined" only above this real count */
  studentCountThreshold: 100,
  /** Partner leaderboard visible to partners */
  showLeaderboard: false,
  /** Full links to your social pages. Leave empty to hide them in the footer. */
  instagramUrl: "",
  youtubeUrl: "",
  metaPixelId: "",
  ga4Id: "",
};

export type Settings = typeof DEFAULTS;
export type SettingKey = keyof Settings;

export async function getSettings(): Promise<Settings> {
  const rows = await db.setting.findMany();
  const out: Record<string, unknown> = { ...DEFAULTS };
  for (const r of rows) if (r.key in DEFAULTS) out[r.key] = r.value;
  return out as Settings;
}

export async function getSetting<K extends SettingKey>(key: K): Promise<Settings[K]> {
  const row = await db.setting.findUnique({ where: { key } });
  return (row?.value as Settings[K]) ?? DEFAULTS[key];
}

export async function setSetting<K extends SettingKey>(key: K, value: Settings[K]) {
  await db.setting.upsert({ where: { key }, create: { key, value: value as never }, update: { value: value as never } });
}

/** wa.me link for the support number, or undefined when no real number is set (callers then hide the link). */
export function supportWhatsappHref(s: Pick<Settings, "supportWhatsapp">): string | undefined {
  const digits = s.supportWhatsapp.replace(/\D/g, "");
  return digits.length >= 10 ? `https://wa.me/${digits}` : undefined;
}
