"use client";

import { useEffect, useState } from "react";
import { meApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Card, Spinner } from "@/components/ui";
import type { Attendance } from "@/types/api";

export default function MemberVisitsPage() {
  const [attendance, setAttendance] = useState<Attendance[] | null>(null);

  useEffect(() => {
    meApi.attendance().then((res) => setAttendance(res.attendance));
  }, []);

  if (!attendance) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const presentDays = new Set(attendance.map((a) => new Date(a.inTime).getUTCDate()));

  return (
    <div className="flex flex-col gap-3.5">
      <div>
        <h1 className="text-2xl">Visits</h1>
        <p className="text-muted">{formatDate(now, { month: "long", year: "numeric" })}</p>
      </div>

      <Card className="items-center text-center py-4">
        <span className="font-display text-3xl font-semibold">{attendance.length}</span>
        <span className="text-sm text-muted">visits this month</span>
      </Card>

      <Card>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const present = presentDays.has(day);
            const isToday = day === now.getDate();
            return (
              <div
                key={day}
                title={present ? "Checked in" : "No visit"}
                className={`aspect-square rounded-md border flex items-center justify-center text-xs ${
                  present ? "bg-accent border-accent text-on-accent font-semibold" : "bg-line2 border-line text-muted"
                } ${isToday ? "ring-2 ring-ink" : ""}`}
              >
                {day}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
