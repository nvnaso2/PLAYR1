import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Target, Trophy, Check } from "lucide-react";
import type { Drill } from "@shared/schema";
import { BasketballRating } from "@/components/basketball-rating";
import { getObjectUrl } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface DrillCardProps {
  drill: Drill;
  personalBest?: number | null;
  totalSessions?: number;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (drillId: string) => void;
}

const difficultyColors = {
  beginner: "bg-green-500/10 text-green-600 dark:text-green-400",
  intermediate: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  advanced: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  elite: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const categoryLabels: Record<string, string> = {
  "ball-handling": "Ball Handling",
  "shooting": "Shooting",
  "passing": "Passing",
  "finishing": "Finishing",
  "defense": "Defense",
  "film-session": "Film Session",
  "workouts": "Workouts",
};

export function DrillCard({ drill, personalBest, totalSessions, selectable = false, selected = false, onSelect }: DrillCardProps) {
  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const card = (
      <Card
        className={cn(
          "group cursor-pointer transition-all duration-300 overflow-hidden",
          selectable ? "relative hover:border-orange-400/70" : "hover-elevate",
          selected && "border-orange-400 ring-2 ring-orange-400/40"
        )}
        data-testid={`card-drill-${drill.id}`}
        data-selected={selected ? "true" : "false"}
        role={selectable ? "checkbox" : undefined}
        aria-checked={selectable ? selected : undefined}
        tabIndex={selectable ? 0 : undefined}
        onClick={selectable ? () => onSelect?.(drill.id) : undefined}
        onKeyDown={selectable ? (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect?.(drill.id);
          }
        } : undefined}
      >
        <div className="relative aspect-video bg-muted">
          {drill.videoUrl ? (
            // Video available: show thumbnail as poster (first-frame fallback if poster fails)
            <video
              src={getObjectUrl(drill.videoUrl)}
              poster={getObjectUrl(drill.thumbnailUrl) || undefined}
              preload={drill.thumbnailUrl ? "none" : "metadata"}
              muted
              playsInline
              className="w-full h-full object-cover pointer-events-none"
              onLoadedMetadata={!drill.thumbnailUrl
                ? (e) => { (e.currentTarget as HTMLVideoElement).currentTime = 0.5; }
                : undefined}
            />
          ) : drill.thumbnailUrl ? (
            <img 
              src={getObjectUrl(drill.thumbnailUrl)} 
              alt={drill.title}
              className="w-full h-full object-cover"
            />
          ) : drill.pdfUrl ? (
            <img 
              src={getObjectUrl(drill.pdfUrl)} 
              alt={drill.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
              <Target className="w-12 h-12 text-primary/50" />
            </div>
          )}
          <div className={cn(
            "absolute inset-0 transition-colors flex items-center justify-center",
            selectable ? "bg-black/0" : "bg-black/0 group-hover:bg-black/40"
          )}>
            <div className={cn(
              "w-14 h-14 rounded-full bg-primary items-center justify-center opacity-0 transition-opacity transform scale-75",
              selectable ? "hidden" : "flex group-hover:opacity-100 group-hover:scale-100"
            )}>
              <Play className="w-6 h-6 text-primary-foreground fill-current ml-1" />
            </div>
          </div>
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge className={difficultyColors[drill.difficulty || 'beginner']}>
              {drill.difficulty || 'beginner'}
            </Badge>
          </div>
          {selectable && (
            <div className={cn(
              "absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-sm transition-colors",
              selected
                ? "border-orange-400 bg-orange-500 text-black"
                : "border-white/80 bg-black/60 text-transparent"
            )}>
              <Check className="h-4 w-4" strokeWidth={3} />
              <span className="sr-only">{selected ? "Selected" : "Select drill"}</span>
            </div>
          )}
          {personalBest !== undefined && personalBest !== null && (
            <div className={cn("absolute top-3 right-3", selectable && "top-14")}>
              <Badge className="bg-yellow-500/90 text-yellow-950 flex items-center gap-1" data-testid={`badge-personal-best-${drill.id}`}>
                <Trophy className="w-3 h-3" />
                PB: {personalBest}/10
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors" data-testid={`text-drill-title-${drill.id}`}>
              {drill.title}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3" data-testid={`text-drill-desc-${drill.id}`}>
            {drill.description || "Master this drill to improve your skills."}
          </p>
          <div className="mb-2">
            <BasketballRating drillId={drill.id} size="sm" showCount={true} />
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatDuration(drill.duration)}
            </div>
            <div className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5" />
              {categoryLabels[drill.category] || drill.category}
            </div>
            {totalSessions !== undefined && totalSessions > 0 && (
              <div className="flex items-center gap-1" data-testid={`text-sessions-${drill.id}`}>
                <Play className="w-3.5 h-3.5" />
                {totalSessions} {totalSessions === 1 ? 'session' : 'sessions'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
  );

  if (selectable) return card;
  return <Link href={`/drill/${drill.id}`}>{card}</Link>;
}
