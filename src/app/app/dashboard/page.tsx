"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { dashboardApi } from "@/lib/api";
import type { DashboardSummary } from "@/types/api";
import { Avatar, Spinner, Toast, cx } from "@/components/ui";
import { formatDate, formatPaise, initials } from "@/lib/format";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { useAuth } from "@/lib/auth-context";
import { visibleNavFor } from "@/lib/nav";
import {
  IconArrowUp,
  IconCalendar,
  IconChart,
  IconCheck,
  IconClock,
  IconDollar,
  IconMessage,
  IconPlus,
  IconUsers,
  IconWhatsapp,
} from "@/components/icons";

const WHATSAPP_PLACEHOLDER =
  "WhatsApp reminders aren't wired up yet — this is a placeholder for the nightly reminder job described in the product workflows doc.";

function Tile({ className, bg = "bg-surface", children }: { className?: string; bg?: string; children: ReactNode }) {
  return <section className={cx(bg, "rounded-[24px] p-6 flex flex-col", className)}>{children}</section>;
}

function hourLabel(h: number): string {
  const period = h < 12 ? "am" : "pm";
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return `${hh}${period}`;
}

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { context, user } = useAuth();
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

  const now = new Date();
  const firstName = user?.name?.split(" ")[0];
  const { kpis, expiringSoon, pendingDuesList, checkinsByHour } = data;

  const totalCheckins = checkinsByHour.reduce((a, b) => a + b, 0);
  const maxCheckins = Math.max(1, ...checkinsByHour);
  const peakHour = checkinsByHour.indexOf(Math.max(...checkinsByHour));
  const hasCheckins = totalCheckins > 0;

  const billed = kpis.collectedTodayPaise + kpis.pendingDuesPaise;
  const collectedPct = billed > 0 ? (kpis.collectedTodayPaise / billed) * 100 : 0;

  const allowed = new Set(context ? visibleNavFor(context.role, context.org?.modules).map((n) => n.href) : []);
  const quickActions = [
    { href: "/app/attendance", label: "Check in member", icon: <IconCheck size={16} /> },
    { href: "/app/leads", label: "New lead", icon: <IconMessage size={16} /> },
    { href: "/app/expenses", label: "Log expense", icon: <IconDollar size={16} /> },
    { href: "/app/payments", label: "Today's payments", icon: <IconChart size={16} /> },
  ].filter((a) => allowed.has(a.href));

  return (
    <div className="flex flex-col gap-5">
      {context?.role === "org_owner" && <OnboardingChecklist />}

      {/* ---- Header ---- */}
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div>
          <p className="text-[13px] font-semibold tracking-[0.06em] uppercase text-muted">
            {formatDate(now, { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="font-sans text-[34px] sm:text-[40px] font-bold tracking-[-0.02em] leading-tight mt-1">
            {greeting(now.getHours())}
            {firstName ? `, ${firstName}` : ""}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/app/payments"
            className="inline-flex items-center min-h-[44px] px-5 rounded-full bg-surface text-ink font-medium shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition"
          >
            Record payment
          </Link>
          <Link
            href="/app/members/new"
            className="inline-flex items-center gap-2 min-h-[44px] px-5 rounded-full bg-accent text-on-accent font-semibold hover:bg-accent-hover transition"
          >
            <IconPlus size={16} />
            Add member
          </Link>
        </div>
      </div>

      {/* ---- Bento grid ---- */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-[1.75fr_1fr_1fr]">
        {/* Collected today */}
        <Tile className="md:col-span-2 xl:col-span-1 gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-muted">Collected today</div>
              <div className="text-[44px] sm:text-[52px] font-bold tracking-[-0.03em] leading-none mt-2">
                {formatPaise(kpis.collectedTodayPaise)}
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-gray-soft text-[13px] text-gray-ink whitespace-nowrap">
              {kpis.collectedTodayCount} {kpis.collectedTodayCount === 1 ? "payment" : "payments"}
            </span>
          </div>
          <div className="mt-auto flex flex-col gap-3">
            <div className="flex h-2 rounded-full overflow-hidden bg-line" role="img" aria-label={`${Math.round(collectedPct)}% of today's billing collected`}>
              <div className="bg-ink" style={{ width: `${collectedPct}%` }} />
              <div className="bg-accent flex-1" style={{ display: kpis.pendingDuesPaise > 0 ? undefined : "none" }} />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-ink" /> Collected {formatPaise(kpis.collectedTodayPaise)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" /> Still due {formatPaise(kpis.pendingDuesPaise)}
              </span>
            </div>
          </div>
        </Tile>

        {/* Active members */}
        <Tile className="gap-2 min-h-[180px]">
          <div className="flex items-start justify-between text-muted">
            <span>Active members</span>
            <IconUsers size={17} />
          </div>
          <div className="mt-auto text-[40px] font-bold tracking-[-0.02em] leading-none">{kpis.activeMembers}</div>
          <span className="self-start inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-soft text-green-ink text-[13px]">
            <IconArrowUp size={12} /> {kpis.joinedThisMonth} joined this month
          </span>
        </Tile>

        {/* Pending dues KPI */}
        <Tile className={cx("gap-2 min-h-[180px]", kpis.pendingDuesPaise > 0 && "text-warn-ink")} bg={kpis.pendingDuesPaise > 0 ? "bg-warn-soft" : "bg-surface"}>
          <div className={cx("flex items-start justify-between font-medium", kpis.pendingDuesPaise > 0 ? "text-warn-ink" : "text-muted")}>
            <span>Pending dues</span>
            <IconClock size={17} />
          </div>
          <div className="mt-auto text-[40px] font-bold tracking-[-0.02em] leading-none">{formatPaise(kpis.pendingDuesPaise)}</div>
          <span className="text-[13px]">
            {kpis.pendingDuesMembers} {kpis.pendingDuesMembers === 1 ? "member owes" : "members owe"}
          </span>
        </Tile>

        {/* Pending dues list */}
        <Tile className="md:col-span-2 xl:col-span-1 xl:row-span-2 gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-xl font-bold tracking-[-0.01em]">Pending dues</h2>
            <Link href="/app/payments" className="text-sm text-link underline underline-offset-2">
              See all ›
            </Link>
          </div>
          {pendingDuesList.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted py-8">No pending dues. Nice.</div>
          ) : (
            <>
              <ul className="flex flex-col">
                {pendingDuesList.map((item) => (
                  <li key={item._id} className="flex items-center gap-3.5 py-3.5 border-t border-line first:border-0">
                    <Avatar label={initials(item.memberId.firstName, item.memberId.lastName)} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">
                        {item.memberId.firstName} {item.memberId.lastName ?? ""}
                      </div>
                      <div className="text-sm text-muted truncate">Due since {formatDate(item.dueSince)}</div>
                    </div>
                    <div className="font-semibold text-lg">{formatPaise(item.outstandingPaise)}</div>
                    <Link
                      href="/app/payments"
                      className="inline-flex items-center min-h-[38px] px-4 rounded-full bg-gray-soft text-accent-ink font-semibold text-sm hover:bg-accent-soft transition"
                    >
                      Collect
                    </Link>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => showToast(WHATSAPP_PLACEHOLDER)}
                className="mt-auto inline-flex items-center justify-center gap-2 min-h-[44px] rounded-[14px] bg-gray-soft hover:bg-line font-medium text-sm transition"
              >
                <IconWhatsapp size={16} />
                Send WhatsApp reminder to all {pendingDuesList.length}
              </button>
            </>
          )}
        </Tile>

        {/* Expiring in 7 days KPI */}
        <Tile className="gap-1 min-h-[220px]">
          <div className="flex items-start justify-between text-muted">
            <span>Expiring in 7 days</span>
            <IconCalendar size={17} />
          </div>
          <div className="mt-auto text-[40px] font-bold tracking-[-0.02em] leading-none">{kpis.expiringIn7Days}</div>
          <span className="text-[13px] text-muted">Possible renewals {formatPaise(kpis.potentialRenewalPaise)}</span>
        </Tile>

        {/* Quick actions */}
        <Tile className="text-white gap-3.5" bg="bg-panel">
          <h2 className="font-sans text-[17px] font-semibold">Quick actions</h2>
          {quickActions.length === 0 ? (
            <p className="text-sm text-white/60">No quick actions for your role.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 flex-1">
              {quickActions.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex flex-col justify-between gap-4 min-h-[84px] p-3 rounded-[14px] bg-panel-tile hover:bg-white/15 transition"
                >
                  {a.icon}
                  <span className="text-sm font-semibold leading-tight">{a.label}</span>
                </Link>
              ))}
            </div>
          )}
        </Tile>

        {/* Expiring soon */}
        <Tile className="md:col-span-2 justify-center">
          {expiringSoon.length === 0 ? (
            <div className="flex flex-wrap items-center gap-5">
              <span className="w-16 h-16 flex-none rounded-[16px] bg-green-soft text-green-ink flex items-center justify-center">
                <IconCheck size={24} />
              </span>
              <div className="flex-1 min-w-[200px]">
                <h2 className="font-sans text-xl font-bold tracking-[-0.01em]">Expiring soon</h2>
                <p className="text-muted mt-0.5">You&apos;re all set. No memberships expire in the next 7 days.</p>
              </div>
              <Link href="/app/members?status=expiring" className="text-sm text-link underline underline-offset-2 whitespace-nowrap">
                View renewals ›
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="font-sans text-xl font-bold tracking-[-0.01em]">Expiring soon</h2>
                <Link href="/app/members?status=expiring" className="text-sm text-link underline underline-offset-2">
                  View renewals ›
                </Link>
              </div>
              <ul className="flex flex-col">
                {expiringSoon.map((item) => (
                  <li key={item._id} className="flex items-center gap-3.5 py-3 border-t border-line first:border-0">
                    <Avatar label={initials(item.memberId.firstName, item.memberId.lastName)} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">
                        {item.memberId.firstName} {item.memberId.lastName ?? ""}
                      </div>
                      <div className="text-sm text-muted truncate">
                        {item.planName} · ends {formatDate(item.endDate)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => showToast(WHATSAPP_PLACEHOLDER)}
                      className="inline-flex items-center min-h-[38px] px-4 rounded-full bg-gray-soft text-accent-ink font-semibold text-sm hover:bg-accent-soft transition"
                    >
                      Remind
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Tile>
      </div>

      {/* ---- Check-ins ---- */}
      <Tile className="gap-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-sans text-xl font-bold tracking-[-0.01em]">Check-ins today</h2>
            <p className="text-muted text-sm mt-0.5">
              {hasCheckins ? `Busiest around ${hourLabel(peakHour)}.` : "No check-ins yet today. They'll appear here hour by hour."}
            </p>
          </div>
          <div className="text-[32px] font-bold leading-none">{totalCheckins}</div>
        </div>
        <div className="flex items-end gap-1.5 h-36 mt-4">
          {checkinsByHour.map((count, hour) => {
            const isNow = hour === now.getHours();
            const highlight = hasCheckins ? count === maxCheckins : isNow;
            const pct = count > 0 ? Math.max((count / maxCheckins) * 100, 8) : 0;
            return (
              <div key={hour} className="flex-1 flex flex-col justify-end h-full" title={`${hourLabel(hour)}: ${count} check-ins`}>
                <div
                  className={cx("w-full rounded-full", highlight ? "bg-accent" : count > 0 ? "bg-ink/15" : "bg-line")}
                  style={{ height: count > 0 ? `${pct}%` : 5 }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex gap-1.5 text-xs text-muted mt-2">
          {checkinsByHour.map((_, hour) => (
            <div key={hour} className="flex-1 whitespace-nowrap">
              {hour % 3 === 0 ? hourLabel(hour) : ""}
            </div>
          ))}
        </div>
      </Tile>

      <Toast message={toast} />
    </div>
  );
}
