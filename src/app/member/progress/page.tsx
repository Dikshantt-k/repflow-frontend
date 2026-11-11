"use client";

import { useEffect, useState } from "react";
import { meApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Card, Spinner } from "@/components/ui";
import type { FitnessLog, FitnessMeasurements } from "@/types/api";

function bmi(weightKg?: number, heightCm?: number): string | undefined {
  if (!weightKg || !heightCm) return undefined;
  const m = heightCm / 100;
  return (weightKg / (m * m)).toFixed(1);
}

function measurementsSummary(m?: FitnessMeasurements): string {
  if (!m) return "—";
  const parts: string[] = [];
  if (m.chestCm) parts.push(`Chest ${m.chestCm}cm`);
  if (m.waistCm) parts.push(`Waist ${m.waistCm}cm`);
  if (m.hipsCm) parts.push(`Hips ${m.hipsCm}cm`);
  if (m.armsCm) parts.push(`Arms ${m.armsCm}cm`);
  if (m.thighsCm) parts.push(`Thighs ${m.thighsCm}cm`);
  return parts.length ? parts.join(" · ") : "—";
}

export default function MemberProgressPage() {
  const [logs, setLogs] = useState<FitnessLog[] | null>(null);

  useEffect(() => {
    meApi.fitness().then((res) => setLogs(res.logs));
  }, []);

  if (!logs) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col gap-3.5">
        <h1 className="text-2xl">Progress</h1>
        <Card>
          <p className="text-muted">Your trainer hasn&apos;t logged any fitness progress yet.</p>
        </Card>
      </div>
    );
  }

  const latest = logs[0]!;
  const previous = logs[1];
  const weightDelta =
    latest.weightKg !== undefined && previous?.weightKg !== undefined ? latest.weightKg - previous.weightKg : null;
  const latestHeightCm = logs.find((l) => l.heightCm)?.heightCm;

  return (
    <div className="flex flex-col gap-3.5">
      <h1 className="text-2xl">Progress</h1>

      <div className="grid grid-cols-2 gap-2.5">
        <Card className="items-center text-center gap-1 py-4">
          <span className="font-display text-2xl font-semibold">{latest.weightKg ? `${latest.weightKg} kg` : "—"}</span>
          <span className="text-sm text-muted">
            Weight{weightDelta !== null ? ` (${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)})` : ""}
          </span>
        </Card>
        <Card className="items-center text-center gap-1 py-4">
          <span className="font-display text-2xl font-semibold">{bmi(latest.weightKg, latest.heightCm ?? latestHeightCm) ?? "—"}</span>
          <span className="text-sm text-muted">BMI</span>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <ul className="flex flex-col">
          {logs.map((l) => (
            <li key={l._id} className="flex flex-col gap-0.5 p-3.5 border-t border-line2 first:border-0">
              <div className="flex justify-between">
                <span className="font-semibold">{formatDate(l.date)}</span>
                <span className="text-sm text-muted">
                  {l.weightKg ? `${l.weightKg} kg` : "—"}
                  {l.bodyFatPercent ? ` · ${l.bodyFatPercent}% fat` : ""}
                </span>
              </div>
              <span className="text-sm text-muted">{measurementsSummary(l.measurements)}</span>
              {l.notes && <span className="text-sm">{l.notes}</span>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
