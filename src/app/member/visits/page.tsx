"use client";

import { useEffect, useState } from "react";
import { meApi } from "@/lib/api";
import { formatDate, localDateParts } from "@/lib/format";
import { cx } from "@/components/ui";
import { BigValue, PageHeader, PageSpinner, Tile, TileLabel } from "@/components/member-ui";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import type { Attendance } from "@/types/api";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function daysAgoLabel(n: number): string {
  if (n <= 0) return "Today";
  if (n === 1) return "Yesterday";
  return `${n} days ago`;
}

export default function MemberVisitsPage() {
  const today = localDateParts();
  const [view, setView] = useState({ year: today.year, month: today.month });
  const [loaded, setLoaded] = useState<{ key: string; attendance: Attendance[] } | null>(null);

  const key = monthKey(view.year, view.month);

  useEffect(() => {
    let cancelled = false;
    meApi.attendance(key).then((res) => {
      if (!cancelled) setLoaded({ key, attendance: res.attendance });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const isCurrentMonth = view.year === today.year && view.month === today.month;
  const monthDate = new Date(Date.UTC(view.year, view.month - 1, 15));
  const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }).format(monthDate);
  const monthName = new Intl.DateTimeFormat("en-IN", { month: "long", timeZone: "UTC" }).format(monthDate);

  function shift(delta: number) {
    setView((v) => {
      const m = v.month + delta;
      if (m < 1) return { year: v.year - 1, month: 12 };
      if (m > 12) return { year: v.year + 1, month: 1 };
      return { year: v.year, month: m };
    });
  }

  const attendance = loaded?.key === key ? loaded.attendance : null;
  const daysInMonth = new Date(Date.UTC(view.year, view.month, 0)).getUTCDate();
  const leadingBlanks = new Date(Date.UTC(view.year, view.month - 1, 1)).getUTCDay();
  const visitedDays = new Set((attendance ?? []).map((a) => localDateParts(a.inTime).day));
  const last = attendance && attendance.length ? attendance[attendance.length - 1] : undefined;
  const lastParts = last ? localDateParts(last.inTime) : null;
  const lastAgo = lastParts
    ? Math.round((Date.UTC(today.year, today.month - 1, today.day) - Date.UTC(lastParts.year, lastParts.month - 1, lastParts.day)) / 86_400_000)
    : null;

  return (
    <>
      <PageHeader eyebrow={monthLabel} title="Visits" />

      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        {/* Summary tiles: first on phones, right column on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:order-2 lg:grid-rows-2">
          <Tile className="gap-3 min-h-[140px]">
            <TileLabel>This month</TileLabel>
            <BigValue className="mt-auto">{attendance ? attendance.length : "–"}</BigValue>
            <span className="text-[13px] text-muted">
              {attendance?.length === 1 ? "visit" : "visits"} in {monthName}
            </span>
          </Tile>
          <Tile className="gap-1.5 min-h-[140px]">
            <TileLabel>Last visit</TileLabel>
            {last ? (
              <>
                <span className="mt-auto text-xl font-bold leading-snug">{formatDate(last.inTime, { weekday: "short", day: "numeric", month: "short" })}</span>
                <span className="text-[13px] text-muted">{isCurrentMonth && lastAgo !== null ? daysAgoLabel(lastAgo) : `Last in ${monthName}`}</span>
              </>
            ) : (
              <>
                <span className="mt-auto text-xl font-bold">—</span>
                <span className="text-[13px] text-muted">No visits in {monthName}</span>
              </>
            )}
          </Tile>
        </div>

        {/* Calendar */}
        <Tile className="gap-4 lg:order-1">
          <div className="flex items-center justify-between">
            <h2 className="font-sans text-lg font-bold">{monthLabel}</h2>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => shift(-1)}
                aria-label="Previous month"
                className="w-9 h-9 rounded-full bg-bg hover:bg-line flex items-center justify-center transition"
              >
                <IconChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => shift(1)}
                disabled={isCurrentMonth}
                aria-label="Next month"
                className="w-9 h-9 rounded-full bg-bg hover:bg-line flex items-center justify-center transition disabled:opacity-40 disabled:hover:bg-bg"
              >
                <IconChevronRight size={16} />
              </button>
            </div>
          </div>

          {!attendance ? (
            <PageSpinner />
          ) : (
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {WEEKDAYS.map((d, i) => (
                <div key={i} className="text-center text-xs font-medium text-muted pb-1">
                  {d}
                </div>
              ))}
              {Array.from({ length: leadingBlanks }, (_, i) => (
                <div key={`b${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                const visited = visitedDays.has(day);
                const isToday = isCurrentMonth && day === today.day;
                const future = isCurrentMonth && day > today.day;
                return (
                  <div
                    key={day}
                    title={visited ? "Checked in" : future ? undefined : "No visit"}
                    className={cx(
                      "aspect-square max-h-[64px] w-full rounded-[10px] sm:rounded-[12px] flex items-center justify-center text-sm",
                      visited ? "bg-accent text-on-accent font-semibold" : future ? "text-muted" : "bg-bg",
                      isToday && "ring-2 ring-ink ring-inset font-bold"
                    )}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[3px] bg-accent" /> Visited
            </span>
            {isCurrentMonth && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[3px] ring-2 ring-ink ring-inset" /> Today
              </span>
            )}
          </div>
        </Tile>
      </div>
    </>
  );
}
