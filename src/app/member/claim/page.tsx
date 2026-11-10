"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { memberAuthApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button, Field, Input } from "@/components/ui";

export default function ClaimMemberAccountPage() {
  const router = useRouter();
  const { setSession } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await memberAuthApi.claim(email, password);
      await setSession(res.user, res.accessToken, res.refreshToken);
      router.push("/member/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't set up your account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-bg">
      <div className="w-full max-w-[420px] flex flex-col gap-4">
        <div className="flex items-center gap-2 font-display italic text-2xl font-extrabold text-accent">Repflow</div>
        <h1 className="text-3xl">Set up your member login</h1>
        <p className="text-muted">
          Use the email your gym has on file for you. If you&apos;re not sure, ask the front desk.
        </p>

        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <Field label="Create a password" hint="At least 8 characters.">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        {error && <p className="text-sm font-semibold text-warn">{error}</p>}
        <Button variant="primary" disabled={!email || password.length < 8 || busy} onClick={submit}>
          {busy ? "Setting up…" : "Continue"}
        </Button>

        <p className="text-sm text-muted mt-2">
          Already set up?{" "}
          <Link href="/login" className="text-link font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
