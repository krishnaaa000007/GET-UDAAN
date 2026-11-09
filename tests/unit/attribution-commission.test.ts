import { describe, expect, it } from "vitest";
import { decodeRefCookie, encodeRefCookie, resolveAttribution, type AttributionInput } from "@/server/attribution";
import { computeCommission, computeOrderCommission, walletSummary, withdrawalSplit } from "@/server/commission";

const now = new Date("2026-11-09T10:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

const partners = {
  pA: { status: "APPROVED", userId: "uA", email: "a@partner.in" },
  pB: { status: "APPROVED", userId: "uB", email: "b@partner.in" },
  pX: { status: "PENDING", userId: "uX", email: "x@partner.in" },
};

const base: AttributionInput = {
  now,
  windowDays: 30,
  buyer: { userId: null, email: "buyer@gmail.com" },
  coupon: null,
  cookie: null,
  lead: null,
  partners,
};

describe("attribution", () => {
  it("no partner → our sale", () => {
    expect(resolveAttribution(base).source).toBe("NONE");
  });
  it("partner coupon beats a different partner's cookie", () => {
    const a = resolveAttribution({ ...base, coupon: { partnerId: "pA" }, cookie: { partnerId: "pB", clickId: "c1", campaign: "reel1", at: daysAgo(1) } });
    expect(a).toMatchObject({ partnerId: "pA", source: "COUPON", clickId: null });
  });
  it("last click within window wins", () => {
    const a = resolveAttribution({ ...base, cookie: { partnerId: "pB", clickId: "c1", campaign: "reel23", at: daysAgo(29) } });
    expect(a).toMatchObject({ partnerId: "pB", source: "COOKIE", clickId: "c1", campaign: "reel23" });
  });
  it("click older than window earns nothing", () => {
    expect(resolveAttribution({ ...base, cookie: { partnerId: "pB", clickId: "c1", campaign: null, at: daysAgo(31) } }).partnerId).toBeNull();
  });
  it("attribution survives the lead stage (cookie cleared, lead remembers partner)", () => {
    const a = resolveAttribution({ ...base, lead: { id: "L1", partnerId: "pA", campaign: "reel9", at: daysAgo(10) } });
    expect(a).toMatchObject({ partnerId: "pA", source: "LEAD", leadId: "L1" });
  });
  it("cookie beats lead", () => {
    const a = resolveAttribution({ ...base, cookie: { partnerId: "pB", clickId: "c", campaign: null, at: daysAgo(2) }, lead: { id: "L1", partnerId: "pA", campaign: null, at: daysAgo(5) } });
    expect(a.partnerId).toBe("pB");
  });
  it("self-referral earns nothing (by user id or email)", () => {
    expect(resolveAttribution({ ...base, buyer: { userId: "uA", email: "z@z.in" }, coupon: { partnerId: "pA" } }).note).toBe("self-referral");
    expect(resolveAttribution({ ...base, buyer: { userId: null, email: " A@Partner.in " }, cookie: { partnerId: "pA", clickId: "c", campaign: null, at: daysAgo(1) } }).partnerId).toBeNull();
  });
  it("unapproved partners earn nothing", () => {
    expect(resolveAttribution({ ...base, coupon: { partnerId: "pX" } }).partnerId).toBeNull();
  });
  it("ref cookie round-trips", () => {
    const at = new Date("2026-11-01T00:00:00Z");
    const raw = encodeRefCookie({ code: "LIONBHAI", clickId: "abc123", at, campaign: "reel 23!" });
    expect(decodeRefCookie(raw)).toEqual({ code: "LIONBHAI", clickId: "abc123", at, campaign: "reel23" });
    expect(decodeRefCookie("garbage")).toBeNull();
  });
});

describe("commission", () => {
  it("matches the documented example (₹449 paid, ₹10.60 fee, 50%)", () => {
    expect(computeCommission({ totalPaise: 44900, taxPaise: 0, gatewayFeePaise: 1060, rateBps: 5000 })).toEqual({ basePaise: 43840, amountPaise: 21920 });
  });
  it("excludes GST when registered", () => {
    expect(computeCommission({ totalPaise: 49900, taxPaise: 7612, gatewayFeePaise: 1178, rateBps: 5000 }).basePaise).toBe(41110);
  });
  it("never negative and rejects bad rates", () => {
    expect(computeCommission({ totalPaise: 100, taxPaise: 0, gatewayFeePaise: 500, rateBps: 5000 }).amountPaise).toBe(0);
    expect(() => computeCommission({ totalPaise: 100, taxPaise: 0, gatewayFeePaise: 0, rateBps: 12000 })).toThrow();
  });
  it("mixed-rate order shares deductions proportionally", () => {
    const r = computeOrderCommission({
      items: [
        { unitPaise: 49900, rateBps: 5000 },
        { unitPaise: 14900, rateBps: 2500 },
      ],
      subtotalPaise: 64800,
      totalPaise: 64800,
      taxPaise: 0,
      gatewayFeePaise: 0,
    });
    expect(r.amountPaise).toBe(24950 + 3725);
  });
});

describe("wallet & withdrawals", () => {
  it("available = ledger − open requests; pending tracked separately", () => {
    const w = walletSummary({
      commissions: [
        { status: "PENDING", amountPaise: 20000 },
        { status: "APPROVED", amountPaise: 30000 },
      ],
      ledgerSumPaise: 30000,
      openWithdrawalsPaise: 10000,
      paidOutPaise: 0,
    });
    expect(w).toEqual({ pendingPaise: 20000, availablePaise: 20000, requestedPaise: 10000, paidPaise: 0 });
  });
  it("refund after payout makes balance negative (recovered from future sales)", () => {
    expect(walletSummary({ commissions: [], ledgerSumPaise: -21920, openWithdrawalsPaise: 0, paidOutPaise: 50000 }).availablePaise).toBe(-21920);
  });
  it("TDS split", () => {
    expect(withdrawalSplit(100000, 200)).toEqual({ grossPaise: 100000, tdsPaise: 2000, netPaise: 98000 });
  });
});
