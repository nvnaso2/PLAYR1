import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Target, Trophy, Check, HandMetal, Crosshair, Flame, Shield, Brain, Dumbbell } from "lucide-react";
import type { Drill } from "@shared/schema";
import { CompactDrillRating } from "@/components/basketball-rating";
import { getObjectUrl } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface DrillCardProps {
  drill: Drill;
  personalBest?: number | null;
  totalSessions?: number;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (drillId: string) => void;
  viewMode?: "grid" | "list";
  hubFeatured?: boolean;
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

const categoryIcons = {
  "ball-handling": HandMetal,
  shooting: Target,
  passing: Crosshair,
  finishing: Flame,
  defense: Shield,
  "film-session": Brain,
  workouts: Dumbbell,
};

const categoryAccent: Record<string, string> = {
  "ball-handling": "from-orange-500/25 via-orange-950/50 to-zinc-950 text-orange-300",
  shooting: "from-emerald-500/20 via-emerald-950/50 to-zinc-950 text-emerald-300",
  passing: "from-blue-500/20 via-blue-950/50 to-zinc-950 text-blue-300",
  finishing: "from-red-500/20 via-red-950/50 to-zinc-950 text-red-300",
  defense: "from-violet-500/20 via-violet-950/50 to-zinc-950 text-violet-300",
  "film-session": "from-pink-500/20 via-pink-950/50 to-zinc-950 text-pink-300",
  workouts: "from-teal-500/20 via-teal-950/50 to-zinc-950 text-teal-300",
};

export function DrillCard({
  drill,
  personalBest,
  totalSessions,
  selectable = false,
  selected = false,
  onSelect,
  viewMode = "grid",
  hubFeatured = false,
}: DrillCardProps) {
  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };
  const CategoryIcon = categoryIcons[drill.category as keyof typeof categoryIcons] || Target;
  const categoryStyle = categoryAccent[drill.category] || "from-orange-500/20 via-orange-950/50 to-zinc-950 text-orange-300";

  const card = (
      <Card
        className={cn(
          "group cursor-pointer overflow-hidden border-white/[0.08] bg-zinc-950/90 text-zinc-100 shadow-[0_8px_24px_rgba(0,0,0,0.2)] transition-all duration-200",
          viewMode === "grid" && !hubFeatured && "flex h-[220px] flex-col",
          hubFeatured && "flex h-full min-h-[128px] flex-col",
          viewMode === "list" && "flex min-h-[88px] flex-row",
          selectable
            ? "relative hover:border-white/70"
            : "hover:border-white/70 hover:shadow-[0_12px_30px_rgba(255,255,255,0.05)]",
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
        <div className={cn(
          "relative shrink-0 overflow-hidden bg-zinc-900",
          viewMode === "list" ? "h-[88px] w-28 sm:h-24 sm:w-36" : hubFeatured ? "aspect-[1.35/1] w-full" : "aspect-[11/5] w-full"
        )}>
          {drill.videoUrl ? (
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
          ) : (
            <div className={cn(
              "flex h-full w-full items-center justify-center bg-gradient-to-br",
              categoryStyle
            )}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-current/20 bg-black/20">
                <CategoryIcon className="h-5 w-5" />
              </div>
            </div>
          )}
          <div className={cn(
            "absolute inset-0 flex items-center justify-center transition-colors duration-200",
            selectable ? "bg-transparent" : "bg-transparent group-hover:bg-black/20"
          )}>
            <div className={cn(
              "flex h-11 w-11 scale-90 items-center justify-center rounded-full border border-white/25 bg-zinc-950/70 text-orange-300 opacity-0 shadow-lg backdrop-blur-md transition-all duration-200 group-hover:scale-100 group-hover:border-white/60 group-hover:bg-zinc-950/90 group-hover:text-orange-400 group-hover:opacity-100",
              selectable && "hidden"
            )}>
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </div>
          </div>
          <div className={cn("absolute left-2 top-2 flex max-w-[calc(100%-1rem)] gap-2", hubFeatured && "left-1 top-1 max-w-[calc(100%-0.5rem)]")}>
            <Badge className={cn(
              "max-w-full truncate px-1.5 py-0 text-[9px] capitalize",
              hubFeatured && "px-1 text-[7px] leading-3",
              difficultyColors[drill.difficulty || 'beginner']
            )}>
              {categoryLabels[drill.category] || drill.category}
              <span className="mx-1 opacity-60">·</span>
              {drill.difficulty || 'beginner'}
            </Badge>
          </div>
          {selectable && (
            <div className={cn(
              "absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 shadow-sm transition-colors",
              selected
                ? "border-orange-400 bg-orange-500 text-black"
                : "border-white/80 bg-black/60 text-transparent"
            )}>
              <Check className="h-3 w-3" strokeWidth={3} />
              <span className="sr-only">{selected ? "Selected" : "Select drill"}</span>
            </div>
          )}
          {personalBest !== undefined && personalBest !== null && (
            <div className={cn("absolute right-2", selectable ? "top-9" : "top-2")}>
              <Badge className="flex items-center gap-1 bg-yellow-500/90 px-1.5 py-0 text-[9px] text-yellow-950" data-testid={`badge-personal-best-${drill.id}`}>
                <Trophy className="h-2.5 w-2.5" />
                PB {personalBest}/10
              </Badge>
            </div>
          )}
        </div>
        <CardContent className={cn(
          "min-w-0 flex-1",
          viewMode === "list" ? "flex items-center gap-3 p-2.5 sm:p-3" : hubFeatured ? "flex min-h-0 flex-1 flex-col justify-between gap-1 p-2" : "flex min-h-0 flex-1 flex-col justify-between gap-2 p-3"
        )}>
          <div className={cn("min-w-0 flex-1", viewMode === "list" && "flex flex-col items-start")}>
            <h3 className={cn(
              "font-semibold leading-snug transition-colors group-hover:text-primary",
              viewMode === "list" ? "line-clamp-2 text-sm" : hubFeatured ? "line-clamp-2 text-[10px] leading-tight sm:text-[11px]" : "line-clamp-2 min-h-[2.5em] text-[13px]"
            )} data-testid={`text-drill-title-${drill.id}`}>
              {drill.title}
            </h3>
            <div className={cn(
              "flex min-w-0 items-center gap-3 text-[10px] text-zinc-400",
              hubFeatured && "gap-1.5 text-[8px]"
            )}>
              <span className="flex shrink-0 items-center gap-1">
                <Clock className={cn("h-3 w-3 text-orange-400", hubFeatured && "h-2.5 w-2.5")} />
                {formatDuration(drill.duration)}
              </span>
              <CompactDrillRating drillId={drill.id} />
            </div>
          </div>
          {totalSessions !== undefined && totalSessions > 0 && (
            <span className="shrink-0 text-[10px] text-zinc-500" data-testid={`text-sessions-${drill.id}`}>
              {totalSessions} {totalSessions === 1 ? "session" : "sessions"}
            </span>
          )}
        </CardContent>
      </Card>
  );

  if (selectable) return card;
  return <Link href={`/drill/${drill.id}`} className={hubFeatured ? "block h-full" : undefined}>{card}</Link>;
}
