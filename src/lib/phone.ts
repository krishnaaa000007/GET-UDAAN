/**
 * Cleans an Indian mobile number typed or pasted by a user.
 * "+91 98765 43210" and "098765 43210" both become "9876543210". Never returns more than 10 digits.
 */
export function cleanIndianMobile(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}
