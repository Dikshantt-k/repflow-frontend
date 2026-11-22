import { orgLocale } from "./locale";

/**
 * Formats an amount in minor units (paise, fils, pence, cents) in the signed-in gym's currency
 * (Round 3): ₹4,200 / AED 315 / £45.50 / $39.99. Whole amounts show no decimals.
 * Pass `currency` to format a stored payment in the currency it was taken in.
 */
export function formatPaise(paise: number, currency?: string): string {
  const { locale, currency: gymCurrency } = orgLocale();
  const whole = paise % 100 === 0;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency ?? gymCurrency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(paise / 100);
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function formatDate(iso: string | Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  const { locale, timeZone } = orgLocale();
  const date = new Date(iso);
  // Calendar dates (membership start/end, freeze dates) are stored as midnight UTC. Show them as that
  // date everywhere; in a US time zone they would otherwise display a day early. Moments in time
  // (payments, check-ins) are shown in the gym's time zone (Round 3).
  const isCalendarDate = date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;
  const showsTime = opts.hour !== undefined || opts.minute !== undefined || opts.timeStyle !== undefined;
  return new Intl.DateTimeFormat(locale, { timeZone: isCalendarDate && !showsTime ? "UTC" : timeZone, ...opts }).format(date);
}

/**
 * Whole calendar days from today (in the gym's time zone) to a plan's last valid day.
 * 0 = the plan ends today (still valid all day); negative = it ended that many days ago.
 * End dates are calendar dates stored as midnight UTC, so both sides are compared as dates.
 */
export function daysLeft(endDateIso: string): number {
  const end = new Date(endDateIso);
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: orgLocale().timeZone, year: "numeric", month: "numeric", day: "numeric" })
    .formatToParts(new Date())
    .reduce<Record<string, number>>((acc, p) => (p.type === "literal" ? acc : { ...acc, [p.type]: Number(p.value) }), {});
  const today = Date.UTC(parts.year, parts.month - 1, parts.day);
  return Math.round((endDay - today) / 86_400_000);
}

/** "12 days left", "1 day left", "Last day today", "Expired yesterday", "Expired 3 days ago". */
export function daysLeftLabel(endDateIso: string): string {
  const n = daysLeft(endDateIso);
  if (n > 1) return `${n} days left`;
  if (n === 1) return "1 day left";
  if (n === 0) return "Last day today";
  if (n === -1) return "Expired yesterday";
  return `Expired ${-n} days ago`;
}

/** Calendar date (year, 1-based month, day) of an instant in the gym's time zone. */
export function localDateParts(when: string | Date = new Date()): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: orgLocale().timeZone, year: "numeric", month: "numeric", day: "numeric" })
    .formatToParts(new Date(when))
    .reduce<Record<string, number>>((acc, p) => (p.type === "literal" ? acc : { ...acc, [p.type]: Number(p.value) }), {});
  return { year: parts.year!, month: parts.month!, day: parts.day! };
}

export function initials(firstName: string, lastName?: string): string {
  return `${firstName[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}
