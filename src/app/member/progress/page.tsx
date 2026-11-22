"use client";

import { useEffect, useState } from "react";
import { meApi } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { cx } from "@/components/ui";
import { BigValue, EmptyTile, PageHeader, PageSpinner, Tile, TileLabel } from "@/components/member-ui";
import { IconTrend } from "@/components/icons";
import type { FitnessLog, FitnessMeasurements } from "@/types/api";

function bmiValue(weightKg?: number, heightCm?: number): number | undefined {
  if (!weightKg || !heightCm) return undefined;
  const m = heightCm / 100;
  return weightKg / (m * m);
}

function bmiCategory(bmi: number): { label: string; healthy: boolean } {
  if (bmi < 18.5) return { label: "Underweight", healthy: false };
  if (bmi < 25) return { label: "Healthy range", healthy: true };
  if (bmi < 30) return { label: "Overweight", healthy: false };
  return { label: "Obese range", healthy: false };
}

function measurementsSummary(m?: FitnessMeasurements): string {
  if (!m) return "";
  const parts: string[] = [];
  if (m.chestCm) parts.push(`Chest ${m.chestCm} cm`);
  if (m.waistCm) parts.push(`Waist ${m.waistCm} cm`);
  if (m.hipsCm) parts.push(`Hips ${m.hipsCm} cm`);
  if (m.armsCm) parts.push(`Arms ${m.armsCm} cm`);
  if (m.thighsCm) parts.push(`Thighs ${m.thighsCm} cm`);
  return parts.join(" · ");
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** "−1.5 kg since Aug" — change from the earliest log that has the value. */
function DeltaPill({ latest, first, unit, since }: { latest?: number; first?: number; unit: string; since: string }) {
  if (latest === undefined || first === undefined) return null;
  const d = latest - first;
  const sign = d > 0 ? "+" : d < 0 ? "−" : "±";
  return (
    <span className="self-start px-2.5 py-0.5 rounded-full bg-gray-soft text-gray-ink text-xs font-semibold">
      {sign}
      {fmt(Math.abs(d))}
      {unit} since {since}
    </span>
  );
}

function WeightChart({ points }: { points: Array<{ date: string; kg: number }> }) {
  const W = 600;
  const H = 220;
  const pad = { l: 24, r: 24, t: 34, b: 34 };
  const values = points.map((p) => p.kg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 2);
  const lo = min - span * 0.25;
  const hi = max + span * 0.25;
  const x = (i: number) => (points.length === 1 ? W / 2 : pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r));
  const y = (kg: number) => pad.t + (1 - (kg - lo) / (hi - lo)) * (H - pad.t - pad.b);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.kg)}`).join(" ");
  const lastIdx = points.length - 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Weight from ${fmt(points[0]!.kg)} kg to ${fmt(points[lastIdx]!.kg)} kg`}>
      {[0, 1, 2].map((g) => {
        const gy = pad.t + (g / 2) * (H - pad.t - pad.b);
        return <line key={g} x1={pad.l} x2={W - pad.r} y1={gy} y2={gy} className="stroke-line" strokeWidth="1" />;
      })}
      <path d={path} fill="none" className="stroke-accent" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => {
        const edge = i === 0 || i === lastIdx;
        return (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.kg)} r={edge ? 7 : 4.5} strokeWidth="3" className={cx("stroke-accent", i === lastIdx ? "fill-accent" : "fill-surface")} />
            {edge && (
              <text x={x(i)} y={y(p.kg) - 14} textAnchor={i === 0 && points.length > 1 ? "start" : i === lastIdx && points.length > 1 ? "end" : "middle"} className="fill-ink text-[15px] font-bold">
                {fmt(p.kg)} kg
              </text>
            )}
          </g>
        );
      })}
      <text x={x(0)} y={H - 8} textAnchor={points.length > 1 ? "start" : "middle"} className="fill-muted text-[13px]">
        {formatDate(points[0]!.date, { day: "numeric", month: "short" })}
      </text>
      {points.length > 1 && (
        <text x={x(lastIdx)} y={H - 8} textAnchor="end" className="fill-muted text-[13px]">
          {formatDate(points[lastIdx]!.date, { day: "numeric", month: "short" })}
        </text>
      )}
    </svg>
  );
}

export default function MemberProgressPage() {
  const [logs, setLogs] = useState<FitnessLog[] | null>(null);

  useEffect(() => {
    meApi.fitness().then((res) => setLogs(res.logs));
  }, []);

  if (!logs) return <PageSpinner />;

  if (logs.length === 0) {
    return (
      <>
        <PageHeader title="Progress" />
        <EmptyTile icon={<IconTrend size={24} />} title="No measurements yet">
          Your trainer hasn&apos;t logged any fitness progress yet. Your weight, BMI and measurements will show up here.
        </EmptyTile>
      </>
    );
  }

  // logs arrive newest first
  const latest = logs[0]!;
  const oldestFirst = [...logs].reverse();
  const firstWith = <K extends keyof FitnessLog>(key: K) => oldestFirst.find((l) => l[key] !== undefined && l[key] !== null);
  const latestHeightCm = logs.find((l) => l.heightCm)?.heightCm;
  const bmi = bmiValue(latest.weightKg, latest.heightCm ?? latestHeightCm);
  const cat = bmi !== undefined ? bmiCategory(bmi) : null;

  const firstWeight = firstWith("weightKg");
  const firstFat = firstWith("bodyFatPercent");
  const firstWaist = oldestFirst.find((l) => l.measurements?.waistCm !== undefined);
  const since = (l?: FitnessLog) => (l && l._id !== latest._id ? formatDate(l.date, { month: "short" }) : "");

  const weightPoints = oldestFirst.filter((l) => l.weightKg !== undefined).map((l) => ({ date: l.date, kg: l.weightKg! }));
  const range =
    weightPoints.length > 1
      ? `${formatDate(weightPoints[0]!.date, { month: "short" })} – ${formatDate(weightPoints[weightPoints.length - 1]!.date, { month: "short", year: "numeric" })}`
      : "";

  return (
    <>
      <PageHeader eyebrow={`Last measured ${formatDate(latest.date, { day: "numeric", month: "short", year: "numeric" })}`} title="Progress" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile className="gap-2.5">
          <TileLabel>Weight</TileLabel>
          <BigValue unit={latest.weightKg !== undefined ? "kg" : undefined}>{latest.weightKg !== undefined ? fmt(latest.weightKg) : "—"}</BigValue>
          {since(firstWeight) && <DeltaPill latest={latest.weightKg} first={firstWeight?.weightKg} unit=" kg" since={since(firstWeight)} />}
        </Tile>
        <Tile className="gap-2.5">
          <TileLabel>BMI</TileLabel>
          <BigValue>{bmi !== undefined ? bmi.toFixed(1) : "—"}</BigValue>
          {cat && (
            <span className={cx("self-start px-2.5 py-0.5 rounded-full text-xs font-semibold", cat.healthy ? "bg-green-soft text-green-ink" : "bg-warn-soft text-warn-ink")}>
              {cat.label}
            </span>
          )}
        </Tile>
        <Tile className="gap-2.5">
          <TileLabel>Body fat</TileLabel>
          <BigValue unit={latest.bodyFatPercent !== undefined ? "%" : undefined}>{latest.bodyFatPercent !== undefined ? fmt(latest.bodyFatPercent) : "—"}</BigValue>
          {since(firstFat) && <DeltaPill latest={latest.bodyFatPercent} first={firstFat?.bodyFatPercent} unit="%" since={since(firstFat)} />}
        </Tile>
        <Tile className="gap-2.5">
          <TileLabel>Waist</TileLabel>
          <BigValue unit={latest.measurements?.waistCm !== undefined ? "cm" : undefined}>
            {latest.measurements?.waistCm !== undefined ? fmt(latest.measurements.waistCm) : "—"}
          </BigValue>
          {since(firstWaist) && <DeltaPill latest={latest.measurements?.waistCm} first={firstWaist?.measurements?.waistCm} unit=" cm" since={since(firstWaist)} />}
        </Tile>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Tile className="gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-sans text-lg font-bold">Weight</h2>
            {range && <span className="text-xs text-muted">{range}</span>}
          </div>
          {weightPoints.length === 0 ? (
            <p className="text-sm text-muted py-8 text-center">No weight logged yet.</p>
          ) : (
            <WeightChart points={weightPoints} />
          )}
        </Tile>

        <Tile className="gap-3">
          <h2 className="font-sans text-lg font-bold">Measurements</h2>
          <ul className="flex flex-col">
            {logs.map((l, i) => {
              const details = measurementsSummary(l.measurements);
              const right = [l.weightKg !== undefined ? `${fmt(l.weightKg)} kg` : null, l.bodyFatPercent !== undefined ? `${fmt(l.bodyFatPercent)}% fat` : null]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={l._id} className="flex gap-3 py-3 border-t border-line first:border-0">
                  <span className={cx("w-2 h-2 rounded-full mt-2 flex-none", i === 0 ? "bg-accent" : "bg-line")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-3">
                      <span className="font-semibold">{formatDate(l.date)}</span>
                      {right && <span className="text-sm text-muted whitespace-nowrap">{right}</span>}
                    </div>
                    {details && <p className="text-sm text-muted">{details}</p>}
                    {l.notes && <p className="text-sm mt-0.5">&ldquo;{l.notes}&rdquo;</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </Tile>
      </div>
    </>
  );
}
