import { describe, expect, it } from "vitest";
import { applyBps, formatINR } from "@/lib/money";
import { activePrice, cartTotals, evaluateCoupon, gstIncluded, nextPrice } from "@/server/pricing";
import { maskEmail, maskName, maskPhone } from "@/lib/mask";

const d = (s: string) => new Date(s);

describe("money", () => {
  it("formats paise as INR", () => {
    expect(formatINR(49900)).toBe("₹499");
    expect(formatINR(21920)).toBe("₹219.20");
    expect(formatINR(1499900)).toBe("₹14,999");
  });
  it("applies bps rounding down", () => {
    expect(applyBps(43840, 5000)).toBe(21920);
    expect(applyBps(999, 5000)).toBe(499);
  });
});

describe("launch price switching", () => {
  const rows = [
    { amountPaise: 99900, label: null, startsAt: d("2026-01-01"), endsAt: null },
    { amountPaise: 49900, label: "Launch price", startsAt: d("2026-11-01"), endsAt: d("2026-11-15T18:30:00Z") },
  ];
  it("uses launch price before the deadline", () => {
    expect(activePrice(rows, d("2026-11-10"))?.amountPaise).toBe(49900);
    expect(nextPrice(rows, d("2026-11-10"))?.amountPaise).toBe(99900);
  });
  it("switches automatically after the deadline", () => {
    expect(activePrice(rows, d("2026-11-16"))?.amountPaise).toBe(99900);
    expect(nextPrice(rows, d("2026-11-16"))).toBeNull(); // no deadline → no countdown
  });
});

describe("coupons", () => {
  const base = { code: "X", active: true, maxUses: null, usedCount: 0, startsAt: null, endsAt: null, productSlugs: null };
  it("percent coupon", () => {
    expect(evaluateCoupon({ ...base, kind: "PERCENT", value: 1000 }, "basic", 49900)).toEqual({ ok: true, discountPaise: 4900 });
  });
  it("flat coupon never makes price below ₹1", () => {
    expect(evaluateCoupon({ ...base, kind: "FLAT", value: 100000 }, "basic", 49900)).toEqual({ ok: true, discountPaise: 49800 });
  });
  it("rejects expired, exhausted, wrong product, inactive", () => {
    expect(evaluateCoupon({ ...base, kind: "FLAT", value: 5000, endsAt: d("2020-01-01") }, "basic", 49900).ok).toBe(false);
    expect(evaluateCoupon({ ...base, kind: "FLAT", value: 5000, maxUses: 3, usedCount: 3 }, "basic", 49900).ok).toBe(false);
    expect(evaluateCoupon({ ...base, kind: "FLAT", value: 5000, productSlugs: ["pro"] }, "basic", 49900).ok).toBe(false);
    expect(evaluateCoupon({ ...base, kind: "FLAT", value: 5000, active: false }, "basic", 49900).ok).toBe(false);
    expect(evaluateCoupon(null, "basic", 49900).ok).toBe(false);
  });
});

describe("GST", () => {
  it("is zero when not registered", () => expect(gstIncluded(49900, false)).toBe(0));
  it("extracts 18% inclusive GST", () => expect(gstIncluded(49900, true)).toBe(49900 - 42288));
  it("cart totals", () => {
    const t = cartTotals(
      [
        { productSlug: "basic", name: "Basic", unitPaise: 49900, kind: "MAIN" },
        { productSlug: "bump", name: "Bump", unitPaise: 14900, kind: "BUMP" },
      ],
      4990,
      false,
    );
    expect(t).toEqual({ subtotalPaise: 64800, discountPaise: 4990, totalPaise: 59810, taxPaise: 0 });
  });
});

describe("masking (partners never see contact details)", () => {
  it("masks phone like 98XXXXX210", () => expect(maskPhone("+91 98765 43210")).toBe("98XXXXX210"));
  it("masks email", () => expect(maskEmail("rahul.kumar@gmail.com")).toBe("ra***@gmail.com"));
  it("masks name", () => expect(maskName("Rahul Kumar")).toBe("R***"));
});
