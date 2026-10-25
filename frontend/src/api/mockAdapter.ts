import { centavos } from "@/lib/money";
import type { AuthenticatedUser } from "@/lib/types";
import {
  billingAccounts,
  CURRENT_MOCK_SCHOOL_YEAR,
  getStudentById,
  payments,
  students,
} from "@/api/mock";
import { getMockState, mockApiDelay } from "@/api/mock";
import type {
  DashboardRange,
  DashboardSummary,
  RecentPayment,
} from "./dashboardTypes";
import type { BackupRecord } from "./backupApi";

const DAY_MS = 24 * 60 * 60 * 1000;

function dateInputForManila(value: Date): string {
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

function startOfManilaDay(value: Date): number {
  const manilaOffsetMs = 8 * 60 * 60 * 1000;
  const manilaDate = new Date(value.getTime() + manilaOffsetMs);
  return Date.UTC(
    manilaDate.getUTCFullYear(),
    manilaDate.getUTCMonth(),
    manilaDate.getUTCDate(),
  ) - manilaOffsetMs;
}

function currentSchoolYearPayments(): RecentPayment[] {
  return payments
    .filter((payment) =>
      billingAccounts.some(
        (account) => account.id === payment.accountId && account.schoolYear === CURRENT_MOCK_SCHOOL_YEAR,
      ),
    )
    .map((payment): RecentPayment => ({
      id: payment.id,
      time: new Date(`${payment.paidOn}T12:00:00+08:00`).toISOString(),
      studentName: getStudentById(payment.studentId)?.name ?? "Unavailable student",
      receiptNo: payment.receiptNo,
      amount: payment.amount,
      method: "cash",
      status:
        payment.status === "Posted"
          ? "posted"
          : payment.status === "Void pending"
            ? "void_pending"
            : "voided",
    }))
    .sort((first, second) => Date.parse(second.time) - Date.parse(first.time));
}

function activityForRange(
  allPayments: RecentPayment[],
  range: DashboardRange,
  now: Date,
): RecentPayment[] {
  if (range === "school_year") return allPayments;

  const days = range === "today" ? 1 : range === "last_7_days" ? 7 : 30;
  const cutoff = startOfManilaDay(now) - (days - 1) * DAY_MS;
  return allPayments.filter((payment) => Date.parse(payment.time) >= cutoff);
}

function financialTotalsForActivity(paymentsInRange: RecentPayment[]) {
  const collected = paymentsInRange.filter((payment) => payment.status !== "voided");
  return {
    totalCollections: centavos(
      collected.reduce((total, payment) => total + payment.amount, 0),
    ),
    paymentCount: collected.length,
  };
}

function collectionTrendForActivity(paymentsInRange: RecentPayment[]) {
  const totalsByDate = new Map<string, number>();
  for (const payment of paymentsInRange) {
    if (payment.status === "voided") continue;
    const date = dateInputForManila(new Date(payment.time));
    totalsByDate.set(date, (totalsByDate.get(date) ?? 0) + payment.amount);
  }
  return [...totalsByDate.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([date, totalCollected]) => ({ date, totalCollected: centavos(totalCollected) }));
}

function accountStatusOverview() {
  const currentAccounts = billingAccounts.filter(
    (account) => account.schoolYear === CURRENT_MOCK_SCHOOL_YEAR,
  );
  return currentAccounts.reduce(
    (counts, account) => {
      if (account.balance === 0) counts.cleared += 1;
      else if (account.status === "Overdue") counts.overdue += 1;
      else if (account.status === "Due soon") counts.dueSoon += 1;
      else counts.current += 1;
      return counts;
    },
    { cleared: 0, current: 0, dueSoon: 0, overdue: 0 },
  );
}

function accountsNeedingAttention() {
  return billingAccounts
    .filter(
      (account) =>
        account.schoolYear === CURRENT_MOCK_SCHOOL_YEAR && account.balance > 0,
    )
    .sort((first, second) => second.balance - first.balance)
    .map((account) => ({
      id: account.id,
      studentName: getStudentById(account.studentId)?.name ?? "Unavailable student",
      amountDue: account.balance,
      severity: account.status === "Overdue" ? ("error" as const) : ("warning" as const),
    }));
}

function overdueBalance() {
  return centavos(
    billingAccounts
      .filter((account) => account.schoolYear === CURRENT_MOCK_SCHOOL_YEAR)
      .flatMap((account) => account.schedule)
      .filter((installment) => installment.status === "overdue")
      .reduce(
        (total, installment) => total + installment.amount - installment.paid,
        0,
      ),
  );
}

function latestBackup() {
  const backups = getMockState().backupRuns;
  return backups[backups.length - 1];
}

export async function listBackupRecords(): Promise<BackupRecord[]> {
  await mockApiDelay();
  return getMockState().backupRuns
    .slice()
    .sort((first, second) => second.occurredAt.localeCompare(first.occurredAt))
    .map((backup) => ({
      id: backup.id,
      result: backup.succeeded ? "succeeded" : "failed",
      sizeBytes: null,
      error: null,
      completedAt: backup.occurredAt,
    }));
}

/** Development-only dashboard projection over the same synthetic billing records as student and payment workspaces. */
export async function fetchDashboardSummary(
  user: AuthenticatedUser,
  range: DashboardRange = "last_7_days",
  now = new Date(),
): Promise<DashboardSummary> {
  await mockApiDelay();
  const allPayments = currentSchoolYearPayments();
  const recentActivity = activityForRange(allPayments, range, now);
  const rangeTotals = financialTotalsForActivity(recentActivity);
  const todayActivity = activityForRange(allPayments, "today", now);
  const todayTotals = financialTotalsForActivity(todayActivity);
  const activeStudents = students.filter((student) => student.studentStatus === "Active").length;

  switch (user.role) {
    case "cashier":
      return {
        role: "cashier",
        overallEnrolledStudents: activeStudents,
        todayCollectionsTotal: todayTotals.totalCollections,
        paymentsTodayCount: todayTotals.paymentCount,
        rangeCollectionsTotal: rangeTotals.totalCollections,
        paymentsInRangeCount: rangeTotals.paymentCount,
        failedEmailCount: getMockState().notificationAttempts.filter((attempt) => attempt.channel === "Email" && attempt.status === "Failed").length,
        closeoutDone: getMockState().closeouts.length > 0,
        accountStatusOverview: accountStatusOverview(),
        accountsNeedingAttention: accountsNeedingAttention(),
        recentActivity,
      };
    case "accounting":
      return {
        role: "accounting",
        overallEnrolledStudents: activeStudents,
        pendingVoidApprovals: payments.filter((payment) => payment.status === "Void pending").length,
        overdueTotal: overdueBalance(),
        unsignedCloseouts: getMockState().closeouts.length,
        collectionTrend: collectionTrendForActivity(recentActivity),
        recentActivity,
      };
    case "administrator":
      return {
        role: "administrator",
        lastBackupAt: latestBackup()?.occurredAt ?? null,
        lastBackupSucceeded: latestBackup()?.succeeded ?? null,
        activeUserCount: getMockState().staffUsers.filter((staff) => staff.active).length,
      };
    case "super_admin":
      return {
        role: "super_admin",
        lastBackupAt: latestBackup()?.occurredAt ?? null,
        lastBackupSucceeded: latestBackup()?.succeeded ?? null,
        activeUserCount: getMockState().staffUsers.filter((staff) => staff.active).length,
      };
    case "auditor":
      return {
        role: "auditor",
        overallEnrolledStudents: activeStudents,
        todayCollectionsTotal: todayTotals.totalCollections,
        paymentsTodayCount: todayTotals.paymentCount,
        rangeCollectionsTotal: rangeTotals.totalCollections,
        paymentsInRangeCount: rangeTotals.paymentCount,
      };
    case "registrar":
      return { role: "registrar" };
  }
}
