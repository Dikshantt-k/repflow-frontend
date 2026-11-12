"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, paymentAccountsApi } from "@/lib/api";
import { Button, Card, Spinner } from "@/components/ui";

/** Razorpay sends the owner back here after they approve Repflow; we finish connecting their account. */
function Callback() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      setError(params.get("error_description") ?? "Razorpay didn't finish connecting. Try again from Settings → Payments.");
      return;
    }
    paymentAccountsApi
      .razorpayCallback(code, state)
      .then(() => router.replace("/app/settings/payments"))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't connect Razorpay. Try again."));
  }, [params, router]);

  if (!error) return <Spinner />;
  return (
    <Card className="max-w-[520px]">
      <p className="font-semibold">Razorpay wasn&apos;t connected</p>
      <p className="text-sm">{error}</p>
      <div>
        <Button onClick={() => router.replace("/app/settings/payments")}>Back to payment settings</Button>
      </div>
    </Card>
  );
}

export default function RazorpayCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Callback />
    </Suspense>
  );
}
