import { tokenStore } from "./tokenStore";
import type {
  Attendance,
  AuthUser,
  Branch,
  ContextOption,
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

  login: (email: string, password: string) =>
    request<
      | { status: "no_account"; sessionToken: string }
      | { status: "choose_context"; sessionToken: string; contexts: ContextOption[] }
      | { status: "ok"; user: AuthUser; accessToken: string; refreshToken: string }
    >("/auth/login", { method: "POST", body: { email, password }, auth: false }),

  selectContext: (sessionToken: string, ctx: ContextOption) =>
    request<{ status: "ok"; user: AuthUser; accessToken: string; refreshToken: string }>("/auth/context", {
      method: "POST",
      body: { sessionToken, role: ctx.role, orgId: ctx.orgId, franchiseeId: ctx.franchiseeId, branchId: ctx.branchId },
      auth: false,
    }),

  me: () => request<{ user: AuthUser; context: { userId: string; role: Role; orgId?: string; branchId?: string; org?: { name: string; city?: string; businessType: string; status: string; logoUrl?: string } | null; branch?: { name: string; code: string } | null } }>("/auth/me"),

  acceptInvite: (email: string, password: string) =>
    request<
      | { status: "choose_context"; sessionToken: string; contexts: ContextOption[] }
      | { status: "ok"; user: AuthUser; accessToken: string; refreshToken: string }
    >("/auth/accept-invite", { method: "POST", body: { email, password }, auth: false }),
};

// ---- Signup ----

export interface SignupPayload {
  sessionToken: string;
  gym: { name: string; city?: string; gstin?: string; businessType: "independent" | "franchise" };
  branches: Array<{ name: string }>;
  plans: Array<{ name: string; lengthValue: number; lengthUnit: "month" | "day" | "session"; pricePaise: number; joiningFeePaise: number }>;
}

export const signupApi = {
  complete: (payload: SignupPayload) =>
    request<{
      status: "ok";
      user: AuthUser;
      org: { id: string; name: string };
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
}

export interface ImportMembersResult {
  imported: number;
  failed: number;
  results: Array<{ row: number; status: "imported" | "failed"; memberCode?: string; error?: string }>;
}

export const membersApi = {
  list: (params: ListMembersParams = {}) =>
    request<{ members: MemberListRow[]; pagination: Pagination }>("/members", { query: params as Record<string, string | number | undefined> }),

  get: (id: string) => request<{ member: Member; memberships: Membership[]; payments: Payment[]; notes: Note[] }>(`/members/${id}`),

  create: (input: CreateMemberInput) =>
    request<{ member: Member; membershipId: string; receiptNo: string; balancePaise: number }>("/members", { method: "POST", body: input }),

  update: (id: string, input: Partial<CreateMemberInput>) => request<{ member: Member }>(`/members/${id}`, { method: "PATCH", body: input }),

  addNote: (id: string, text: string) => request<{ note: Note }>(`/members/${id}/notes`, { method: "POST", body: { text } }),

  freeze: (id: string, input: { fromDate: string; days: number; reason: "travel" | "medical" | "exams" | "other" }) =>
    request<{ membership: Membership }>(`/members/${id}/freeze`, { method: "POST", body: input }),

  renew: (
    id: string,
    input: { planId: string; startDate?: string; discountPaise?: number; mode: "upi" | "cash" | "card"; amountPaidPaise: number; gstInvoice?: boolean }
  ) => request<{ membershipId: string; receiptNo: string; balancePaise: number }>(`/members/${id}/renew`, { method: "POST", body: input }),

  import: (input: { branchId: string; rows: Record<string, string>[] }) =>
    request<ImportMembersResult>("/members/import", { method: "POST", body: input }),

  getWorkout: (memberId: string) => request<{ plan: WorkoutPlan | null }>(`/members/${memberId}/workout`),

  saveWorkout: (
    memberId: string,
    input: { days: Array<{ weekday: Weekday; label?: string; exercises: Array<{ name: string; sets?: number; reps?: string; notes?: string }> }>; dietNotes?: string }
  ) => request<{ plan: WorkoutPlan }>(`/members/${memberId}/workout`, { method: "PUT", body: input }),
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

  record: (input: { memberId: string; branchId?: string; description: string; amountPaidPaise: number; mode: "upi" | "cash" | "card"; gstInvoice?: boolean }) =>
    request<{ payment: Payment }>("/payments", { method: "POST", body: input }),

  receipt: (id: string) => request<{ payment: Payment; member: Member; org: { name: string; gstin?: string }; branch: { name: string; address?: string } }>(`/payments/${id}/receipt`),

  sendReceipt: (id: string) => request<{ ok: true }>(`/payments/${id}/send-receipt`, { method: "POST" }),
};

// ---- Dues ----

export const duesApi = {
  list: () => request<{ dues: Dues[] }>("/dues"),
  remind: (id: string, channel: "whatsapp" | "sms" = "whatsapp") => request<{ dues: Dues }>(`/dues/${id}/remind`, { method: "POST", body: { channel } }),
  collect: (id: string, input: { amountPaise: number; mode: "upi" | "cash" | "card"; gstInvoice?: boolean }) =>
    request<{ payment: Payment; dues: Dues }>(`/dues/${id}/collect`, { method: "POST", body: input }),
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
  plans: () => request<{ plans: Plan[] }>("/member/plans"),
  renew: (planId: string) => request<{ membershipId: string; receiptNo: string; balancePaise: number }>("/member/renew", { method: "POST", body: { planId } }),
  freezeRequest: (input: { fromDate: string; days: number; reason: "travel" | "medical" | "exams" | "other" }) =>
    request<{ membership: Membership }>("/member/freeze-request", { method: "POST", body: input }),
  workout: () => request<{ plan: WorkoutPlan | null; completedExerciseIds: string[] }>("/member/workout"),
  toggleExercise: (exerciseId: string) => request<{ completed: boolean }>("/member/workout/toggle", { method: "POST", body: { exerciseId } }),
};

// ---- Staff ----

export const staffApi = {
  list: () => request<{ staff: StaffRow[] }>("/staff"),
  invite: (input: { name: string; email: string; role: InvitableRole; branchId: string }) =>
    request<StaffRow & { userId: string }>("/staff", { method: "POST", body: input }),
  remove: (userId: string, branchId: string, role: InvitableRole) =>
    request<{ ok: true }>(`/staff/${userId}`, { method: "DELETE", query: { branchId, role } }),
};

// ---- Franchisees ----

export const franchiseesApi = {
  list: () => request<{ franchisees: FranchiseeRow[] }>("/franchisees"),
  network: () => request<Network>("/franchisees/network"),
  invite: (name: string, email: string) => request<{ franchisee: FranchiseeRow }>("/franchisees", { method: "POST", body: { name, email } }),
  remove: (id: string) => request<{ ok: true }>(`/franchisees/${id}`, { method: "DELETE" }),
};

export { tokenStore };
