"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { meApi, ApiError } from "@/lib/api";
import { formatPaise } from "@/lib/format";
import { Button, Card, Spinner } from "@/components/ui";
import type { Plan } from "@/types/api";

export default function MemberRenewPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    meApi.plans().then((res) => {
      setPlans(res.plans);
      setSelected(res.plans[0]?._id ?? null);
    });
  }, []);

  async function pay() {
    if (!selected) return;
    setError(null);
    setBusy(true);
    try {
      const res = await meApi.renew(selected);
      router.push(`/member/home?renewed=${res.receiptNo}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't complete the renewal.");
    } finally {
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
            {busy ? "Processing…" : "Pay with UPI"}
          </Button>
          <p className="text-xs text-muted text-center">Dev mode: payment is recorded immediately — no real payment gateway is wired up yet.</p>
        </>
      )}
    </div>
  );
}
