"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { membersApi, trainerApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { hasModule } from "@/lib/modules";
import { formatDate } from "@/lib/format";
import { Badge, Card, EmptyState, Spinner, Toast, statusBadge } from "@/components/ui";
import type { MemberListRow, TrainerPtPackageRow } from "@/types/api";

export default function TrainerDashboardPage() {
  const { context } = useAuth();
  const ptEnabled = hasModule(context?.org?.modules, "personal_training");
  const [members, setMembers] = useState<MemberListRow[] | null>(null);
  const [packages, setPackages] = useState<TrainerPtPackageRow[] | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    membersApi
      .list({ mine: true, pageSize: 100 })
      .then((res) => setMembers(res.members))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load your members."));
    if (!ptEnabled) return;
    trainerApi
      .ptPackages()
      .then((res) => setPackages(res.packages))
      .catch(() => {});
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount; ptEnabled doesn't change mid-session
  useEffect(load, []);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  async function logSession(pkg: TrainerPtPackageRow) {
    try {
      await membersApi.logPtSession(pkg.memberId, pkg._id);
      showToast(`Session logged for ${pkg.memberName}.`);
      load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "Couldn't log this session.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1>My dashboard</h1>

      {error && <p className="text-sm font-semibold text-warn">{error}</p>}

      {ptEnabled && (
      <Card className="p-0 overflow-x-auto">
        <div className="p-5 pb-0">
          <h2>Active PT packages</h2>
        </div>
        {!packages ? (
          <div className="p-5">
            <Spinner />
          </div>
        ) : packages.length === 0 ? (
          <EmptyState>None of your assigned members have an active PT package.</EmptyState>
        ) : (
          <table className="w-full border-collapse mt-3">
            <thead>
              <tr>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Member</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Package</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Progress</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2" />
              </tr>
            </thead>
            <tbody>
              {packages.map((p) => (
                <tr key={p._id} className="border-t border-line2">
                  <td className="p-3">
                    <Link href={`/app/members/${p.memberId}`} className="font-semibold text-ink">
                      {p.memberName}
                    </Link>
                  </td>
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">
                    <Badge tone="blue">{p.totalSessions - p.sessionsUsed} left</Badge>
                  </td>
                  <td className="p-3 text-right">
                    <button type="button" className="text-sm font-semibold text-link" onClick={() => void logSession(p)}>
                      Log session
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      )}

      <Card className="p-0 overflow-x-auto">
        <div className="p-5 pb-0">
          <h2>My members</h2>
        </div>
        {!members ? (
          <div className="p-5">
            <Spinner />
          </div>
        ) : members.length === 0 ? (
          <EmptyState>No members are assigned to you yet.</EmptyState>
        ) : (
          <table className="w-full border-collapse mt-3">
            <thead>
              <tr>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Member</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Plan</th>
                <th className="text-left text-[13px] font-semibold text-muted p-3 bg-line2">Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-t border-line2">
                  <td className="p-3">
                    <Link href={`/app/members/${m.id}`} className="font-semibold text-ink">
                      {m.firstName} {m.lastName ?? ""}
                    </Link>
                    <br />
                    <span className="text-sm text-muted">{m.phone}</span>
                  </td>
                  <td className="p-3">
                    {m.plan ? (
                      <span className="flex flex-col">
                        <span>{m.plan.name}</span>
                        <span className="text-sm text-muted">Ends {formatDate(m.plan.endDate)}</span>
                      </span>
                    ) : (
                      <span className="text-muted">No plan</span>
                    )}
                  </td>
                  <td className="p-3">{statusBadge(m.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Toast message={toast} />
    </div>
  );
}
