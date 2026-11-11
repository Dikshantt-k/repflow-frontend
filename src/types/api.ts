export type Role =
  | "super_admin"
  | "support"
  | "org_owner"
  | "franchise_owner"
  | "branch_manager"
  | "front_desk"
  | "trainer"
  | "accountant"
  | "member";

export interface AuthContext {
  userId: string;
  role: Role;
  orgId?: string;
  franchiseeId?: string;
  branchId?: string;
}

export interface ContextOption {
  role: Role;
  orgId?: string;
  orgName?: string;
  branchId?: string;
  branchName?: string;
  franchiseeId?: string;
  franchiseeName?: string;
}

export interface AuthUser {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  themePreference?: "light" | "dark";
  mustChangePassword?: boolean;
}

export type LoginIdentifierType = "member_code" | "email" | "phone";

export interface GstBreakdown {
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  totalPaise: number;
}

export interface Branch {
  _id: string;
  orgId: string;
  franchiseeId?: string;
  name: string;
  code: string;
  address?: string;
}

export type PlanLengthUnit = "month" | "day" | "session";
export type PlanStatus = "shown" | "hidden";

export interface Plan {
  _id: string;
  orgId: string;
  name: string;
  lengthValue: number;
  lengthUnit: PlanLengthUnit;
  validityDaysForSessions?: number;
  pricePaise: number;
  joiningFeePaise: number;
  allBranches: boolean;
  branchIds: string[];
  onlineRenewal: boolean;
  status: PlanStatus;
  gst: GstBreakdown;
}

export type Gender = "prefer_not_to_say" | "female" | "male" | "other";

export type MemberStatus = "active" | "expiring" | "expired" | "frozen" | "no_membership";

export interface MemberListRow {
  id: string;
  memberCode: string;
  firstName: string;
  lastName?: string;
  phone: string;
  branchId: string;
  branchName?: string;
  plan: { name: string; endDate: string } | null;
  status: MemberStatus;
  duesPaise?: number; // omitted for trainers — finance-visible-only info
}

export interface Member {
  _id: string;
  orgId: string;
  branchId: string;
  memberCode: string;
  firstName: string;
  lastName?: string;
  phone: string;
  gender?: Gender;
  dob?: string;
  emergencyContact?: { name?: string; phone?: string };
  healthNotes?: string;
  photoUrl?: string;
  email?: string;
  trainerUserId?: string;
  fingerprintEnrolled: boolean;
  status: MemberStatus;
  duesPaise?: number; // omitted for trainers — finance-visible-only info
  createdAt: string;
}

export type MembershipStatus = "active" | "expiring" | "expired" | "frozen" | "completed";

export interface Freeze {
  fromDate: string;
  days: number;
  reason: "travel" | "medical" | "exams" | "other";
  previousEndDate: string;
  newEndDate: string;
}

export interface Membership {
  _id: string;
  orgId: string;
  branchId: string;
  memberId: string;
  planId: string;
  planName: string;
  lengthValue: number;
  lengthUnit: PlanLengthUnit;
  pricePaise: number;
  joiningFeePaise: number;
  startDate: string;
  endDate: string;
  status: MembershipStatus;
  sessionsTotal?: number;
  sessionsUsed: number;
  freezes: Freeze[];
}

export type PaymentMode = "upi" | "cash" | "card";

export interface Payment {
  _id: string;
  orgId: string;
  branchId: string;
  memberId: string | { _id: string; firstName: string; lastName?: string; memberCode: string };
  membershipId?: string;
  receiptNo: string;
  description: string;
  totalPaise: number;
  discountPaise: number;
  amountPaidPaise: number;
  balancePaise: number;
  mode: PaymentMode;
  gstInvoice: boolean;
  gst: GstBreakdown;
  date: string;
}

export interface Dues {
  _id: string;
  orgId: string;
  branchId: string;
  memberId: string | { _id: string; firstName: string; lastName?: string; phone: string; memberCode: string };
  membershipId?: string;
  outstandingPaise: number;
  dueSince: string;
  lastReminder?: { date?: string; channel: "whatsapp" | "sms" | "none" };
  writtenOff: boolean;
}

export type AttendanceMethod = "manual" | "biometric";
export type AttendanceNote = "expired_allowed_once" | "dues_pending" | "personal_training" | "none";

export interface Attendance {
  _id: string;
  orgId: string;
  branchId: string;
  memberId: string | { _id: string; firstName: string; lastName?: string; memberCode: string };
  inTime: string;
  outTime?: string;
  method: AttendanceMethod;
  note: AttendanceNote;
}

export interface Note {
  _id: string;
  memberId: string;
  authorUserId: string;
  text: string;
  createdAt: string;
}

export interface DashboardSummary {
  kpis: {
    activeMembers: number;
    joinedThisMonth: number;
    collectedTodayPaise: number;
    collectedTodayCount: number;
    pendingDuesPaise: number;
    pendingDuesMembers: number;
    expiringIn7Days: number;
    potentialRenewalPaise: number;
  };
  expiringSoon: Array<{
    _id: string;
    memberId: { _id: string; firstName: string; lastName?: string; phone: string };
    planName: string;
    endDate: string;
  }>;
  pendingDuesList: Array<{
    _id: string;
    memberId: { _id: string; firstName: string; lastName?: string; phone: string };
    outstandingPaise: number;
    dueSince: string;
  }>;
  checkinsByHour: number[];
}

// ---- Super Admin ----

export type ChargeUnit = "branch" | "flat" | "member";
export type OrgStatus = "trial" | "active" | "grace" | "suspended";
export type BusinessType = "independent" | "franchise";

export interface PackageLimits {
  maxBranches?: number | null;
  membersPerBranch?: number | null;
  whatsappMessagesPerMonth?: number | null;
  staffLogins?: number | null;
}

export interface Package {
  _id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  isActive: boolean;
  monthlyPricePaise: number;
  yearlyPricePaise?: number;
  chargeUnit: ChargeUnit;
  trialDays: number;
  minBranches: number;
  limits: PackageLimits;
  modules: string[];
  version: number;
  assignedOrgId?: string;
  usedByGyms: number;
}

export interface AdminGymRow {
  id: string;
  name: string;
  city?: string;
  businessType: BusinessType;
  status: OrgStatus;
  trialEndsAt?: string;
  franchiseeCount: number;
  branchCount: number;
  packageName: string | null;
  payer: "franchisor" | "each_franchisee" | null;
  mrrPaise: number;
}

export interface AdminGymsKpis {
  clientGyms: number;
  branchesLive: number;
  onTrial: number;
  mrrPaise: number;
  overdue: number;
  overduePaise: number;
}

export interface Subscription {
  _id: string;
  orgId: string;
  packageId: string;
  packageVersion: number;
  scope: "whole_network" | "selected_franchisees";
  franchiseeIds: string[];
  payer: "franchisor" | "each_franchisee";
  discountPct: number;
  status: OrgStatus;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  billingCycle: "monthly" | "yearly";
}

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface WorkoutExercise {
  _id: string;
  name: string;
  sets?: number;
  reps?: string;
  notes?: string;
}

export interface WorkoutDay {
  weekday: Weekday;
  label?: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutPlan {
  _id: string;
  orgId: string;
  branchId: string;
  memberId: string;
  trainerUserId?: string;
  days: WorkoutDay[];
  createdAt: string;
  updatedAt: string;
}

// ---- Diet plans ----

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface FoodItem {
  name: string;
  quantity?: string;
  calories?: number;
}

export interface Meal {
  type: MealType;
  items: FoodItem[];
}

export interface DietDay {
  weekday: Weekday;
  meals: Meal[];
}

export interface DietPlan {
  _id: string;
  orgId: string;
  branchId: string;
  memberId: string;
  trainerUserId?: string;
  days: DietDay[];
  createdAt: string;
  updatedAt: string;
}

// ---- Personal training ----

export type PTPackageStatus = "active" | "completed" | "cancelled";

export interface PTSession {
  _id: string;
  date: string;
  trainerUserId: string;
  notes?: string;
}

export interface PTPackage {
  _id: string;
  orgId: string;
  branchId: string;
  memberId: string;
  trainerUserId?: string;
  name: string;
  totalSessions: number;
  pricePaise?: number;
  startDate: string;
  expiresAt?: string;
  status: PTPackageStatus;
  sessions: PTSession[];
  createdAt: string;
}

// ---- Fitness progress ----

export interface FitnessMeasurements {
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  armsCm?: number;
  thighsCm?: number;
}

export interface FitnessLog {
  _id: string;
  orgId: string;
  branchId: string;
  memberId: string;
  recordedByUserId: string;
  date: string;
  weightKg?: number;
  heightCm?: number;
  bodyFatPercent?: number;
  measurements?: FitnessMeasurements;
  photoUrls: string[];
  notes?: string;
  createdAt: string;
}

// ---- Expenses ----

export type ExpenseCategory =
  | "rent"
  | "electricity"
  | "maintenance"
  | "staff_salary"
  | "equipment"
  | "marketing"
  | "vendor"
  | "other";

export interface Expense {
  _id: string;
  orgId: string;
  branchId: string;
  category: ExpenseCategory;
  description: string;
  vendor?: string;
  amountPaise: number;
  date: string;
  createdByUserId: string;
  createdAt: string;
}

// ---- Leads & enquiries ----

export type LeadSource = "walk_in" | "referral" | "website" | "social_media" | "phone" | "other";
export type LeadStatus = "new" | "contacted" | "trial_scheduled" | "trial_completed" | "converted" | "lost";

export interface Lead {
  _id: string;
  orgId: string;
  branchId: string;
  name: string;
  phone: string;
  email?: string;
  source: LeadSource;
  status: LeadStatus;
  assignedToUserId?: string | { _id: string; name?: string; email: string };
  followUpDate?: string;
  notes?: string;
  lostReason?: string;
  createdAt: string;
}

// ---- Trainer dashboard ----

export interface TrainerPtPackageRow {
  _id: string;
  memberId: string;
  memberName: string;
  name: string;
  totalSessions: number;
  sessionsUsed: number;
}

// ---- Audit logs ----

export interface AuditLogRow {
  _id: string;
  orgId?: string | { _id: string; name: string };
  actorUserId: string | { _id: string; name?: string; email: string };
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface PlatformInvoice {
  _id: string;
  orgId: string;
  subscriptionId: string;
  periodStart: string;
  periodEnd: string;
  amountPaise: number;
  gstPaise: number;
  totalPaise: number;
  status: "pending" | "paid" | "failed";
  razorpayPaymentId?: string;
  createdAt: string;
}

export interface AdminGymDetail {
  org: {
    _id: string;
    name: string;
    city?: string;
    gstin?: string;
    businessType: BusinessType;
    status: OrgStatus;
    trialEndsAt?: string;
    logoUrl?: string;
    settings: {
      crossBranchCheckin: boolean;
      dataSharing: { franchisorSeesRevenue: boolean; franchisorSeesMemberLists: boolean; franchiseesSeeEachOther: boolean };
    };
  };
  owner: { name?: string; email: string } | null;
  memberCount: number;
  mrrPaise: number;
  subscription: Subscription | null;
  package: Package | null;
  network: {
    companyBranches: Array<{ id: string; name: string; memberCount: number }>;
    franchisees: Array<{
      id: string;
      name: string;
      status: string;
      branches: Array<{ id: string; name: string; memberCount: number }>;
    }>;
  };
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

// ---- Member self-service (the member mobile app) ----

export interface MeMemberSummary {
  member: Member & { status: MemberStatus; duesPaise: number };
  branch: { _id: string; name: string } | null;
  membership: Membership | null;
  visitsThisMonth: number;
}

// ---- Staff ----

export type InvitableRole = "branch_manager" | "front_desk" | "trainer" | "accountant";

export interface StaffRow {
  userId: string;
  name?: string;
  email: string;
  role: InvitableRole;
  branchId: string;
  accepted: boolean;
  ptRatePerSessionPaise?: number;
}

// ---- Franchisees ----

export interface FranchiseeRow {
  _id: string;
  orgId: string;
  name: string;
  status: "invited" | "active";
  owner: { name?: string; email: string } | null;
}

export interface NetworkBranch {
  id: string;
  name: string;
  memberCount: number;
}

export interface Network {
  companyBranches: NetworkBranch[];
  franchisees: Array<{ id: string; name: string; status: string; branches: NetworkBranch[] }>;
}
