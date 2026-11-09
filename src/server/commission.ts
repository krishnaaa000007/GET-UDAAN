/**
 * COMMISSION FORMULA (pure — shown to partners in their dashboard)
 *
 *   base       = amount buyer paid − GST included in it − Razorpay fee (incl. GST on fee)
 *   commission = floor(base × rate)
 *
 * Example: ₹499 course, ₹50 coupon → paid ₹449, not GST registered (GST ₹0),
 *          Razorpay fee ₹10.60 → base ₹438.40 → 50% → ₹219.20
 *
 * Rate = partner's override for that product, else the product's default.
 */
import { applyBps, type Paise } from "@/lib/money";

export type CommissionInput = {
  totalPaise: Paise;
  taxPaise: Paise;
  gatewayFeePaise: Paise | null;
  rateBps: number;
};

export function commissionBase(i: Omit<CommissionInput, "rateBps">): Paise {
  return Math.max(0, i.totalPaise - i.taxPaise - (i.gatewayFeePaise ?? 0));
}

export function computeCommission(i: CommissionInput): { basePaise: Paise; amountPaise: Paise } {
  if (i.rateBps < 0 || i.rateBps > 10_000) throw new Error(`invalid rate ${i.rateBps}`);
  const basePaise = commissionBase(i);
  return { basePaise, amountPaise: applyBps(basePaise, i.rateBps) };
}

/**
 * Multi-item orders (main + order bump): each item can have its own rate.
 * The deductions (discount, GST, fee) are shared proportionally by item price.
 */
export function computeOrderCommission(o: {
  items: { unitPaise: Paise; rateBps: number }[];
  subtotalPaise: Paise;
  totalPaise: Paise;
  taxPaise: Paise;
  gatewayFeePaise: Paise | null;
}): { basePaise: Paise; amountPaise: Paise; effectiveRateBps: number } {
  const base = commissionBase(o);
  if (o.subtotalPaise <= 0 || base === 0) return { basePaise: base, amountPaise: 0, effectiveRateBps: 0 };
  let amount = 0;
  for (const it of o.items) {
    const share = Math.floor((base * it.unitPaise) / o.subtotalPaise);
    amount += applyBps(share, it.rateBps);
  }
  const effectiveRateBps = Math.round((amount * 10_000) / base);
  return { basePaise: base, amountPaise: amount, effectiveRateBps };
}

/** Wallet numbers for the partner dashboard, from commissions + ledger + open withdrawals. */
export function walletSummary(input: {
  commissions: { status: string; amountPaise: Paise }[];
  ledgerSumPaise: Paise;
  openWithdrawalsPaise: Paise;
  paidOutPaise: Paise;
}) {
  const pendingPaise = input.commissions.filter((c) => c.status === "PENDING").reduce((s, c) => s + c.amountPaise, 0);
  // Ledger already subtracts PAID withdrawals; open (requested/approved) ones are reserved.
  const availablePaise = input.ledgerSumPaise - input.openWithdrawalsPaise;
  return {
    pendingPaise,
    availablePaise,
    requestedPaise: input.openWithdrawalsPaise,
    paidPaise: input.paidOutPaise,
  };
}

/** TDS on a withdrawal. */
export function withdrawalSplit(grossPaise: Paise, tdsBps: number) {
  const tdsPaise = applyBps(grossPaise, tdsBps);
  return { grossPaise, tdsPaise, netPaise: grossPaise - tdsPaise };
}
