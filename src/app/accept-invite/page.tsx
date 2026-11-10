"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { homeFor } from "@/lib/nav";
import { Button, Field, Input } from "@/components/ui";
import type { ContextOption } from "@/types/api";

export default function AcceptInvitePage() {
  const router = useRouter();
  const { setSession } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [contexts, setContexts] = useState<ContextOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await authApi.acceptInvite(email, password);
      if (res.status === "choose_context") {
        setSessionToken(res.sessionToken);
        setContexts(res.contexts);
        return;
      }
      const ctx = await setSession(res.user, res.accessToken, res.refreshToken);
      router.push(homeFor(ctx.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't set up your account.");
    } finally {
      setBusy(false);
    }
  }

  async function pickContext(ctx: ContextOption) {
    if (!sessionToken) return;
    setError(null);
    setBusy(true);
    try {
      const res = await authApi.selectContext(sessionToken, ctx);
      const resolved = await setSession(res.user, res.accessToken, res.refreshToken);
      router.push(homeFor(resolved.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't open that account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-bg">
      <div className="w-full max-w-[420px] flex flex-col gap-4">
        <div className="flex items-center gap-2 font-display italic text-2xl font-extrabold text-accent">Repflow</div>

        {!contexts ? (
          <>
            <h1 className="text-3xl">Set up your account</h1>
            <p className="text-muted">Use the email your gym invited you with.</p>
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
          </>
        ) : (
          <>
            <h1 className="text-3xl">Choose an account</h1>
            <p className="text-muted">This email is linked to more than one account.</p>
            <div className="flex flex-col gap-2">
              {contexts.map((ctx, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={busy}
                  onClick={() => pickContext(ctx)}
                  className="flex flex-col gap-0.5 px-4 py-3 rounded-xl border border-line bg-surface text-left hover:border-accent"
                >
                  <span className="font-semibold">{ctx.orgName ?? "Repflow"}</span>
                  <span className="text-sm text-muted">
                    {ctx.role.replace("_", " ")}
                    {ctx.branchName ? ` · ${ctx.branchName}` : ""}
                  </span>
                </button>
              ))}
            </div>
            {error && <p className="text-sm font-semibold text-warn">{error}</p>}
          </>
        )}

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
