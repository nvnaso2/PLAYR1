import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { ContinueProgramsWidget } from "@/components/continue-programs-widget";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import {
  Flame,
  Zap,
  ChevronRight,
  Target,
  CalendarDays,
  Bot,
  Trophy,
  Dumbbell,
  TrendingUp,
  X,
  Sparkles,
} from "lucide-react";
import type { GoalProgram } from "@shared/schema";

type GoalData = {
  goal: any;
  clarifications: any[];
  milestones: any[];
  checkIns: any[];
} | null;

const TIER_COLORS: Record<string, string> = {
  prospect: "text-zinc-400 bg-zinc-700/40",
  rising: "text-amber-400 bg-amber-500/10",
  starter: "text-blue-400 bg-blue-500/10",
  star: "text-purple-400 bg-purple-500/10",
  elite: "text-yellow-400 bg-yellow-500/10",
  playr1: "text-orange-400 bg-orange-500/10",
};

const TIER_ORDER = ["prospect", "rising", "starter", "star", "elite", "playr1"];
const TIER_XP: Record<string, number> = {
  prospect: 0, rising: 500, starter: 1500, star: 3500, elite: 7000, playr1: 12000,
};

function greeting(firstName?: string | null) {
  const h = new Date().getHours();
  const emoji = h < 12 ? "🌅" : h < 17 ? "☀️" : "🌙";
  const word = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return { text: `${word}${firstName ? `, ${firstName}` : ""}`, emoji };
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default function HubPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    localStorage.getItem("playr1_new_onboarding_dismissed") === "1"
  );

  function dismissNewPlayerBanner() {
    setBannerDismissed(true);
    localStorage.setItem("playr1_new_onboarding_dismissed", "1");
    // Also clear the "new onboarding" flag
    localStorage.removeItem("playr1_new_onboarding");
  }

  const { data: profile } = useQuery<any>({ queryKey: ["/api/profile"] });
  const { data: careerData } = useQuery<any>({ queryKey: ["/api/career"] });
  const { data: overview, isLoading: overviewLoading } = useQuery<any>({ queryKey: ["/api/stats/overview"] });
  const { data: goalData, isLoading: goalLoading } = useQuery<GoalData>({
    queryKey: ["/api/goals/active"],
    queryFn: () =>
      fetch("/api/goals/active", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => d ?? null),
    enabled: !!user,
  });
  const { data: archetypes, isLoading: archLoading } = useQuery<any[]>({
    queryKey: ["/api/archetypes/user"],
    enabled: !!user,
  });

  // Show banner for new cinematic onboarding users with incomplete profiles
  // Driven by durable server state (onboardingVersion) + local dismissal flag
  const isCinematicOnboarding = careerData?.onboardingVersion === "cinematic-v1";
  const profileIncomplete = !profile?.lastName || !careerData?.positions?.length || !careerData?.aspiration;
  const showNewPlayerBanner = isCinematicOnboarding && profileIncomplete && !bannerDismissed;

  const firstName = profile?.firstName ?? user?.firstName;
  const { text: greetText, emoji } = greeting(firstName);
  const streak = overview?.streak ?? 0;
  const totalSessions = overview?.totalSessions ?? 0;

  const mainArch = archetypes?.find((a: any) => a.role === "main");
  const activeGoal = goalData?.goal?.status === "active" ? goalData : null;
  const hasGoalProgram = !!activeGoal?.goal?.aiProgram;
  const program = activeGoal?.goal?.aiProgram as GoalProgram | null;
  const completedMilestones = activeGoal?.milestones?.filter((m: any) => m.completed).length ?? 0;
  const totalMilestones = activeGoal?.milestones?.length ?? 0;
  const goalWeek = activeGoal?.goal?.currentWeek ?? 1;
  const goalTotalWeeks = activeGoal?.goal?.totalWeeks ?? 8;
  const goalPct = Math.round(((goalWeek - 1) / goalTotalWeeks) * 100);

  // Today's training from goal program
  const todayProgram = (() => {
    if (!program?.weeklyFocus) return null;
    const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const currentWeekData = program.weeklyFocus.find((w: any) => w.week === goalWeek);
    return currentWeekData?.dailySchedule?.find((d: any) => d.day === todayName) ?? currentWeekData?.dailySchedule?.[0] ?? null;
  })();

  // Archetype XP progress
  const archProgress = (() => {
    if (!mainArch) return null;
    const tierIdx = TIER_ORDER.indexOf(mainArch.tier);
    const nextTier = TIER_ORDER[tierIdx + 1];
    const currentThreshold = TIER_XP[mainArch.tier] ?? 0;
    const nextThreshold = nextTier ? TIER_XP[nextTier] : null;
    const pct = nextThreshold
      ? Math.round(((mainArch.totalXp - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
      : 100;
    return { pct, nextTier, xpToNext: nextThreshold ? nextThreshold - mainArch.totalXp : 0 };
  })();

  return (
    <div className="min-h-full bg-background pb-6">
      {/* New Player Welcome Banner (cinematic onboarding graduates) */}
      {showNewPlayerBanner && (
        <div className="mx-4 mt-4 rounded-2xl border border-orange-500/30 bg-gradient-to-r from-orange-500/15 via-orange-500/8 to-transparent p-4 relative" data-testid="banner-new-player">
          <button
            onClick={dismissNewPlayerBanner}
            className="absolute top-3 right-3 text-zinc-500 hover:text-white transition-colors"
            data-testid="button-dismiss-banner"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4 text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">Welcome to PLAYR1! 🏀</p>
              <p className="text-zinc-400 text-xs mt-0.5 leading-snug">
                Unlock 10% off your first session with a trainer when you complete your profile.
              </p>
              <button
                onClick={() => navigate("/profile")}
                className="mt-2.5 text-orange-400 text-xs font-bold flex items-center gap-1 hover:text-orange-300 transition-colors"
                data-testid="button-banner-complete-profile"
              >
                Complete My Profile <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Greeting Header */}
      <div className="px-5 pt-6 pb-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-zinc-400 text-sm">{formatDate()}</p>
            <h1 className="text-2xl font-bold text-white mt-0.5">
              {greetText} {emoji}
            </h1>
          </div>
          {streak > 0 && (() => {
              const sa = streak >= 30 ? { bg: "bg-red-500/20", border: "border-red-400/40", color: "text-red-300", flames: 3, pulse: true }
                       : streak >= 14 ? { bg: "bg-orange-500/20", border: "border-orange-400/40", color: "text-orange-300", flames: 3, pulse: true }
                       : streak >= 7  ? { bg: "bg-orange-500/15", border: "border-orange-400/30", color: "text-orange-400", flames: 2, pulse: false }
                       : streak >= 3  ? { bg: "bg-orange-500/10", border: "border-orange-500/25", color: "text-orange-400", flames: 1, pulse: false }
                       :                { bg: "bg-orange-500/10", border: "border-orange-500/20", color: "text-orange-400", flames: 1, pulse: false };
              return (
                <button
                  onClick={() => navigate("/streaks")}
                  data-testid="button-streak"
                  className={`flex items-center gap-1.5 rounded-2xl px-3 py-2 mt-1 border active:scale-95 transition-all ${sa.bg} ${sa.border}`}
                >
                  <Flame className={`w-4 h-4 ${sa.color} ${sa.pulse ? "animate-pulse" : ""}`} />
                  {sa.flames >= 2 && <Flame className={`w-3 h-3 ${sa.color} -ml-2.5 opacity-70`} />}
                  {sa.flames >= 3 && <Flame className={`w-3 h-3 ${sa.color} -ml-2.5 opacity-50`} />}
                  <span className={`${sa.color} font-bold text-sm`}>{streak}</span>
                </button>
              );
            })()}
        </div>
      </div>

      <div className="px-4 space-y-4 mt-4">
        {/* Today's Training Card */}
        {!goalLoading && (
          <>
            {todayProgram ? (
              <div
                data-testid="card-today-training"
                onClick={() => navigate("/my-goal")}
                className="cursor-pointer rounded-2xl overflow-hidden bg-gradient-to-br from-orange-500/15 via-orange-500/8 to-transparent border border-orange-500/25 p-5 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <Target className="w-4 h-4 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-xs text-orange-400 font-medium">TODAY'S TRAINING</p>
                      <p className="text-xs text-zinc-400">Week {goalWeek} of {goalTotalWeeks}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-orange-400/60" />
                </div>
                <p className="text-white font-bold text-lg leading-tight">{todayProgram.activity}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-zinc-400 text-sm">{todayProgram.duration}</span>
                  {todayProgram.drillCategories?.[0] && (
                    <Badge variant="outline" className="text-xs border-orange-500/30 text-orange-300 py-0">
                      {todayProgram.drillCategories[0]}
                    </Badge>
                  )}
                </div>
                {todayProgram.details && (
                  <p className="text-zinc-400 text-xs mt-1.5 line-clamp-1">{todayProgram.details}</p>
                )}
                <Button
                  data-testid="button-log-today"
                  onClick={(e) => { e.stopPropagation(); navigate("/log"); }}
                  size="sm"
                  className="mt-3 bg-orange-500 hover:bg-orange-600 text-black font-semibold text-xs h-8"
                >
                  <Dumbbell className="w-3.5 h-3.5 mr-1.5" />
                  Log This Session
                </Button>
              </div>
            ) : (
              !goalData && (
                <button
                  data-testid="card-set-goal-cta"
                  onClick={() => navigate("/my-goal")}
                  className="w-full text-left rounded-2xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 p-5 active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-orange-500/15 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-orange-400" />
                    </div>
                    <p className="text-white font-semibold">Set a Goal with Your AI Coach</p>
                  </div>
                  <p className="text-zinc-400 text-sm">Get a personalized 8-week program built around your archetype and goals.</p>
                  <div className="mt-3 flex items-center gap-1 text-orange-400 text-sm font-medium">
                    Start now <ChevronRight className="w-4 h-4" />
                  </div>
                </button>
              )
            )}
          </>
        )}

        {/* Stats Row */}
        {!overviewLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Streak", value: streak, icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10" },
              { label: "Sessions", value: totalSessions, icon: Dumbbell, color: "text-blue-400", bg: "bg-blue-500/10" },
              { label: "Milestones", value: completedMilestones, icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-500/10" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className="text-white font-bold text-xl">{value}</p>
                <p className="text-zinc-500 text-xs">{label}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
        )}

        {/* Archetype Identity Strip */}
        {!archLoading && mainArch ? (
          <button
            data-testid="card-identity-strip"
            onClick={() => navigate("/journey")}
            className="w-full text-left rounded-2xl bg-zinc-900 border border-zinc-800 p-4 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border"
                  style={{
                    backgroundColor: mainArch.archetype.primaryHex + "22",
                    borderColor: mainArch.archetype.primaryHex + "44",
                  }}
                >
                  <Zap className="w-5 h-5" style={{ color: mainArch.archetype.primaryHex }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold text-sm">{mainArch.archetype.name}</p>
                    <Badge
                      variant="outline"
                      className={`text-xs py-0 px-1.5 border-transparent capitalize ${TIER_COLORS[mainArch.tier] ?? ""}`}
                    >
                      {mainArch.tier}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-24 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${archProgress?.pct ?? 0}%`,
                          backgroundColor: mainArch.archetype.primaryHex,
                        }}
                      />
                    </div>
                    {archProgress?.nextTier && (
                      <p className="text-zinc-500 text-xs">{archProgress.xpToNext} XP to {archProgress.nextTier}</p>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </div>
          </button>
        ) : !archLoading && !mainArch ? (
          <button
            data-testid="card-pick-archetype"
            onClick={() => navigate("/archetypes")}
            className="w-full text-left rounded-2xl bg-zinc-900 border border-zinc-800 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold text-sm">Pick Your Archetype</p>
                <p className="text-zinc-400 text-xs mt-0.5">Define your play style and unlock your identity</p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </div>
          </button>
        ) : null}

        {/* Goal Progress (if active) */}
        {!goalLoading && activeGoal && (
          <button
            data-testid="card-goal-progress"
            onClick={() => navigate("/my-goal")}
            className="w-full text-left rounded-2xl bg-zinc-900 border border-zinc-800 p-4 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-400" />
                <p className="text-white font-semibold text-sm">My Goal</p>
              </div>
              <div className="flex items-center gap-1 text-zinc-400 text-xs">
                {completedMilestones}/{totalMilestones} milestones
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-zinc-300 text-sm line-clamp-1 mb-3">"{activeGoal.goal.goalText}"</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Week {goalWeek} of {goalTotalWeeks}</span>
                <span>{goalPct}%</span>
              </div>
              <Progress value={goalPct} className="h-1.5 bg-zinc-800" />
            </div>
          </button>
        )}

        {/* Programs */}
        <div data-testid="section-continue-programs">
          <ContinueProgramsWidget />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 pb-2">
          <button
            data-testid="button-quick-log"
            onClick={() => navigate("/log")}
            className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col gap-2 active:scale-[0.98] transition-transform text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-zinc-300" />
            </div>
            <p className="text-white font-medium text-sm">Log Session</p>
            <p className="text-zinc-500 text-xs">Track today's work</p>
          </button>
          <button
            data-testid="button-quick-drills"
            onClick={() => navigate("/drills")}
            className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col gap-2 active:scale-[0.98] transition-transform text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-zinc-300" />
            </div>
            <p className="text-white font-medium text-sm">Drill Library</p>
            <p className="text-zinc-500 text-xs">Find your next drill</p>
          </button>
        </div>
      </div>
    </div>
  );
}
