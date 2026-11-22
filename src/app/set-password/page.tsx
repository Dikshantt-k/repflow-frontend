"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { homeFor } from "@/lib/nav";
import { Button, Field, Input, Spinner } from "@/components/ui";

export default function SetPasswordPage() {
  const router = useRouter();
  const { user, context, loading, refresh } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.mustChangePassword && context) {
      router.replace(homeFor(context.role));
    }
  }, [loading, user, context, router]);

  async function submit() {
    setError(null);
    if (newPassword.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Those passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await authApi.setPassword(newPassword);
      await refresh();
      if (context) router.replace(homeFor(context.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your password. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !user || !user.mustChangePassword) {
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
        <h1 className="text-3xl">Set your password</h1>
        <p className="text-muted">You signed in with a temporary password. Choose your own to continue.</p>

        <Field label="New password">
          <Input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </Field>
        <Field label="Confirm password">
          <Input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && newPassword && confirmPassword && submit()}
          />
        </Field>
        {error && <p className="text-sm font-semibold text-warn">{error}</p>}
        <Button variant="primary" disabled={!newPassword || !confirmPassword || busy} onClick={submit}>
          {busy ? "Saving…" : "Set password and continue"}
        </Button>
      </div>
    </div>
  );
}
