/** Masking for anything shown to partners or used as a video watermark. */

/** 9876543210 → 98XXXXX210 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length < 6) return "XXXXXXXX";
  return `${digits.slice(0, 2)}${"X".repeat(digits.length - 5)}${digits.slice(-3)}`;
}

/** rahul.kumar@gmail.com → ra***@gmail.com */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  return `${user.slice(0, 2)}***@${domain}`;
}

/** Partners see only a first name initial + city, never contact details. "Rahul Kumar" → "R***" */
export function maskName(name: string | null | undefined): string {
  const first = (name ?? "").trim().charAt(0).toUpperCase();
  return first ? `${first}***` : "Student";
}
