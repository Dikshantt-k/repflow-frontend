"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { homeFor } from "@/lib/nav";
import { Button, Field, Input, Spinner } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const { user, context, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && context) router.replace(homeFor(context.role));
  }, [loading, user, context, router]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function register() {
    setError(null);
    setBusy(true);
    try {
      const res = await authApi.register(name, email, password);
      router.push(`/signup?sessionToken=${encodeURIComponent(res.sessionToken)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create your account. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-bg">
      <div className="w-full max-w-[420px] flex flex-col gap-4">
        <div className="flex items-center gap-2 font-display italic text-2xl font-extrabold text-accent">Repflow</div>
        <h1 className="text-3xl">Start your free trial</h1>
        <p className="text-muted">14 days, no card required.</p>

        <Field label="Your name">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </Field>
        {error && <p className="text-sm font-semibold text-warn">{error}</p>}
        <Button variant="primary" disabled={!name || !email || password.length < 8 || busy} onClick={register}>
          {busy ? "Creating account…" : "Continue"}
        </Button>

        <p className="text-sm text-muted mt-2">
          Already have an account?{" "}
          <Link href="/login" className="text-link font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
