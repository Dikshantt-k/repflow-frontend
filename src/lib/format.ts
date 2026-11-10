export function formatPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function formatDate(iso: string | Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  return new Intl.DateTimeFormat("en-IN", opts).format(new Date(iso));
}

export function daysLeft(endDateIso: string): number {
  const ms = new Date(endDateIso).getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function initials(firstName: string, lastName?: string): string {
  return `${firstName[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}
