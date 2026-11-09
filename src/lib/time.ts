/** Store UTC, display Asia/Kolkata. */
export const IST = "Asia/Kolkata";

export function formatIST(d: Date | string, style: "date" | "datetime" | "time" = "datetime"): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const opts: Intl.DateTimeFormatOptions =
    style === "date"
      ? { day: "numeric", month: "short", year: "numeric" }
      : style === "time"
        ? { hour: "numeric", minute: "2-digit" }
        : { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" };
  return new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: IST }).format(date);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

export function addMinutes(d: Date, mins: number): Date {
  return new Date(d.getTime() + mins * 60_000);
}

/** "YYYY-MM-DD" of a date in IST — used to bucket charts by Indian calendar day. */
export function istDayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** "x min ago" style, Hinglish-friendly. */
export function timeAgo(d: Date, now = new Date()): string {
  const s = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));
  if (s < 60) return "abhi abhi";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min pehle`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ghante pehle`;
  return `${Math.floor(h / 24)} din pehle`;
}

/** Date N days before now. */
export function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

/** True if d is within the last h hours. */
export function withinHours(d: Date | null | undefined, h: number): boolean {
  return !!d && Date.now() - d.getTime() < h * 3600_000;
}
