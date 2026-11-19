/**
 * Site-wide facts (functionality brief §1). Prices are NOT here: they live in the database
 * (Admin → Pricing) so a price change never needs a code change.
 */
export const SITE = {
  /** Masterclass coupon: a normal coupon (not a partner coupon), so it never removes a partner's credit. */
  masterclassCoupon: { code: "FIRST100", percent: 10 },
  /** Buyer refund guarantee, in days (separate from when partners get their commission). */
  refundGuaranteeDays: 7,
} as const;
