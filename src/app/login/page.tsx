"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { homeFor } from "@/lib/nav";
import { Button, Field, Input, Pill, Spinner } from "@/components/ui";
import type { ContextOption, LoginIdentifierType, Role } from "@/types/api";

type Step = "credentials" | "choose_context";

const IDENTIFIER_TABS: Array<{ value: LoginIdentifierType; label: string; placeholder: string; type: string; autoComplete: string }> = [
  { value: "member_code", label: "Member code", placeholder: "e.g. TW-0412", type: "text", autoComplete: "username" },
  { value: "email", label: "Email", placeholder: "you@example.com", type: "email", autoComplete: "email" },
  { value: "phone", label: "Mobile", placeholder: "98200 11234", type: "tel", autoComplete: "tel" },
];

export default function LoginPage() {
  const router = useRouter();
  const { user, context, loading, setSession } = useAuth();

  useEffect(() => {
    if (!loading && user && context) router.replace(homeFor(context.role));
  }, [loading, user, context, router]);

  const [step, setStep] = useState<Step>("credentials");
  const [identifierType, setIdentifierType] = useState<LoginIdentifierType>("member_code");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [contexts, setContexts] = useState<ContextOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function routeAfterLogin(user: { mustChangePassword?: boolean }, role: Role) {
    if (user.mustChangePassword) {
      router.push("/set-password");
      return;
    }
    router.push(homeFor(role));
  }

  async function login() {
    setError(null);
    setBusy(true);
    try {
      const res = await authApi.login(identifierType, identifier, password);
      if (res.status === "no_account") {
        router.push(`/signup?sessionToken=${encodeURIComponent(res.sessionToken)}`);
        return;
      }
      if (res.status === "choose_context") {
        setSessionToken(res.sessionToken);
        setContexts(res.contexts);
        setStep("choose_context");
        return;
      }
      const ctx = await setSession(res.user, res.accessToken, res.refreshToken);
      routeAfterLogin(res.user, ctx.role);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't sign in. Try again.");
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
      routeAfterLogin(res.user, resolved.role);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't open that account.");
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

        {step === "credentials" && (
          <>
            <h1 className="text-3xl">Sign in</h1>
            <div className="flex gap-2">
              {IDENTIFIER_TABS.map((tab) => (
                <Pill
                  key={tab.value}
                  active={identifierType === tab.value}
                  onClick={() => {
                    setIdentifierType(tab.value);
                    setIdentifier("");
                  }}
                >
                  {tab.label}
                </Pill>
              ))}
            </div>
            {IDENTIFIER_TABS.filter((t) => t.value === identifierType).map((tab) => (
              <Field key={tab.value} label={tab.label}>
                <Input
                  type={tab.type}
                  autoComplete={tab.autoComplete}
                  placeholder={tab.placeholder}
                  value={identifier}
                  onChange={(e) => setIdentifier(tab.value === "phone" ? e.target.value.replace(/\D/g, "") : e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && identifier && password && login()}
                />
              </Field>
            ))}
            <Field label="Password">
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && identifier && password && login()}
              />
            </Field>
            {error && <p className="text-sm font-semibold text-warn">{error}</p>}
            <Button variant="primary" disabled={!identifier || !password || busy} onClick={login}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </>
        )}

        {step === "choose_context" && (
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
          New gym?{" "}
          <Link href="/register" className="text-link font-semibold">
            Start a free 14-day trial
          </Link>
        </p>
      </div>
    </div>
  );
}
