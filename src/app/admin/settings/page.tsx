import { db } from "@/lib/db";
import { formatIST } from "@/lib/time";
import { DEFAULTS, getSettings, type SettingKey } from "@/server/settings";
import { ActionForm } from "@/components/admin/action-form";
import { saveSettingsAction } from "../actions";

const HELP: Partial<Record<SettingKey, string>> = {
  attributionWindowDays: "Days a partner click/lead keeps credit",
  refundWindowDays: "Buyer refund guarantee (days). Not the partner wait.",
  commissionReleaseMinutes: "Minutes after a sale before the partner commission becomes available (60 = 1 hour)",
  absorbRefunds: "On = refunds do NOT take back commissions or team bonus (Get Udaan absorbs them)",
  teamBonusEnabled: "Team bonus 10% / 5%. Keep OFF until your lawyer/CA has checked it",
  refundFlagPct: "Flag partners above this refund % (over 20+ sales). 0 = no flag",
  payoutTimeText: "Shown to partners, e.g. 1–2 working days. Empty = hidden",
  supportWhatsapp: "Real support WhatsApp, e.g. +91 98xxxxxxxx. Empty = hidden everywhere",
  supportEmail: "Real support email. Empty = hidden everywhere",
  masterclassVideoUrl: "Masterclass video: YouTube link or .mp4 URL. Empty = video + home masterclass block hidden",
  masterclassVideoQualities: "Optional smaller versions for the player's quality menu, comma separated: 720p=https://…720.mp4, 480p=https://…480.mp4 (the main link above shows as HD). Empty = no quality menu",
  maxDevices: "Max logged-in devices per student",
  partnerCouponDiscountBps: "Partner coupon discount in bps (1000 = 10%)",
  tdsBps: "TDS on withdrawals in bps (200 = 2%). 0 = none shown. Confirm rate + threshold with your CA",
  minWithdrawalPaise: "Minimum withdrawal in paise (50000 = ₹500)",
  studentCountThreshold: "Show the real student count only above this",
  showRecentPurchases: "“Someone from Pune joined…” from real orders (Phase 3)",
  showLeaderboard: "Partner leaderboard (Phase 3)",
  metaPixelId: "Meta Pixel ID (overrides env)",
  ga4Id: "GA4 Measurement ID, e.g. G-XXXX (overrides env)",
};

export default async function AdminSettings() {
  const [s, log] = await Promise.all([getSettings(), db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 })]);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section>
        <h1 className="font-display mb-4 text-3xl">Settings</h1>
        <ActionForm action={saveSettingsAction} className="card grid gap-3 p-4 sm:grid-cols-2" success="Settings saved ✓">
          {(Object.keys(DEFAULTS) as SettingKey[]).map((key) => {
            const v = s[key];
            return (
              <label key={key} className="block text-sm">
                <span className="font-semibold">{key}</span>
                {HELP[key] && <span className="block text-xs text-ink-muted">{HELP[key]}</span>}
                {typeof v === "boolean" ? (
                  <input type="checkbox" name={key} defaultChecked={v} className="mt-2 h-5 w-5" />
                ) : (
                  <input name={key} defaultValue={String(v)} type={typeof v === "number" ? "number" : "text"} className="field mt-1 min-h-10" />
                )}
              </label>
            );
          })}
          <button className="btn-gold min-h-10 sm:col-span-2">Save settings</button>
        </ActionForm>
      </section>
      <aside>
        <h2 className="mb-4 font-semibold">Audit log (latest 30)</h2>
        <ul className="card divide-y divide-line text-xs">
          {log.map((l) => (
            <li key={l.id} className="p-3">
              <b>{l.action}</b> <span className="text-ink-muted">{l.entity} {l.entityId?.slice(0, 10)}</span>
              <span className="block text-ink-muted">{formatIST(l.createdAt)}</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
