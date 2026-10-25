import { request } from "@/api/cashierApi";
import { centavos } from "@/lib/money";
import type { AccountingDashboardSummary, AuditorDashboardSummary, CashierDashboardSummary, DashboardRange, DashboardSummary, RecentPayment, SuperAdministratorDashboardSummary } from "./dashboardTypes";

type ApiRecentPayment = Omit<RecentPayment, "amount"> & { amount: number };
type ApiCashierSummary = Omit<CashierDashboardSummary, "todayCollectionsTotal" | "rangeCollectionsTotal" | "accountsNeedingAttention" | "recentActivity"> & {
  todayCollectionsTotal: number;
  rangeCollectionsTotal: number;
  accountsNeedingAttention: (Omit<CashierDashboardSummary["accountsNeedingAttention"][number], "amountDue"> & { amountDue: number })[];
  recentActivity: ApiRecentPayment[];
};
type ApiAccountingSummary = Omit<AccountingDashboardSummary, "overdueTotal" | "collectionTrend" | "recentActivity"> & {
  overdueTotal: number;
  collectionTrend: (Omit<AccountingDashboardSummary["collectionTrend"][number], "totalCollected"> & { totalCollected: number })[];
  recentActivity: ApiRecentPayment[];
};
type ApiAuditorSummary = Omit<AuditorDashboardSummary, "todayCollectionsTotal" | "rangeCollectionsTotal"> & {
  todayCollectionsTotal: number;
  rangeCollectionsTotal: number;
};
type ApiAdministratorSummary = Omit<Extract<DashboardSummary, { role: "administrator" }>, "role"> & { role: "admin" };
type ApiSuperAdministratorSummary = Omit<SuperAdministratorDashboardSummary, "role"> & { role: "super_admin" };
type ApiDashboardSummary =
  | ApiCashierSummary
  | ApiAccountingSummary
  | ApiAuditorSummary
  | ApiAdministratorSummary
  | ApiSuperAdministratorSummary;

export async function fetchDashboardSummary(range: DashboardRange): Promise<DashboardSummary> {
  const response = await request<{ data: ApiDashboardSummary }>(
    `/dashboard?range=${encodeURIComponent(range)}`,
  );
  const summary = response.data;

  if (summary.role === "admin") {
    return { ...summary, role: "administrator" };
  }

  if (summary.role === "super_admin") return summary;

  if (summary.role === "cashier") {
    return {
      ...summary,
      todayCollectionsTotal: centavos(summary.todayCollectionsTotal),
      rangeCollectionsTotal: centavos(summary.rangeCollectionsTotal),
      accountsNeedingAttention: summary.accountsNeedingAttention.map((account) => ({
        ...account,
        amountDue: centavos(account.amountDue),
      })),
      recentActivity: summary.recentActivity.map((payment) => ({
        ...payment,
        amount: centavos(payment.amount),
      })),
    };
  }

  if (summary.role === "accounting") {
    return {
      ...summary,
      overdueTotal: centavos(summary.overdueTotal),
      collectionTrend: summary.collectionTrend.map((point) => ({
        ...point,
        totalCollected: centavos(point.totalCollected),
      })),
      recentActivity: summary.recentActivity.map((payment) => ({
        ...payment,
        amount: centavos(payment.amount),
      })),
    };
  }

  if (summary.role === "auditor") {
    return {
      ...summary,
      todayCollectionsTotal: centavos(summary.todayCollectionsTotal),
      rangeCollectionsTotal: centavos(summary.rangeCollectionsTotal),
    };
  }

  throw new Error("The server returned an unsupported dashboard role.");
}
