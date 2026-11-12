"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { meApi, ApiError } from "@/lib/api";
import { loadRazorpayScript, openRazorpayCheckout } from "@/lib/razorpay";
import { formatPaise } from "@/lib/format";
import { inclTaxLabel } from "@/lib/locale";
import { Button, Card, Spinner } from "@/components/ui";
import type { Plan } from "@/types/api";

export default function MemberRenewPage() {
  const router = useRouter();
  const { context } = useAuth();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [onlinePayments, setOnlinePayments] = useState(true);

  useEffect(() => {
    meApi.plans().then((res) => {
      setPlans(res.plans);
      setOnlinePayments(res.onlinePayments !== false);
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
        currency: order.currency ?? "INR",
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
      ) : !onlinePayments ? (
        // Per-gym payments: the gym hasn't connected its own payment account yet, so online payment is off.
        <Card>
          <p className="font-semibold">Online payment isn&apos;t available at your gym yet.</p>
          <p className="text-sm text-muted mt-1">You can renew at the front desk. Your plans and prices are below for reference.</p>
          <ul className="mt-2 text-sm">
            {plans.map((p) => (
              <li key={p._id} className="flex justify-between py-1">
                <span>{p.name}</span>
                <span className="font-semibold">{formatPaise(p.chargePaise ?? p.pricePaise)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <>
          {/* Round 5: memberships first, then personal training / class packs in their own section. */}
          {(
            [
              ["membership", "Memberships"],
              ["sessions", "Personal training & class packs"],
            ] as const
          ).map(([kind, heading]) => {
            const group = plans.filter((p) => (p.kind ?? (p.lengthUnit === "session" ? "sessions" : "membership")) === kind);
            if (group.length === 0) return null;
            return (
              <section key={kind} className="flex flex-col gap-2">
                <h2 className="text-lg">{heading}</h2>
                {group.map((p) => (
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
                          {p.lengthUnit === "session" && p.validityDaysForSessions ? ` within ${p.validityDaysForSessions} days` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold">{formatPaise(p.chargePaise ?? p.pricePaise)}</span>
                  </label>
                ))}
              </section>
            );
          })}

          {plan && (
            <Card>
              <div className="flex justify-between">
                <span className="text-muted">{inclTaxLabel() ? `Total (${inclTaxLabel()})` : "Total"}</span>
                <b className="font-display text-2xl">{formatPaise(plan.chargePaise ?? plan.tax?.totalPaise ?? plan.gst?.totalPaise ?? plan.pricePaise)}</b>
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
