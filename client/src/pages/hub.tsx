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
  X,
  Sparkles,
  Play,
  PlayCircle,
  ClipboardCheck,
  UserRound,
  MessageCircle,
  BookOpen,
  Layers3,
  CheckCircle2,
} from "lucide-react";
import type { GoalProgram } from "@shared/schema";
import introTrailer from "@assets/Welcome_To_PLAYR1_1781991119550.mp4";

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
  const [trailerDismissed, setTrailerDismissed] = useState(() =>
    localStorage.getItem("playr1_intro_trailer_dismissed") === "1"
  );

  function dismissTrailer() {
    setTrailerDismissed(true);
    localStorage.setItem("playr1_intro_trailer_dismissed", "1");
  }

  function replayTrailer() {
    setTrailerDismissed(false);
    localStorage.removeItem("playr1_intro_trailer_dismissed");
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
  const { data: fixData } = useQuery<any>({
    queryKey: ["/api/onboarding/fix-drills"],
    enabled: !!user,
  });

  const profileIncomplete = !profile?.lastName || !careerData?.positions?.length || !careerData?.aspiration;
  const fullOnboardingComplete = Boolean(careerData?.onboardingCompleted || fixData?.fullProfileCompleted);
  const showProfileSetup = profileIncomplete || !fullOnboardingComplete;

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
        {!trailerDismissed && (
          <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-black" data-testid="card-intro-trailer">
            <video
              src={introTrailer}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-50"
              aria-label="Welcome to PLAYR1 intro trailer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
            <button
              onClick={dismissTrailer}
              className="absolute top-3 right-3 z-10 text-white/60 hover:text-white"
              aria-label="Dismiss intro trailer"
              data-testid="button-dismiss-trailer"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="relative z-10 p-5 min-h-[156px] flex flex-col justify-end">
              <p className="text-[10px] uppercase tracking-[0.25em] text-orange-400 font-bold">The PLAYR1 Trailer</p>
              <h2 className="text-xl font-black text-white mt-1">Start Your Road to PLAYR1 Here.</h2>
              <p className="text-xs text-zinc-300 mt-1 max-w-[260px]">The game of basketball has changed my life forever. No matter how the game affects your life, everyone has their own PLAYR1 story.</p>
              <div className="mt-3 flex items-center gap-2 text-xs font-bold text-white">
                <span className="h-7 w-7 rounded-full bg-orange-500 text-black flex items-center justify-center"><Play className="h-3.5 w-3.5 fill-current ml-0.5" /></span>
                Watch the Trailer
              </div>
            </div>
          </div>
        )}

        {/* Post-onboarding path */}
        <section className="space-y-3" data-testid="section-post-onboarding">
          <div>
            <h2 className="text-xl font-black text-white mt-1">Your next steps are ready.</h2>
            <p className="text-sm text-zinc-500 mt-1">Finish your setup, meet your coach, then get to work.</p>
          </div>

          {trailerDismissed && (
            <button
              onClick={replayTrailer}
              className="w-full text-left rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 flex items-center gap-3 hover:border-orange-500/40 transition-colors"
              data-testid="button-replay-trailer"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
                <PlayCircle className="w-5 h-5 text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">PLAYR1 App Trailer</p>
                <p className="text-zinc-500 text-xs mt-0.5">Watch the intro again whenever you need it.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0" />
            </button>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => navigate("/career")}
              className="w-full text-left rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 hover:border-orange-500/40 transition-colors"
              data-testid="button-regular-onboarding"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  {fullOnboardingComplete
                    ? <CheckCircle2 className="w-5 h-5 text-white" />
                    : <ClipboardCheck className="w-5 h-5 text-white" />}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm">Tell us more about your basketball story</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {fullOnboardingComplete ? "Review your player assessment." : "Answer a few questions to customize your profile and app experience."}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-orange-400 text-xs font-bold">
                {fullOnboardingComplete ? "Review assessment" : "Take assessment"}
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>

            <button
              onClick={() => navigate("/profile")}
              className="w-full text-left rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 hover:border-orange-500/40 transition-colors"
              data-testid="button-complete-profile"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                  {showProfileSetup
                    ? <UserRound className="w-5 h-5 text-white" />
                    : <CheckCircle2 className="w-5 h-5 text-white" />}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm">Complete your profile</p>
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {showProfileSetup ? "Add the details to customize your PLAYR1 Card and Account." : "Your player profile is looking good."}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-orange-400 text-xs font-bold">
                {showProfileSetup ? "Finish profile" : "View profile"}
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>

          <button
            onClick={() => navigate("/journal")}
            className="w-full text-left rounded-2xl border border-orange-500/25 bg-gradient-to-r from-orange-500/15 via-orange-500/8 to-transparent p-4 flex items-center gap-3 hover:border-orange-500/50 transition-colors"
            data-testid="button-try-coach-p"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white font-bold text-sm">Try Coach P</p>
                <Badge className="bg-orange-500/15 text-orange-300 border-orange-500/20 text-[10px]">AI COACH</Badge>
              </div>
              <p className="text-zinc-400 text-xs mt-0.5">Reflect on your game and get a direct coaching response.</p>
            </div>
            <ChevronRight className="w-4 h-4 text-orange-400/70 shrink-0" />
          </button>
        </section>

        {/* Start training */}
        <section className="space-y-3" data-testid="section-start-training">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500 font-bold">START TRAINING</p>
              <h2 className="text-lg font-black text-white mt-1">Choose your next rep.</h2>
            </div>
            <Dumbbell className="w-5 h-5 text-orange-400" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Start a program", detail: "Follow a plan", path: "/programs", icon: Layers3, testId: "button-start-program" },
              { label: "Log a session", detail: "Track today's work", path: "/log", icon: Dumbbell, testId: "button-start-log" },
              { label: "Drill library", detail: "Find your next drill", path: "/drills", icon: BookOpen, testId: "button-start-drills" },
            ].map(({ label, detail, path, icon: Icon, testId }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 text-left hover:border-orange-500/40 transition-colors"
                data-testid={testId}
              >
                <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-orange-400" />
                </div>
                <p className="text-white font-bold text-xs leading-tight">{label}</p>
                <p className="text-zinc-600 text-[11px] mt-1 leading-tight">{detail}</p>
              </button>
            ))}
          </div>
        </section>

        {fixData?.primaryFixDrill && (
          <div className="rounded-2xl overflow-hidden border border-orange-500/30 bg-gradient-to-br from-orange-500/20 via-orange-500/8 to-transparent p-5" data-testid="card-unlocked-fix-drill">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Target className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-xs text-orange-400 font-bold uppercase tracking-wider">Your unlocked fix</p>
            </div>
            <h2 className="text-xl font-black text-white">{fixData.primaryFixDrill.title}</h2>
            <p className="text-sm text-zinc-400 mt-1 line-clamp-2">
              {fixData.diagnosticSummary || fixData.primaryFixDrill.description || "A focused drill built around your diagnostic."}
            </p>
            <Button
              size="sm"
              className="mt-4 bg-orange-500 hover:bg-orange-400 text-black font-bold"
              onClick={() => navigate(`/drill/${fixData.primaryFixDrill.id}`)}
              data-testid="button-open-fix-drill"
            >
              Start your fix <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {fixData?.quizId && !fixData.fullProfileCompleted && (
          <button
            onClick={() => navigate("/career")}
            className="w-full text-left rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 hover:border-zinc-700 transition-colors"
            data-testid="banner-full-profile-assessment"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-white font-bold">Go deeper when you’re ready</p>
                <p className="text-xs text-zinc-500 mt-0.5">Complete the full 17-question player assessment.</p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </div>
          </button>
        )}

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

      </div>
    </div>
  );
}
