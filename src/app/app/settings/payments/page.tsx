"use client";

import { useEffect, useState } from "react";
import { ApiError, paymentAccountsApi } from "@/lib/api";
import { Badge, Button, Card, Field, Input, Modal, Spinner, Toast } from "@/components/ui";
import type { PaymentAccount, PaymentAccountLevel, PaymentAccountTarget, PaymentAccountsOverview, PaymentProvider } from "@/types/api";

const PROVIDER_LABEL: Record<PaymentProvider, string> = {
  razorpay_oauth: "Razorpay",
  razorpay_keys: "Razorpay (API keys)",
  mock: "Test account",
};

const LEVEL_LABEL: Record<PaymentAccountLevel, string> = {
  org: "Organisation",
  franchisee: "Franchise",
  branch: "Gym's own",
};

interface ConnectTarget extends PaymentAccountTarget {
  label: string;
}

/**
 * Per-gym payments. Member money goes straight into the gym's own gateway account: the branch's
 * own if it has one, otherwise its franchise's, otherwise the organisation's. Repflow never holds it.
 * Org owner: any level. Franchise owner: their own franchise and gyms. Branch manager: view only.
 */
export default function PaymentSettingsPage() {
  const [data, setData] = useState<PaymentAccountsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<ConnectTarget | null>(null);
  const [removing, setRemoving] = useState<PaymentAccount | null>(null);

  async function load() {
    try {
      setData(await paymentAccountsApi.list());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load payment settings.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  if (!data) return error ? <p className="text-warn">{error}</p> : <Spinner />;

  const accountFor = (level: PaymentAccountLevel, id?: string) =>
    data.accounts.find(
      (a) => a.level === level && (level === "org" || (level === "franchisee" ? a.franchiseeId === id : a.branchId === id))
    ) ?? null;

  const orgAccount = accountFor("org");
  const noProviders = data.providers.length === 0;

  return (
    <div className="flex flex-col gap-5 max-w-[860px]">
      <div>
        <h1>Payments</h1>
        <p className="text-muted mt-1">
          Members&apos; online payments go straight into your own payment account. Repflow never holds your members&apos; money.
          Each gym uses its own account if it has one, otherwise its franchise&apos;s, otherwise the organisation&apos;s.
        </p>
      </div>

      {noProviders && (
        <Card>
          <p className="text-sm text-warn-ink">
            Online payments for your country (Stripe) are coming soon. Meanwhile you can record cash and card payments as usual.
          </p>
        </Card>
      )}

      {(data.canManageOrg || orgAccount) && (
        <AccountCard
          title="Organisation account"
          hint="Used by every gym that doesn't have its own or its franchise's account."
          account={orgAccount}
          canManage={data.canManageOrg && !noProviders}
          onConnect={() => setConnecting({ level: "org", label: "the organisation" })}
          onRemove={setRemoving}
        />
      )}

      {data.franchisees.map((f) => (
        <AccountCard
          key={f._id}
          title={`Franchise: ${f.name}`}
          hint="For a franchise business that runs several gyms. Its gyms' payments go here unless a gym has its own account."
          account={accountFor("franchisee", f._id)}
          canManage={f.canManage && !noProviders}
          onConnect={() => setConnecting({ level: "franchisee", franchiseeId: f._id, label: f.name })}
          onRemove={setRemoving}
        />
      ))}

      <Card className="gap-2">
        <h2>Where each gym&apos;s payments go</h2>
        <p className="text-sm text-muted">
          Give a gym its own account only when it is a separate business, with its own tax number and bank account.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[560px]">
            <thead>
              <tr>
                {["Gym", "Franchise", "Payments go to", ""].map((h) => (
                  <th key={h} className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.branches.map((b) => {
                const own = accountFor("branch", b._id);
                return (
                  <tr key={b._id} className="border-t border-line2">
                    <td className="p-2.5 font-semibold">{b.name}</td>
                    <td className="p-2.5 text-sm">{b.franchiseeName ?? "Company-owned"}</td>
                    <td className="p-2.5 text-sm">
                      {b.paysInto ? (
                        <span className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={b.paysInto.provider === "mock" ? "orange" : "green"}>{LEVEL_LABEL[b.paysInto.level]}</Badge>
                          {b.paysInto.displayName}
                        </span>
                      ) : (
                        <Badge tone="gray">Not set up: cash and card only</Badge>
                      )}
                    </td>
                    <td className="p-2.5 text-right">
                      {b.canManage && !noProviders &&
                        (own ? (
                          <Button variant="ghost" onClick={() => setRemoving(own)}>
                            Remove own account
                          </Button>
                        ) : (
                          <Button variant="ghost" onClick={() => setConnecting({ level: "branch", branchId: b._id, label: b.name })}>
                            Use its own account
                          </Button>
                        ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <ConnectModal
        target={connecting}
        providers={data.providers}
        onClose={() => setConnecting(null)}
        onDone={async (msg) => {
          setConnecting(null);
          await load();
          showToast(msg);
        }}
      />

      <Modal open={removing !== null} onClose={() => setRemoving(null)} title="Disconnect this account?">
        <p className="text-sm">
          New online payments will stop going to <b>{removing?.displayName}</b>. Gyms that used it will fall back to the next account
          up (franchise, then organisation), or to cash and card only. Past payments aren&apos;t affected.
        </p>
        <div className="flex gap-2 justify-end">
          <Button onClick={() => setRemoving(null)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={async () => {
              if (!removing) return;
              try {
                await paymentAccountsApi.disconnect(removing._id);
                setRemoving(null);
                await load();
                showToast("Account disconnected.");
              } catch (err) {
                setRemoving(null);
                showToast(err instanceof ApiError ? err.message : "Couldn't disconnect. Try again.");
              }
            }}
          >
            Disconnect
          </Button>
        </div>
      </Modal>

      <Toast message={toast} />
    </div>
  );
}

function AccountCard(props: {
  title: string;
  hint: string;
  account: PaymentAccount | null;
  canManage: boolean;
  onConnect: () => void;
  onRemove: (a: PaymentAccount) => void;
}) {
  const { account } = props;
  return (
    <Card className="gap-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2>{props.title}</h2>
          <p className="text-sm text-muted">{props.hint}</p>
        </div>
        {props.canManage &&
          (account ? (
            <Button variant="ghost" onClick={() => props.onRemove(account)}>
              Disconnect
            </Button>
          ) : (
            <Button variant="primary" onClick={props.onConnect}>
              Connect account
            </Button>
          ))}
      </div>
      {account ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge tone={account.provider === "mock" ? "orange" : "green"}>{PROVIDER_LABEL[account.provider]}</Badge>
          <span className="font-semibold">{account.displayName}</span>
          <span className="text-muted">{account.externalAccountId}</span>
          {account.provider !== "mock" && <Badge tone={account.livemode ? "green" : "blue"}>{account.livemode ? "Live" : "Test mode"}</Badge>}
        </div>
      ) : (
        <p className="text-sm">Not connected.</p>
      )}
    </Card>
  );
}

function ConnectModal({
  target,
  providers,
  onClose,
  onDone,
}: {
  target: ConnectTarget | null;
  providers: PaymentProvider[];
  onClose: () => void;
  onDone: (msg: string) => void | Promise<void>;
}) {
  const [method, setMethod] = useState<PaymentProvider | null>(null);
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMethod(providers.find((p) => p !== "mock") ?? providers[0] ?? null);
    setKeyId("");
    setKeySecret("");
    setError(null);
  }, [target, providers]);

  if (!target) return null;
  const { label, ...where } = target;

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (method === "razorpay_oauth") {
        const { url } = await paymentAccountsApi.razorpayConnectUrl(where);
        window.location.href = url; // Razorpay asks the owner to approve, then returns to /app/settings/payments/callback
        return;
      }
      if (method === "razorpay_keys") {
        if (!keyId.trim() || !keySecret.trim()) {
          setError("Paste both the key ID and the key secret.");
          setBusy(false);
          return;
        }
        await paymentAccountsApi.connectRazorpayKeys({ ...where, keyId: keyId.trim(), keySecret: keySecret.trim() });
        await onDone(`Razorpay connected for ${label}.`);
      } else if (method === "mock") {
        await paymentAccountsApi.connectMock(where);
        await onDone(`Test account connected for ${label}. No real money will move.`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't connect. Try again.");
    }
    setBusy(false);
  }

  return (
    <Modal open onClose={onClose} title={`Connect a payment account for ${label}`}>
      <div className="flex flex-col gap-2">
        {providers.map((p) => (
          <label key={p} className={`flex gap-2.5 p-3 rounded-xl border ${method === p ? "border-accent bg-accent-soft" : "border-line"}`}>
            <input type="radio" checked={method === p} onChange={() => setMethod(p)} />
            <span>
              <span className="font-semibold">
                {p === "razorpay_oauth" ? "Connect with Razorpay" : p === "razorpay_keys" ? "Use my Razorpay API keys" : "Test account"}
              </span>
              <span className="block text-sm text-muted">
                {p === "razorpay_oauth"
                  ? "Sign in to Razorpay and approve Repflow. Recommended."
                  : p === "razorpay_keys"
                    ? "From Razorpay → Account & Settings → API Keys. The secret is stored encrypted."
                    : "For trying Repflow out. Payments are simulated; no real money moves."}
              </span>
            </span>
          </label>
        ))}
      </div>

      {method === "razorpay_keys" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Key ID">
            <Input value={keyId} placeholder="rzp_live_…" autoComplete="off" onChange={(e) => setKeyId(e.target.value)} />
          </Field>
          <Field label="Key secret">
            <Input type="password" value={keySecret} autoComplete="new-password" onChange={(e) => setKeySecret(e.target.value)} />
          </Field>
        </div>
      )}

      {error && <p className="text-sm text-warn">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={busy || !method} onClick={submit}>
          {busy ? "Connecting…" : method === "razorpay_oauth" ? "Continue to Razorpay" : "Connect"}
        </Button>
      </div>
    </Modal>
  );
}
