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
  isDragging
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
      <CardContent className="min-h-[88px] px-3 py-3.5 sm:px-4 sm:py-4">
        <div className="flex min-w-0 items-start gap-3">
          {draggable && (
            <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
          )}
          {icon && !draggable && (
            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10 text-primary">{icon}</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-heading text-[9px] font-bold uppercase leading-tight tracking-[0.12em] text-zinc-500">{title}</p>
            <div className="mt-1 flex min-w-0 items-baseline gap-2">
              <p className="truncate text-lg font-black leading-tight tabular-nums text-white sm:text-xl" data-testid={`${testId}-value`}>{value}</p>
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
