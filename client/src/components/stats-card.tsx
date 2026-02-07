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
      className={`transition-opacity ${isDragging ? "opacity-40" : ""} ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <CardContent className="px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          {draggable && (
            <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-xl font-bold leading-tight" data-testid={`${testId}-value`}>{value}</p>
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
