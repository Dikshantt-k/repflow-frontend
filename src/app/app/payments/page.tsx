"use client";

import { useEffect, useState } from "react";
import { ApiError, attendanceApi, duesApi, paymentsApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { collectUpiPayment, loadRazorpayScript } from "@/lib/razorpay";
import { can } from "@/lib/permissions";
import { Button, Card, EmptyState, Field, Input, Kpi, Modal, Pill, Spinner, Toast } from "@/components/ui";
import { formatDate, formatPaise, rupeesToPaise } from "@/lib/format";
import { ReceiptModal } from "@/components/ReceiptModal";
import type { Dues, Member, Payment, PaymentMode } from "@/types/api";

function memberLabel(memberId: string | { firstName: string; lastName?: string }): string {
  if (typeof memberId === "string") return memberId;
  return `${memberId.firstName} ${memberId.lastName ?? ""}`.trim();
}

function memberPhone(memberId: string | { phone?: string }): string | undefined {
  return typeof memberId === "string" ? undefined : memberId.phone;
}

export default function PaymentsPage() {
  const { context } = useAuth();
  const canRecord = can.recordPayment(context?.role);
  const [dues, setDues] = useState<Dues[]>([]);
  const [duesLoading, setDuesLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  const [toast, setToast] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);

  // Record payment form
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<{ id: string; label: string } | null>(null);
  const [description, setDescription] = useState("");
  const [amountRupees, setAmountRupees] = useState("");
  const [mode, setMode] = useState<PaymentMode>("upi");
  const [gstInvoice, setGstInvoice] = useState(true);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [recordBusy, setRecordBusy] = useState(false);

  // Collect dues dialog
  const [collectingDue, setCollectingDue] = useState<Dues | null>(null);
  const [collectAmountRupees, setCollectAmountRupees] = useState("");
  const [collectMode, setCollectMode] = useState<PaymentMode>("upi");
  const [collectGstInvoice, setCollectGstInvoice] = useState(true);
  const [collectError, setCollectError] = useState<string | null>(null);
  const [collectBusy, setCollectBusy] = useState(false);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  async function loadDues() {
    setDuesLoading(true);
    const res = await duesApi.list();
    setDues(res.dues);
    setDuesLoading(false);
  }

  async function loadPayments() {
    setPaymentsLoading(true);
    const res = await paymentsApi.list({ pageSize: 25 });
    setPayments(res.payments);
    setPaymentsLoading(false);
  }

  useEffect(() => {
    void loadDues();
    void loadPayments();
    // Preload so paying via UPI only has to await order creation inside the click handler —
    // see the matching note in member/renew/page.tsx for why this avoids a new-tab checkout.
    void loadRazorpayScript();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim() || selectedMember) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const res = await attendanceApi.lookup(searchQuery.trim());
        // A later-typed query can resolve before an earlier, slower one — only the most
        // recent request for the current text should ever be allowed to set results.
        if (!cancelled) setSearchResults(res.members);
      } catch {
        if (!cancelled) setSearchResults([]);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [searchQuery, selectedMember]);

  function selectMember(m: Member) {
    setSelectedMember({ id: m._id, label: `${m.firstName} ${m.lastName ?? ""} · ${m.phone}`.trim() });
    setSearchQuery(`${m.firstName} ${m.lastName ?? ""}`.trim());
    setSearchResults([]);
  }

  const pendingDuesTotal = dues.reduce((sum, d) => sum + d.outstandingPaise, 0);

  async function submitPayment() {
    setRecordError(null);
    if (!selectedMember) {
      setRecordError("Search and select a member.");
      return;
    }
    if (!description.trim()) {
      setRecordError("Enter what this payment is for.");
      return;
    }
    const amount = Number(amountRupees);
    if (!amountRupees.trim() || !(amount > 0)) {
      setRecordError("Enter an amount above ₹0.");
      return;
    }
    const amountPaidPaise = rupeesToPaise(amount);
    if (mode === "upi" && amountPaidPaise < 100) {
      setRecordError("Enter at least ₹1 to collect via UPI.");
      return;
    }

    setRecordBusy(true);
    let paid = false;
    try {
      let razorpayProof: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string } | undefined;
      if (mode === "upi") {
        const order = await paymentsApi.createRazorpayOrder(amountPaidPaise);
        razorpayProof = await collectUpiPayment({ order, orgName: context?.org?.name ?? "Repflow", description: description.trim() });
        paid = true;
      }

      const res = await paymentsApi.record({
        memberId: selectedMember.id,
        description: description.trim(),
        amountPaidPaise,
        mode,
        gstInvoice,
        ...razorpayProof,
      });
      showToast("Payment saved. Receipt ready.");
      setReceiptId(res.payment._id);
      setSelectedMember(null);
      setSearchQuery("");
      setDescription("");
      setAmountRupees("");
      void loadPayments();
    } catch (err) {
      if (paid) {
        setRecordError(
          `${formatPaise(amountPaidPaise)} was collected via UPI, but this payment couldn't be saved. Don't collect again — contact support to reconcile this payment.`
        );
      } else if (err instanceof Error && err.message === "Payment cancelled.") {
        setRecordError("Payment was cancelled. Try again when ready.");
      } else {
        setRecordError(err instanceof ApiError ? err.message : "Couldn't save this payment.");
      }
    } finally {
      setRecordBusy(false);
    }
  }

  function openCollect(due: Dues) {
    setCollectingDue(due);
    setCollectAmountRupees(String(due.outstandingPaise / 100));
    setCollectMode("upi");
    setCollectGstInvoice(true);
    setCollectError(null);
  }

  async function submitCollect() {
    if (!collectingDue) return;
    setCollectError(null);
    const amount = Number(collectAmountRupees);
    if (!collectAmountRupees.trim() || !(amount > 0)) {
      setCollectError("Enter an amount above ₹0.");
      return;
    }
    const amountPaise = rupeesToPaise(amount);
    if (collectMode === "upi" && amountPaise < 100) {
      setCollectError("Enter at least ₹1 to collect via UPI.");
      return;
    }

    setCollectBusy(true);
    let paid = false;
    try {
      let razorpayProof: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string } | undefined;
      if (collectMode === "upi") {
        const order = await paymentsApi.createRazorpayOrder(amountPaise);
        razorpayProof = await collectUpiPayment({
          order,
          orgName: context?.org?.name ?? "Repflow",
          description: `Dues collection — ${memberLabel(collectingDue.memberId)}`,
        });
        paid = true;
      }

      const res = await duesApi.collect(collectingDue._id, {
        amountPaise,
        mode: collectMode,
        gstInvoice: collectGstInvoice,
        ...razorpayProof,
      });
      const extra = res.appliedToOtherDuesPaise > 0 ? ` ${formatPaise(res.appliedToOtherDuesPaise)} also applied to another due.` : "";
      showToast(`Payment collected.${extra}`);
      setCollectingDue(null);
      setReceiptId(res.payment._id);
      void loadDues();
      void loadPayments();
    } catch (err) {
      if (paid) {
        setCollectError(
          `${formatPaise(amountPaise)} was collected via UPI, but this couldn't be saved. Don't collect again — contact support to reconcile this payment.`
        );
      } else if (err instanceof Error && err.message === "Payment cancelled.") {
        setCollectError("Payment was cancelled. Try again when ready.");
      } else {
        setCollectError(err instanceof ApiError ? err.message : "Couldn't collect this payment.");
      }
    } finally {
      setCollectBusy(false);
    }
  }

  async function remind(due: Dues) {
    try {
      await duesApi.remind(due._id);
      showToast(`Reminder sent to ${memberLabel(due.memberId)}.`);
      void loadDues();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't send the reminder.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1>Payments and dues</h1>
        <p className="text-muted mt-1">{formatDate(new Date(), { month: "long", year: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <Kpi
          label="Pending dues"
          value={duesLoading ? "…" : formatPaise(pendingDuesTotal)}
          sub={duesLoading ? undefined : `${dues.length} member${dues.length === 1 ? "" : "s"} owe`}
          warn={pendingDuesTotal > 0}
        />
        <Kpi label="Open dues entries" value={duesLoading ? "…" : dues.length} />
      </div>

      <div className="flex flex-wrap gap-3.5 items-start">
        {canRecord && (
        <Card className="flex-1 basis-[380px]">
          <h2>Record a payment</h2>

          <div className="relative">
            <Field label="Member">
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedMember(null);
                }}
                placeholder="Search by name, phone or member ID"
              />
            </Field>
            {searchResults.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-surface border border-line rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {searchResults.map((m) => (
                  <button
                    key={m._id}
                    type="button"
                    onClick={() => selectMember(m)}
                    className="w-full text-left px-3 py-2 hover:bg-line2 flex flex-col"
                  >
                    <span className="font-medium">
                      {m.firstName} {m.lastName ?? ""}
                    </span>
                    <span className="text-xs text-muted">
                      {m.phone} · {m.memberCode}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Field label="Description">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Personal training, 12 sessions" />
          </Field>

          <Field label="Amount">
            <Input inputMode="decimal" value={amountRupees} onChange={(e) => setAmountRupees(e.target.value.replace(/[^\d.]/g, ""))} placeholder="₹" />
          </Field>

          <div className="flex gap-2">
            <Pill active={mode === "upi"} onClick={() => setMode("upi")}>
              UPI
            </Pill>
            <Pill active={mode === "cash"} onClick={() => setMode("cash")}>
              Cash
            </Pill>
            <Pill active={mode === "card"} onClick={() => setMode("card")}>
              Card
            </Pill>
          </div>

          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={gstInvoice} onChange={(e) => setGstInvoice(e.target.checked)} className="w-[18px] h-[18px] accent-accent" />
            GST invoice
          </label>

          {recordError && <p className="text-sm font-semibold text-warn">{recordError}</p>}

          <Button variant="primary" className="w-full" onClick={submitPayment} disabled={recordBusy}>
            {recordBusy ? (mode === "upi" ? "Opening payment…" : "Saving…") : "Save and send receipt"}
          </Button>
        </Card>
        )}

        <Card className="flex-1 basis-[380px] p-0 overflow-x-auto">
          <div className="p-5 pb-0">
            <h2>Members with dues</h2>
          </div>
          {duesLoading ? (
            <div className="p-5">
              <Spinner />
            </div>
          ) : dues.length === 0 ? (
            <EmptyState>No one owes anything right now.</EmptyState>
          ) : (
            <table className="w-full border-collapse mt-3">
              <thead>
                <tr>
                  <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Member</th>
                  <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Due since</th>
                  <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Last reminder</th>
                  <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Amount</th>
                  <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2" />
                </tr>
              </thead>
              <tbody>
                {dues.map((due) => (
                  <tr key={due._id} className="border-t border-line2">
                    <td className="p-3">
                      <div className="font-medium">{memberLabel(due.memberId)}</div>
                      {memberPhone(due.memberId) && <div className="text-xs text-muted">{memberPhone(due.memberId)}</div>}
                    </td>
                    <td className="p-3">{formatDate(due.dueSince)}</td>
                    <td className="p-3">
                      {due.lastReminder?.date ? `${formatDate(due.lastReminder.date)} · ${due.lastReminder.channel}` : "Not sent"}
                    </td>
                    <td className="p-3 font-semibold text-warn">{formatPaise(due.outstandingPaise)}</td>
                    <td className="p-3">
                      <div className="flex gap-2 justify-end">
                        <Button onClick={() => remind(due)}>Remind</Button>
                        {canRecord && (
                          <Button variant="primary" onClick={() => openCollect(due)}>
                            Collect
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card className="p-0 overflow-x-auto">
        <div className="p-5 pb-0">
          <h2>Recent payments</h2>
        </div>
        {paymentsLoading ? (
          <div className="p-5">
            <Spinner />
          </div>
        ) : payments.length === 0 ? (
          <EmptyState>No payments recorded yet.</EmptyState>
        ) : (
          <table className="w-full border-collapse mt-3">
            <thead>
              <tr>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Receipt no.</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Member</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">For</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Mode</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Amount</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2" />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id} className="border-t border-line2">
                  <td className="p-3">{p.receiptNo}</td>
                  <td className="p-3">{memberLabel(p.memberId)}</td>
                  <td className="p-3">{p.description}</td>
                  <td className="p-3 uppercase">{p.mode}</td>
                  <td className="p-3 font-semibold">{formatPaise(p.amountPaidPaise)}</td>
                  <td className="p-3 text-right">
                    <Button onClick={() => setReceiptId(p._id)}>Receipt</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {collectingDue && (
        <Modal open onClose={() => setCollectingDue(null)} title={`Collect from ${memberLabel(collectingDue.memberId)}`}>
          <div className="flex flex-col gap-3.5">
            <Field label="Amount">
              <Input
                inputMode="decimal"
                value={collectAmountRupees}
                onChange={(e) => setCollectAmountRupees(e.target.value.replace(/[^\d.]/g, ""))}
              />
            </Field>
            <div className="flex gap-2">
              <Pill active={collectMode === "upi"} onClick={() => setCollectMode("upi")}>
                UPI
              </Pill>
              <Pill active={collectMode === "cash"} onClick={() => setCollectMode("cash")}>
                Cash
              </Pill>
              <Pill active={collectMode === "card"} onClick={() => setCollectMode("card")}>
                Card
              </Pill>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={collectGstInvoice}
                onChange={(e) => setCollectGstInvoice(e.target.checked)}
                className="w-[18px] h-[18px] accent-accent"
              />
              GST invoice
            </label>
            {collectError && <p className="text-sm font-semibold text-warn">{collectError}</p>}
            <div className="flex gap-2 border-t border-line2 pt-3">
              <Button className="flex-1" onClick={() => setCollectingDue(null)} disabled={collectBusy}>
                Cancel
              </Button>
              <Button variant="primary" className="flex-1" onClick={submitCollect} disabled={collectBusy}>
                {collectBusy ? (collectMode === "upi" ? "Opening payment…" : "Saving…") : "Collect payment"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <ReceiptModal paymentId={receiptId} onClose={() => setReceiptId(null)} />
      <Toast message={toast} />
    </div>
  );
}
