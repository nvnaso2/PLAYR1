import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { nativeFetch, queryClient, getObjectUrl } from "@/lib/queryClient";
import { track } from "@/lib/track";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Flame,
  Trophy,
  CheckCircle2,
  Timer,
  ChevronRight,
  Crown,
  History,
} from "lucide-react";

interface DailyData {
  challenge: { challenge: { challengeDate: string; drillId: string }; drill: { id: string; title: string; category: string; difficulty: string; duration?: number; thumbnailUrl?: string; isAiGenerated?: boolean } } | null;
  completedToday: boolean;
  streak: { currentStreak: number; longestStreak: number; lastCompletedDate?: string } | null;
  date: string;
}

interface LeaderEntry {
  userId: string;
  displayName: string;
  currentStreak: number;
  profilePhotoUrl: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  shooting: "text-orange-400",
  "ball-handling": "text-blue-400",
  passing: "text-green-400",
  conditioning: "text-red-400",
  workout: "text-purple-400",
  defense: "text-yellow-400",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-500/20 text-green-400 border-green-500/30",
  intermediate: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  advanced: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  elite: "bg-red-500/20 text-red-400 border-red-500/30",
};

const MILESTONES = [3, 7, 14, 30, 60, 100];
const MILESTONE_LABELS: Record<number, { label: string; icon: string }> = {
  3:   { label: "Rookie",          icon: "⚡" },
  7:   { label: "Weekly Warrior",  icon: "🔥" },
  14:  { label: "Two-Week Grind",  icon: "💪" },
  30:  { label: "Monthly Machine", icon: "🏆" },
  60:  { label: "Elite Trainer",   icon: "🌟" },
  100: { label: "Legend",          icon: "👑" },
};

function nextMilestone(current: number): { days: number; label: string; icon: string } | null {
  const next = MILESTONES.find(m => m > current);
  if (!next) return null;
  return { days: next - current, ...MILESTONE_LABELS[next] };
}

function formatCategory(cat: string) {
  return cat.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

function formatDuration(seconds?: number) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  return m > 0 ? `~${m}m` : `${seconds}s`;
}

function localMidnight(): Date {
  const m = new Date();
  m.setHours(24, 0, 0, 0); // local midnight
  return m;
}

function TimeRemaining() {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    function calc() {
      const diff = localMidnight().getTime() - Date.now();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h >= 6) return `${h}h remaining`;
      if (h > 0) return `${h}h ${m}m remaining`;
      return `${m}m remaining`;
    }
    setRemaining(calc());
    const id = setInterval(() => setRemaining(calc()), 60000);
    return () => clearInterval(id);
  }, []);

  const hoursLeft = (localMidnight().getTime() - Date.now()) / 3600000;
  const isUrgent = hoursLeft < 4;

  return (
    <span className={cn("text-[11px] font-medium flex items-center gap-1", isUrgent ? "text-orange-400" : "text-muted-foreground")}>
      <Timer className="w-3 h-3" />
      {remaining}
    </span>
  );
}

function FlameCounter({ count, isUrgent }: { count: number; isUrgent?: boolean }) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center rounded-2xl px-5 py-3 min-w-[80px]",
      count > 0
        ? "bg-gradient-to-b from-orange-500/20 to-orange-500/5 border border-orange-500/30"
        : "bg-muted/50 border border-border"
    )}>
      <span className={cn("text-3xl leading-none", count > 0 ? "animate-none" : "grayscale opacity-40")}>
        🔥
      </span>
      <span className={cn(
        "text-2xl font-black leading-tight tabular-nums",
        count > 0 ? "text-orange-400" : "text-muted-foreground"
      )}>
        {count}
      </span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
        {count === 1 ? "day" : "days"}
      </span>
    </div>
  );
}

export function DailyChallengeCard() {
  const [, navigate] = useLocation();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [celebrated, setCelebrated] = useState(false);

  // Use local date (YYYY-MM-DD) so the challenge matches the user's timezone
  const clientDate = new Date().toLocaleDateString("en-CA");

  const { data, isLoading } = useQuery<DailyData>({
    queryKey: ["/api/daily-challenge", clientDate],
    queryFn: async () => {
      const res = await nativeFetch(`/api/daily-challenge?clientDate=${clientDate}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: leaderboard } = useQuery<LeaderEntry[]>({
    queryKey: ["/api/streak/leaderboard"],
    queryFn: async () => {
      const res = await nativeFetch("/api/streak/leaderboard");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: showLeaderboard,
    staleTime: 1000 * 60 * 5,
  });

  const streak = data?.streak?.currentStreak ?? 0;
  const longest = data?.streak?.longestStreak ?? 0;
  const completedToday = data?.completedToday ?? false;
  const drill = data?.challenge?.drill;
  const next = nextMilestone(streak);

  const hoursLeft = (localMidnight().getTime() - Date.now()) / 3600000;
  const isUrgent = streak > 0 && !completedToday && hoursLeft < 4;

  // Did the streak just break? (last completed != yesterday and streak is 0)
  const streakBroke = !completedToday && streak === 0 && (longest > 0);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card animate-pulse h-48" data-testid="daily-challenge-skeleton" />
    );
  }

  if (!data?.challenge) {
    return null;
  }

  return (
    <div className="space-y-3" data-testid="daily-challenge-section">
      {/* ── Main card ── */}
      <div className={cn(
        "rounded-2xl border overflow-hidden transition-all duration-300",
        completedToday
          ? "border-green-500/40 bg-gradient-to-br from-green-950/40 via-card to-card"
          : isUrgent
          ? "border-orange-500/60 bg-gradient-to-br from-orange-950/40 via-card to-card shadow-lg shadow-orange-500/10"
          : "border-border bg-card"
      )}>
        {/* Accent strip */}
        <div className={cn(
          "h-1 w-full",
          completedToday ? "bg-gradient-to-r from-green-500 to-emerald-400" : "bg-gradient-to-r from-orange-500 to-amber-400"
        )} />

        <div className="p-4 sm:p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <Flame className={cn("w-4 h-4 shrink-0", completedToday ? "text-green-400" : "text-orange-500")} />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Daily Streak Challenge
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                {completedToday ? (
                  <span className="text-green-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Completed! Come back tomorrow
                  </span>
                ) : (
                  <TimeRemaining />
                )}
              </p>
            </div>
            <FlameCounter count={streak} isUrgent={isUrgent} />
          </div>

          {/* Drill card — clickable to preview */}
          {drill && (
            <button
              className={cn(
                "w-full rounded-xl border p-3 sm:p-4 flex items-center gap-3 transition-all text-left",
                completedToday
                  ? "border-green-500/20 bg-green-950/20 hover:bg-green-950/30"
                  : "border-border bg-muted/30 hover:bg-muted/60 active:scale-[0.99]"
              )}
              onClick={() => navigate(`/drill/${drill.id}`)}
              data-testid="daily-drill-card"
            >
              <div className={cn(
                "w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex flex-col items-center justify-center shrink-0",
                completedToday ? "bg-green-500/15" : "bg-orange-500/15"
              )}>
                <span className="text-2xl sm:text-3xl leading-none">🔥</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm sm:text-base leading-tight truncate" data-testid="daily-drill-title">
                  {drill.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className={cn("text-[11px] font-medium", CATEGORY_COLORS[drill.category] || "text-muted-foreground")}>
                    {formatCategory(drill.category)}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] px-1.5 py-0 h-4 border capitalize", DIFFICULTY_COLORS[drill.difficulty] || "")}
                  >
                    {drill.difficulty}
                  </Badge>
                  {formatDuration(drill.duration) && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                      <Timer className="w-2.5 h-2.5" />
                      {formatDuration(drill.duration)}
                    </span>
                  )}
                </div>
              </div>
              {completedToday ? (
                <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </button>
          )}

          {/* Milestone progress bar */}
          {next && !completedToday && streak > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                <span>{next.icon} {next.days} more day{next.days !== 1 ? "s" : ""} to <strong className="text-foreground">{next.label}</strong></span>
                <span>{streak} / {streak + next.days}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-700"
                  style={{ width: `${Math.min(100, (streak / (streak + next.days)) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Milestone reached (freshly completed) */}
          {completedToday && MILESTONE_LABELS[streak] && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-orange-500/10 border border-orange-500/20 px-3 py-2">
              <span className="text-lg">{MILESTONE_LABELS[streak].icon}</span>
              <div>
                <p className="text-xs font-bold text-orange-400">Milestone unlocked!</p>
                <p className="text-[11px] text-muted-foreground">{MILESTONE_LABELS[streak].label} — {streak}-day streak</p>
              </div>
            </div>
          )}

          {/* Personal best */}
          {longest > 0 && longest > streak && completedToday && (
            <p className="mt-2 text-[11px] text-muted-foreground text-center">
              All-time best: <strong className="text-foreground">{longest} days</strong>
            </p>
          )}

          {/* Urgent warning */}
          {isUrgent && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-orange-500/10 border border-orange-500/30 px-3 py-2 animate-pulse">
              <Zap className="w-4 h-4 text-orange-400 shrink-0" />
              <p className="text-xs text-orange-300 font-medium">
                Your {streak}-day streak is at risk! Log this drill before midnight.
              </p>
            </div>
          )}

          {/* Streak broken message */}
          {streakBroke && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
              <span className="text-base">💔</span>
              <p className="text-xs text-muted-foreground">
                Your streak was broken — best was <strong className="text-foreground">{longest} days</strong>. Start a new one today!
              </p>
            </div>
          )}

          {/* Action button */}
          {!completedToday && drill && (
            <Button
              className="w-full mt-3 gap-2 font-semibold"
              onClick={() => {
                track("daily_challenge_started", { drillId: drill.id, streak });
                navigate(`/log?drill=${drill.id}`);
              }}
              data-testid="btn-accept-challenge"
            >
              <Flame className="w-4 h-4" />
              {streak > 0 ? `Keep your ${streak}-day streak going` : "Start your streak today"}
              <ChevronRight className="w-4 h-4 ml-auto" />
            </Button>
          )}
        </div>
      </div>

      {/* ── History + Leaderboard row ── */}
      <div className="grid grid-cols-2 gap-2">
        <button
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-sm font-medium"
          onClick={() => navigate("/challenge-history")}
          data-testid="btn-view-challenge-history"
        >
          <History className="w-4 h-4 text-muted-foreground" />
          Challenge Archive
        </button>
        <button
          className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-sm"
          onClick={() => setShowLeaderboard(v => !v)}
          data-testid="btn-toggle-leaderboard"
        >
          <span className="flex items-center gap-2 font-medium">
            <Crown className="w-4 h-4 text-amber-400" />
            Leaderboard
          </span>
          <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", showLeaderboard && "rotate-90")} />
        </button>
      </div>

      {showLeaderboard && (
        <div className="rounded-xl border border-border bg-card overflow-hidden" data-testid="streak-leaderboard">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-sm">Top Streaks</span>
          </div>
          <div className="divide-y divide-border">
            {(!leaderboard || leaderboard.length === 0) && (
              <p className="text-center text-muted-foreground text-sm py-8">No active streaks yet — be the first!</p>
            )}
            {leaderboard?.map((entry, i) => (
              <div key={entry.userId} className="flex items-center gap-3 px-4 py-2.5" data-testid={`leaderboard-row-${i}`}>
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0",
                  i === 0 ? "bg-amber-400 text-amber-950" :
                  i === 1 ? "bg-slate-300 text-slate-800" :
                  i === 2 ? "bg-amber-700 text-amber-100" :
                  "bg-muted text-muted-foreground"
                )}>
                  {i + 1}
                </div>
                <Avatar className="w-7 h-7 shrink-0">
                  {entry.profilePhotoUrl && <AvatarImage src={getObjectUrl(entry.profilePhotoUrl)} />}
                  <AvatarFallback className="text-[10px]">{entry.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm font-medium truncate">{entry.displayName}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-base">🔥</span>
                  <span className="font-black text-orange-400 tabular-nums">{entry.currentStreak}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
