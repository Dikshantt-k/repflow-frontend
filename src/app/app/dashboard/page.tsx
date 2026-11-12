"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { dashboardApi } from "@/lib/api";
import type { DashboardSummary } from "@/types/api";
import { Avatar, Button, Card, EmptyState, Kpi, Spinner, Toast } from "@/components/ui";
import { formatDate, formatPaise, initials } from "@/lib/format";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { useAuth } from "@/lib/auth-context";

function LinkButton({ href, variant = "default", children }: { href: string; variant?: "primary" | "default"; children: ReactNode }) {
  const base = "inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-[10px] font-semibold text-sm whitespace-nowrap transition";
  const styles =
    variant === "primary" ? "bg-accent border border-accent text-on-accent hover:bg-accent-hover" : "border border-line bg-surface text-ink hover:border-muted";
  return (
    <Link href={href} className={`${base} ${styles}`}>
      {children}
    </Link>
  );
}

function hourLabel(h: number): string {
  const period = h < 12 ? "am" : "pm";
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return `${hh}${period}`;
}

export default function DashboardPage() {
  const { context } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    dashboardApi.summary().then(setData).catch(() => setData(null));
  }, []);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3500);
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const { kpis, expiringSoon, pendingDuesList, checkinsByHour } = data;
  const maxCheckins = Math.max(1, ...checkinsByHour);
  const peakHour = checkinsByHour.indexOf(Math.max(...checkinsByHour));
  const hasCheckins = checkinsByHour.some((n) => n > 0);

  return (
    <div className="flex flex-col gap-5">
      {context?.role === "org_owner" && <OnboardingChecklist />}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <h1>Today</h1>
          <p className="text-muted mt-1">{formatDate(new Date(), { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <LinkButton href="/app/payments">Record payment</LinkButton>
          <LinkButton href="/app/members/new" variant="primary">
            + Add member
          </LinkButton>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Kpi label="Active members" value={kpis.activeMembers} sub={`${kpis.joinedThisMonth} joined this month`} />
        <Kpi label="Collected today" value={formatPaise(kpis.collectedTodayPaise)} sub={`${kpis.collectedTodayCount} payments`} />
        <Kpi
          label="Pending dues"
          value={formatPaise(kpis.pendingDuesPaise)}
          sub={`${kpis.pendingDuesMembers} members owe`}
          warn={kpis.pendingDuesPaise > 0}
        />
        <Kpi label="Expiring in 7 days" value={kpis.expiringIn7Days} sub={`possible renewals ${formatPaise(kpis.potentialRenewalPaise)}`} />
      </div>

      <div className="flex flex-wrap gap-4">
        <Card className="flex-1 basis-[380px]">
          <h2>Expiring soon</h2>
          {expiringSoon.length === 0 ? (
            <EmptyState>Nothing expiring in the next 7 days.</EmptyState>
          ) : (
            <ul className="flex flex-col">
              {expiringSoon.map((item) => (
                <li key={item._id} className="flex items-center gap-3 py-2.5 border-t border-line2 first:border-0 first:pt-0">
                  <Avatar label={initials(item.memberId.firstName, item.memberId.lastName)} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">
                      {item.memberId.firstName} {item.memberId.lastName ?? ""}
                    </div>
                    <div className="text-sm text-muted truncate">
                      {item.planName} · ends {formatDate(item.endDate)}
                    </div>
                  </div>
                  <Button
                    onClick={() =>
                      showToast(
                        "WhatsApp reminders aren't wired up yet — this is a placeholder for the nightly reminder job described in the product workflows doc."
                      )
                    }
                  >
                    Remind
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex-1 basis-[380px]">
          <h2>Pending dues</h2>
          {pendingDuesList.length === 0 ? (
            <EmptyState>No pending dues. Nice.</EmptyState>
          ) : (
            <ul className="flex flex-col">
              {pendingDuesList.map((item) => (
                <li key={item._id} className="flex items-center gap-3 py-2.5 border-t border-line2 first:border-0 first:pt-0">
                  <Avatar label={initials(item.memberId.firstName, item.memberId.lastName)} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">
                      {item.memberId.firstName} {item.memberId.lastName ?? ""}
                    </div>
                    <div className="text-sm text-muted truncate">Due since {formatDate(item.dueSince)}</div>
                  </div>
                  <div className="font-semibold text-warn">{formatPaise(item.outstandingPaise)}</div>
                  <LinkButton href="/app/payments">Collect</LinkButton>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h2>Check-ins today</h2>
        <div className="flex items-end gap-1.5 h-32 pb-1">
          {checkinsByHour.map((count, hour) => {
            const pct = Math.max((count / maxCheckins) * 100, count > 0 ? 6 : 2);
            const isPeak = hasCheckins && count === maxCheckins;
            return (
              <div key={hour} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${hourLabel(hour)}: ${count} check-ins`}>
                <div className={`w-full max-w-[18px] rounded-t-[6px] rounded-b-[2px] ${isPeak ? "bg-accent" : "bg-blue-soft"}`} style={{ height: `${pct}%` }} />
              </div>
            );
          })}
        </div>
        <div className="flex gap-1.5 text-xs text-muted">
          {checkinsByHour.map((_, hour) => (
            <div key={hour} className="flex-1 text-center">
              {hour % 3 === 0 ? hourLabel(hour) : ""}
            </div>
          ))}
        </div>
        <p className="text-sm text-muted">{hasCheckins ? `Busiest around ${hourLabel(peakHour)}` : "No check-ins yet today."}</p>
      </Card>

      <Toast message={toast} />
    </div>
  );
}
