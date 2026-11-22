"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onboardingApi } from "@/lib/api";
import { Button, Card } from "@/components/ui";
import type { OnboardingState } from "@/types/api";

/**
 * "Get started" checklist for a gym owner, worked out by the server from what the gym has actually
 * set up. Hidden once every required step is done, or when the owner hides it.
 */
export function OnboardingChecklist() {
  const [state, setState] = useState<OnboardingState | null>(null);

  useEffect(() => {
    onboardingApi.get().then(setState).catch(() => setState(null));
  }, []);

  if (!state || state.dismissed || state.progress.complete) return null;

  const { done, total } = state.progress;
  const pct = Math.round((done / total) * 100);
  const next = state.steps.find((s) => !s.done);

  return (
    <Card className="gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2>Get your gym set up</h2>
          <p className="text-sm text-muted">
            {done} of {total} done
            {state.trialDaysLeft !== null && state.trialDaysLeft >= 0
              ? ` · ${state.trialDaysLeft === 0 ? "last day of your free trial" : `${state.trialDaysLeft} day${state.trialDaysLeft === 1 ? "" : "s"} of free trial left`}`
              : ""}
          </p>
        </div>
        <Button variant="ghost" onClick={() => onboardingApi.setDismissed(true).then(setState).catch(() => undefined)}>
          Hide
        </Button>
      </div>

      <div className="h-2 rounded-full bg-line2 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ol className="flex flex-col">
        {state.steps.map((s) => (
          <li key={s.key} className="flex items-start gap-3 py-2.5 border-t border-line2 first:border-0">
            <span
              aria-hidden
              className={`mt-0.5 w-6 h-6 flex-none rounded-full flex items-center justify-center text-xs font-bold ${
                s.done ? "bg-accent text-on-accent" : "border border-line text-muted"
              }`}
            >
              {s.done ? "✓" : ""}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold ${s.done ? "text-muted line-through" : ""}`}>
                {s.label}
                {s.optional && !s.done && <span className="ml-2 text-xs font-normal text-muted">optional</span>}
              </p>
              {!s.done && <p className="text-sm text-muted">{s.hint}</p>}
            </div>
            {!s.done && (
              <Link
                href={s.href}
                className={`flex-none text-sm font-semibold min-h-[36px] inline-flex items-center px-3 rounded-[10px] ${
                  s.key === next?.key ? "bg-accent text-on-accent" : "text-link"
                }`}
              >
                {s.key === next?.key ? "Start" : "Open"}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}
