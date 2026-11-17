/**
 * Admin-editable settings with safe defaults. Stored in the Setting table (key → JSON).
 * Add a new setting: add it to DEFAULTS below; it appears in Admin → Settings automatically.
 */
import "server-only";
import { db } from "@/lib/db";

export const DEFAULTS = {
  /** Days a partner click / lead keeps credit for a later sale */
  attributionWindowDays: 30,
  /** Refund guarantee window = commission "pending" period */
  refundWindowDays: 7,
  /** Max logged-in devices per account */
  maxDevices: 2,
  gstRegistered: false,
  gstin: "",
  sellerLegalName: "Get Udaan",
  sellerAddress: "",
  supportWhatsapp: "+91 90000 00000",
  supportEmail: "support@yourdomain.com",
  /** Discount for partner coupons created on approval, in bps (1000 = 10%) */
  partnerCouponDiscountBps: 1000,
  /** TDS on partner withdrawals, bps (confirm with your CA) */
  tdsBps: 0,
  /** Minimum partner withdrawal, paise */
  minWithdrawalPaise: 50_000,
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
