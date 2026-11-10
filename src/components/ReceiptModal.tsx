"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { paymentsApi, ApiError } from "@/lib/api";
import { formatPaise, formatDate } from "@/lib/format";
import { downloadReceiptPdf } from "@/lib/receiptPdf";
import { Button, Modal, Spinner } from "@/components/ui";
import type { Payment } from "@/types/api";

interface ReceiptData {
  payment: Payment;
  member: { _id: string; firstName: string; lastName?: string; phone: string; memberCode: string };
  org: { name: string; gstin?: string };
  branch: { name: string; address?: string };
}

export function ReceiptModal({ paymentId, onClose }: { paymentId: string | null; onClose: () => void }) {
  const [data, setData] = useState<ReceiptData | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(null);
      setSent(false);
      setError(null);
      return;
    }
    let cancelled = false;
    paymentsApi.receipt(paymentId).then((res) => {
      if (!cancelled) setData(res as unknown as ReceiptData);
    });
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  async function sendOnWhatsapp() {
    if (!paymentId) return;
    setSending(true);
    setError(null);
    try {
      await paymentsApi.sendReceipt(paymentId);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send the receipt.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={paymentId !== null} onClose={onClose} title="Receipt">
      {!data ? (
        <Spinner />
      ) : (
        <div className="flex flex-col gap-4">
          <div id="receipt-paper" className="bg-white text-[#15171A] border border-[#E2E4DF] rounded-md p-5 text-sm flex flex-col gap-3.5">
            <div className="flex gap-3 items-center">
              <span className="w-8 h-8 rounded-lg bg-[#12201D] text-[#2BB39A] flex items-center justify-center font-display italic font-extrabold text-sm flex-none">
                {data.org.name[0]}
              </span>
              <div className="flex flex-col">
                <span className="font-display font-semibold text-xl">{data.org.name}</span>
                <span className="text-xs text-[#5A6067] leading-tight">
                  {data.branch.name}
                  {data.branch.address ? `, ${data.branch.address}` : ""}
                  {data.org.gstin ? ` · GSTIN ${data.org.gstin}` : ""}
                </span>
              </div>
            </div>

            <div className="text-xs font-bold tracking-[.08em] text-[#5A6067] border-y border-dashed border-[#C9CCC4] py-1.5 text-center">
              TAX INVOICE
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="flex flex-col">
                <span className="text-xs text-[#5A6067]">Receipt no.</span>
                <span>{data.payment.receiptNo}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-[#5A6067]">Date</span>
                <span>{formatDate(data.payment.date)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-[#5A6067]">Member</span>
                <span>
                  {data.member.firstName} {data.member.lastName ?? ""} · {data.member.memberCode}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-[#5A6067]">Mobile</span>
                <span>{data.member.phone}</span>
              </div>
            </div>

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="text-left font-semibold text-xs text-[#5A6067] pb-1.5 border-b border-[#E2E4DF]">Description</th>
                  <th className="text-right font-semibold text-xs text-[#5A6067] pb-1.5 border-b border-[#E2E4DF]">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-1.5 border-b border-[#EEF0EC]">{data.payment.description}</td>
                  <td className="py-1.5 border-b border-[#EEF0EC] text-right">{formatPaise(data.payment.totalPaise)}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex flex-col gap-0.5 text-sm text-[#5A6067]">
              <div className="flex justify-between">
                <span>Taxable value</span>
                <span>{formatPaise(data.payment.gst.taxablePaise)}</span>
              </div>
              <div className="flex justify-between">
                <span>CGST 9%</span>
                <span>{formatPaise(data.payment.gst.cgstPaise)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST 9%</span>
                <span>{formatPaise(data.payment.gst.sgstPaise)}</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline border-t-2 border-[#15171A] pt-2">
              <span className="font-semibold">Total</span>
              <b className="font-display text-[28px]">{formatPaise(data.payment.gst.totalPaise)}</b>
            </div>

            <div className="flex flex-col gap-0.5 text-sm">
              <div className="flex justify-between">
                <span>Paid by {data.payment.mode.toUpperCase()}</span>
                <span>{formatPaise(data.payment.amountPaidPaise)}</span>
              </div>
              {data.payment.balancePaise > 0 && (
                <div className="flex justify-between text-[#B4480F] font-semibold">
                  <span>Balance due</span>
                  <span>{formatPaise(data.payment.balancePaise)}</span>
                </div>
              )}
            </div>

            <div className="text-center text-xs text-[#5A6067] border-t border-dashed border-[#C9CCC4] pt-2.5">
              {data.payment.balancePaise > 0 ? "Part paid" : "Paid"} · Thank you for training with us.
              <br />
              <span className="font-display italic text-[#0E6B5C]">Powered by REPFLOW</span>
            </div>
          </div>

          {error && <p className="text-sm font-semibold text-warn">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button className="flex-1" onClick={() => window.print()}>
              Print
            </Button>
            <Button className="flex-1" onClick={() => downloadReceiptPdf(data)}>
              Download PDF
            </Button>
            <Button className="flex-1" disabled={sending || sent} onClick={sendOnWhatsapp}>
              {sent ? "Sent" : sending ? "Sending…" : "Send on WhatsApp"}
            </Button>
            <Link
              href={`/app/members/${data.member._id}`}
              onClick={onClose}
              className="flex-1 inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-[10px] border border-line bg-surface text-ink font-semibold text-sm whitespace-nowrap hover:border-muted"
            >
              Open member profile
            </Link>
            <Button variant="primary" className="flex-1" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
