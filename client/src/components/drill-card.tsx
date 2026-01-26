import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Target, Trophy } from "lucide-react";
import type { Drill } from "@shared/schema";

interface DrillCardProps {
  drill: Drill;
  personalBest?: number | null;
  totalSessions?: number;
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

export function DrillCard({ drill, personalBest, totalSessions }: DrillCardProps) {
  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  return (
    <Link href={`/drill/${drill.id}`}>
      <Card 
        className="group hover-elevate cursor-pointer transition-all duration-300 overflow-hidden"
        data-testid={`card-drill-${drill.id}`}
      >
        <div className="relative aspect-video bg-muted">
          {drill.thumbnailUrl ? (
            <img 
              src={drill.thumbnailUrl} 
              alt={drill.title}
              className="w-full h-full object-cover"
            />
          ) : drill.pdfUrl ? (
            <img 
              src={drill.pdfUrl} 
              alt={drill.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
              <Target className="w-12 h-12 text-primary/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 group-hover:scale-100">
              <Play className="w-6 h-6 text-primary-foreground fill-current ml-1" />
            </div>
          </div>
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge className={difficultyColors[drill.difficulty || 'beginner']}>
              {drill.difficulty || 'beginner'}
            </Badge>
          </div>
          {personalBest !== undefined && personalBest !== null && (
            <div className="absolute top-3 right-3">
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
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
    </Link>
  );
}
