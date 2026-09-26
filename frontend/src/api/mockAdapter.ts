import { centavos } from "@/lib/money";
import type { AuthenticatedUser } from "@/lib/types";
import type {
  DashboardRange,
  DashboardSummary,
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

function makeRecentActivity(): RecentPayment[] {
  const methods: RecentPayment["method"][] = [
    "cash",
    "gcash",
    "bank_transfer",
    "check",
  ];
  const statuses: RecentPayment["status"][] = ["posted", "posted", "pending", "voided"];
  const now = Date.now();

  return RECENT_ACTIVITY_AGE_DAYS.map((daysAgo, i) => ({
    id: `mock-payment-${i}`,
    time: new Date(
      now - daysAgo * 24 * 60 * 60 * 1000 - (daysAgo === 0 ? 0 : i * 17 * 60 * 1000),
    ).toISOString(),
    studentName: FAKE_STUDENT_NAMES[i % FAKE_STUDENT_NAMES.length]!,
    receiptNo: `OR-2026-${String(1000 + i)}`,
    amount: centavos((1500 + i * 350) * 100),
    method: methods[i % methods.length]!,
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

  switch (user.role) {
    case "cashier":
      return {
        role: "cashier",
        overallEnrolledStudents: 60,
        todayCollectionsTotal: centavos(4685000),
        paymentsTodayCount: 12,
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
        collectionTrend: [
          { date: "2026-09-20", totalCollected: centavos(3120000) },
          { date: "2026-09-21", totalCollected: centavos(4085000) },
          { date: "2026-09-22", totalCollected: centavos(2890000) },
          { date: "2026-09-23", totalCollected: centavos(5010000) },
          { date: "2026-09-24", totalCollected: centavos(3760000) },
          { date: "2026-09-25", totalCollected: centavos(4420000) },
          { date: "2026-09-26", totalCollected: centavos(4685000) },
        ].slice(range === "today" ? -1 : range === "last_30_days" || range === "school_year" ? undefined : -7),
        recentActivity,
      };
    case "administrator":
      return {
        role: "administrator",
        overallEnrolledStudents: 60,
        lastBackupAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        lastBackupSucceeded: true,
        activeUserCount: 14,
        failedEmailCount: 2,
      };
    case "auditor":
      return {
        role: "auditor",
        overallEnrolledStudents: 60,
        todayCollectionsTotal: centavos(4685000),
        paymentsTodayCount: 12,
        recentActivity,
      };
    case "registrar":
      return { role: "registrar" };
  }
}
