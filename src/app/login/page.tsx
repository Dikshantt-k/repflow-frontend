"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { homeFor } from "@/lib/nav";
import { Button, Field, Input, Spinner, cx } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { ContextOption, LoginIdentifierType, Role } from "@/types/api";

type Step = "credentials" | "choose_context";

const IDENTIFIER_TABS: Array<{ value: LoginIdentifierType; label: string; placeholder: string; type: string; autoComplete: string }> = [
  { value: "member_code", label: "Member code", placeholder: "e.g. TW-0412", type: "text", autoComplete: "username" },
  { value: "email", label: "Email", placeholder: "you@example.com", type: "email", autoComplete: "email" },
  { value: "phone", label: "Mobile", placeholder: "98200 11234", type: "tel", autoComplete: "tel" },
];

/** Shown when the app shell sent the user here because their session ran out (?expired=1). */
function ExpiredNotice() {
  const params = useSearchParams();
  if (params.get("expired") !== "1") return null;
  return (
    <p role="status" className="text-sm font-medium rounded-[10px] bg-warn-soft text-warn-ink px-3 py-2.5">
      Your session has expired. Sign in again to continue.
    </p>
  );
}

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
    <div className="min-h-screen flex items-center justify-center p-6">
      <div aria-hidden className="pointer-events-none fixed -z-10 -top-40 -left-32 w-[480px] h-[480px] rounded-full bg-accent/10 blur-3xl" />
      <div aria-hidden className="pointer-events-none fixed -z-10 -bottom-40 -right-32 w-[480px] h-[480px] rounded-full bg-accent-pop/10 blur-3xl" />
      <ThemeToggle variant="light" className="fixed top-5 right-5" />

      <div className="hero-in w-full max-w-[440px] bg-surface border border-line rounded-2xl shadow-[0_20px_50px_rgba(10,20,18,0.12)] p-8 sm:p-10 flex flex-col gap-6">
        <Logo />

        <Suspense fallback={null}>
          <ExpiredNotice />
        </Suspense>

        {step === "credentials" && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-3xl">Sign in</h1>
              <p className="text-sm text-muted mt-1">Choose how you&rsquo;d like to sign in.</p>
            </div>

            <div className="flex gap-1 p-1 rounded-[14px] bg-line2">
              {IDENTIFIER_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setIdentifierType(tab.value);
                    setIdentifier("");
                  }}
                  className={cx(
                    "flex-1 min-h-[38px] rounded-[10px] text-sm font-semibold transition",
                    identifierType === tab.value ? "bg-surface text-ink shadow-[0_1px_3px_rgba(20,30,25,0.12)]" : "text-muted hover:text-ink",
                  )}
                >
                  {tab.label}
                </button>
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
            <Button variant="primary" className="w-full" disabled={!identifier || !password || busy} onClick={login}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </div>
        )}

        {step === "choose_context" && (
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-3xl">Choose an account</h1>
              <p className="text-sm text-muted mt-1">This login is linked to more than one account.</p>
            </div>
            <div className="flex flex-col gap-2">
              {contexts.map((ctx, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={busy}
                  onClick={() => pickContext(ctx)}
                  className="flex flex-col gap-0.5 px-4 py-3 rounded-xl border border-line bg-surface text-left transition hover:border-accent hover:bg-accent-soft/40"
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
          </div>
        )}

        <p className="text-sm text-muted text-center border-t border-line pt-5">
          New gym?{" "}
          <Link href="/register" className="text-link font-semibold">
            Start a free 14-day trial
          </Link>
        </p>
      </div>
    </div>
  );
}
