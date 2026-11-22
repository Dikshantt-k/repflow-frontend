"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { meApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { hasModule } from "@/lib/modules";
import { formatDate, daysLeft, formatPaise } from "@/lib/format";
import { cx } from "@/components/ui";
import { BigValue, PageHeader, PageSpinner, ProgressBar, Tile, TileLabel, membershipRemainingPct } from "@/components/member-ui";
import { IconCheck, IconClock } from "@/components/icons";
import type { Attendance, MeMemberSummary, PTPackage, Weekday, WorkoutPlan } from "@/types/api";

const WEEKDAY_ORDER: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function PtRing({ left, total }: { left: number; total: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? left / total : 0;
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" className="flex-none -rotate-90">
      <circle cx="24" cy="24" r={r} fill="none" strokeWidth="6" className="stroke-line" />
      <circle cx="24" cy="24" r={r} fill="none" strokeWidth="6" strokeLinecap="round" className="stroke-accent" strokeDasharray={`${c * pct} ${c}`} />
    </svg>
  );
}

export default function MemberHomePage() {
  const { user, context } = useAuth();
  const modules = context?.org?.modules;
  const ptEnabled = hasModule(modules, "personal_training");
  const workoutEnabled = hasModule(modules, "workout_diet");

  const [data, setData] = useState<MeMemberSummary | null>(null);
  const [visits, setVisits] = useState<Attendance[]>([]);
  const [pt, setPt] = useState<PTPackage[] | null>(null);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);

  useEffect(() => {
    meApi.summary().then(setData);
    meApi.attendance().then((res) => setVisits(res.attendance)).catch(() => setVisits([]));
    if (ptEnabled) meApi.pt().then((res) => setPt(res.packages)).catch(() => setPt([]));
    if (workoutEnabled) meApi.workout().then((res) => setPlan(res.plan)).catch(() => setPlan(null));
  }, [ptEnabled, workoutEnabled]);

  if (!data) return <PageSpinner />;

  const { member, membership, branch, visitsThisMonth } = data;
  const now = new Date();
  const left = membership ? daysLeft(membership.endDate) : null;
  const expired = member.status === "expired";
  const expiringSoon = left !== null && left <= 7;

  const remainingPct = membership ? membershipRemainingPct(membership.startDate, membership.endDate) : 0;

  const lastVisit = visits.length ? visits[visits.length - 1] : undefined;
  const activePt = pt?.find((p) => p.status === "active");
  const ptLeft = activePt ? activePt.totalSessions - activePt.sessions.length : 0;

  const today = WEEKDAY_ORDER[(now.getDay() + 6) % 7];
  const todayPlan = plan?.days.find((d) => d.weekday === today);
  const hasAnyPlan = plan?.days.some((d) => d.exercises.length > 0);

  const eyebrow = [branch?.name, formatDate(now, { weekday: "long", day: "numeric", month: "short" })].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={`Hi ${user?.name?.split(" ")[0] ?? member.firstName}`} />

      {membership && (expiringSoon || expired) && (
        <Tile bg="bg-warn-soft" className="text-warn-ink gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="font-semibold">
              {membership.planName} {expired ? "has expired" : left === 0 ? "ends today" : `ends in ${left} day${left === 1 ? "" : "s"}`}
            </p>
            <p className="text-sm">
              {expired ? "Expired" : "Ends"} {formatDate(membership.endDate)}. Renew to keep checking in.
            </p>
          </div>
          <Link
            href="/member/renew"
            className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-full bg-accent text-on-accent font-semibold hover:bg-accent-hover transition"
          >
            Renew membership
          </Link>
        </Tile>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Check-in ID */}
        <Tile className="col-span-2 lg:row-span-2 items-center justify-center text-center gap-3 py-8">
          <span className="text-sm text-muted">Check-in ID</span>
          <div className="px-6 py-5 rounded-[18px] bg-bg border border-line">
            <span className="font-mono text-[36px] sm:text-[44px] font-bold tracking-[0.12em] leading-none">{member.memberCode}</span>
          </div>
          <span className="text-sm text-muted">Show this at the front desk to check in.</span>
        </Tile>

        {/* Visits this month */}
        <Tile className="gap-3 min-h-[140px]">
          <TileLabel>Visits this month</TileLabel>
          <BigValue className="mt-auto">{visitsThisMonth}</BigValue>
          <span className="text-[13px] text-muted">{lastVisit ? `Last visit · ${formatDate(lastVisit.inTime, { day: "numeric", month: "short" })}` : "No visits yet this month"}</span>
        </Tile>

        {/* Dues */}
        <Tile className="gap-3 min-h-[140px]" bg={member.duesPaise > 0 ? "bg-warn-soft" : "bg-surface"}>
          <TileLabel right={member.duesPaise > 0 ? <IconClock size={16} className="text-warn-ink" /> : undefined}>Dues</TileLabel>
          {member.duesPaise > 0 ? (
            <>
              <BigValue className="mt-auto text-warn-ink">{formatPaise(member.duesPaise)}</BigValue>
              <span className="text-[13px] text-warn-ink">Pay at the front desk</span>
            </>
          ) : (
            <>
              <div className="mt-auto flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-green-soft text-green-ink flex items-center justify-center">
                  <IconCheck size={14} />
                </span>
                <span className="text-2xl font-bold">None</span>
              </div>
              <span className="text-[13px] text-muted">You&apos;re all paid up</span>
            </>
          )}
        </Tile>

        {/* Personal training */}
        {ptEnabled && (
          <Tile className="gap-3 min-h-[140px]">
            <TileLabel>Personal training</TileLabel>
            {activePt ? (
              <div className="mt-auto flex items-center gap-3">
                <PtRing left={ptLeft} total={activePt.totalSessions} />
                <div className="leading-tight">
                  <div className="text-2xl font-bold">{ptLeft}</div>
                  <div className="text-[13px] text-muted">of {activePt.totalSessions} left</div>
                </div>
              </div>
            ) : (
              <>
                <span className="mt-auto text-lg font-bold">No package</span>
                <span className="text-[13px] text-muted">Ask the front desk about PT</span>
              </>
            )}
          </Tile>
        )}

        {/* Today's workout */}
        {workoutEnabled && (
          <Tile className="gap-1.5 min-h-[140px]">
            <TileLabel>Today&apos;s workout</TileLabel>
            <span className="mt-auto text-lg font-bold leading-snug">
              {!hasAnyPlan
                ? "No plan yet"
                : todayPlan && todayPlan.exercises.length > 0
                  ? todayPlan.label || `${todayPlan.exercises.length} exercises`
                  : "Rest day"}
            </span>
            <Link href="/member/workout" className="text-sm font-semibold text-link">
              Open workout ›
            </Link>
          </Tile>
        )}

        {/* Membership */}
        <Tile className={cx("col-span-2 lg:col-span-4 gap-3")}>
          <TileLabel
            right={
              left !== null ? (
                <span className={cx("text-sm font-semibold", expired || expiringSoon ? "text-warn" : "text-accent-ink")}>
                  {left > 0 ? `${left} days left` : left === 0 ? "Last day" : "Expired"}
                </span>
              ) : undefined
            }
          >
            Membership
          </TileLabel>
          {membership ? (
            <>
              <span className="text-lg font-bold">
                {membership.planName} · {expired ? "ended" : "ends"} {formatDate(membership.endDate)}
              </span>
              <ProgressBar pct={remainingPct} />
            </>
          ) : (
            <span className="text-lg font-bold">No active membership</span>
          )}
        </Tile>
      </div>
    </>
  );
}
