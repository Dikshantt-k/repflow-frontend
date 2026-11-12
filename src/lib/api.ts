import { tokenStore } from "./tokenStore";
import type {
  Attendance,
  AuthUser,
  Branch,
  ContextOption,
  LoginIdentifierType,
  Dues,
  Member,
  MemberListRow,
  Membership,
  Note,
  Pagination,
  Payment,
  Plan,
  Role,
  DashboardSummary,
  AdminGymRow,
  AdminGymsKpis,
  AdminGymDetail,
  PlatformInvoice,
  Package,
  ChargeUnit,
  PackageLimits,
  Subscription,
  MeMemberSummary,
  StaffRow,
  InvitableRole,
  FranchiseeRow,
  Network,
  WorkoutPlan,
  Weekday,
  PTPackage,
  FitnessLog,
  FitnessMeasurements,
  AuditLogRow,
  DietPlan,
  DietDay,
  Expense,
  ExpenseCategory,
  Lead,
  LeadSource,
  LeadStatus,
  TrainerPtPackageRow,
  OrgLocale,
  CountryOption,
  CountryCode,
  GatewayOrder,
  PaymentAccount,
  PaymentAccountTarget,
  PaymentAccountsOverview,
  SignupPackage,
  OnboardingState,
  OwnerBilling,
} from "@/types/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | number | undefined>;
}

let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    tokenStore.clear();
    return false;
  }
  const json = await res.json();
  tokenStore.setAccessToken(json.accessToken);
  return true;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${BASE_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, query } = opts;

  async function doFetch(): Promise<Response> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (auth) {
      const token = tokenStore.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  let res = await doFetch();

  if (res.status === 401 && auth && tokenStore.getRefreshToken()) {
    refreshPromise ??= doRefresh().finally(() => {
      refreshPromise = null;
    });
    const refreshed = await refreshPromise;
    if (refreshed) res = await doFetch();
  }

  const json = await res.json().catch(() => undefined);

  if (!res.ok) {
    const message = json?.error?.message ?? "Something went wrong. Try again.";
    throw new ApiError(message, res.status, json?.error?.details);
  }

  return json as T;
}

// ---- Auth ----

export const authApi = {
  register: (name: string, email: string, password: string) =>
    request<{ sessionToken: string }>("/auth/register", { method: "POST", body: { name, email, password }, auth: false }),

  login: (identifierType: LoginIdentifierType, identifier: string, password: string) =>
    request<
      | { status: "no_account"; sessionToken: string }
      | { status: "choose_context"; sessionToken: string; contexts: ContextOption[] }
      | { status: "ok"; user: AuthUser; accessToken: string; refreshToken: string }
    >("/auth/login", { method: "POST", body: { identifierType, identifier, password }, auth: false }),

  selectContext: (sessionToken: string, ctx: ContextOption) =>
    request<{ status: "ok"; user: AuthUser; accessToken: string; refreshToken: string }>("/auth/context", {
      method: "POST",
      body: { sessionToken, role: ctx.role, orgId: ctx.orgId, franchiseeId: ctx.franchiseeId, branchId: ctx.branchId },
      auth: false,
    }),

  me: () =>
    request<{
      user: AuthUser;
      context: {
        userId: string;
        role: Role;
        orgId?: string;
        branchId?: string;
        org?: { name: string; city?: string; businessType: string; status: string; logoUrl?: string; modules: string[]; locale?: OrgLocale } | null;
        branch?: { name: string; code: string } | null;
      };
    }>("/auth/me"),

  acceptInvite: (email: string, password: string) =>
    request<
      | { status: "choose_context"; sessionToken: string; contexts: ContextOption[] }
      | { status: "ok"; user: AuthUser; accessToken: string; refreshToken: string }
    >("/auth/accept-invite", { method: "POST", body: { email, password }, auth: false }),

  setPassword: (newPassword: string) => request<{ ok: true }>("/auth/set-password", { method: "POST", body: { newPassword } }),
};

// ---- Signup ----

export interface SignupPayload {
  sessionToken: string;
  gym: {
    name: string;
    city?: string;
    gstin?: string;
    businessType: "independent" | "franchise";
    /** Round 3: sets currency, tax, time zone and phone format. Defaults to India. */
    country?: CountryCode;
    timeZone?: string;
    taxId?: string;
  };
  branches: Array<{ name: string }>;
  plans: Array<{ name: string; lengthValue: number; lengthUnit: "month" | "day" | "session"; pricePaise: number; joiningFeePaise: number }>;
  /** Self-onboarding: the Repflow package to trial (the server picks the best fit if omitted). */
  packageId?: string;
  billingCycle?: "monthly" | "yearly";
  /** The owner's mobile, for setup and trial reminders on WhatsApp. */
  ownerPhone?: string;
}

export const signupApi = {
  countries: () => request<{ countries: CountryOption[] }>("/signup/countries", { auth: false }),
  packages: () => request<{ currency: string; packages: SignupPackage[] }>("/signup/packages", { auth: false }),
  complete: (payload: SignupPayload) =>
    request<{
      status: "ok";
      user: AuthUser;
      org: { id: string; name: string; packageName?: string | null };
      branches: Array<{ id: string; name: string; code: string }>;
      accessToken: string;
      refreshToken: string;
    }>("/signup/complete", { method: "POST", body: payload, auth: false }),
};

// ---- Branches ----

export const branchesApi = {
  list: () => request<{ branches: Branch[] }>("/branches"),
  create: (name: string, address?: string) => request<{ branch: Branch }>("/branches", { method: "POST", body: { name, address } }),
};

// ---- Plans ----

export interface PlanInput {
  name: string;
  lengthValue: number;
  lengthUnit: "month" | "day" | "session";
  validityDaysForSessions?: number;
  pricePaise: number;
  joiningFeePaise?: number;
  allBranches?: boolean;
  branchIds?: string[];
  onlineRenewal?: boolean;
  status?: "shown" | "hidden";
}

export const plansApi = {
  list: () => request<{ plans: Plan[] }>("/plans"),
  create: (input: PlanInput) => request<{ plan: Plan }>("/plans", { method: "POST", body: input }),
  update: (id: string, input: Partial<PlanInput>) => request<{ plan: Plan }>(`/plans/${id}`, { method: "PATCH", body: input }),
};

// ---- Members ----

export interface ListMembersParams {
  search?: string;
  status?: "all" | "active" | "expiring" | "expired" | "frozen";
  branchId?: string;
  mine?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateMemberInput {
  branchId: string;
  firstName: string;
  lastName?: string;
  phone: string;
  gender?: string;
  dob?: string;
  emergencyContact?: { name?: string; phone?: string };
  healthNotes?: string;
  email?: string;
  trainerUserId?: string;
  planId: string;
  startDate?: string;
  joiningFeeWaived?: boolean;
  discountPaise?: number;
  mode: "upi" | "cash" | "card";
  amountPaidPaise: number;
  gstInvoice?: boolean;
  sendWelcomeMessage?: boolean;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}

export interface RazorpayProofInput {
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
}

export interface ImportMembersResult {
  imported: number;
  failed: number;
  results: Array<{ row: number; status: "imported" | "failed"; memberCode?: string; error?: string }>;
}

export const membersApi = {
  list: (params: ListMembersParams = {}) =>
    request<{ members: MemberListRow[]; pagination: Pagination }>("/members", { query: params as Record<string, string | number | undefined> }),

  get: (id: string) =>
    request<{ member: Member; memberships: Membership[]; payments: Payment[]; notes: Note[]; trainer?: { _id: string; name?: string } | null }>(`/members/${id}`),

  create: (input: CreateMemberInput) =>
    request<{ member: Member; membershipId: string; receiptNo: string; balancePaise: number; appliedToDuesPaise: number; tempPassword?: string }>(
      "/members",
      { method: "POST", body: input }
    ),

  update: (id: string, input: Partial<CreateMemberInput>) => request<{ member: Member }>(`/members/${id}`, { method: "PATCH", body: input }),

  addNote: (id: string, text: string) => request<{ note: Note }>(`/members/${id}/notes`, { method: "POST", body: { text } }),

  freeze: (id: string, input: { fromDate: string; days: number; reason: "travel" | "medical" | "exams" | "other" }) =>
    request<{ membership: Membership }>(`/members/${id}/freeze`, { method: "POST", body: input }),

  renew: (
    id: string,
    input: {
      planId: string;
      startDate?: string;
      discountPaise?: number;
      mode: "upi" | "cash" | "card";
      amountPaidPaise: number;
      gstInvoice?: boolean;
    } & RazorpayProofInput
  ) =>
    request<{ membershipId: string; receiptNo: string; balancePaise: number; appliedToDuesPaise: number }>(`/members/${id}/renew`, {
      method: "POST",
      body: input,
    }),

  import: (input: { branchId: string; rows: Record<string, string>[] }) =>
    request<ImportMembersResult>("/members/import", { method: "POST", body: input }),

  getWorkout: (memberId: string) => request<{ plan: WorkoutPlan | null }>(`/members/${memberId}/workout`),

  saveWorkout: (
    memberId: string,
    input: { days: Array<{ weekday: Weekday; label?: string; exercises: Array<{ name: string; sets?: number; reps?: string; notes?: string }> }>; dietNotes?: string }
  ) => request<{ plan: WorkoutPlan }>(`/members/${memberId}/workout`, { method: "PUT", body: input }),

  listPt: (memberId: string) => request<{ packages: PTPackage[] }>(`/members/${memberId}/pt-packages`),

  createPt: (memberId: string, input: { name: string; totalSessions: number; pricePaise?: number; expiresAt?: string }) =>
    request<{ package: PTPackage }>(`/members/${memberId}/pt-packages`, { method: "POST", body: input }),

  logPtSession: (memberId: string, packageId: string, notes?: string) =>
    request<{ package: PTPackage }>(`/members/${memberId}/pt-packages/${packageId}/sessions`, { method: "POST", body: { notes } }),

  deletePtSession: (memberId: string, packageId: string, sessionId: string) =>
    request<{ package: PTPackage }>(`/members/${memberId}/pt-packages/${packageId}/sessions/${sessionId}`, { method: "DELETE" }),

  cancelPt: (memberId: string, packageId: string) =>
    request<{ package: PTPackage }>(`/members/${memberId}/pt-packages/${packageId}`, { method: "PATCH", body: { status: "cancelled" } }),

  listFitness: (memberId: string) => request<{ logs: FitnessLog[] }>(`/members/${memberId}/fitness`),

  addFitness: (
    memberId: string,
    input: { weightKg?: number; heightCm?: number; bodyFatPercent?: number; measurements?: FitnessMeasurements; notes?: string }
  ) => request<{ log: FitnessLog }>(`/members/${memberId}/fitness`, { method: "POST", body: input }),

  deleteFitness: (memberId: string, logId: string) =>
    request<{ ok: true }>(`/members/${memberId}/fitness/${logId}`, { method: "DELETE" }),

  getDiet: (memberId: string) => request<{ plan: DietPlan | null }>(`/members/${memberId}/diet`),

  saveDiet: (memberId: string, input: { days: DietDay[] }) =>
    request<{ plan: DietPlan }>(`/members/${memberId}/diet`, { method: "PUT", body: input }),
};

// ---- Attendance ----

export const attendanceApi = {
  lookup: (q: string) => request<{ members: Member[] }>("/attendance/lookup", { query: { q } }),

  checkin: (input: { memberId: string; branchId: string; method?: "manual" | "biometric"; allowOnceIfExpired?: boolean }) =>
    request<{ attendance: Attendance; status: string; duesPaise: number; planEndingSoon: boolean; duplicate?: boolean }>("/attendance/checkin", {
      method: "POST",
      body: input,
    }),

  checkout: (id: string) => request<{ attendance: Attendance }>(`/attendance/${id}/checkout`, { method: "POST" }),

  list: (params: { branchId?: string; date?: string } = {}) =>
    request<{ attendance: Attendance[]; kpis: { checkinsToday: number; inGymNow: number } }>("/attendance", { query: params }),
};

// ---- Payments ----

export const paymentsApi = {
  list: (params: { memberId?: string; page?: number; pageSize?: number } = {}) =>
    request<{ payments: Payment[]; pagination: Pagination }>("/payments", { query: params }),

  record: (
    input: { memberId: string; branchId?: string; description: string; amountPaidPaise: number; mode: "upi" | "cash" | "card"; gstInvoice?: boolean } & RazorpayProofInput
  ) => request<{ payment: Payment }>("/payments", { method: "POST", body: input }),

  receipt: (id: string) => request<{ payment: Payment; member: Member; org: { name: string; gstin?: string }; branch: { name: string; address?: string } }>(`/payments/${id}/receipt`),

  sendReceipt: (id: string) => request<{ ok: true }>(`/payments/${id}/send-receipt`, { method: "POST" }),

  /**
   * An online (UPI) order on the gym's own payment account. Pass the member (existing member) or
   * branch (new member) so the money goes to that gym's account.
   */
  createRazorpayOrder: (amountPaise: number, target: { memberId?: string; branchId?: string }) =>
    request<GatewayOrder>("/payments/razorpay/order", { method: "POST", body: { amountPaise, ...target } }),
};

// ---- Self-onboarding checklist and the owner's Repflow billing ----

export const onboardingApi = {
  get: () => request<OnboardingState>("/onboarding"),
  setDismissed: (dismissed: boolean) => request<OnboardingState>("/onboarding/dismiss", { method: "POST", body: { dismissed } }),
};

export const billingApi = {
  get: () => request<OwnerBilling>("/billing"),
  choosePackage: (packageId: string, billingCycle: "monthly" | "yearly") =>
    request<OwnerBilling>("/billing/package", { method: "POST", body: { packageId, billingCycle } }),
  startNow: () => request<OwnerBilling>("/billing/start-now", { method: "POST" }),
  invoiceOrder: (invoiceId: string) =>
    request<{ orderId: string; keyId: string; amountPaise: number; currency: string; provider: string }>(`/billing/invoices/${invoiceId}/order`, {
      method: "POST",
    }),
  payInvoice: (invoiceId: string, proof: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) =>
    request<{ invoice: { _id: string; status: string } }>(`/billing/invoices/${invoiceId}/pay`, { method: "POST", body: proof }),
};

// ---- Per-gym payment accounts ----

export const paymentAccountsApi = {
  list: () => request<PaymentAccountsOverview>("/payment-accounts"),
  connectMock: (target: PaymentAccountTarget & { displayName?: string }) =>
    request<{ account: PaymentAccount }>("/payment-accounts/mock", { method: "POST", body: target }),
  connectRazorpayKeys: (target: PaymentAccountTarget & { keyId: string; keySecret: string; displayName?: string }) =>
    request<{ account: PaymentAccount }>("/payment-accounts/razorpay-keys", { method: "POST", body: target }),
  razorpayConnectUrl: (target: PaymentAccountTarget) =>
    request<{ url: string }>("/payment-accounts/razorpay/connect-url", { method: "POST", body: target }),
  razorpayCallback: (code: string, state: string) =>
    request<{ account: PaymentAccount }>("/payment-accounts/razorpay/callback", { method: "POST", body: { code, state } }),
  disconnect: (id: string) => request<{ ok: true }>(`/payment-accounts/${id}`, { method: "DELETE" }),
};

/** The test gateway's "checkout": returns a signed proof for a mock order (no real money). */
export const mockGatewayApi = {
  pay: (orderId: string) =>
    request<{ razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }>("/payment-gateway/mock/pay", {
      method: "POST",
      body: { orderId },
    }),
};

// ---- Dues ----

export const duesApi = {
  list: () => request<{ dues: Dues[] }>("/dues"),
  remind: (id: string, channel: "whatsapp" | "sms" = "whatsapp") => request<{ dues: Dues }>(`/dues/${id}/remind`, { method: "POST", body: { channel } }),
  collect: (id: string, input: { amountPaise: number; mode: "upi" | "cash" | "card"; gstInvoice?: boolean } & RazorpayProofInput) =>
    request<{ payment: Payment; dues: Dues; appliedToOtherDuesPaise: number }>(`/dues/${id}/collect`, { method: "POST", body: input }),
  writeOff: (id: string) => request<{ dues: Dues }>(`/dues/${id}/write-off`, { method: "POST" }),
};

// ---- Dashboard ----

export const dashboardApi = {
  summary: () => request<DashboardSummary>("/dashboard/summary"),
};

// ---- Super Admin ----

export interface PackageInput {
  name: string;
  description?: string;
  isPublic?: boolean;
  isActive?: boolean;
  monthlyPricePaise: number;
  yearlyPricePaise?: number;
  chargeUnit: ChargeUnit;
  trialDays?: number;
  minBranches?: number;
  limits?: PackageLimits;
  modules?: string[];
}

export const adminApi = {
  listGyms: () => request<{ gyms: AdminGymRow[]; kpis: AdminGymsKpis }>("/admin/gyms"),

  getGym: (id: string) => request<AdminGymDetail>(`/admin/gyms/${id}`),

  assignPackage: (
    gymId: string,
    input: {
      packageId: string;
      scope?: "whole_network" | "selected_franchisees";
      franchiseeIds?: string[];
      payer?: "franchisor" | "each_franchisee";
      discountPct?: number;
      start?: "next_billing" | "immediate";
    }
  ) => request<{ subscription: Subscription }>(`/admin/gyms/${gymId}/assign-package`, { method: "POST", body: input }),

  listPackages: () => request<{ packages: Package[] }>("/admin/packages"),

  createPackage: (input: PackageInput) => request<{ package: Package }>("/admin/packages", { method: "POST", body: input }),

  updatePackage: (id: string, input: Partial<PackageInput>) =>
    request<{ package: Package; affectedGyms: number }>(`/admin/packages/${id}`, { method: "PATCH", body: input }),

  listInvoices: (gymId: string) => request<{ invoices: PlatformInvoice[] }>(`/admin/gyms/${gymId}/invoices`),

  markInvoicePaid: (invoiceId: string) => request<{ invoice: PlatformInvoice }>(`/admin/invoices/${invoiceId}/mark-paid`, { method: "POST" }),

  auditLogs: (params: { page?: number; pageSize?: number; action?: string; orgId?: string } = {}) =>
    request<{ logs: AuditLogRow[]; pagination: Pagination }>("/admin/audit-logs", { query: params }),
};

// ---- Audit logs (org-scoped) ----

export const auditLogsApi = {
  list: (params: { page?: number; pageSize?: number; action?: string } = {}) =>
    request<{ logs: AuditLogRow[]; pagination: Pagination }>("/audit-logs", { query: params }),
};

// ---- Member self-service (member mobile app) ----

export const memberAuthApi = {
  claim: (email: string, password: string) =>
    request<{ status: "ok"; user: AuthUser; accessToken: string; refreshToken: string }>("/member-auth/claim", {
      method: "POST",
      body: { email, password },
      auth: false,
    }),
};

export const meApi = {
  summary: () => request<MeMemberSummary>("/member/me"),
  attendance: (month?: string) => request<{ attendance: Attendance[]; count: number }>("/member/attendance", { query: { month } }),
  payments: () => request<{ payments: Payment[] }>("/member/payments"),
  plans: () => request<{ plans: Plan[]; onlinePayments?: boolean }>("/member/plans"),
  createRenewOrder: (planId: string) => request<GatewayOrder>("/member/renew/order", { method: "POST", body: { planId } }),
  renew: (input: { planId: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) =>
    request<{ membershipId: string; receiptNo: string; balancePaise: number }>("/member/renew", { method: "POST", body: input }),
  freezeRequest: (input: { fromDate: string; days: number; reason: "travel" | "medical" | "exams" | "other" }) =>
    request<{ membership: Membership }>("/member/freeze-request", { method: "POST", body: input }),
  workout: () => request<{ plan: WorkoutPlan | null; completedExerciseIds: string[] }>("/member/workout"),
  toggleExercise: (exerciseId: string) => request<{ completed: boolean }>("/member/workout/toggle", { method: "POST", body: { exerciseId } }),
  pt: () => request<{ packages: PTPackage[] }>("/member/pt-packages"),
  fitness: () => request<{ logs: FitnessLog[] }>("/member/fitness"),
  diet: () => request<{ plan: DietPlan | null }>("/member/diet"),
};

// ---- Staff ----

export const staffApi = {
  list: () => request<{ staff: StaffRow[] }>("/staff"),
  invite: (input: { name: string; email: string; role: InvitableRole; branchId: string }) =>
    request<StaffRow & { userId: string }>("/staff", { method: "POST", body: input }),
  remove: (userId: string, branchId: string, role: InvitableRole) =>
    request<{ ok: true }>(`/staff/${userId}`, { method: "DELETE", query: { branchId, role } }),
  updatePtRate: (userId: string, input: { branchId: string; role: InvitableRole; ptRatePerSessionPaise: number }) =>
    request<{ ok: true }>(`/staff/${userId}/pt-rate`, { method: "PATCH", body: input }),
};

// ---- Franchisees ----

export const franchiseesApi = {
  list: () => request<{ franchisees: FranchiseeRow[] }>("/franchisees"),
  network: () => request<Network>("/franchisees/network"),
  invite: (name: string, email: string) => request<{ franchisee: FranchiseeRow }>("/franchisees", { method: "POST", body: { name, email } }),
  remove: (id: string) => request<{ ok: true }>(`/franchisees/${id}`, { method: "DELETE" }),
};

// ---- Expenses ----

export const expensesApi = {
  list: (params: { branchId?: string; category?: ExpenseCategory; from?: string; to?: string; page?: number; pageSize?: number } = {}) =>
    request<{ expenses: Expense[]; pagination: Pagination; totalPaise: number }>("/expenses", { query: params }),

  create: (input: { branchId: string; category: ExpenseCategory; description: string; vendor?: string; amountPaise: number; date?: string }) =>
    request<{ expense: Expense }>("/expenses", { method: "POST", body: input }),

  remove: (id: string) => request<{ ok: true }>(`/expenses/${id}`, { method: "DELETE" }),
};

// ---- Leads & enquiries ----

export const leadsApi = {
  list: (params: { search?: string; status?: LeadStatus; branchId?: string; page?: number; pageSize?: number } = {}) =>
    request<{ leads: Lead[]; pagination: Pagination }>("/leads", { query: params }),

  create: (input: { branchId: string; name: string; phone: string; email?: string; source?: LeadSource; followUpDate?: string; notes?: string }) =>
    request<{ lead: Lead }>("/leads", { method: "POST", body: input }),

  update: (id: string, input: { status?: LeadStatus; assignedToUserId?: string; followUpDate?: string; notes?: string; lostReason?: string }) =>
    request<{ lead: Lead }>(`/leads/${id}`, { method: "PATCH", body: input }),

  remove: (id: string) => request<{ ok: true }>(`/leads/${id}`, { method: "DELETE" }),
};

// ---- Trainer dashboard ----

export const trainerApi = {
  ptPackages: () => request<{ packages: TrainerPtPackageRow[] }>("/trainer/pt-packages"),
};

export { tokenStore };

// ---- Round 3: gym country settings (owner) ----

export interface BranchLocaleRow {
  _id: string;
  name: string;
  code: string;
  timeZone: string;
  tax: OrgLocale["tax"];
  overrides: { timeZone: string | null; taxRatePct: number | null };
}

export const orgLocaleApi = {
  get: () => request<{ locale: OrgLocale; branches: BranchLocaleRow[]; countries: CountryOption[] }>("/org/locale"),
  update: (input: { country?: CountryCode; timeZone?: string; taxName?: string; taxRatePct?: number; taxId?: string; taxInclusive?: boolean }) =>
    request<{ locale: OrgLocale }>("/org/locale", { method: "PATCH", body: input }),
  updateBranch: (id: string, input: { timeZone?: string | null; taxRatePct?: number | null }) =>
    request<{ branch: { _id: string; name: string; timeZone: string; tax: OrgLocale["tax"] } }>(`/org/locale/branches/${id}`, {
      method: "PATCH",
      body: input,
    }),
};

