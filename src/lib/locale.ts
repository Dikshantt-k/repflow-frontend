import type { OrgLocale, TaxBreakdown } from "@/types/api";

/**
 * The signed-in gym's country settings (Round 3): currency, number format, tax name and rate, phone
 * format. Set once from /auth/me by the auth provider; read by formatPaise() and the tax helpers so
 * pages don't have to pass it around. Defaults to India, which is also what the backend assumes for
 * gyms that haven't picked a country, and what the super admin (Repflow's own INR billing) sees.
 */
export const INDIA_LOCALE: OrgLocale = {
  country: "IN",
  currency: "INR",
  locale: "en-IN",
  timeZone: "Asia/Kolkata",
  tax: { name: "GST", ratePct: 18, split: "cgst_sgst" },
  taxIdLabel: "GSTIN",
  gateway: "razorpay",
  phone: { dialCode: "+91", example: "98200 11234" },
};

let current: OrgLocale = INDIA_LOCALE;

export function setOrgLocale(locale: OrgLocale | null | undefined): void {
  current = locale ?? INDIA_LOCALE;
}

export function orgLocale(): OrgLocale {
  return current;
}

/** "₹", "AED", "£", "$", "A$": the symbol the gym's currency is shown with. */
export function currencySymbol(): string {
  const part = new Intl.NumberFormat(current.locale, { style: "currency", currency: current.currency })
    .formatToParts(0)
    .find((p) => p.type === "currency");
  return part?.value ?? current.currency;
}

/** "incl. GST", "incl. VAT", or "" when the gym charges no tax (e.g. US default 0%). */
export function inclTaxLabel(): string {
  return current.tax.ratePct > 0 ? `incl. ${current.tax.name}` : "";
}

/** Same rounding as the backend's taxSplit(): each line rounded first, taxable value derived. */
export function taxSplitPreview(totalPaise: number): TaxBreakdown {
  const rate = Math.max(0, current.tax.ratePct);
  const raw = rate > 0 ? (totalPaise * rate) / (100 + rate) : 0;
  const lines =
    rate === 0
      ? []
      : current.tax.split === "cgst_sgst"
        ? [
            { label: "CGST", ratePct: rate / 2, amountPaise: Math.round(raw / 2) },
            { label: "SGST", ratePct: rate / 2, amountPaise: Math.round(raw / 2) },
          ]
        : [{ label: current.tax.name, ratePct: rate, amountPaise: Math.round(raw) }];
  const taxPaise = lines.reduce((s, l) => s + l.amountPaise, 0);
  return { name: current.tax.name, ratePct: rate, taxablePaise: totalPaise - taxPaise, taxPaise, lines, totalPaise };
}

/**
 * The tax rows printed on a receipt. Payments from Round 3 on carry `tax`; older Indian payments only
 * have the CGST/SGST `gst` breakdown, which is shown exactly as before.
 */
export function receiptTaxRows(payment: {
  tax?: TaxBreakdown;
  gst?: { taxablePaise: number; cgstPaise: number; sgstPaise: number; totalPaise: number };
  totalPaise: number;
}): { taxablePaise: number; lines: Array<{ label: string; amountPaise: number }>; totalPaise: number } {
  if (payment.tax) {
    return {
      taxablePaise: payment.tax.taxablePaise,
      lines: payment.tax.lines.map((l) => ({ label: `${l.label} ${formatRate(l.ratePct)}%`, amountPaise: l.amountPaise })),
      totalPaise: payment.tax.totalPaise,
    };
  }
  if (payment.gst) {
    return {
      taxablePaise: payment.gst.taxablePaise,
      lines: [
        { label: "CGST 9%", amountPaise: payment.gst.cgstPaise },
        { label: "SGST 9%", amountPaise: payment.gst.sgstPaise },
      ],
      totalPaise: payment.gst.totalPaise,
    };
  }
  return { taxablePaise: payment.totalPaise, lines: [], totalPaise: payment.totalPaise };
}

function formatRate(r: number): string {
  return Number.isInteger(r) ? String(r) : r.toFixed(3).replace(/0+$/, "");
}

/**
 * A quick check before submitting. The server validates the number exactly for the gym's country
 * (and stores it), so this only catches obvious typos. India keeps its exact 10-digit rule.
 */
export function looksLikeMobile(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  if (current.country === "IN") return /^(?:91|0)?[6-9]\d{9}$/.test(digits);
  return digits.length >= 8 && digits.length <= 15;
}

export function phoneHint(): string {
  return `${orgLocaleName()} mobile, for example ${current.phone.example}`;
}

function orgLocaleName(): string {
  return { IN: "Indian", AE: "UAE", GB: "UK", US: "US", AU: "Australian" }[current.country] ?? "";
}
