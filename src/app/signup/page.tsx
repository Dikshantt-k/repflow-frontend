"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, signupApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button, Field, Input, Select } from "@/components/ui";
import { rupeesToPaise } from "@/lib/format";
import type { CountryCode, CountryOption } from "@/types/api";

/** Currency symbol for a country's currency before the gym exists (e.g. "£" for GBP). */
function symbolFor(currency: string): string {
  return new Intl.NumberFormat("en", { style: "currency", currency }).formatToParts(0).find((p) => p.type === "currency")?.value ?? currency;
}

interface PlanDraft {
  name: string;
  lengthValue: number;
  lengthUnit: "month" | "day" | "session";
  priceRupees: string;
  joiningFeeRupees: string;
}

const DEFAULT_PLANS: PlanDraft[] = [
  { name: "Monthly", lengthValue: 1, lengthUnit: "month", priceRupees: "", joiningFeeRupees: "" },
  { name: "Quarterly", lengthValue: 3, lengthUnit: "month", priceRupees: "", joiningFeeRupees: "" },
  { name: "Half-yearly", lengthValue: 6, lengthUnit: "month", priceRupees: "", joiningFeeRupees: "" },
  { name: "Yearly", lengthValue: 12, lengthUnit: "month", priceRupees: "", joiningFeeRupees: "" },
];

const STEPS = ["Gym details", "Branches", "Membership plans", "Ready"];

function SignupWizard() {
  const router = useRouter();
  const { setSession } = useAuth();
  const sessionToken = useSearchParams().get("sessionToken") ?? "";

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [gymName, setGymName] = useState("");
  const [city, setCity] = useState("");
  const [gstin, setGstin] = useState(""); // the tax ID, labelled per country (GSTIN, TRN, VAT number, EIN, ABN)
  // Round 3: country sets currency, tax, time zone and phone format for the whole gym.
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [countryCode, setCountryCode] = useState<CountryCode>("IN");
  const [timeZone, setTimeZone] = useState("");
  const country = countries.find((c) => c.code === countryCode);
  const symbol = symbolFor(country?.currency ?? "INR");
  const taxLabel = country && country.tax.ratePct > 0 ? `incl. ${country.tax.name}` : country ? "" : "incl. GST";

  useEffect(() => {
    signupApi
      .countries()
      .then((r) => setCountries(r.countries))
      .catch(() => setCountries([])); // falls back to India, as before
  }, []);
  const [businessType, setBusinessType] = useState<"independent" | "franchise">("independent");
  const [branches, setBranches] = useState<string[]>(["Main branch"]);
  const [branchDraft, setBranchDraft] = useState("");
  const [plans, setPlans] = useState<PlanDraft[]>(DEFAULT_PLANS);

  function updatePlan(i: number, patch: Partial<PlanDraft>) {
    setPlans((p) => p.map((pl, idx) => (idx === i ? { ...pl, ...patch } : pl)));
  }

  function addBranch() {
    if (!branchDraft.trim()) return;
    setBranches((b) => [...b, branchDraft.trim()]);
    setBranchDraft("");
  }

  function removeBranch(i: number) {
    setBranches((b) => b.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const validPlans = plans.filter((p) => p.priceRupees.trim() !== "");
      if (validPlans.length === 0) throw new ApiError("Add a price for at least one plan.", 422);

      const res = await signupApi.complete({
        sessionToken,
        gym: {
          name: gymName,
          city: city || undefined,
          // India keeps sending gstin (older backends read it); every country sends taxId.
          gstin: countryCode === "IN" ? gstin || undefined : undefined,
          taxId: gstin || undefined,
          businessType,
          country: countryCode,
          timeZone: timeZone || undefined,
        },
        branches: branches.map((b) => ({ name: b })),
        plans: validPlans.map((p) => ({
          name: p.name,
          lengthValue: p.lengthValue,
          lengthUnit: p.lengthUnit,
          pricePaise: rupeesToPaise(Number(p.priceRupees)),
          joiningFeePaise: p.joiningFeeRupees.trim() ? rupeesToPaise(Number(p.joiningFeeRupees)) : 0,
        })),
      });

      await setSession(res.user, res.accessToken, res.refreshToken);
      router.push("/app/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't complete signup. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!sessionToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p className="text-muted">
          This signup link has expired.{" "}
          <a href="/login" className="text-link font-semibold">
            Start again
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-wrap">
      <aside className="flex-1 basis-[260px] bg-side text-side-ink p-7 flex flex-col gap-6">
        <div className="font-display italic text-xl font-extrabold text-side-accent">Repflow</div>
        <ol className="flex flex-col gap-1">
          {STEPS.map((label, i) => (
            <li key={label} className={`flex items-center gap-3 min-h-10 ${i === step ? "text-white font-semibold" : i < step ? "text-side-ink" : "text-side-muted"}`}>
              <span
                className={`w-[26px] h-[26px] rounded-full border flex items-center justify-center text-xs font-semibold flex-none ${
                  i <= step ? "bg-side-accent border-side-accent text-[#06201B]" : "border-side-muted"
                }`}
              >
                {i + 1}
              </span>
              {label}
            </li>
          ))}
        </ol>
        <p className="text-sm text-side-muted">About 2 minutes.</p>
      </aside>

      <div className="flex-[999] basis-[520px] flex flex-col items-center p-10 gap-4 bg-bg">
        <div className="w-full max-w-[620px] bg-surface border border-line rounded-2xl p-7 flex flex-col gap-4">
          <p className="text-sm text-muted">
            Step {step + 1} of {STEPS.length}
          </p>

          {step === 0 && (
            <>
              <h2 className="text-2xl">Tell us about your gym</h2>
              <Field label="Gym or brand name">
                <Input value={gymName} onChange={(e) => setGymName(e.target.value)} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="City">
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </Field>
                <Field label={`${country?.tax.taxIdLabel ?? "GSTIN"} (optional)`}>
                  <Input value={gstin} onChange={(e) => setGstin(e.target.value)} />
                </Field>
              </div>
              {countries.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Country" hint={country ? `${country.currency} · ${country.tax.name} ${country.tax.ratePct}% · ${country.phone.dialCode}` : undefined}>
                    <Select
                      value={countryCode}
                      onChange={(e) => {
                        setCountryCode(e.target.value as CountryCode);
                        setTimeZone("");
                      }}
                    >
                      {countries.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {country && country.timeZones.length > 1 && (
                    <Field label="Time zone">
                      <Select value={timeZone || country.timeZones[0]} onChange={(e) => setTimeZone(e.target.value)}>
                        {country.timeZones.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz.split("/").pop()!.replace(/_/g, " ")}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                </div>
              )}
              {countryCode === "US" && (
                <p className="text-sm text-muted">Sales tax starts at 0%. Set your state&apos;s rate later in Settings if gym memberships are taxed where you are.</p>
              )}
              <Field label="Business type">
                <Select value={businessType} onChange={(e) => setBusinessType(e.target.value as "independent" | "franchise")}>
                  <option value="independent">Independent gym</option>
                  <option value="franchise">Franchise brand</option>
                </Select>
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-2xl">Add your branches</h2>
              <ul className="flex flex-col gap-2">
                {branches.map((b, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 border-t border-line2 pt-2 first:border-0 first:pt-0">
                    <span className="font-semibold">{b}</span>
                    {branches.length > 1 && (
                      <button type="button" className="text-sm text-warn" onClick={() => removeBranch(i)}>
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 items-end">
                <Field label="Branch name">
                  <Input value={branchDraft} onChange={(e) => setBranchDraft(e.target.value)} placeholder="e.g. Thane West" />
                </Field>
                <Button onClick={addBranch}>Add branch</Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-2xl">Set up membership plans</h2>
              <p className="text-sm text-muted">Enter your price for each plan you want to sell. Leave the price blank to skip a plan.</p>
              {plans.map((p, i) => (
                <div key={i} className="flex flex-wrap gap-3 items-end">
                  <Field label="Plan name">
                    <Input value={p.name} onChange={(e) => updatePlan(i, { name: e.target.value })} className="w-40" />
                  </Field>
                  <Field label={taxLabel ? `Price (${taxLabel})` : "Price"}>
                    <Input
                      inputMode="decimal"
                      placeholder={symbol}
                      value={p.priceRupees}
                      onChange={(e) => updatePlan(i, { priceRupees: e.target.value.replace(/[^\d.]/g, "") })}
                      className="w-32"
                    />
                  </Field>
                  <Field label="Joining fee">
                    <Input
                      inputMode="decimal"
                      placeholder={`${symbol}0`}
                      value={p.joiningFeeRupees}
                      onChange={(e) => updatePlan(i, { joiningFeeRupees: e.target.value.replace(/[^\d.]/g, "") })}
                      className="w-28"
                    />
                  </Field>
                </div>
              ))}
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-2xl">Ready to go</h2>
              <ul className="flex flex-col gap-2">
                <li>✓ {gymName || "Your gym"} in {city || "your city"}</li>
                <li>
                  ✓ {branches.length} branch{branches.length === 1 ? "" : "es"}
                </li>
                <li>✓ {plans.filter((p) => p.priceRupees.trim()).length} membership plan(s) priced</li>
              </ul>
              <p className="text-sm text-muted">You get a 14-day free trial. No card needed to start.</p>
            </>
          )}

          {error && <p className="text-sm font-semibold text-warn">{error}</p>}

          <div className="flex gap-3 items-center border-t border-line2 pt-4">
            {step > 0 && (
              <Button onClick={() => setStep((s) => s - 1)} disabled={busy}>
                Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button variant="primary" disabled={step === 0 && !gymName.trim()} onClick={() => setStep((s) => s + 1)}>
                Continue
              </Button>
            ) : (
              <Button variant="primary" disabled={busy} onClick={submit}>
                {busy ? "Setting up…" : "Go to my dashboard"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupWizard />
    </Suspense>
  );
}
