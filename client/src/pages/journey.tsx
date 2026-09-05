import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ChevronRight,
  Target,
  Zap,
  Trophy,
  Dumbbell,
  Bot,
  CheckCircle2,
  Flame,
  Star,
  Fingerprint,
} from "lucide-react";
import type { GoalProgram } from "@shared/schema";

type GoalData = {
  goal: any;
  clarifications: any[];
  milestones: any[];
  checkIns: any[];
} | null;

const TIER_ORDER = ["prospect", "rising", "starter", "star", "elite", "playr1"];
const TIER_XP: Record<string, number> = {
  prospect: 0, rising: 500, starter: 1500, star: 3500, elite: 7000, playr1: 12000,
};
const TIER_LABEL: Record<string, string> = {
  prospect: "Prospect", rising: "Rising", starter: "Starter",
  star: "Star", elite: "Elite", playr1: "PLAYR1",
};
const TIER_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  prospect: { text: "text-zinc-400", bg: "bg-zinc-700/40", border: "border-zinc-600/40" },
  rising: { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  starter: { text: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  star: { text: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  elite: { text: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
  playr1: { text: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
};

function SectionHeader({ label, action, onAction }: { label: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-white font-semibold text-base">{label}</h2>
      {action && (
        <button onClick={onAction} className="flex items-center gap-1 text-orange-400 text-sm">
          {action} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default function JourneyPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: profile } = useQuery<any>({ queryKey: ["/api/profile"] });
  const { data: archetypes, isLoading: archLoading } = useQuery<any[]>({
    queryKey: ["/api/archetypes/user"],
    enabled: !!user,
  });
  const { data: goalData, isLoading: goalLoading } = useQuery<GoalData>({
    queryKey: ["/api/goals/active"],
    queryFn: () =>
      fetch("/api/goals/active", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => d ?? null),
    enabled: !!user,
  });
  const { data: career, isLoading: careerLoading } = useQuery<any>({ queryKey: ["/api/career"] });
  const { data: overview } = useQuery<any>({ queryKey: ["/api/stats/overview"] });

  const firstName = profile?.firstName ?? user?.firstName;
  const lastName = profile?.lastName ?? user?.lastName;
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Player";

  const mainArch = archetypes?.find((a: any) => a.role === "main");
  const secondaryArch = archetypes?.find((a: any) => a.role === "secondary");
  const activeGoal = goalData?.goal?.status === "active" ? goalData : null;
  const clarifyingGoal = goalData?.goal?.status === "clarifying" ? goalData : null;

  const goalPct = activeGoal
    ? Math.round(((activeGoal.goal.currentWeek - 1) / activeGoal.goal.totalWeeks) * 100)
    : 0;
  const completedMilestones = activeGoal?.milestones?.filter((m: any) => m.completed).length ?? 0;
  const totalMilestones = activeGoal?.milestones?.length ?? 0;
  const nextMilestone = activeGoal?.milestones?.find((m: any) => !m.completed);

  const streak = overview?.streak ?? 0;
  const totalSessions = overview?.totalSessions ?? 0;

  return (
    <div className="min-h-full bg-background pb-6">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <p className="text-zinc-400 text-sm uppercase tracking-widest text-xs">My Journey</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">{fullName}</h1>
        <div className="flex items-center gap-3 mt-2">
          {mainArch && (
            <Badge
              variant="outline"
              className="text-xs border-transparent"
              style={{
                color: mainArch.archetype.primaryHex,
                backgroundColor: mainArch.archetype.primaryHex + "18",
              }}
            >
              {mainArch.archetype.name}
            </Badge>
          )}
          {streak > 0 && (
            <div className="flex items-center gap-1 text-orange-400 text-xs">
              <Flame className="w-3.5 h-3.5" />
              {streak} day streak
            </div>
          )}
        </div>
      </div>

      <div className="px-4 space-y-6">

        {/* MY GOAL */}
        <section data-testid="section-my-goal">
          <SectionHeader
            label="My PLAYR1 Project"
            action={activeGoal || clarifyingGoal ? "View Project" : "Discover Your Project"}
            onAction={() => navigate("/my-goal")}
          />
          {goalLoading ? (
            <Skeleton className="h-36 rounded-2xl" />
          ) : activeGoal ? (
            <button
              data-testid="card-goal"
              onClick={() => navigate("/my-goal")}
              className="w-full text-left rounded-2xl bg-zinc-900 border border-zinc-800 p-5 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-start justify-between gap-2 mb-4">
                <p className="text-white font-semibold text-sm leading-snug line-clamp-2">
                  "{activeGoal.goal.goalText}"
                </p>
                <Badge variant="outline" className="flex-shrink-0 text-xs border-green-500/30 text-green-400 bg-green-500/10">
                  Active
                </Badge>
              </div>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Phase {activeGoal.goal.currentWeek} of {activeGoal.goal.totalWeeks}</span>
                  <span>{completedMilestones}/{totalMilestones} milestones</span>
                </div>
                <Progress value={goalPct} className="h-1.5 bg-zinc-800" />
              </div>
              {nextMilestone && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                  <span className="line-clamp-1">Next: {nextMilestone.title}</span>
                  <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-500 px-1.5 py-0 ml-auto flex-shrink-0">
                    Phase {nextMilestone.weekNumber}
                  </Badge>
                </div>
              )}
            </button>
          ) : clarifyingGoal ? (
            <button
              data-testid="card-goal-clarifying"
              onClick={() => navigate("/my-goal")}
              className="w-full text-left rounded-2xl bg-zinc-900 border border-zinc-800 p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <Bot className="w-4 h-4 text-orange-400" />
                <p className="text-orange-400 text-sm font-medium">Your AI Coach is asking questions…</p>
              </div>
              <p className="text-zinc-400 text-xs">Answer the last question to unlock your program.</p>
              <p className="mt-2 text-orange-400 text-xs font-medium">Continue →</p>
            </button>
          ) : (
            <button
              data-testid="card-goal-empty"
              onClick={() => navigate("/my-goal")}
              className="w-full text-left rounded-2xl bg-gradient-to-br from-orange-500/8 to-transparent border border-orange-500/15 p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Target className="w-4 h-4 text-orange-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Discover Your PLAYR1 Project</p>
                  <p className="text-zinc-400 text-xs">Coach P helps turn your basketball story into a path</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-orange-400 text-sm font-medium mt-3">
                Get started <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          )}
        </section>

        {/* ARCHETYPE / IDENTITY */}
        <section data-testid="section-archetype">
          <SectionHeader
            label="My Archetype"
            action="View Identity"
            onAction={() => navigate("/archetypes?tab=identity")}
          />
          {archLoading ? (
            <Skeleton className="h-32 rounded-2xl" />
          ) : mainArch ? (
            <div className="space-y-3">
              {[mainArch, secondaryArch].filter(Boolean).map((arch: any) => {
                const tierIdx = TIER_ORDER.indexOf(arch.tier);
                const nextTier = TIER_ORDER[tierIdx + 1];
                const currentThreshold = TIER_XP[arch.tier] ?? 0;
                const nextThreshold = nextTier ? TIER_XP[nextTier] : null;
                const pct = nextThreshold
                  ? Math.round(((arch.totalXp - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
                  : 100;
                const tc = TIER_COLORS[arch.tier] ?? TIER_COLORS.prospect;

                return (
                  <button
                    key={arch.id}
                    data-testid={`card-archetype-${arch.role}`}
                    onClick={() => navigate("/archetypes?tab=identity")}
                    className="w-full text-left rounded-2xl bg-zinc-900 border border-zinc-800 p-4 active:scale-[0.98] transition-transform"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center border"
                          style={{
                            backgroundColor: arch.archetype.primaryHex + "20",
                            borderColor: arch.archetype.primaryHex + "40",
                          }}
                        >
                          <Zap className="w-4 h-4" style={{ color: arch.archetype.primaryHex }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-white font-semibold text-sm">{arch.archetype.name}</p>
                            <Badge
                              variant="outline"
                              className={`text-xs py-0 px-1.5 capitalize ${tc.text} ${tc.bg} ${tc.border}`}
                            >
                              {TIER_LABEL[arch.tier]}
                            </Badge>
                          </div>
                          <p className="text-zinc-500 text-xs capitalize">{arch.role} archetype</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span>{arch.totalXp} XP</span>
                        {nextTier && <span>{nextThreshold! - arch.totalXp} to {TIER_LABEL[nextTier]}</span>}
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: arch.archetype.primaryHex,
                          }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              data-testid="card-archetype-empty"
              onClick={() => navigate("/archetypes")}
              className="w-full text-left rounded-2xl bg-zinc-900 border border-zinc-800 p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center">
                  <Fingerprint className="w-4 h-4 text-zinc-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Choose Your Archetype</p>
                  <p className="text-zinc-400 text-xs">Define your play style identity</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-orange-400 text-sm font-medium mt-2">
                Browse archetypes <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          )}
        </section>

        {/* CAREER STATS */}
        <section data-testid="section-career">
          <SectionHeader label="PLAYR1" action="Full Stats" onAction={() => navigate("/career")} />
          {careerLoading ? (
            <Skeleton className="h-24 rounded-2xl" />
          ) : (
            <button
              data-testid="card-career-stats"
              onClick={() => navigate("/career")}
              className="w-full text-left rounded-2xl bg-zinc-900 border border-zinc-800 p-4 active:scale-[0.98] transition-transform"
            >
              <div className="grid grid-cols-3 divide-x divide-zinc-800">
                {[
                  { label: "Sessions", value: totalSessions, icon: Dumbbell },
                  { label: "Streak", value: `${streak}🔥`, icon: Flame },
                  { label: "Trophies", value: career?.trophies?.length ?? 0, icon: Trophy },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex flex-col items-center py-1 px-2">
                    <p className="text-white font-bold text-lg">{value}</p>
                    <p className="text-zinc-500 text-xs">{label}</p>
                  </div>
                ))}
              </div>
            </button>
          )}
        </section>

        {/* QUICK ACTIONS */}
        <section>
          <SectionHeader label="Quick Actions" />
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Log Session", icon: Dumbbell, path: "/log" },
              { label: "Drill Library", icon: Star, path: "/drills" },
              { label: "Programs", icon: Trophy, path: "/programs" },
            ].map(({ label, icon: Icon, path }) => (
              <button
                key={label}
                data-testid={`button-quick-${label.replace(/\s/g, "-").toLowerCase()}`}
                onClick={() => navigate(path)}
                className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col items-center gap-2 active:scale-[0.98] transition-transform"
              >
                <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-zinc-300" />
                </div>
                <p className="text-zinc-300 text-xs font-medium text-center leading-tight">{label}</p>
              </button>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
