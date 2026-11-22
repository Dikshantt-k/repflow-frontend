"use client";

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

export function cx(...parts: Array<string | false | undefined | null>): string {
  return parts.filter(Boolean).join(" ");
}

// ---- Button ----

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "default";
}

export function Button({ variant = "default", className, ...props }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-[10px] font-semibold text-sm whitespace-nowrap transition active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
  const variants: Record<string, string> = {
    default: "border border-line bg-surface text-ink hover:border-muted",
    primary: "bg-accent border border-accent text-on-accent hover:bg-accent-hover",
    outline: "border border-link text-link hover:bg-accent-soft",
    ghost: "border border-transparent bg-transparent text-link hover:bg-accent-soft",
  };
  return <button className={cx(base, variants[variant], className)} {...props} />;
}

// ---- Card ----

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("bg-surface border border-line rounded-[14px] p-5 flex flex-col gap-3.5 shadow-[0_1px_2px_rgba(20,30,50,0.04)]", className)}>
      {children}
    </div>
  );
}

// ---- Badge ----

type BadgeTone = "green" | "orange" | "blue" | "gray" | "violet";

export function Badge({ tone = "gray", children }: { tone?: BadgeTone; children: ReactNode }) {
  const tones: Record<BadgeTone, string> = {
    green: "bg-green-soft text-green-ink",
    orange: "bg-warn-soft text-warn-ink",
    blue: "bg-blue-soft text-blue-ink",
    gray: "bg-gray-soft text-gray-ink",
    violet: "bg-violet-soft text-violet-ink",
  };
  return <span className={cx("inline-block px-2.5 py-1 rounded-xl text-[12.5px] font-semibold whitespace-nowrap", tones[tone])}>{children}</span>;
}

export function statusBadge(status: string): ReactNode {
  const map: Record<string, { tone: BadgeTone; label: string }> = {
    active: { tone: "green", label: "Active" },
    expiring: { tone: "orange", label: "Expiring" },
    expired: { tone: "gray", label: "Expired" },
    frozen: { tone: "blue", label: "Frozen" },
    completed: { tone: "gray", label: "Completed" },
    no_membership: { tone: "gray", label: "No plan" },
  };
  const entry = map[status] ?? { tone: "gray" as BadgeTone, label: status };
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}

// ---- KPI ----

export function Kpi({ label, value, sub, warn }: { label: string; value: ReactNode; sub?: string; warn?: boolean }) {
  return (
    <div className={cx("bg-surface border rounded-[14px] p-[18px] flex flex-col gap-1", warn ? "bg-warn-soft border-warn-line" : "border-line")}>
      <div className={cx("text-muted", warn && "text-warn-ink")}>{label}</div>
      <div className={cx("font-display text-[36px] font-bold leading-[1.05]", warn && "text-warn-ink")}>{value}</div>
      {sub && <div className={cx("text-[13px] text-muted", warn && "text-warn-ink")}>{sub}</div>}
    </div>
  );
}

// ---- Form fields ----

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cx(
        "min-h-[44px] px-3 rounded-[10px] border border-line bg-surface text-ink w-full outline-none focus:border-accent",
        className
      )}
      {...props}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cx(
        "min-h-[44px] px-3 rounded-[10px] border border-line bg-surface text-ink w-full outline-none focus:border-accent",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <label className="text-[13px] text-muted">{label}</label>
      {children}
      {hint && !error && <span className="text-xs text-muted">{hint}</span>}
      {error && <span className="text-[13px] font-semibold text-warn">{error}</span>}
    </div>
  );
}

// ---- Pills (filter toggle) ----

export function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "min-h-[44px] px-4 rounded-[22px] border font-semibold text-sm",
        active ? "bg-ink border-ink text-bg" : "border-line bg-surface text-ink"
      )}
    >
      {children}
    </button>
  );
}

// ---- Avatar ----

export function Avatar({ label, size = "md" }: { label: string; size?: "md" | "xl" }) {
  return (
    <span
      className={cx(
        "inline-flex items-center justify-center flex-none rounded-full bg-accent-soft text-accent-ink font-semibold",
        size === "xl" ? "w-18 h-18 text-2xl" : "w-10 h-10"
      )}
      style={size === "xl" ? { width: 72, height: 72 } : undefined}
    >
      {label}
    </span>
  );
}

// ---- Empty state ----

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="text-center text-muted py-8 px-3">{children}</div>;
}

// ---- Simple centered modal (dialog) ----

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4" style={{ background: "rgba(10,14,13,.55)" }} onClick={onClose}>
      <div
        className={cx("bg-surface text-ink rounded-2xl w-full p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto", wide ? "max-w-2xl" : "max-w-lg")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl">{title}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-ink text-2xl leading-none" aria-label="Close">
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---- Toast ----

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed left-1/2 bottom-6 -translate-x-1/2 bg-ink text-bg px-[18px] py-3 rounded-xl font-semibold max-w-[calc(100%-32px)] z-30 shadow-lg">
      {message}
    </div>
  );
}

export function Spinner() {
  return <div className="animate-pulse text-muted text-sm">Loading…</div>;
}
