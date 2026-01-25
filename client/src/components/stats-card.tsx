import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  testId?: string;
}

export function StatsCard({ 
  title, 
  value, 
  change, 
  changeLabel = "vs last week",
  icon,
  testId
}: StatsCardProps) {
  const getTrendIcon = () => {
    if (!change) return <Minus className="w-3 h-3" />;
    if (change > 0) return <TrendingUp className="w-3 h-3" />;
    return <TrendingDown className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (!change) return "text-muted-foreground";
    if (change > 0) return "text-green-600 dark:text-green-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Card data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold" data-testid={`${testId}-value`}>{value}</p>
            {typeof change === 'number' && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${getTrendColor()}`}>
                {getTrendIcon()}
                <span>{change > 0 ? '+' : ''}{change}% {changeLabel}</span>
              </div>
            )}
          </div>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
