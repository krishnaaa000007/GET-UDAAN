import { db } from "@/lib/db";
import { formatIST } from "@/lib/time";
import { DEFAULTS, getSettings, type SettingKey } from "@/server/settings";
import { ActionForm } from "@/components/admin/action-form";
import { saveSettingsAction } from "../actions";

const HELP: Partial<Record<SettingKey, string>> = {
  attributionWindowDays: "Days a partner click/lead keeps credit",
  refundWindowDays: "Refund guarantee days = commission pending period",
  maxDevices: "Max logged-in devices per student",
  partnerCouponDiscountBps: "Partner coupon discount in bps (1000 = 10%)",
  tdsBps: "TDS on withdrawals in bps (200 = 2%) — confirm with your CA",
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
                {HELP[key] && <span className="block text-xs text-muted">{HELP[key]}</span>}
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
              <b>{l.action}</b> <span className="text-muted">{l.entity} {l.entityId?.slice(0, 10)}</span>
              <span className="block text-muted">{formatIST(l.createdAt)}</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
