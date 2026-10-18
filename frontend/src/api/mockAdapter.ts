import { centavos } from "@/lib/money";
import type { AuthenticatedUser } from "@/lib/types";
import type {
  DashboardRange,
  DashboardSummary,
  RecordPaymentInput,
  RecentPayment,
} from "./dashboardTypes";

// All names below are obviously fake placeholder data (spec section 13).
// Never replace these with real student records.
const FAKE_STUDENT_NAMES = [
  "Juan Dela Cruz (sample)",
  "Maria Santos (sample)",
  "Pedro Reyes (sample)",
  "Ana Bautista (sample)",
  "Jose Ramirez (sample)",
];

const RECENT_ACTIVITY_AGE_DAYS = [0, 0, 1, 3, 6, 8, 14, 22, 29, 45, 90, 180, 300];
let nextMockReceiptNumber = 2000;

function makeRecentActivity(): RecentPayment[] {
  const statuses: RecentPayment["status"][] = ["posted", "posted", "void_pending", "voided"];
  const now = Date.now();

  return RECENT_ACTIVITY_AGE_DAYS.map((daysAgo, i) => ({
    id: `mock-payment-${i}`,
    time: new Date(
      now - daysAgo * 24 * 60 * 60 * 1000 - (daysAgo === 0 ? 0 : i * 17 * 60 * 1000),
    ).toISOString(),
    studentName: FAKE_STUDENT_NAMES[i % FAKE_STUDENT_NAMES.length]!,
    receiptNo: `OR-2026-${String(1000 + i)}`,
    amount: centavos((1500 + i * 350) * 100),
    method: "cash",
    status: statuses[i % statuses.length]!,
  }));
}

function activityForRange(
  payments: RecentPayment[],
  range: DashboardRange,
): RecentPayment[] {
  const days = {
    today: 1,
    last_7_days: 7,
    last_30_days: 30,
    school_year: null,
  }[range];

  if (days === null) return payments;

  const now = new Date();
  const cutoff =
    range === "today"
      ? startOfManilaDay(now)
      : now.getTime() - days * 24 * 60 * 60 * 1000;
  return payments.filter((payment) => Date.parse(payment.time) >= cutoff);
}

function financialTotalsForActivity(payments: RecentPayment[]): {
  totalCollections: ReturnType<typeof centavos>;
  paymentCount: number;
} {
  return {
    totalCollections: centavos(
      payments.reduce((total, payment) => total + payment.amount, 0),
    ),
    paymentCount: payments.length,
  };
}

/**
 * Builds chart data from the same range-filtered activity that feeds the
 * dashboard. This prevents the trend from falling back to a fixed "today"
 * series when the selected range changes.
 */
function collectionTrendForActivity(
  payments: RecentPayment[],
): { date: string; totalCollected: ReturnType<typeof centavos> }[] {
  const totalsByDate = new Map<string, number>();

  for (const payment of payments) {
    const date = dateInputForManila(new Date(payment.time));
    totalsByDate.set(date, (totalsByDate.get(date) ?? 0) + payment.amount);
  }

  return [...totalsByDate.entries()]
    .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
    .map(([date, totalCollected]) => ({
      date,
      totalCollected: centavos(totalCollected),
    }));
}

function startOfManilaDay(value: Date): number {
  const manilaOffsetMs = 8 * 60 * 60 * 1000;
  const manilaDate = new Date(value.getTime() + manilaOffsetMs);
  return (
    Date.UTC(
      manilaDate.getUTCFullYear(),
      manilaDate.getUTCMonth(),
      manilaDate.getUTCDate(),
    ) - manilaOffsetMs
  );
}

function dateInputForManila(value = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

function paymentDateToIso(paymentDate: string): string {
  const todayInManila = dateInputForManila();

  if (paymentDate === todayInManila) {
    return new Date().toISOString();
  }

  return new Date(`${paymentDate}T12:00:00+08:00`).toISOString();
}

/**
 * Simulates POST /payments. The mock adapter assigns the receipt number so the
 * UI does not invent or edit receipt numbers directly.
 */
export async function recordMockPayment(
  input: RecordPaymentInput,
): Promise<RecentPayment> {
  await new Promise((resolve) => setTimeout(resolve, 200));

  const receiptNo = `OR-2026-${String(nextMockReceiptNumber).padStart(6, "0")}`;
  nextMockReceiptNumber += 1;

  return {
    id: `mock-recorded-payment-${receiptNo}`,
    time: paymentDateToIso(input.paymentDate),
    studentName: input.studentName,
    receiptNo,
    amount: input.amount,
    method: input.method,
    status: "posted",
  };
}

/**
 * Simulates GET /dashboard. Returns a role-specific summary, matching the
 * shape the real API layer is expected to return once implemented.
 */
export async function fetchDashboardSummary(
  user: AuthenticatedUser,
  range: DashboardRange = "last_7_days",
): Promise<DashboardSummary> {
  // Simulate network latency for realistic loading states.
  await new Promise((resolve) => setTimeout(resolve, 350));
  const recentActivity = activityForRange(makeRecentActivity(), range);
  const financialTotals = financialTotalsForActivity(recentActivity);

  switch (user.role) {
    case "cashier":
      return {
        role: "cashier",
        overallEnrolledStudents: 60,
        todayCollectionsTotal: financialTotals.totalCollections,
        paymentsTodayCount: financialTotals.paymentCount,
        failedEmailCount: 2,
        closeoutDone: false,
        accountStatusOverview: {
          cleared: 28,
          current: 21,
          dueSoon: 6,
          overdue: 5,
        },
        accountsNeedingAttention: [
          {
            id: "attention-1",
            studentName: "Carlo Reyes (sample)",
            amountDue: centavos(2100000),
            severity: "warning",
          },
          {
            id: "attention-2",
            studentName: "Luis Torres (sample)",
            amountDue: centavos(2100000),
            severity: "error",
          },
        ],
        recentActivity,
      };
    case "accounting":
      return {
        role: "accounting",
        overallEnrolledStudents: 60,
        pendingVoidApprovals: 3,
        overdueTotal: centavos(18240000),
        unsignedCloseouts: 2,
        collectionTrend: collectionTrendForActivity(recentActivity),
        recentActivity,
      };
    case "administrator":
      return {
        role: "administrator",
        lastBackupAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        lastBackupSucceeded: true,
        activeUserCount: 14,
        failedLoginCount: 2,
      };
    case "auditor":
      return {
        role: "auditor",
        overallEnrolledStudents: 60,
        todayCollectionsTotal: financialTotals.totalCollections,
        paymentsTodayCount: financialTotals.paymentCount,
        recentActivity,
      };
    case "registrar":
      return { role: "registrar" };
  }
}
