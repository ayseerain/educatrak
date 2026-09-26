import { Card, CardLabel, CardValue, CardHelperText } from "@/components/ui/Card";
import { Badge, type BadgeTone } from "@/components/ui/Badge";

interface DashboardStatCardProps {
  label: string;
  value: string;
  helperText?: string;
  badge?: { tone: BadgeTone; label: string };
}

export function DashboardStatCard({
  label,
  value,
  helperText,
  badge,
}: DashboardStatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <CardLabel>{label}</CardLabel>
        {badge && <Badge tone={badge.tone} label={badge.label} />}
      </div>
      <CardValue>{value}</CardValue>
      {helperText && <CardHelperText>{helperText}</CardHelperText>}
    </Card>
  );
}
