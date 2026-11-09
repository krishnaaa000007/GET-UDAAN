/**
 * Money helpers. RULE: every amount in this codebase is an integer number of PAISE.
 * ₹499 = 49900 paise. Only convert to rupees for display.
 */

export type Paise = number;

export function rupees(r: number): Paise {
  return Math.round(r * 100);
}

/** 49900 → "₹499", 21920 → "₹219.20" */
export function formatINR(paise: Paise, opts: { decimals?: "auto" | "always" } = {}): string {
  const neg = paise < 0;
  const abs = Math.abs(paise);
  const hasFraction = abs % 100 !== 0;
  const showDecimals = opts.decimals === "always" || hasFraction;
  const value = abs / 100;
  const str = value.toLocaleString("en-IN", {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });
  return `${neg ? "−" : ""}₹${str}`;
}

/** Apply basis points (5000 = 50%) and round DOWN to the paisa (never overpay). */
export function applyBps(paise: Paise, bps: number): Paise {
  return Math.floor((paise * bps) / 10_000);
}

export function assertPaise(n: number, label = "amount"): asserts n is Paise {
  if (!Number.isInteger(n)) throw new Error(`${label} must be integer paise, got ${n}`);
}
