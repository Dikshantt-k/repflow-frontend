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

export function daysLeft(endDateIso: string): number {
  const ms = new Date(endDateIso).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function initials(firstName: string, lastName?: string): string {
  return `${firstName[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}
