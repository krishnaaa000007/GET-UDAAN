/**
 * WHO GETS CREDIT FOR A SALE? (pure function, fully unit tested)
 *
 * Rules, in priority order:
 *  1. A partner's coupon used at checkout ALWAYS wins.
 *  2. Otherwise the partner of the LAST click (cookie) within the attribution window.
 *  3. Otherwise the partner who brought the buyer in as a LEAD, if within the window.
 *  4. Otherwise nobody (our own sale).
 * Self-referral: if the winning partner IS the buyer, nobody earns.
 * Only APPROVED partners can earn.
 */

export type AttributionInput = {
  now: Date;
  windowDays: number;
  buyer: { userId: string | null; email: string; phone?: string | null };
  coupon: { partnerId: string } | null;
  /** last-click cookie */
  cookie: { partnerId: string; clickId: string | null; campaign: string | null; at: Date } | null;
  /** most recent lead record for this buyer's email/phone that has a partner */
  lead: { id: string; partnerId: string; campaign: string | null; at: Date } | null;
  /** lookup for partner status + owner, keyed by partnerId */
  partners: Record<string, { status: string; userId: string; email: string; phone?: string | null }>;
};

export type Attribution = {
  partnerId: string | null;
  source: "COUPON" | "COOKIE" | "LEAD" | "NONE";
  clickId: string | null;
  leadId: string | null;
  campaign: string | null;
  /** why nobody got credit (for admin debugging) */
  note?: string;
};

const NONE: Attribution = { partnerId: null, source: "NONE", clickId: null, leadId: null, campaign: null };

export function resolveAttribution(input: AttributionInput): Attribution {
  const windowMs = input.windowDays * 86_400_000;
  const inWindow = (at: Date) => input.now.getTime() - at.getTime() <= windowMs && at.getTime() <= input.now.getTime() + 60_000;

  let candidate: Attribution = NONE;
  if (input.coupon) {
    candidate = { partnerId: input.coupon.partnerId, source: "COUPON", clickId: input.cookie?.partnerId === input.coupon.partnerId ? input.cookie.clickId : null, leadId: null, campaign: input.cookie?.partnerId === input.coupon.partnerId ? input.cookie.campaign : null };
  } else if (input.cookie && inWindow(input.cookie.at)) {
    candidate = { partnerId: input.cookie.partnerId, source: "COOKIE", clickId: input.cookie.clickId, leadId: null, campaign: input.cookie.campaign };
  } else if (input.lead && inWindow(input.lead.at)) {
    candidate = { partnerId: input.lead.partnerId, source: "LEAD", clickId: null, leadId: input.lead.id, campaign: input.lead.campaign };
  }

  if (!candidate.partnerId) return NONE;

  const partner = input.partners[candidate.partnerId];
  if (!partner || partner.status !== "APPROVED") return { ...NONE, note: "partner not approved" };

  const isSelf =
    (input.buyer.userId && input.buyer.userId === partner.userId) ||
    input.buyer.email.trim().toLowerCase() === partner.email.trim().toLowerCase() ||
    (!!input.buyer.phone && !!partner.phone && input.buyer.phone.replace(/\D/g, "").slice(-10) === partner.phone.replace(/\D/g, "").slice(-10));
  if (isSelf) return { ...NONE, note: "self-referral" };

  return candidate;
}

/** Cookie format for rb_ref: "<partnerCode>.<clickId>.<unixSeconds>.<campaign?>" */
export function encodeRefCookie(v: { code: string; clickId: string; at: Date; campaign?: string | null }): string {
  const c = (v.campaign ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  return [v.code, v.clickId, Math.floor(v.at.getTime() / 1000), c].join(".");
}

export function decodeRefCookie(raw: string | undefined | null): { code: string; clickId: string; at: Date; campaign: string | null } | null {
  if (!raw) return null;
  const [code, clickId, ts, campaign] = raw.split(".");
  const n = Number(ts);
  if (!code || !clickId || !Number.isFinite(n)) return null;
  return { code, clickId, at: new Date(n * 1000), campaign: campaign || null };
}

/** Partner codes are short, uppercase, safe for URLs. */
export function normalizeCode(code: string | null | undefined): string | null {
  const c = (code ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  return c.length >= 2 && c.length <= 32 ? c : null;
}
