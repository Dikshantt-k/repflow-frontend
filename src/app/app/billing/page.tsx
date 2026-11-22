"use client";

import { useEffect, useState } from "react";
import { ApiError, billingApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { openRazorpayCheckout, loadRazorpayScript } from "@/lib/razorpay";
import { formatDate, formatPaise } from "@/lib/format";
import { Badge, Button, Card, Modal, Spinner, Toast } from "@/components/ui";
import type { OwnerBilling, SignupPackage } from "@/types/api";

const UNIT: Record<string, string> = { branch: "per branch", member: "per member", flat: "flat" };
const inr = (paise: number) => formatPaise(paise, "INR"); // Repflow bills in INR

function statusBadge(status: string) {
  if (status === "active") return <Badge tone="green">Active</Badge>;
  if (status === "trial") return <Badge tone="blue">Free trial</Badge>;
  if (status === "grace") return <Badge tone="orange">Payment due</Badge>;
  return <Badge tone="gray">Paused</Badge>;
}

/**
 * The owner's Repflow plan: pick or switch the package, see the next charge, and pay invoices into
 * Repflow's own account. Works even while the gym is suspended, so the owner can pay their way back.
 */
export default function BillingPage() {
  const { context, refresh } = useAuth();
  const [data, setData] = useState<OwnerBilling | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [switching, setSwitching] = useState<SignupPackage | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const res = await billingApi.get();
      setData(res);
      setCycle(res.subscription?.billingCycle ?? "monthly");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load billing.");
    }
  }

  useEffect(() => {
    void load();
    void loadRazorpayScript().catch(() => undefined);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  if (context && context.role !== "org_owner") return <p className="text-muted">Only the gym owner can see billing.</p>;
  if (!data) return error ? <p className="text-warn">{error}</p> : <Spinner />;

  const sub = data.subscription;
  const pkg = sub?.package ?? null;
  const unpaid = data.invoices.filter((i) => i.status !== "paid");

  async function choose(p: SignupPackage) {
    setBusy(true);
    try {
      setData(await billingApi.choosePackage(p._id, cycle));
      await refresh();
      showToast(`You're on ${p.name}${sub?.status === "trial" || !sub ? " for the rest of your trial" : " from your next invoice"}.`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't change the plan.");
    } finally {
      setBusy(false);
      setSwitching(null);
    }
  }

  async function startNow() {
    setBusy(true);
    try {
      setData(await billingApi.startNow());
      await refresh();
      showToast("Your paid plan has started. Pay the invoice below.");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't start the plan.");
    } finally {
      setBusy(false);
    }
  }

  async function pay(invoiceId: string, amountPaise: number) {
    setBusy(true);
    try {
      const order = await billingApi.invoiceOrder(invoiceId);
      await openRazorpayCheckout({
        keyId: order.keyId,
        order_id: order.orderId,
        amount: order.amountPaise,
        currency: order.currency,
        name: "Repflow",
        description: "Repflow subscription",
        theme: { color: "#0e6b5c" },
        modal: { ondismiss: () => setBusy(false) },
        handler: (r) => {
          billingApi
            .payInvoice(invoiceId, { razorpayOrderId: r.razorpay_order_id, razorpayPaymentId: r.razorpay_payment_id, razorpaySignature: r.razorpay_signature })
            .then(async () => {
              await load();
              await refresh();
              showToast(`Paid ${inr(amountPaise)}. Thank you!`);
            })
            .catch((err) => showToast(err instanceof ApiError ? `Payment received but not confirmed: ${err.message}` : "Payment received but not confirmed. Contact Repflow support."))
            .finally(() => setBusy(false));
        },
      });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't start the payment.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 max-w-[960px]">
      <div>
        <h1>Billing &amp; plan</h1>
        <p className="text-muted mt-1">Your Repflow subscription. Your members&apos; payments go to your own payment account, not here.</p>
      </div>

      <Card className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Current plan</p>
            <h2 className="text-2xl">{pkg?.name ?? "No plan chosen yet"}</h2>
          </div>
          {statusBadge(data.org.status)}
        </div>
        {data.org.status === "trial" && data.org.trialEndsAt && (
          <p className="text-sm">
            Free trial until <b>{formatDate(data.org.trialEndsAt)}</b>. Your first invoice is raised then, and you&apos;ll have 7 days to pay it.
          </p>
        )}
        {data.org.status === "grace" && (
          <p className="text-sm text-warn-ink">
            Payment due{data.org.graceEndsAt ? ` by ${formatDate(data.org.graceEndsAt)}` : ""}. After that the account is paused (read-only) until it&apos;s paid.
          </p>
        )}
        {data.org.status === "suspended" && <p className="text-sm text-warn-ink">Paused for an unpaid invoice. Pay it below to unlock everything straight away.</p>}
        {sub && sub.status === "active" && sub.currentPeriodEnd && <p className="text-sm">Next invoice on {formatDate(sub.currentPeriodEnd)}.</p>}
        {data.nextChargePaise !== null && pkg && (
          <p className="text-sm text-muted">
            {inr(data.nextChargePaise)} per {sub?.billingCycle === "yearly" ? "year" : "month"} incl. GST
            {pkg.chargeUnit === "branch" ? ` (${data.branchCount} branch${data.branchCount === 1 ? "" : "es"})` : ""}
            {sub?.discountPct ? `, with your ${sub.discountPct}% discount` : ""}.
          </p>
        )}
        {sub?.status === "trial" && (
          <div>
            <Button disabled={busy} onClick={startNow}>
              Start paid plan now
            </Button>
          </div>
        )}
      </Card>

      {unpaid.length > 0 && (
        <Card className="gap-2 border-warn-line">
          <h2>To pay</h2>
          {unpaid.map((i) => (
            <div key={i._id} className="flex flex-wrap items-center justify-between gap-3 border-t border-line2 pt-2 first:border-0 first:pt-0">
              <span>
                {formatDate(i.periodStart)} to {formatDate(i.periodEnd)}
                <span className="block text-sm text-muted">incl. GST {inr(i.gstPaise)}</span>
              </span>
              <span className="flex items-center gap-3">
                <b className="text-lg">{inr(i.totalPaise)}</b>
                <Button variant="primary" disabled={busy} onClick={() => pay(i._id, i.totalPaise)}>
                  Pay now
                </Button>
              </span>
            </div>
          ))}
        </Card>
      )}

      <Card className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2>{pkg ? "Change plan" : "Choose a plan"}</h2>
          <div className="flex gap-1 rounded-[10px] border border-line p-1" role="group" aria-label="Billing cycle">
            {(["monthly", "yearly"] as const).map((c) => (
              <button
                key={c}
                type="button"
                className={`min-h-[36px] px-3 rounded-lg text-sm font-semibold ${cycle === c ? "bg-accent text-on-accent" : "text-muted"}`}
                onClick={() => setCycle(c)}
              >
                {c === "monthly" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.packages.map((p) => {
            const current = pkg?._id === p._id && sub?.billingCycle === cycle;
            const price = cycle === "yearly" ? (p.yearlyPricePaise ?? p.monthlyPricePaise * 12) : p.monthlyPricePaise;
            return (
              <div key={p._id} className={`rounded-[12px] border p-4 flex flex-col gap-2 ${current ? "border-accent bg-accent-soft" : "border-line"}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-semibold text-lg">{p.name}</h3>
                  <span className="text-right">
                    <b>{inr(price)}</b>
                    <span className="block text-xs text-muted">
                      {UNIT[p.chargeUnit] ?? ""} / {cycle === "yearly" ? "year" : "month"}
                    </span>
                  </span>
                </div>
                {p.description && <p className="text-sm text-muted">{p.description}</p>}
                <p className="text-xs text-muted">{p.modules.map((m) => m.label).join(" · ")}</p>
                {p.fitProblem ? (
                  <p className="text-sm text-warn-ink">{p.fitProblem}</p>
                ) : current ? (
                  <Badge tone="green">Your plan</Badge>
                ) : (
                  <div>
                    <Button variant={pkg ? "default" : "primary"} disabled={busy} onClick={() => (pkg ? setSwitching(p) : choose(p))}>
                      {pkg ? `Switch to ${p.name}` : `Choose ${p.name}`}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {data.invoices.some((i) => i.status === "paid") && (
        <Card className="gap-2">
          <h2>Past invoices</h2>
          {data.invoices
            .filter((i) => i.status === "paid")
            .map((i) => (
              <div key={i._id} className="flex justify-between border-t border-line2 pt-2 first:border-0 first:pt-0 text-sm">
                <span>
                  {formatDate(i.periodStart)} to {formatDate(i.periodEnd)}
                </span>
                <span>
                  {inr(i.totalPaise)} <Badge tone="green">Paid</Badge>
                </span>
              </div>
            ))}
        </Card>
      )}

      <Modal open={switching !== null} onClose={() => setSwitching(null)} title={`Switch to ${switching?.name}?`}>
        <p className="text-sm">
          {sub?.status === "trial"
            ? "You'll trial this plan for the rest of your free trial instead."
            : "The new price applies from your next invoice. Features change straight away."}
        </p>
        <div className="flex justify-end gap-2">
          <Button onClick={() => setSwitching(null)}>Cancel</Button>
          <Button variant="primary" disabled={busy} onClick={() => switching && choose(switching)}>
            Switch
          </Button>
        </div>
      </Modal>

      <Toast message={toast} />
    </div>
  );
}
