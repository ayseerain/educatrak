import { DashboardStatCard } from "./DashboardStatCard";
import { ArrowRight, Banknote, ReceiptText, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { en } from "@/i18n/en";
import { format } from "@/lib/money";
import type { AuditorDashboardSummary, DashboardRange } from "@/api/dashboardTypes";
import { financialStatLabelsForRange } from "./dashboardRangeLabels";

interface AuditorDashboardProps {
  summary: AuditorDashboardSummary;
  range: DashboardRange;
}

export function AuditorDashboard({ summary, range }: AuditorDashboardProps) {
  const statLabels = financialStatLabelsForRange(range);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-3">
        <DashboardStatCard
          label={en.dashboard.overallEnrolledStudents}
          value={String(summary.overallEnrolledStudents)}
          icon={Users}
        />
        <DashboardStatCard
          label={statLabels.collections}
          value={format(range === "today" ? summary.todayCollectionsTotal : summary.rangeCollectionsTotal)}
          icon={Banknote}
        />
        <DashboardStatCard
          label={statLabels.payments}
          value={String(range === "today" ? summary.paymentsTodayCount : summary.paymentsInRangeCount)}
          icon={ReceiptText}
        />
      </div>

      <div className="flex justify-end">
        <Link
          to="/admin/audit-log"
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-brand-green-light/60 bg-white px-3 text-sm font-semibold text-brand-green-dark transition-colors hover:bg-[#EAF6EC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-dark"
        >
          <ShieldCheck aria-hidden="true" className="h-4 w-4" />
          {en.dashboard.openAuditReview}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>

    </div>
  );
}
