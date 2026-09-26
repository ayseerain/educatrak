import { centavos } from "@/lib/money";
import type { AuthenticatedUser } from "@/lib/types";
import type {
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

function makeRecentActivity(count: number): RecentPayment[] {
  const methods: RecentPayment["method"][] = [
    "cash",
    "gcash",
    "bank_transfer",
    "check",
  ];
  const statuses: RecentPayment["status"][] = ["posted", "posted", "pending", "voided"];
  const now = Date.now();

  return Array.from({ length: count }, (_, i) => ({
    id: `mock-payment-${i}`,
    time: new Date(now - i * 25 * 60 * 1000).toISOString(),
    studentName: FAKE_STUDENT_NAMES[i % FAKE_STUDENT_NAMES.length]!,
    receiptNo: `OR-2026-${String(1000 + i)}`,
    amount: centavos((1500 + i * 350) * 100),
    method: methods[i % methods.length]!,
    status: statuses[i % statuses.length]!,
  }));
}

/**
 * Simulates GET /dashboard. Returns a role-specific summary, matching the
 * shape the real API layer is expected to return once implemented.
 */
export async function fetchDashboardSummary(
  user: AuthenticatedUser,
): Promise<DashboardSummary> {
  // Simulate network latency for realistic loading states.
  await new Promise((resolve) => setTimeout(resolve, 350));

  switch (user.role) {
    case "cashier":
      return {
        role: "cashier",
        todayCollectionsTotal: centavos(4685000),
        paymentsTodayCount: 12,
        dueSoonCount: 6,
        failedEmailCount: 2,
        closeoutDone: false,
        recentActivity: makeRecentActivity(5),
      };
    case "accounting":
      return {
        role: "accounting",
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
        ],
        recentActivity: makeRecentActivity(4),
      };
    case "administrator":
      return {
        role: "administrator",
        lastBackupAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        lastBackupSucceeded: true,
        activeUserCount: 14,
        failedEmailCount: 2,
      };
    case "auditor":
      return {
        role: "auditor",
        todayCollectionsTotal: centavos(4685000),
        paymentsTodayCount: 12,
        recentActivity: makeRecentActivity(4),
      };
    case "registrar":
      return { role: "registrar" };
  }
}
