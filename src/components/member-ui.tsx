"use client";

import type { ReactNode } from "react";
import { cx } from "@/components/ui";

/** Card used across the member app: rounded, borderless surface on the page background. */
export function Tile({ className, bg = "bg-surface", children }: { className?: string; bg?: string; children: ReactNode }) {
  return <section className={cx(bg, "rounded-[20px] p-5 flex flex-col", className)}>{children}</section>;
}

/** Small uppercase eyebrow + big bold title. */
export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="text-[12px] font-semibold tracking-[0.07em] uppercase text-muted">{eyebrow}</p>}
        <h1 className="font-sans text-[30px] sm:text-[34px] font-bold tracking-[-0.02em] leading-tight mt-0.5">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function TileLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-sm text-muted">{children}</span>
      {right}
    </div>
  );
}

export function BigValue({ children, unit, className }: { children: ReactNode; unit?: string; className?: string }) {
  return (
    <div className={cx("text-[34px] font-bold tracking-[-0.02em] leading-none", className)}>
      {children}
      {unit && <span className="text-base font-medium text-muted ml-1">{unit}</span>}
    </div>
  );
}

export function ProgressBar({ pct, className }: { pct: number; className?: string }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className={cx("h-2 rounded-full bg-line overflow-hidden", className)} role="progressbar" aria-valuenow={Math.round(clamped)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-accent" style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function EmptyTile({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Tile className="items-center text-center gap-2 py-12">
      <span className="w-14 h-14 rounded-[16px] bg-accent-soft text-accent-ink flex items-center justify-center mb-1">{icon}</span>
      <h2 className="font-sans text-lg font-bold">{title}</h2>
      <p className="text-sm text-muted max-w-[340px]">{children}</p>
    </Tile>
  );
}

/** Share of a membership still remaining (100 = just started, 0 = ended), for progress bars. */
export function membershipRemainingPct(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (end <= start) return 0;
  return Math.min(100, Math.max(0, 100 - ((new Date().getTime() - start) / (end - start)) * 100));
}

export function PageSpinner() {
  return <div className="flex justify-center py-16 animate-pulse text-muted text-sm">Loading…</div>;
}
