"use client";

import { useEffect, useState } from "react";
import { ApiError, orgLocaleApi, type BranchLocaleRow } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button, Card, Field, Input, Select, Spinner, Toast } from "@/components/ui";
import type { CountryCode, CountryOption, OrgLocale } from "@/types/api";

/** "America/Los_Angeles" → "Los Angeles" */
function zoneLabel(tz: string): string {
  return tz.split("/").pop()!.replace(/_/g, " ");
}

/**
 * Round 3: the gym's country settings. The country sets currency, tax, time zone and phone format;
 * the owner can change the tax name, rate and ID, the time zone, and per-branch overrides
 * (US state sales tax, Australian time zones). The country locks once the gym has taken payments.
 */
export default function CountrySettingsPage() {
  const { context, refresh } = useAuth();
  const isOwner = context?.role === "org_owner";

  const [locale, setLocale] = useState<OrgLocale | null>(null);
  const [branches, setBranches] = useState<BranchLocaleRow[]>([]);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [country, setCountry] = useState<CountryCode>("IN");
  const [timeZone, setTimeZone] = useState("");
  const [taxName, setTaxName] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [taxId, setTaxId] = useState("");

  function fill(l: OrgLocale) {
    setLocale(l);
    setCountry(l.country);
    setTimeZone(l.timeZone);
    setTaxName(l.tax.name);
    setTaxRate(String(l.tax.ratePct));
    setTaxId(l.taxId ?? "");
  }

  async function load() {
    setLoading(true);
    try {
      const res = await orgLocaleApi.get();
      fill(res.locale);
      setBranches(res.branches);
      setCountries(res.countries);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  const selected = countries.find((c) => c.code === country);
  const countryChanged = locale && country !== locale.country;

  async function save() {
    setError(null);
    const rate = Number(taxRate);
    if (taxRate.trim() === "" || !(rate >= 0 && rate <= 100)) {
      setError("Enter a tax rate between 0 and 100.");
      return;
    }
    setSaving(true);
    try {
      const res = await orgLocaleApi.update(
        countryChanged
          ? { country } // a new country resets tax and time zone to its defaults
          : { timeZone, taxName: taxName.trim() || undefined, taxRatePct: rate, taxId: taxId.trim() }
      );
      fill(res.locale);
      await refresh(); // so amounts and labels across the app switch straight away
      await load();
      showToast(countryChanged ? `Switched to ${selected?.name}. Check the tax rate below.` : "Settings saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveBranch(b: BranchLocaleRow, patch: { timeZone?: string | null; taxRatePct?: number | null }) {
    try {
      await orgLocaleApi.updateBranch(b._id, patch);
      await load();
      showToast(`${b.name} updated.`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't update the branch.");
    }
  }

  if (loading) return <Spinner />;
  if (!locale) return <p className="text-warn">{error ?? "Couldn't load settings."}</p>;

  const zones = selected?.timeZones ?? [locale.timeZone];

  return (
    <div className="flex flex-col gap-5 max-w-[760px]">
      <div>
        <h1>Country &amp; tax</h1>
        <p className="text-muted mt-1">
          Sets your currency, tax on receipts, time zone (what &ldquo;today&rdquo; means) and the phone format for members.
        </p>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Country" hint={`Currency ${selected?.currency ?? locale.currency}. Can't be changed after your first payment.`}>
            <Select value={country} disabled={!isOwner} onChange={(e) => setCountry(e.target.value as CountryCode)}>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          {!countryChanged && (
            <Field label="Time zone">
              <Select value={timeZone} disabled={!isOwner || zones.length < 2} onChange={(e) => setTimeZone(e.target.value)}>
                {zones.map((tz) => (
                  <option key={tz} value={tz}>
                    {zoneLabel(tz)}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        {countryChanged ? (
          <p className="text-sm text-warn-ink">
            Switching to {selected?.name} changes the currency to {selected?.currency} and resets tax to {selected?.tax.name}{" "}
            {selected?.tax.ratePct}%. Save to apply.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Tax name" hint="Shown on receipts">
              <Input value={taxName} disabled={!isOwner} onChange={(e) => setTaxName(e.target.value)} />
            </Field>
            <Field label="Tax rate (%)" hint="Prices include this tax">
              <Input inputMode="decimal" value={taxRate} disabled={!isOwner} onChange={(e) => setTaxRate(e.target.value.replace(/[^\d.]/g, ""))} />
            </Field>
            <Field label={locale.taxIdLabel} hint="Printed on receipts">
              <Input value={taxId} disabled={!isOwner} onChange={(e) => setTaxId(e.target.value)} />
            </Field>
          </div>
        )}

        {error && <p className="text-sm text-warn">{error}</p>}
        {isOwner && (
          <div>
            <Button variant="primary" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </Card>

      {branches.length > 0 && (
        <Card className="gap-2">
          <h2>Branches</h2>
          <p className="text-sm text-muted">
            Only needed when a branch is in a different time zone or (in the US) has a different sales-tax rate. Leave blank to use the gym&apos;s.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[520px]">
              <thead>
                <tr>
                  <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">Branch</th>
                  <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">Time zone</th>
                  <th className="text-left text-[13px] font-semibold text-muted p-2.5 bg-line2">Tax rate (%)</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b._id} className="border-t border-line2">
                    <td className="p-2.5 font-semibold">{b.name}</td>
                    <td className="p-2.5">
                      <Select
                        value={b.overrides.timeZone ?? ""}
                        disabled={!isOwner || zones.length < 2}
                        onChange={(e) => saveBranch(b, { timeZone: e.target.value || null })}
                      >
                        <option value="">Same as gym ({zoneLabel(locale.timeZone)})</option>
                        {zones.map((tz) => (
                          <option key={tz} value={tz}>
                            {zoneLabel(tz)}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="p-2.5">
                      <Input
                        inputMode="decimal"
                        defaultValue={b.overrides.taxRatePct ?? ""}
                        placeholder={`${locale.tax.ratePct} (gym)`}
                        disabled={!isOwner}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          const next = v === "" ? null : Number(v);
                          if (next !== null && !(next >= 0 && next <= 100)) return showToast("Enter a rate between 0 and 100.");
                          if (next !== b.overrides.taxRatePct) void saveBranch(b, { taxRatePct: next });
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Toast message={toast} />
    </div>
  );
}
