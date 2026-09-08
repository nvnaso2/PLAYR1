import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, GripVertical } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  testId?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragging?: boolean;
  compact?: boolean;
}

export function StatsCard({ 
  title, 
  value, 
  change, 
  changeLabel = "vs last week",
  icon,
  testId,
  draggable,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragging,
  compact = false
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
    <Card
      data-testid={testId}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      className={`min-w-0 border-zinc-800 bg-zinc-950/70 shadow-none transition-colors hover:border-orange-500/35 ${isDragging ? "opacity-40" : ""} ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <CardContent className={`${compact ? "flex min-h-[72px] items-center px-3 py-2.5 sm:min-h-[78px] sm:px-3.5 sm:py-3" : "flex min-h-[136px] items-center px-4 py-5 sm:min-h-[156px] sm:px-5 sm:py-6"}`}>
        <div className={`flex min-w-0 items-center ${compact ? "gap-3" : "gap-4"}`}>
          {draggable && (
            <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
          )}
          {icon && !draggable && (
            <div className={`${compact ? "h-8 w-8 rounded-md" : "h-14 w-14 rounded-xl"} flex flex-shrink-0 items-center justify-center border border-orange-500/20 bg-orange-500/10 text-primary`}>{icon}</div>
          )}
          <div className="min-w-0 flex-1">
            <p className={`${compact ? "text-[10px]" : "text-[11px] sm:text-xs"} font-heading font-bold uppercase leading-tight tracking-[0.12em] text-zinc-500`}>{title}</p>
            <div className="mt-1 flex min-w-0 items-baseline gap-2">
              <p className={`${compact ? "text-lg sm:text-xl" : "text-3xl sm:text-4xl"} truncate font-black leading-none tabular-nums text-white`} data-testid={`${testId}-value`}>{value}</p>
              {typeof change === 'number' && (
                <span className={`flex items-center gap-0.5 text-[10px] ${getTrendColor()}`}>
                  {getTrendIcon()}
                  {change > 0 ? '+' : ''}{change}%
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
