import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardLabel } from "@/components/ui/Card";
import { en } from "@/i18n/en";
import { format, type Centavos } from "@/lib/money";
import { formatDate } from "@/lib/dates";
import type { CollectionTrendPoint } from "@/api/dashboardTypes";

interface CollectionTrendProps {
  points: CollectionTrendPoint[];
}

// This is the single chart the specification permits in the entire
// application (section 9, Accounting dashboard). Do not add more.
export function CollectionTrend({ points }: CollectionTrendProps) {
  const data = points.map((p) => ({
    label: formatDate(p.date).replace(", 2026", ""),
    total: p.totalCollected / 100,
  }));

  return (
    <Card>
      <CardLabel>{en.dashboard.collectionTrend}</CardLabel>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
                borderRadius: 6,
                borderColor: "#E0E0E0",
                fontSize: 12,
              }}
            />
            <Bar dataKey="total" fill="#039935" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
