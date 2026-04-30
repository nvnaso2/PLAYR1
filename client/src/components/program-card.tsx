import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, Flame, Sparkles, Users } from "lucide-react";
import type { Program } from "@shared/schema";

const difficultyColors: Record<string, string> = {
  beginner: "bg-green-500/15 text-green-400 border-green-500/30",
  intermediate: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  advanced: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  elite: "bg-red-500/15 text-red-400 border-red-500/30",
};

const categoryLabels: Record<string, string> = {
  "ball-handling": "Ball Handling",
  shooting: "Shooting",
  passing: "Passing",
  finishing: "Finishing",
  defense: "Defense",
  workouts: "Workouts",
  "film-session": "Film Session",
};

interface ProgramCardProps {
  program: Program;
  enrolledCount?: number; // optional progress hint
  totalItems?: number;
  variant?: "grid" | "featured";
}

export function ProgramCard({ program, enrolledCount, totalItems, variant = "grid" }: ProgramCardProps) {
  const accent = program.accentColor || "#f97316";
  const isFeatured = variant === "featured";
  const progressPct =
    totalItems && totalItems > 0 && enrolledCount !== undefined
      ? Math.min(100, Math.round((enrolledCount / totalItems) * 100))
      : null;

  return (
    <Link href={`/programs/${program.slug}`} data-testid={`link-program-${program.slug}`}>
      <Card
        className={`group relative overflow-hidden border-border/60 hover-elevate active-elevate-2 cursor-pointer transition-all ${
          isFeatured ? "h-full" : "h-full"
        }`}
        data-testid={`card-program-${program.slug}`}
      >
        {/* Cinematic gradient hero */}
        <div
          className={`relative overflow-hidden ${isFeatured ? "h-56 md:h-64" : "h-40"}`}
          style={{
            background: `linear-gradient(135deg, ${accent}cc 0%, ${accent}66 50%, hsl(var(--card)) 100%)`,
          }}
        >
          {/* radial overlay */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: `radial-gradient(circle at 30% 20%, ${accent}66 0%, transparent 60%)`,
            }}
          />
          {/* Subtle mesh */}
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "16px 16px",
            }}
          />

          {/* Featured / Length badges */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            {program.isFeatured && (
              <Badge className="bg-white/95 text-black border-0 backdrop-blur shadow-sm" data-testid={`badge-featured-${program.slug}`}>
                <Sparkles className="w-3 h-3 mr-1" />
                Featured
              </Badge>
            )}
          </div>
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <Badge variant="outline" className={`backdrop-blur border ${difficultyColors[program.difficulty] || ""}`}>
              {program.difficulty}
            </Badge>
          </div>

          {/* Big title overlay for featured */}
          {isFeatured && (
            <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              <p className="text-xs uppercase tracking-widest text-white/70 mb-1">
                {(program.categoryTags ?? []).slice(0, 1).map((c) => categoryLabels[c] || c).join("")}
              </p>
              <h3 className="text-2xl font-bold text-white leading-tight" data-testid={`text-program-title-${program.slug}`}>
                {program.title}
              </h3>
              {program.tagline && (
                <p className="text-sm text-white/80 mt-1 line-clamp-1">{program.tagline}</p>
              )}
            </div>
          )}
        </div>

        <CardContent className={`p-5 ${isFeatured ? "" : ""}`}>
          {!isFeatured && (
            <>
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide mb-2">
                {(program.categoryTags ?? []).slice(0, 2).map((c) => (
                  <span key={c}>{categoryLabels[c] || c}</span>
                ))}
              </div>
              <h3 className="text-lg font-semibold leading-tight mb-1" data-testid={`text-program-title-${program.slug}`}>
                {program.title}
              </h3>
              {program.tagline && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{program.tagline}</p>
              )}
            </>
          )}

          {isFeatured && program.tagline && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{program.description}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            <span className="flex items-center gap-1.5" data-testid={`text-length-${program.slug}`}>
              <Calendar className="w-4 h-4" />
              {program.lengthDays} days
            </span>
            {program.estimatedMinutesPerDay && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                ~{program.estimatedMinutesPerDay} min/day
              </span>
            )}
            {(program.enrollmentCount ?? 0) > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {program.enrollmentCount}
              </span>
            )}
          </div>

          {progressPct !== null && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span className="flex items-center gap-1 font-medium text-foreground">
                  <Flame className="w-3.5 h-3.5" style={{ color: accent }} />
                  In progress
                </span>
                <span data-testid={`text-progress-${program.slug}`}>
                  {enrolledCount}/{totalItems} • {progressPct}%
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progressPct}%`, background: accent }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
