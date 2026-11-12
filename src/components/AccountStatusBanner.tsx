"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/format";

/**
 * Trial / grace / suspended notice at the top of the app. The owner gets a link to Billing; staff are
 * told who can fix it. Hidden for platform roles and members.
 */
export function AccountStatusBanner() {
  const { context } = useAuth();
  const org = context?.org;
  if (!org || !context || context.role === "super_admin" || context.role === "support" || context.role === "member") return null;
  const isOwner = context.role === "org_owner";

  let tone: "info" | "warn" | null = null;
  let text = "";
  if (org.status === "trial" && org.trialEndsAt) {
    const daysLeft = Math.ceil((new Date(org.trialEndsAt).getTime() - Date.now()) / 86_400_000);
    if (isOwner && daysLeft <= 7) {
      tone = "info";
      text =
        daysLeft <= 0
          ? "Your free trial ends today."
          : `Your free trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"} (${formatDate(org.trialEndsAt)}).`;
    }
  } else if (org.status === "grace") {
    tone = "warn";
    const by = org.graceEndsAt ? ` by ${formatDate(org.graceEndsAt)}` : "";
    text = isOwner
      ? `Your Repflow payment is due. Pay${by} to keep your gym running without interruption.`
      : `This gym's Repflow payment is due${by}. Please let the owner know.`;
  } else if (org.status === "suspended") {
    tone = "warn";
    text = isOwner
      ? "Your account is paused for an unpaid Repflow invoice. Check-ins still work, but new members, renewals and payments are blocked until it's paid."
      : "This gym's account is paused for an unpaid Repflow invoice. You can still check members in, but new members, renewals and payments are blocked until the owner pays.";
  }
  if (!tone) return null;

  return (
    <div
      role="status"
      className={`flex flex-wrap items-center justify-between gap-3 rounded-[12px] px-4 py-3 text-sm ${
        tone === "warn" ? "bg-warn-soft text-warn-ink border border-warn-line" : "bg-blue-soft text-blue-ink"
      }`}
    >
      <span>{text}</span>
      {isOwner && (
        <Link href="/app/billing" className="font-semibold underline underline-offset-2">
          {org.status === "trial" ? "Choose a plan" : "Pay now"}
        </Link>
      )}
    </div>
  );
}
