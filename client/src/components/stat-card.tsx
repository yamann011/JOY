import { Card } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatCard({ title, value, icon: Icon, trend }: StatCardProps) {
  return (
    <Card className="p-4 border-t-2 border-t-primary hover-elevate transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-sm text-muted-foreground">{title}</span>
          <span className="text-2xl font-bold mt-1" data-testid={`stat-value-${title.toLowerCase().replace(/\s+/g, "-")}`}>
            {value}
          </span>
          {trend && (
            <span
              className={`text-xs mt-1 ${
                trend.isPositive ? "text-green-500" : "text-red-500"
              }`}
            >
              {trend.isPositive ? "+" : "-"}{Math.abs(trend.value)}%
            </span>
          )}
        </div>
        <div className="p-3 rounded-lg bg-primary/10">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </Card>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="p-4 border-t-2 border-t-muted">
      <div className="flex items-start justify-between">
        <div className="flex flex-col space-y-2">
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          <div className="h-8 w-16 bg-muted rounded animate-pulse" />
        </div>
        <div className="w-12 h-12 bg-muted rounded-lg animate-pulse" />
      </div>
    </Card>
  );
}
