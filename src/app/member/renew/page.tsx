"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { meApi, ApiError } from "@/lib/api";
import { loadRazorpayScript, openRazorpayCheckout } from "@/lib/razorpay";
import { formatPaise } from "@/lib/format";
import { Button, Card, Spinner } from "@/components/ui";
import type { Plan } from "@/types/api";

export default function MemberRenewPage() {
  const router = useRouter();
  const { context } = useAuth();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    meApi.plans().then((res) => {
      setPlans(res.plans);
      setSelected(res.plans[0]?._id ?? null);
    });
    // Preload now so the only await left in the click handler is creating the order —
    // waiting on the script load itself, inside the click handler, is what pushes
    // Razorpay's checkout into a new tab instead of an in-page modal on some browsers.
    void loadRazorpayScript();
  }, []);

  async function pay() {
    if (!selected) return;
    const plan = plans?.find((p) => p._id === selected);
    if (!plan) return;

    setError(null);
    setBusy(true);
    try {
      const order = await meApi.createRenewOrder(selected);
      await openRazorpayCheckout({
        keyId: order.keyId,
        order_id: order.orderId,
        amount: order.amountPaise,
        currency: "INR",
        name: context?.org?.name ?? "Repflow",
        description: `${plan.name} renewal`,
        theme: { color: "#16a34a" },
        modal: { ondismiss: () => setBusy(false) },
        handler: (response) => {
          meApi
            .renew({
              planId: selected,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            .then((res) => {
              router.push(`/member/home?renewed=${res.receiptNo}`);
            })
            .catch((err) => {
              // This callback only ever fires after Razorpay has already confirmed payment,
              // so any failure here means money moved but the renewal wasn't saved — never
              // show a bare error message that could read as "nothing happened."
              const detail = err instanceof ApiError ? ` (${err.message})` : "";
              setError(`Payment succeeded but we couldn't confirm the renewal${detail}. Don't pay again — contact the front desk.`);
              setBusy(false);
            });
        },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start the payment. Try again.");
      setBusy(false);
    }
  }

  if (!plans) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const plan = plans.find((p) => p._id === selected);

  return (
    <div className="flex flex-col gap-3.5">
      <h1 className="text-2xl">Renew membership</h1>

      {plans.length === 0 ? (
        <p className="text-muted">No plans are available for online renewal right now — ask the front desk.</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {plans.map((p) => (
              <label
                key={p._id}
                className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border ${
                  selected === p._id ? "border-accent bg-accent-soft" : "border-line bg-surface"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input type="radio" checked={selected === p._id} onChange={() => setSelected(p._id)} />
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-muted">
                      {p.lengthValue} {p.lengthUnit}
                      {p.lengthValue > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <span className="font-semibold">{formatPaise(p.pricePaise)}</span>
              </label>
            ))}
          </div>

          {plan && (
            <Card>
              <div className="flex justify-between">
                <span className="text-muted">Total (incl. GST)</span>
                <b className="font-display text-2xl">{formatPaise(plan.gst.totalPaise)}</b>
              </div>
            </Card>
          )}

          {error && <p className="text-sm font-semibold text-warn">{error}</p>}

          <Button variant="primary" disabled={!selected || busy} onClick={pay}>
            {busy ? "Opening payment…" : "Pay now"}
          </Button>
        </>
      )}
    </div>
  );
}
