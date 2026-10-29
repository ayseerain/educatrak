import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChartColumn } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { en } from "@/i18n/en";
import { format, type Centavos } from "@/lib/money";
import { formatShortDate } from "@/lib/dates";
import type { CollectionTrendPoint, DashboardRange } from "@/api/dashboardTypes";
import { dashboardRangeLabel } from "./dashboardRangeLabels";

interface CollectionTrendProps {
  points: CollectionTrendPoint[];
  range: DashboardRange;
}

// This is the single chart the specification permits in the entire
// application (section 9, Accounting dashboard). Do not add more.
export function CollectionTrend({ points, range }: CollectionTrendProps) {
  const data = points.map((p) => ({
    label: formatShortDate(p.date),
    total: p.totalCollected / 100,
  }));
  const hasCollections = data.some((point) => point.total > 0);
  const label =
    range === "today"
      ? en.dashboard.todaysTotals
      : en.dashboard.collectionTrendRange.replace("{range}", dashboardRangeLabel(range));
  const isJsdom = typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom");
  const chart = (
    <BarChart data={data} width={760} height={224} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid vertical={false} stroke="#E0E0E0" />
      <XAxis
        dataKey="label"
        tick={{ fontSize: 12, fill: "#757575" }}
        axisLine={{ stroke: "#E0E0E0" }}
        tickLine={false}
      />
      <YAxis
        tick={{ fontSize: 12, fill: "#757575" }}
        axisLine={false}
        tickLine={false}
        width={40}
      />
      <Tooltip
        formatter={(value: number) =>
          format((Math.round(value * 100)) as Centavos)
        }
        contentStyle={{
          borderRadius: 8,
          borderColor: "#E0E0E0",
          fontSize: 12,
        }}
      />
      <Bar
        dataKey="total"
        fill="#039935"
        radius={[4, 4, 0, 0]}
      />
    </BarChart>
  );

  return (
    <Card className="p-0">
      <CardHeader icon={<ChartColumn aria-hidden="true" />} title={label} />
      <div className="flex h-56 min-h-56 min-w-0 items-center px-5 pb-5">
        {!hasCollections ? (
          <EmptyState message={en.dashboard.noCollectionsInRange} />
        ) : isJsdom ? chart : <ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer>}
      </div>
    </Card>
  );
}
