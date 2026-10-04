import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { nativeFetch, statsUrl } from "@/lib/queryClient";
import {
  HUB_STAT_DEFINITIONS,
  HUB_STAT_ACCENTS,
  HUB_STAT_STORAGE_KEY,
  readHubStatOrder,
  type HubStatKey,
  type HubStatOrder,
} from "@/lib/dashboard-stats";
import { useEffect, useState } from "react";
import {
  Flame,
  ChevronRight,
  ChevronLeft,
  Target,
  Dumbbell,
  Clock3,
  X,
  Play,
  PlayCircle,
  ClipboardCheck,
  UserRound,
  MessageCircle,
  BookOpen,
  BookMarked,
  Layers3,
  Radar,
} from "lucide-react";
import introTrailer from "@assets/Welcome_To_PLAYR1_1781991119550.mp4";

type WeeklyStatPoint = { date: string; minutes: number; sessions: number };
type WeeklyTrendPoint = {
  shotsMade: number;
  shotsAttempted: number;
  threesMade: number;
  threesAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  layupsMade: number;
  layupsAttempted: number;
  midRangeMade: number;
  midRangeAttempted: number;
};
type CategoryStatPoint = { category: string; minutes: number; sessions: number };

const HUB_STAT_GLOW_COLORS: Partial<Record<HubStatKey, string>> = {
  totalDrills: "#38bdf8",
  workoutsCompleted: "#22d3ee",
  streak: "#f97316",
  activeDays: "#a78bfa",
  hoursTrained: "#34d399",
  shotsMade: "#fb7185",
  shotsAttempted: "#fbbf24",
  threePointersMade: "#a3e635",
  threePointersAttempted: "#ffffff",
  freeThrowsMade: "#60a5fa",
  freeThrowsAttempted: "#38bdf8",
  midRangeMade: "#f472b6",
  midRangeAttempted: "#e879f9",
  layupsMade: "#e879f9",
  layupsAttempted: "#c084fc",
  fgPct: "#f87171",
  threePointPct: "#a3e635",
  freeThrowPct: "#60a5fa",
  midRangePct: "#f472b6",
  layupPct: "#c084fc",
  conditioningTime: "#f97316",
  ballHandlingMinutes: "#2dd4bf",
  ballHandlingDrills: "#22d3ee",
  finishingMinutes: "#e879f9",
  finishingDrills: "#f472b6",
  defenseMinutes: "#818cf8",
  defenseDrills: "#a78bfa",
  shootingMinutes: "#f87171",
  shootingDrills: "#fb7185",
  passingMinutes: "#38bdf8",
  passingDrills: "#60a5fa",
  basketballIqMinutes: "#facc15",
  basketballIqDrills: "#fbbf24",
  filmSessionMinutes: "#a1a1aa",
  filmSessionDrills: "#a8a29e",
  workoutsMinutes: "#4ade80",
  workoutsDrills: "#34d399",
};

function greeting(firstName?: string | null) {
  const h = new Date().getHours();
  const word = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${word}${firstName ? `, ${firstName}` : ""}`;
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default function HubPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const search = useSearch();
  const onboardingPreview = new URLSearchParams(search).get("preview") === "onboarding";
  const [testHubView, setTestHubView] = useState<"onboarding" | "everyday" | null>(null);
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

  const { data: careerData } = useQuery<any>({ queryKey: ["/api/career"] });
  const { data: overview, isLoading: overviewLoading } = useQuery<any>({
    queryKey: ["/api/stats/overview", "hub-monthly"],
    queryFn: async () => {
      const res = await nativeFetch(statsUrl("/api/stats/overview", "monthly"));
      if (!res.ok) throw new Error("Failed to fetch monthly stats");
      return res.json();
    },
  });
  const { data: weeklyStats, isLoading: weeklyStatsLoading } = useQuery<WeeklyStatPoint[]>({
    queryKey: ["/api/stats/weekly", "hub"],
    queryFn: async () => {
      const res = await nativeFetch(statsUrl("/api/stats/weekly", "weekly"));
      if (!res.ok) throw new Error("Failed to fetch weekly recap");
      return res.json();
    },
  });
  const { data: monthlyStats, isLoading: monthlyStatsLoading } = useQuery<WeeklyStatPoint[]>({
    queryKey: ["/api/stats/weekly", "hub-monthly"],
    queryFn: async () => {
      const res = await nativeFetch(statsUrl("/api/stats/weekly", "monthly"));
      if (!res.ok) throw new Error("Failed to fetch monthly stats");
      return res.json();
    },
  });
  const { data: dashboardTraining, isLoading: dashboardTrainingLoading } = useQuery<Record<string, number>>({
    queryKey: ["/api/stats/dashboard-training", "hub-monthly"],
    queryFn: async () => {
      const res = await nativeFetch(statsUrl("/api/stats/dashboard-training", "monthly"));
      if (!res.ok) throw new Error("Failed to fetch dashboard training stats");
      return res.json();
    },
  });
  const { data: monthlyCategoryStats, isLoading: monthlyCategoryStatsLoading } = useQuery<CategoryStatPoint[]>({
    queryKey: ["/api/stats/by-category", "hub-monthly"],
    queryFn: async () => {
      const res = await nativeFetch(statsUrl("/api/stats/by-category", "monthly"));
      if (!res.ok) throw new Error("Failed to fetch category stats");
      return res.json();
    },
  });
  const { data: monthlyTrends, isLoading: monthlyTrendsLoading } = useQuery<WeeklyTrendPoint[]>({
    queryKey: ["/api/stats/trends", "hub-monthly"],
    queryFn: async () => {
      const res = await nativeFetch(statsUrl("/api/stats/trends", "monthly"));
      if (!res.ok) throw new Error("Failed to fetch monthly shooting stats");
      return res.json();
    },
  });
  const { data: supportUnread } = useQuery<{ available: boolean; unreadCount: number }>({
    queryKey: ["/api/support/unread", user?.id],
    queryFn: async () => {
      const response = await nativeFetch("/api/support/unread", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load message notifications");
      return response.json();
    },
    enabled: !!user,
    staleTime: 0,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });
  const profileIncomplete = !user?.lastName || !careerData?.positions?.length || !careerData?.aspiration;
  const showProfileSetup = onboardingPreview || (import.meta.env.DEV && testHubView !== null
    ? testHubView === "onboarding"
    : profileIncomplete);
  const { data: setupData } = useQuery<{ answers?: Record<string, any> }>({
    queryKey: ["/api/player-setup"],
    enabled: !!user && !showProfileSetup,
    staleTime: 60_000,
  });

  const firstName = user?.firstName;
  const greetText = greeting(firstName);
  const streak = overview?.streak ?? 0;
  const totalSessions = overview?.totalSessions ?? 0;
  const totalMinutes = overview?.totalMinutes ?? 0;
  const activeDays = monthlyStats?.filter((day) => day.sessions > 0).length ?? 0;
  const maxDailyMinutes = Math.max(...(weeklyStats?.map((day) => day.minutes) ?? [0]), 1);
  const maxDailySessions = Math.max(...(weeklyStats?.map((day) => day.sessions) ?? [0]), 1);
  const trendTotals = monthlyTrends?.reduce((totals, day) => ({
    shotsMade: totals.shotsMade + day.shotsMade,
    shotsAttempted: totals.shotsAttempted + day.shotsAttempted,
    threesMade: totals.threesMade + day.threesMade,
    threesAttempted: totals.threesAttempted + day.threesAttempted,
    freeThrowsMade: totals.freeThrowsMade + day.freeThrowsMade,
    freeThrowsAttempted: totals.freeThrowsAttempted + day.freeThrowsAttempted,
    layupsMade: totals.layupsMade + day.layupsMade,
    layupsAttempted: totals.layupsAttempted + day.layupsAttempted,
    midRangeMade: totals.midRangeMade + day.midRangeMade,
    midRangeAttempted: totals.midRangeAttempted + day.midRangeAttempted,
  }), {
    shotsMade: 0,
    shotsAttempted: 0,
    threesMade: 0,
    threesAttempted: 0,
    freeThrowsMade: 0,
    freeThrowsAttempted: 0,
    layupsMade: 0,
    layupsAttempted: 0,
    midRangeMade: 0,
    midRangeAttempted: 0,
  }) ?? {
    shotsMade: 0,
    shotsAttempted: 0,
    threesMade: 0,
    threesAttempted: 0,
    freeThrowsMade: 0,
    freeThrowsAttempted: 0,
    layupsMade: 0,
    layupsAttempted: 0,
    midRangeMade: 0,
    midRangeAttempted: 0,
  };
  const categoryStatsByKey = new Map((monthlyCategoryStats ?? []).map((stat) => [stat.category, stat]));
  const [statOrder, setStatOrder] = useState<HubStatOrder>(() => readHubStatOrder());
  const [activeGroup, setActiveGroup] = useState(0);
  const [activeStatIndexes, setActiveStatIndexes] = useState<[number, number, number]>([0, 0, 0]);

  useEffect(() => {
    localStorage.setItem(HUB_STAT_STORAGE_KEY, JSON.stringify(statOrder));
  }, [statOrder]);

  const formatMinutes = (minutes: number) => minutes >= 60
    ? `${Math.round((minutes / 60) * 10) / 10}h`
    : `${minutes}m`;
  const percentage = (made: number, attempted: number) => attempted > 0 ? Math.round((made / attempted) * 100) : 0;
  const categoryStatValue = (category: string, field: "minutes" | "sessions") =>
    categoryStatsByKey.get(category)?.[field] ?? 0;
  const rawStatValues: Partial<Record<HubStatKey, number>> = {
    totalDrills: totalSessions,
    workoutsCompleted: dashboardTraining?.workoutsCompleted ?? 0,
    streak,
    activeDays,
    hoursTrained: Math.round((totalMinutes / 60) * 10) / 10,
    shotsMade: trendTotals.shotsMade,
    shotsAttempted: trendTotals.shotsAttempted,
    threePointersMade: trendTotals.threesMade,
    threePointersAttempted: trendTotals.threesAttempted,
    freeThrowsMade: trendTotals.freeThrowsMade,
    freeThrowsAttempted: trendTotals.freeThrowsAttempted,
    midRangeMade: trendTotals.midRangeMade,
    midRangeAttempted: trendTotals.midRangeAttempted,
    layupsMade: trendTotals.layupsMade,
    layupsAttempted: trendTotals.layupsAttempted,
    threePointPct: percentage(trendTotals.threesMade, trendTotals.threesAttempted),
    freeThrowPct: percentage(trendTotals.freeThrowsMade, trendTotals.freeThrowsAttempted),
    midRangePct: percentage(trendTotals.midRangeMade, trendTotals.midRangeAttempted),
    layupPct: percentage(trendTotals.layupsMade, trendTotals.layupsAttempted),
    fgPct: dashboardTraining?.fgPct ?? percentage(trendTotals.shotsMade, trendTotals.shotsAttempted),
    conditioningTime: categoryStatValue("workouts", "minutes"),
    ballHandlingMinutes: categoryStatValue("ball-handling", "minutes"),
    ballHandlingDrills: categoryStatValue("ball-handling", "sessions"),
    finishingMinutes: categoryStatValue("finishing", "minutes"),
    finishingDrills: categoryStatValue("finishing", "sessions"),
    defenseMinutes: categoryStatValue("defense", "minutes"),
    defenseDrills: categoryStatValue("defense", "sessions"),
    shootingMinutes: categoryStatValue("shooting", "minutes"),
    shootingDrills: categoryStatValue("shooting", "sessions"),
    passingMinutes: categoryStatValue("passing", "minutes"),
    passingDrills: categoryStatValue("passing", "sessions"),
    basketballIqMinutes: categoryStatValue("basketball-iq", "minutes"),
    basketballIqDrills: categoryStatValue("basketball-iq", "sessions"),
    filmSessionMinutes: categoryStatValue("film-session", "minutes"),
    filmSessionDrills: categoryStatValue("film-session", "sessions"),
    workoutsMinutes: categoryStatValue("workouts", "minutes"),
    workoutsDrills: categoryStatValue("workouts", "sessions"),
  };
  const formatStatValue = (key: HubStatKey, value: number) => {
    if (key === "hoursTrained") return `${value}h`;
    if (key === "conditioningTime" || key.endsWith("Minutes")) return formatMinutes(value);
    if (key.endsWith("Pct")) return `${value}%`;
    return `${value}`;
  };
  const iconForStat = (key: HubStatKey) => {
    if (key === "streak") return Flame;
    if (key.endsWith("Minutes") || key === "hoursTrained" || key === "conditioningTime") return Clock3;
    if (key.includes("Drills") || key === "totalDrills" || key === "workoutsCompleted") return Dumbbell;
    if (key.includes("Pct")) return Target;
    return Target;
  };
  const recapMetrics: Record<HubStatKey, {
    key: HubStatKey;
    label: string;
    valueLabel: string;
    detail: string;
    icon: typeof Flame;
    tabClass: string;
    iconClass: string;
    glowClass: string;
    glowColor: string;
    barValue: (day: WeeklyStatPoint) => number;
  }> = Object.fromEntries(HUB_STAT_DEFINITIONS.map((definition) => {
    const key = definition.key;
    const rawValue = rawStatValues[key] ?? 0;
    const accent = HUB_STAT_ACCENTS[key];
    const Icon = iconForStat(key);
    const isWorkload = key === "hoursTrained" || key === "conditioningTime" || key.endsWith("Minutes");
    return [key, {
      key,
      label: definition.label,
      valueLabel: formatStatValue(key, rawValue),
      detail: definition.description,
      icon: Icon,
      tabClass: `${accent.cardClass} ${accent.textClass}`,
      iconClass: `${accent.cardClass} ${accent.textClass}`,
      glowClass: accent.cardClass.replace("border-", "from-").replace(/ bg-[^ ]+/, " via-transparent"),
      glowColor: HUB_STAT_GLOW_COLORS[key] ?? "#f97316",
      barValue: (day: WeeklyStatPoint) => isWorkload
        ? day.minutes / maxDailyMinutes
        : (key === "totalDrills" || key.endsWith("Drills") ? day.sessions / maxDailySessions : day.sessions > 0 ? 1 : 0.08),
    }];
  })) as Record<HubStatKey, {
    key: HubStatKey;
    label: string;
    valueLabel: string;
    detail: string;
    icon: typeof Flame;
    tabClass: string;
    iconClass: string;
    glowClass: string;
    glowColor: string;
    barValue: (day: WeeklyStatPoint) => number;
  }>;
  const statPages = [0, 1, 2].map((page) => statOrder.slice(page * 3, page * 3 + 3));
  const activePage = statPages[activeGroup] ?? statPages[0];
  const activeStatIndex = activeStatIndexes[activeGroup] ?? 0;
  const activeRecap = activePage[activeStatIndex] ?? activePage[0] ?? "streak";
  const activeRecapMetric = recapMetrics[activeRecap] ?? recapMetrics.streak;
  const ActiveRecapIcon = activeRecapMetric.icon;
  const selectGroup = (groupIndex: number) => {
    setActiveGroup(groupIndex);
  };
  const cycleRecapStat = (direction: 1 | -1) => {
    const nextStat = (activeStatIndex + direction + activePage.length) % activePage.length;
    setActiveStatIndexes((current) => {
      const next = [...current] as [number, number, number];
      next[activeGroup] = nextStat;
      return next;
    });
  };

  const weeklyRecapSection = (
    <section className="space-y-3" data-testid="card-progress-preview">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500 font-bold">TRAINING SNAPSHOT</p>
          <h2 className="text-lg font-black text-white mt-1">See your work add up.</h2>
        </div>
        <button
            type="button"
            onClick={() => navigate("/progress?from=hub")}
            className="group flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-orange-400 transition hover:text-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-sm"
            data-testid="button-view-progress"
          >
            Full dashboard
            <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </button>
      </div>
      <div className="flex items-center justify-between">
         <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-600">Past month</p>
        <span className="text-[11px] text-zinc-600">Category {activeGroup + 1} of 3 · {activeDays} active {activeDays === 1 ? "day" : "days"}</span>
      </div>
      {overviewLoading || weeklyStatsLoading || monthlyStatsLoading || dashboardTrainingLoading || monthlyCategoryStatsLoading || monthlyTrendsLoading ? (
        <div className="space-y-2.5" aria-label="Loading weekly recap">
          <Skeleton className="h-[164px] rounded-2xl" data-testid="hub-recap-loading" />
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((slot) => (
              <Skeleton key={slot} className="h-[68px] rounded-xl" data-testid={`hub-stat-slot-${slot}-loading`} />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div
            className={`relative overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 p-4 ${
              activeRecap === "streak" ? "ring-1 ring-orange-500/40" : ""
            }`}
            aria-live="polite"
            data-testid="card-active-weekly-recap"
          >
            <div
              className="absolute inset-0 opacity-20"
              style={{ background: `linear-gradient(135deg, ${activeRecapMetric.glowColor} 0%, transparent 62%)` }}
            />
            <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/[0.03] blur-2xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${activeRecapMetric.iconClass}`}>
                  <ActiveRecapIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    {activeRecap === "streak" ? "YOUR DAILY ANCHOR" : activeRecapMetric.label}
                  </p>
                  <p className="mt-1 text-xs text-zinc-300">{activeRecapMetric.detail}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => cycleRecapStat(-1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/60 text-zinc-400 transition hover:border-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  aria-label={`Show previous stat in category ${activeGroup + 1}`}
                  data-testid="button-previous-weekly-recap"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => cycleRecapStat(1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/60 text-zinc-400 transition hover:border-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  aria-label={`Show next stat in category ${activeGroup + 1}`}
                  data-testid="button-next-weekly-recap"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="relative mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-4xl font-black leading-none text-white">
                  {activeRecapMetric.valueLabel}
                </p>
                <p className="mt-2 text-[11px] font-medium text-zinc-500">Use the arrows to browse this group.</p>
              </div>
              <div className="flex h-11 items-end gap-1" aria-label="Seven day activity">
                {(weeklyStats ?? []).map((day) => (
                  <span
                    key={day.date}
                    className={`w-1.5 rounded-full ${activeRecapMetric.iconClass.split(" ").find((token) => token.startsWith("bg-")) ?? "bg-orange-500/70"}`}
                    style={{ height: `${Math.max(6, Math.round(activeRecapMetric.barValue(day) * 40))}px` }}
                    title={`${day.date}: ${day.sessions} ${day.sessions === 1 ? "session" : "sessions"}, ${day.minutes} min`}
                  />
                ))}
              </div>
            </div>
            <div className="relative mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">
              <span>{activeRecap === "streak" ? "Keep the run alive" : "7-day activity"}</span>
              <span>Stat {activeStatIndex + 1} of {activePage.length} in category {activeGroup + 1}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Hub stat groups">
            {statPages.map((group, groupIndex) => {
              const groupStatIndex = activeStatIndexes[groupIndex] ?? 0;
              const groupMetric = recapMetrics[group[groupStatIndex] ?? group[0] ?? "streak"];
              const GroupMetricIcon = groupMetric.icon;
              const isActive = groupIndex === activeGroup;
              return (
                <button
                    key={groupIndex}
                    type="button"
                    onClick={() => selectGroup(groupIndex)}
                    aria-pressed={isActive}
                    className={`min-w-0 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                      isActive ? `${groupMetric.tabClass} border-zinc-500` : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500"
                    }`}
                    data-testid={`hub-stat-slot-${groupIndex}`}
                  >
                    <span className="flex items-center justify-between gap-1">
                      <GroupMetricIcon className="h-3.5 w-3.5 shrink-0" />
                      {isActive && <span className="text-[8px] font-bold uppercase tracking-wider">Active</span>}
                    </span>
                    <span className="mt-1.5 block truncate text-base font-black leading-none text-white">{groupMetric.valueLabel}</span>
                    <span className="mt-1 block truncate text-[9px] uppercase tracking-wide text-zinc-500">{groupMetric.label}</span>
                  </button>
              );
            })}
          </div>
        </>
      )}
    </section>
  );

  const improvementFocus = typeof setupData?.answers?.skillRankings?.improveMost === "string"
    ? setupData.answers.skillRankings.improveMost
    : null;
  const coachPrompt = improvementFocus
    ? `What is one adjustment I can make to show my ${improvementFocus.toLowerCase()} when the game speeds up?`
    : "What is the one adjustment that would make the biggest difference in my next game?";

  const customDrillsSection = (
    <section
      className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 sm:p-5"
      data-testid="section-custom-drills"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-500/25 bg-orange-500/10 text-orange-300">
            <Dumbbell className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Custom Drills</p>
            <h2 className="mt-1 text-lg font-black text-white">Your drills, your way.</h2>
            <p className="mt-1 text-sm text-zinc-400">Find and manage the drills you have created for your training.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/drills?tab=my-drills")}
          className="flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white transition hover:border-orange-400/50 sm:w-auto"
          data-testid="button-hub-custom-drills"
        >
          Open Custom Drills
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );

  const coachPromptSection = (
    <button
      type="button"
      onClick={() => navigate(`/coach-p?prompt=${encodeURIComponent(coachPrompt)}`)}
      className="group w-full rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/15 via-zinc-900 to-zinc-950 p-4 text-left transition hover:border-orange-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 sm:p-5"
      data-testid="button-hub-coach-p-prompt"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/15 text-orange-300">
          <MessageCircle className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">A question for Coach P</span>
          <span className="mt-1 block text-base font-bold leading-snug text-white sm:text-lg">{coachPrompt}</span>
          <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-orange-300">
            Explore this with Coach P
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </span>
        </span>
      </div>
    </button>
  );

  return (
    <div className="min-h-full bg-background pb-6">
      {/* Greeting Header */}
      <div className="px-5 pt-6 pb-2">
        {onboardingPreview && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-400/25 bg-orange-400/[0.06] px-3 py-2.5" data-testid="hub-onboarding-preview-banner">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300">Onboarding Hub preview</p>
              <p className="mt-0.5 text-xs text-zinc-300">This preview does not change your saved profile or normal Hub view.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/hub")}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-white/[0.08]"
              data-testid="button-hub-exit-onboarding-preview"
            >
              My normal Hub
            </button>
          </div>
        )}
        {import.meta.env.DEV && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-amber-500/35 bg-amber-500/[0.06] px-3 py-2" data-testid="hub-test-view-toggle">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">Test tools · development only</span>
              <button
                type="button"
                onClick={() => navigate("/coach-p?welcomeWorkout=1")}
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/30 bg-amber-400/10 px-2.5 py-1.5 text-[10px] font-bold text-amber-200 transition hover:bg-amber-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                data-testid="button-test-welcome-workout"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                Test welcome chat
              </button>
            </div>
            <div className="inline-flex rounded-lg border border-white/10 bg-black/30 p-0.5" role="group" aria-label="Hub view for testing">
              {([
                ["onboarding", "Onboarding"],
                ["everyday", "Everyday"],
              ] as const).map(([view, label]) => {
                const isSelected = testHubView === view
                  || (testHubView === null && profileIncomplete === (view === "onboarding"));
                return (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setTestHubView(view)}
                    aria-pressed={isSelected}
                    className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold transition ${
                      isSelected ? "bg-orange-500 text-black" : "text-zinc-400 hover:text-white"
                    }`}
                    data-testid={`button-hub-test-view-${view}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-zinc-400 text-sm">{formatDate()}</p>
            <h1 className="text-2xl font-bold text-white mt-0.5">
              {greetText}
            </h1>
          </div>
          {!showProfileSetup && streak > 0 && (() => {
              const sa = streak >= 30
                ? { bg: "bg-red-500/20", border: "border-red-400/50", color: "text-red-200", flames: 3, pulse: true, scale: "scale-125", glow: "shadow-[0_0_24px_rgba(248,113,113,0.55)]" }
                : streak >= 14
                  ? { bg: "bg-orange-500/20", border: "border-orange-400/50", color: "text-orange-200", flames: 3, pulse: true, scale: "scale-115", glow: "shadow-[0_0_20px_rgba(251,146,60,0.45)]" }
                  : streak >= 7
                    ? { bg: "bg-orange-500/15", border: "border-orange-400/40", color: "text-orange-300", flames: 2, pulse: false, scale: "scale-110", glow: "shadow-[0_0_15px_rgba(251,146,60,0.32)]" }
                    : streak >= 3
                      ? { bg: "bg-orange-500/10", border: "border-orange-500/30", color: "text-orange-400", flames: 1, pulse: false, scale: "scale-105", glow: "" }
                      : { bg: "bg-orange-500/10", border: "border-orange-500/20", color: "text-orange-400", flames: 1, pulse: false, scale: "scale-100", glow: "" };
              return (
                 <div
                  data-testid="button-streak"
                   role="img"
                   aria-label={`${streak} day training streak`}
                   title={`${streak} day training streak`}
                   className={`group flex cursor-default items-center gap-1.5 rounded-2xl border px-3 py-2 mt-1 transition-all hover:scale-105 ${sa.bg} ${sa.border} ${sa.glow}`}
                >
                   <span className={`relative flex items-center transition-transform duration-300 ${sa.scale} group-hover:scale-110`}>
                     <Flame className={`h-4 w-4 ${sa.color} ${sa.pulse ? "animate-pulse" : ""}`} />
                     {sa.flames >= 2 && <Flame className={`-ml-2.5 h-3 w-3 ${sa.color} opacity-75`} />}
                     {sa.flames >= 3 && <Flame className={`-ml-2.5 h-3 w-3 ${sa.color} opacity-55`} />}
                   </span>
                  <span className={`${sa.color} font-bold text-sm`}>{streak}</span>
                 </div>
              );
            })()}
        </div>
      </div>

      <div className="px-4 space-y-4 mt-4">
        {showProfileSetup && (
          <>
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

            <section className="space-y-3" data-testid="section-post-onboarding">
              {trailerDismissed && (
                <button
                  onClick={replayTrailer}
                  className="w-full text-left rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 flex items-center gap-3 hover:border-orange-500/40 transition-colors"
                  data-testid="button-replay-trailer"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
                    <PlayCircle className="h-5 w-5 text-orange-400" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-white">PLAYR1 App Trailer</span>
                    <span className="mt-0.5 block text-xs text-zinc-500">Watch the intro again.</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600" />
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="w-full rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/15 via-zinc-900 to-zinc-950 p-4 text-left transition hover:border-orange-400/60"
                data-testid="button-complete-profile"
              >
                <span className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-500/25 bg-orange-500/10 text-orange-300">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-black text-white">Complete Your Profile</span>
                    <span className="mt-1 block text-sm text-zinc-400">Add the player details that make your training plan yours.</span>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-orange-300">
                      Edit Profile
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </span>
                </span>
              </button>
            </section>
          </>
        )}

        {!showProfileSetup && weeklyRecapSection}
        {!showProfileSetup && customDrillsSection}

        {/* Start training */}
        <section className="space-y-3" data-testid="section-start-training">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500 font-bold">START TRAINING</p>
              <h2 className="text-lg font-black text-white mt-1">Choose your next rep.</h2>
            </div>
            <Dumbbell className="w-5 h-5 text-orange-400" />
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Log a session", detail: "Track today's work", path: "/log", icon: Dumbbell, testId: "button-start-log" },
              { label: "Start a program", detail: "Follow a plan", path: "/programs", icon: Layers3, testId: "button-start-program" },
              { label: "Drill library", detail: "Find your next drill", path: "/drills", icon: BookOpen, testId: "button-start-drills" },
              { label: "Custom workout", detail: "Request a session built for you", path: "/custom-workouts", icon: ClipboardCheck, testId: "button-start-custom-workout" },
            ].map(({ label, detail, path, icon: Icon, testId }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="group flex min-h-[104px] cursor-pointer flex-col gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-left text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
                data-testid={testId}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-heading text-sm uppercase tracking-wide leading-tight">{label}</span>
                  <span className="mt-0.5 block text-[11px] text-zinc-500">{detail}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {!showProfileSetup && (
        <section className="space-y-3" aria-label="Player shortcuts" data-testid="section-hub-player-tools">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">PLAYR1 TOOLS</p>
          <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate("/streak-challenges/fifty-in-a-row?returnTo=%2Fhub")}
              className="group flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-1 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
              aria-label="3 Point Challenge"
              data-testid="button-hub-3-point-challenge"
            >
              <span className="flex h-[68px] w-[68px] items-center justify-center rounded-[20px] border border-orange-300/70 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700 shadow-[0_7px_22px_rgba(249,115,22,0.24)] transition group-hover:scale-[1.03]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-white/90 bg-zinc-950 shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
                  <Play className="h-5 w-5 fill-white text-white" />
                </span>
              </span>
              <span className="text-[10px] font-bold leading-tight text-zinc-300">3 Point Challenge</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/journal")}
              className="group flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-1 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              aria-label="Journal"
              data-testid="button-hub-journal"
            >
              <span className="relative flex h-[68px] w-[68px] items-center justify-center rounded-[18px] border border-[#f2e6cc] bg-gradient-to-br from-[#eee1c4] to-[#c9b894] shadow-[0_5px_18px_rgba(0,0,0,0.28)] transition group-hover:-translate-y-0.5">
                <span className="absolute inset-y-2 left-2 w-px bg-[#9c8765]/60" />
                <BookMarked className="h-8 w-8 text-[#423727]" strokeWidth={1.8} />
                <span className="absolute right-3 top-0 h-4 w-2 rounded-b-sm bg-orange-600" />
              </span>
              <span className="text-[10px] font-bold leading-tight text-zinc-300">Journal</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/lead-magnets")}
              className="group flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-1 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              aria-label="Game Insights"
              data-testid="button-hub-game-insights"
            >
              <span className="relative flex h-[68px] w-[68px] items-center justify-center rounded-[20px] border border-orange-300/30 bg-[radial-gradient(circle_at_35%_25%,rgba(249,115,22,0.24),rgba(24,24,27,0.96)_72%)] shadow-[0_0_18px_rgba(249,115,22,0.14)] transition group-hover:scale-[1.04]">
                <Radar className="h-8 w-8 text-orange-200" strokeWidth={1.8} />
                <span className="absolute right-4 top-4 h-1.5 w-1.5 rounded-full bg-orange-300 shadow-[0_0_8px_rgba(253,186,116,0.9)]" />
              </span>
              <span className="text-[10px] font-bold leading-tight text-zinc-300">Game Insights</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/contact")}
              className="group relative flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-1 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              aria-label={(supportUnread?.unreadCount || 0) > 0 ? `Talk Through Your Game, ${supportUnread?.unreadCount} unread messages` : "Talk Through Your Game"}
              data-testid="button-hub-talk-through-game"
            >
              {(supportUnread?.unreadCount || 0) > 0 && (
                <span className="absolute right-1 top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {supportUnread?.unreadCount}
                </span>
              )}
              <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full border border-orange-200/80 bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 shadow-[0_0_16px_rgba(249,115,22,0.42),inset_0_2px_5px_rgba(255,255,255,0.4)] transition group-hover:scale-[1.04]">
                <MessageCircle className="h-8 w-8 text-zinc-950" strokeWidth={2.6} />
              </span>
              <span className="max-w-[100px] text-[10px] font-bold leading-tight text-zinc-300">Talk Through Your Game</span>
            </button>
          </div>
        </section>
        )}

        {!showProfileSetup && coachPromptSection}

      </div>
    </div>
  );
}
