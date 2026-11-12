"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, attendanceApi, branchesApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Kpi, Select, Spinner, Toast } from "@/components/ui";
import { formatDate, initials, formatPaise } from "@/lib/format";
import type { Attendance, Branch, Member } from "@/types/api";

type PopulatedMember = { _id: string; firstName: string; lastName?: string; memberCode: string };

function memberLabel(m: PopulatedMember): string {
  return `${m.firstName} ${m.lastName ?? ""}`.trim();
}

const NOTE_BADGE: Record<string, { label: string; tone: "orange" | "gray" }> = {
  expired_allowed_once: { label: "Allowed (expired)", tone: "orange" },
  frozen_allowed_once: { label: "Allowed (frozen)", tone: "orange" },
  dues_allowed_once: { label: "Allowed (over dues limit)", tone: "orange" },
  dues_pending: { label: "Dues pending", tone: "orange" },
  personal_training: { label: "Personal training", tone: "gray" },
  none: { label: "—", tone: "gray" },
};

export default function AttendancePage() {
  const { context } = useAuth();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState<string | null>(context?.branchId ?? null);
  const needsBranchPicker = !context?.branchId;

  const [log, setLog] = useState<Attendance[]>([]);
  const [kpis, setKpis] = useState<{ checkinsToday: number; inGymNow: number } | null>(null);
  const [loadingLog, setLoadingLog] = useState(true);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member | null>(null);
  const [searching, setSearching] = useState(false);

  type CheckinResult =
    | { kind: "success"; memberName: string; status: string; duesPaise: number; planEndingSoon: boolean }
    | { kind: "expired"; message: string; memberId: string }
    | null;
  const [result, setResult] = useState<CheckinResult>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    if (needsBranchPicker) {
      branchesApi.list().then((res) => {
        setBranches(res.branches);
        setBranchId((prev) => prev ?? res.branches[0]?._id ?? null);
      });
    }
  }, [needsBranchPicker]);

  const loadLog = useCallback(() => {
    if (!branchId) return;
    setLoadingLog(true);
    attendanceApi
      .list({ branchId })
      .then((res) => {
        setLog(res.attendance);
        setKpis(res.kpis);
      })
      .finally(() => setLoadingLog(false));
  }, [branchId]);

  useEffect(() => {
    loadLog();
  }, [loadLog]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      attendanceApi
        .lookup(query.trim())
        .then((res) => setResults(res.members))
        .finally(() => setSearching(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function doCheckin(allowOnceIfExpired = false) {
    if (!selected || !branchId) return;
    setCheckingIn(true);
    try {
      const res = await attendanceApi.checkin({ memberId: selected._id, branchId, allowOnceIfExpired });
      if (res.duplicate) {
        showToast("Already checked in recently");
      } else {
        setResult({
          kind: "success",
          memberName: `${selected.firstName} ${selected.lastName ?? ""}`.trim(),
          status: res.status,
          duesPaise: res.duesPaise,
          planEndingSoon: res.planEndingSoon,
        });
      }
      setQuery("");
      setResults([]);
      setSelected(null);
      loadLog();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setResult({ kind: "expired", message: err.message, memberId: selected._id });
      } else {
        showToast(err instanceof ApiError ? err.message : "Couldn't check in. Try again.");
      }
    } finally {
      setCheckingIn(false);
    }
  }

  async function doCheckout(id: string) {
    try {
      await attendanceApi.checkout(id);
      loadLog();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't check out. Try again.");
    }
  }

  const branchName = context?.branch?.name ?? branches.find((b) => b._id === branchId)?.name ?? "";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1>Attendance</h1>
          <p className="text-muted mt-1">
            {branchName ? `${branchName} · ` : ""}
            {formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        {needsBranchPicker && branches.length > 1 && (
          <Field label="Branch">
            <Select value={branchId ?? ""} onChange={(e) => setBranchId(e.target.value)} className="w-48">
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3.5 max-w-md">
        <Kpi label="In the gym now" value={kpis?.inGymNow ?? "—"} />
        <Kpi label="Check-ins today" value={kpis?.checkinsToday ?? "—"} />
      </div>

      <Card>
        <h2>Quick check-in</h2>
        <div className="relative max-w-md">
          <Field label="Search by name, phone or member ID">
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
                setResult(null);
              }}
              placeholder="Search…"
            />
          </Field>
          {query.trim().length >= 2 && !selected && (
            <div className="absolute z-10 mt-1 w-full bg-surface border border-line rounded-[10px] shadow-lg max-h-64 overflow-y-auto">
              {searching ? (
                <div className="p-3">
                  <Spinner />
                </div>
              ) : results.length === 0 ? (
                <div className="p-3 text-sm text-muted">No members found.</div>
              ) : (
                results.map((m) => (
                  <button
                    key={m._id}
                    type="button"
                    className="flex flex-col w-full text-left px-3 py-2 hover:bg-line2"
                    onClick={() => {
                      setSelected(m);
                      setQuery(`${m.firstName} ${m.lastName ?? ""}`.trim());
                      setResults([]);
                    }}
                  >
                    <span className="font-semibold">
                      {m.firstName} {m.lastName ?? ""}
                    </span>
                    <span className="text-xs text-muted">
                      {m.phone} · {m.memberCode}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {selected && (
          <Button variant="primary" disabled={checkingIn} onClick={() => doCheckin(false)} className="self-start">
            {checkingIn ? "Checking in…" : `Check in ${selected.firstName}`}
          </Button>
        )}

        {result?.kind === "success" && (
          <div className={`flex flex-wrap items-center gap-3 p-4 rounded-xl ${result.duesPaise > 0 || result.status === "expiring" ? "bg-warn-soft" : "bg-accent-soft"}`}>
            <Avatar label={initials(result.memberName.split(" ")[0] ?? "", result.memberName.split(" ").slice(1).join(" "))} />
            <div className="flex flex-col">
              <span className="font-semibold">{result.memberName} — checked in</span>
              {result.duesPaise > 0 && <span className="text-sm text-warn-ink">Dues {formatPaise(result.duesPaise)}</span>}
              {result.planEndingSoon && <span className="text-sm text-warn-ink">Plan ending soon</span>}
            </div>
          </div>
        )}

        {result?.kind === "expired" && (
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-warn-soft">
            <span className="font-semibold text-warn-ink flex-1 min-w-[200px]">{result.message}</span>
            {/* Only managers can let a blocked member in, and it's audited (Round 2, #20) */}
            {can.overrideCheckin(context?.role) ? (
              <Button variant="primary" disabled={checkingIn} onClick={() => doCheckin(true)}>
                Allow once
              </Button>
            ) : (
              <span className="text-sm text-warn-ink">Ask a branch manager to let them in, or renew / collect dues first.</span>
            )}
            <Button onClick={() => setResult(null)}>Cancel</Button>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-0">
        <h2 className="mb-2">Today&apos;s log</h2>
        {loadingLog ? (
          <Spinner />
        ) : log.length === 0 ? (
          <EmptyState>No check-ins yet today.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="text-left font-semibold text-muted text-[13px] p-3 bg-line2 rounded-l-lg">In time</th>
                  <th className="text-left font-semibold text-muted text-[13px] p-3 bg-line2">Out time</th>
                  <th className="text-left font-semibold text-muted text-[13px] p-3 bg-line2">Member</th>
                  <th className="text-left font-semibold text-muted text-[13px] p-3 bg-line2">Method</th>
                  <th className="text-left font-semibold text-muted text-[13px] p-3 bg-line2 rounded-r-lg">Note</th>
                </tr>
              </thead>
              <tbody>
                {log.map((a) => {
                  const member = typeof a.memberId === "object" ? (a.memberId as PopulatedMember) : null;
                  const note = NOTE_BADGE[a.note] ?? NOTE_BADGE.none;
                  return (
                    <tr key={a._id} className="border-t border-line2">
                      <td className="p-3">{formatDate(a.inTime, { hour: "numeric", minute: "2-digit" })}</td>
                      <td className="p-3">
                        {a.outTime ? (
                          formatDate(a.outTime, { hour: "numeric", minute: "2-digit" })
                        ) : (
                          <button type="button" className="text-link font-semibold" onClick={() => doCheckout(a._id)}>
                            Check out
                          </button>
                        )}
                      </td>
                      <td className="p-3">{member ? `${memberLabel(member)} · ${member.memberCode}` : "—"}</td>
                      <td className="p-3">
                        <Badge tone={a.method === "biometric" ? "blue" : "gray"}>{a.method === "biometric" ? "Biometric" : "Manual"}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge tone={note.tone}>{note.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Toast message={toast} />
    </div>
  );
}
