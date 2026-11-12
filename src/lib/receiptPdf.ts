import { jsPDF } from "jspdf";
import { formatDate, formatPaise } from "./format";
import { receiptTaxRows } from "./locale";
import type { Member, Payment } from "@/types/api";

interface ReceiptPdfInput {
  payment: Payment;
  member: Pick<Member, "firstName" | "lastName" | "phone" | "memberCode">;
  org: { name: string; gstin?: string; taxId?: string; taxIdLabel?: string };
  branch: { name: string; address?: string };
}

const MARGIN = 28;
const WIDTH = 320;

export function downloadReceiptPdf({ payment, member, org, branch }: ReceiptPdfInput): void {
  const doc = new jsPDF({ unit: "pt", format: [WIDTH, 560] });
  let y = MARGIN;
  // Amounts in the currency the payment was taken in (Round 3).
  const money = (paise: number) => formatPaise(paise, payment.currency);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(org.name, MARGIN, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90, 96, 103);
  const taxId = org.taxId ?? org.gstin;
  const subLine = [branch.name, branch.address, taxId ? `${org.taxIdLabel ?? "GSTIN"} ${taxId}` : undefined].filter(Boolean).join(" · ");
  doc.text(doc.splitTextToSize(subLine, WIDTH - MARGIN * 2), MARGIN, y);
  y += 20;

  doc.setDrawColor(201, 204, 196);
  doc.setLineDashPattern([2, 1], 0);
  doc.line(MARGIN, y, WIDTH - MARGIN, y);
  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(90, 96, 103);
  doc.text("TAX INVOICE", WIDTH / 2, y, { align: "center" });
  y += 12;
  doc.line(MARGIN, y, WIDTH - MARGIN, y);
  doc.setLineDashPattern([], 0);
  y += 20;

  doc.setTextColor(21, 23, 26);
  const rows: Array<[string, string]> = [
    ["Receipt no.", payment.receiptNo],
    ["Date", formatDate(payment.date)],
    ["Member", `${member.firstName} ${member.lastName ?? ""} · ${member.memberCode}`],
    ["Mobile", member.phone],
  ];
  doc.setFontSize(10);
  for (const [label, value] of rows) {
    doc.setTextColor(90, 96, 103);
    doc.text(label, MARGIN, y);
    doc.setTextColor(21, 23, 26);
    doc.text(value, WIDTH - MARGIN, y, { align: "right" });
    y += 16;
  }
  y += 6;

  doc.line(MARGIN, y, WIDTH - MARGIN, y);
  y += 16;
  doc.text(payment.description, MARGIN, y);
  doc.text(money(payment.totalPaise), WIDTH - MARGIN, y, { align: "right" });
  y += 12;
  doc.line(MARGIN, y, WIDTH - MARGIN, y);
  y += 18;

  doc.setTextColor(90, 96, 103);
  doc.setFontSize(9.5);
  // Tax lines for the gym's country: CGST/SGST, VAT, GST or sales tax (Round 3).
  const tax = receiptTaxRows(payment);
  const gstRows: Array<[string, string]> = tax.lines.length
    ? [["Taxable value", money(tax.taxablePaise)], ...tax.lines.map((l): [string, string] => [l.label, money(l.amountPaise)])]
    : [];
  for (const [label, value] of gstRows) {
    doc.text(label, MARGIN, y);
    doc.text(value, WIDTH - MARGIN, y, { align: "right" });
    y += 14;
  }
  y += 6;

  doc.setDrawColor(21, 23, 26);
  doc.setLineWidth(1.3);
  doc.line(MARGIN, y, WIDTH - MARGIN, y);
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(21, 23, 26);
  doc.text("Total", MARGIN, y);
  doc.setFontSize(16);
  doc.text(money(tax.totalPaise), WIDTH - MARGIN, y, { align: "right" });
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Paid by ${payment.mode.toUpperCase()}`, MARGIN, y);
  doc.text(money(payment.amountPaidPaise), WIDTH - MARGIN, y, { align: "right" });
  y += 16;
  if (payment.balancePaise > 0) {
    doc.setTextColor(180, 72, 15);
    doc.setFont("helvetica", "bold");
    doc.text("Balance due", MARGIN, y);
    doc.text(money(payment.balancePaise), WIDTH - MARGIN, y, { align: "right" });
    y += 16;
  }
  y += 10;

  doc.setDrawColor(201, 204, 196);
  doc.setLineDashPattern([2, 1], 0);
  doc.line(MARGIN, y, WIDTH - MARGIN, y);
  y += 16;
  doc.setLineDashPattern([], 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(90, 96, 103);
  doc.text(`${payment.balancePaise > 0 ? "Part paid" : "Paid"} · Thank you for training with us.`, WIDTH / 2, y, { align: "center" });
  y += 14;
  doc.setFont("helvetica", "bolditalic");
  doc.setTextColor(14, 107, 92);
  doc.text("Powered by REPFLOW", WIDTH / 2, y, { align: "center" });

  doc.save(`receipt-${payment.receiptNo}.pdf`);
}
