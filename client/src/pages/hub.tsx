import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { DrillCard } from "@/components/drill-card";
import { nativeFetch, statsUrl } from "@/lib/queryClient";
import {
  HUB_STAT_DEFINITIONS,
  HUB_STAT_ACCENTS,
  HUB_STAT_STORAGE_KEY,
  readHubStatOrder,
  type HubStatKey,
  type HubStatOrder,
} from "@/lib/dashboard-stats";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Flame,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  Target,
  Dumbbell,
  Clock3,
  X,
  CheckCircle2,
  Play,
  PlayCircle,
  UserRound,
  MessageCircle,
  BookOpen,
  BookMarked,
  Layers3,
  Radar,
} from "lucide-react";
import introTrailer from "@assets/Welcome_To_PLAYR1_1781991119550.mp4";
import type { Drill } from "@shared/schema";
import { selectDailyDrillSuggestions } from "@shared/daily-drill-recommendations";
import { getDailyCoachPrompt } from "@/lib/coach-p-hub-prompts";
import { OnboardingPreviewMenu } from "@/components/onboarding-preview-menu";

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
type PreviewShotKey = "threes" | "midrange" | "freeThrows";

const onboardingBaselines: Array<{
  id: "full" | "standard" | "quick";
  name: string;
  threes: number;
  midrange: number;
  freeThrows: number;
}> = [
  { id: "full", name: "Full session", threes: 100, midrange: 40, freeThrows: 25 },
  { id: "standard", name: "Balanced", threes: 50, midrange: 40, freeThrows: 25 },
  { id: "quick", name: "Quick session", threes: 50, midrange: 20, freeThrows: 15 },
];
const previewShotTypes: Array<{ key: PreviewShotKey; label: string; color: string }> = [
  { key: "threes", label: "3-pointers", color: "#ff7a24" },
  { key: "midrange", label: "Mid-range", color: "#35c4e8" },
  { key: "freeThrows", label: "Free throws", color: "#b28cff" },
];

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

// Keep the test panel available in source for later; flip this to true to show it in development.
const SHOW_HUB_DEV_TEST_TOOLS = false;

function greeting(firstName?: string | null) {
  const h = new Date().getHours();
  const word = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${word}${firstName ? `, ${firstName}` : ""}`;
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function HubPage() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const search = useSearch();
  const onboardingPreview = new URLSearchParams(search).get("preview") === "onboarding"
    || (location.split("?")[0] === "/admin/onboarding-preview" && new URLSearchParams(search).get("page") === "hub");
  const [baselineId, setBaselineId] = useState<"full" | "standard" | "quick">("standard");
  const [baselineLogging, setBaselineLogging] = useState(false);
  const [baselineComplete, setBaselineComplete] = useState(false);
  const [trailerPlaying, setTrailerPlaying] = useState(false);
  const [baselineResults, setBaselineResults] = useState<Record<PreviewShotKey, string>>({
    threes: "", midrange: "", freeThrows: "",
  });
  const [previewProfile] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("playr1-onboarding-preview") || "{}") as {
        playerName?: string; trainingFrequency?: number; frequencyUnit?: "week" | "month";
        trainingDays?: number; sessionLength?: number; nextSession?: string;
      };
    } catch {
      return {};
    }
  });
  const selectedBaseline = onboardingBaselines.find((option) => option.id === baselineId)!;
  const baselineTotal = selectedBaseline.threes + selectedBaseline.midrange + selectedBaseline.freeThrows;
  const [testHubView, setTestHubView] = useState<"onboarding" | "everyday" | null>(null);
  const [recommendationDay, setRecommendationDay] = useState(() => localDateKey(new Date()));
  const [trailerDismissed, setTrailerDismissed] = useState(() =>
    localStorage.getItem("playr1_intro_trailer_dismissed") === "1"
  );
  useEffect(() => {
    const now = new Date();
    const nextLocalDay = new Date(now);
    nextLocalDay.setHours(24, 0, 0, 0);
    const timeout = window.setTimeout(
      () => setRecommendationDay(localDateKey(new Date())),
      Math.max(1, nextLocalDay.getTime() - now.getTime() + 100),
    );
    return () => window.clearTimeout(timeout);
  }, [recommendationDay]);
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
  const profileIncomplete = !user?.lastName || !careerData?.positions?.length;
  const showProfileSetup = onboardingPreview || (import.meta.env.DEV && testHubView !== null
    ? testHubView === "onboarding"
    : profileIncomplete);
  const { data: setupData } = useQuery<{ answers?: Record<string, any> }>({
    queryKey: ["/api/player-setup"],
    enabled: !!user,
    staleTime: 60_000,
  });
  const {
    data: drillLibrary = [],
    isLoading: drillLibraryLoading,
    isError: drillLibraryError,
  } = useQuery<Drill[]>({
    queryKey: ["/api/drills"],
    enabled: !!user && !showProfileSetup,
    staleTime: 5 * 60_000,
  });
  const dailyDrillSuggestions = useMemo(() => selectDailyDrillSuggestions(
    drillLibrary,
    {
      userId: user?.id,
      positions: careerData?.positions ?? setupData?.answers?.positions,
      currentSituation: setupData?.answers?.currentSituation,
      experienceYears: setupData?.answers?.experienceYears,
      skillRankings: setupData?.answers?.skillRankings,
    },
    recommendationDay,
  ), [drillLibrary, user?.id, careerData?.positions, setupData, recommendationDay]);

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
  const selectStat = (statIndex: number) => {
    setActiveStatIndexes((current) => {
      const next = [...current] as [number, number, number];
      next[activeGroup] = statIndex;
      return next;
    });
  };
  const cycleRecapGroup = (direction: 1 | -1) => {
    setActiveGroup((current) => (current + direction + statPages.length) % statPages.length);
  };

  const weeklyRecapSection = (
    <section className="space-y-3" data-testid="card-progress-preview">
      <div className="flex items-end justify-between">
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
                  onClick={() => cycleRecapGroup(-1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/60 text-zinc-400 transition hover:border-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  aria-label="Show previous stat group"
                  data-testid="button-previous-weekly-recap"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => cycleRecapGroup(1)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/60 text-zinc-400 transition hover:border-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  aria-label="Show next stat group"
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
                <p className="mt-2 text-[11px] font-medium text-zinc-500">Choose a stat below or switch groups with the arrows.</p>
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
              <span>Group {activeGroup + 1} of {statPages.length}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Training Snapshot</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-600">Past month</p>
          </div>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label={`Stats in group ${activeGroup + 1}`}>
            {activePage.map((statKey, statIndex) => {
              const groupMetric = recapMetrics[statKey] ?? recapMetrics.streak;
              const GroupMetricIcon = groupMetric.icon;
              const isActive = statIndex === activeStatIndex;
              return (
                <button
                    key={statKey}
                    type="button"
                    onClick={() => selectStat(statIndex)}
                    aria-pressed={isActive}
                    aria-label={`Show ${groupMetric.label}`}
                    className={`min-w-0 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                      isActive ? `${groupMetric.tabClass} border-zinc-500` : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500"
                    }`}
                    data-testid={`hub-stat-slot-${statIndex}`}
                  >
                    <span className="flex items-center justify-between gap-1">
                      <GroupMetricIcon className="h-3.5 w-3.5 shrink-0" />
                      {isActive && <span className="text-[8px] font-bold uppercase tracking-wider text-orange-300">Selected</span>}
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
  const coachPrompt = getDailyCoachPrompt(improvementFocus, localDateKey(new Date()));

  const customDrillsSection = (
    <section
      className="space-y-3"
      data-testid="section-custom-drills"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Custom Drills</p>
          <h2 className="mt-1 text-lg font-black text-white">Today’s picks for you.</h2>
        </div>
        <span className="shrink-0 pb-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">New picks daily</span>
      </div>
      {drillLibraryLoading ? (
        <div className="grid grid-cols-3 gap-2" aria-label="Loading suggested drills">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-[154px] rounded-xl" data-testid={`suggested-drill-loading-${item}`} />
          ))}
        </div>
      ) : drillLibraryError ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-400" role="status">
          Suggested drills are unavailable right now.
        </p>
      ) : dailyDrillSuggestions.length > 0 ? (
        <div className="grid grid-cols-3 gap-2" data-testid="suggested-drills-row">
          {dailyDrillSuggestions.slice(0, 3).map((drill, index) => (
            <div key={drill.id} className="h-full min-w-0" data-testid={`button-suggested-drill-${index + 1}`}>
              <DrillCard drill={drill} viewMode="grid" hubFeatured />
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-400" role="status">
          No drills are available to suggest yet.
        </p>
      )}
    </section>
  );

  return (
    <div className="min-h-full bg-background pb-6">
      {/* Greeting Header */}
      <div className="px-5 pt-6 pb-2">
        {onboardingPreview && <OnboardingPreviewMenu page="hub" />}
        {import.meta.env.DEV && SHOW_HUB_DEV_TEST_TOOLS && (
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
              {onboardingPreview && previewProfile.playerName ? `Welcome, ${previewProfile.playerName}` : greetText} <span aria-hidden="true">🏀</span>
            </h1>
          </div>
          {!showProfileSetup && streak >= 0 && (() => {
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
        {onboardingPreview ? (
          <>
            <section className="relative isolate overflow-hidden rounded-2xl border border-orange-500/25 bg-[radial-gradient(ellipse_at_88%_10%,rgba(249,115,22,0.22),transparent_34%),linear-gradient(120deg,#17110d,#090909_58%,#050505)] px-4 py-5 shadow-[0_14px_40px_rgba(0,0,0,0.3)] sm:px-6 sm:py-6" data-testid="card-day-one-welcome">
              <svg aria-hidden="true" className="pointer-events-none absolute -right-7 -top-10 h-44 w-44 text-orange-300/[0.08] sm:h-56 sm:w-56" viewBox="0 0 200 200" fill="none">
                <circle cx="100" cy="100" r="74" stroke="currentColor" strokeWidth="1.5" />
                <path d="M26 100h148M100 26v148M48 48c30 30 74 74 104 104M152 48C122 78 78 122 48 152" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-2 rounded-full border border-orange-400/25 bg-orange-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-orange-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.9)]" /> Day 1 · First session
                  </span>
                  <h2 className="mt-3 font-heading text-2xl font-black uppercase leading-[0.98] text-white sm:text-4xl">Your journey<br className="hidden sm:block" /> starts with a shot.</h2>
                  <p className="mt-2 max-w-lg text-xs leading-5 text-zinc-300 sm:text-sm">Set your starting point, then watch every rep build toward something bigger.</p>
                </div>
                <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-300/25 bg-orange-500/15 text-orange-300 shadow-[0_0_32px_rgba(249,115,22,0.17)] sm:h-14 sm:w-14">
                  <Target className="h-6 w-6 sm:h-7 sm:w-7" />
                </div>
              </div>
              <div className="relative mt-5 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-400 sm:flex sm:gap-5">
                <span className="text-orange-200">01 <span className="ml-1 text-zinc-300">Baseline</span></span>
                <span>02 <span className="ml-1 text-zinc-300">Your progress</span></span>
                <span className="col-span-2 sm:ml-auto sm:col-span-1">03 <span className="ml-1 text-zinc-300">The PLAYR1 story</span></span>
              </div>
            </section>

            {previewProfile.sessionLength && (
              <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-zinc-950/80 px-3.5 py-3" aria-label="Your training plan">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-500/10 text-orange-300"><CalendarDays className="h-4 w-4" /></span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-zinc-500">Your training rhythm</p>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-zinc-200">
                      {previewProfile.trainingFrequency
                        ? `${previewProfile.trainingFrequency} ${previewProfile.frequencyUnit === "month" ? "per month" : "per week"}`
                        : `${previewProfile.trainingDays ?? "—"} days/week`} <span className="mx-1 text-zinc-600">·</span>{previewProfile.sessionLength} min sessions
                    </p>
                  </div>
                </div>
                {previewProfile.nextSession && (
                  <p className="ml-12 text-[10px] text-orange-200/80 sm:ml-0">
                    Next up · {new Date(previewProfile.nextSession).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                )}
              </section>
            )}

                <section className="space-y-4 pb-5" data-testid="hub-onboarding-baseline">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-300">Your first challenge</p>
                    <h3 className="mt-1 font-heading text-xl font-black uppercase leading-tight text-white sm:text-2xl">Build your shooting baseline</h3>
                    <p className="mt-1 max-w-xl text-xs leading-5 text-zinc-400">Choose a session that fits today. Log your makes to reveal your real starting point.</p>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800 bg-[radial-gradient(ellipse_at_8%_0%,rgba(249,115,22,0.10),transparent_40%),#050505] px-3 py-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)] sm:px-5 sm:py-5" data-testid="card-onboarding-progress-projection">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-300">{baselineComplete ? "Your baseline is in" : "Your year of progress"}</p>
                        <h3 className="mt-1 text-lg font-bold text-white sm:text-xl">{baselineComplete ? "This is where your climb begins" : "Picture what consistent work can do"}</h3>
                        <p className="mt-1 text-[10px] text-zinc-500">{baselineComplete ? "Your logged results start each line" : "Illustrative shooting percentage projection"}</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[8px] font-bold uppercase tracking-wider text-zinc-400">12 months</span>
                    </div>
                    {(() => {
                      const series = [
                        { key: "threes" as const, label: "3-pointers", color: "#ff7a24", start: 20, goal: 68 },
                        { key: "midrange" as const, label: "Mid-range", color: "#35c4e8", start: 28, goal: 75 },
                        { key: "freeThrows" as const, label: "Free throws", color: "#b28cff", start: 38, goal: 82 },
                      ].map((item) => {
                        const start = baselineComplete
                          ? Math.round((Number(baselineResults[item.key]) / selectedBaseline[item.key]) * 100)
                          : item.start;
                        const goal = Math.max(item.goal, Math.min(98, start + 12));
                        const values = Array.from({ length: 13 }, (_, month) =>
                          Math.round(start + (goal - start) * Math.pow(month / 12, 0.82))
                        );
                        return { ...item, values };
                      });
                      const xAt = (month: number) => 58 + month * (490 / 12);
                      const yAt = (percent: number) => 218 - percent * 1.78;
                      return (
                        <>
                          <svg viewBox="0 0 580 270" role="img" aria-label="Illustrative one-year projection of three-point, mid-range, and free-throw shooting improving over time" className="mt-3 h-[205px] w-full sm:h-[260px]">
                            {[0, 20, 40, 60, 80, 100].map((tick) => {
                              const y = yAt(tick);
                              return <g key={tick}>
                                <line x1="58" x2="548" y1={y} y2={y} stroke="rgba(255,255,255,0.09)" strokeDasharray={tick === 0 ? undefined : "3 6"} />
                                <text x="48" y={y + 3} textAnchor="end" fill="#71717a" fontSize="9">{tick}%</text>
                              </g>;
                            })}
                            {[0, 3, 6, 9, 12].map((month) => (
                              <text key={month} x={xAt(month)} y="245" textAnchor="middle" fill="#71717a" fontSize="9">{month === 0 ? "Start" : `${month} mo`}</text>
                            ))}
                            {series.map((line) => {
                              const points = line.values.map((value, index) => `${xAt(index)},${yAt(value)}`).join(" ");
                              return <g key={line.label}>
                                <polyline points={points} fill="none" stroke={line.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
                                <circle cx={xAt(0)} cy={yAt(line.values[0])} r="4" fill="#050505" stroke={line.color} strokeWidth="2" />
                                <circle cx={xAt(12)} cy={yAt(line.values[12])} r="5" fill={line.color} stroke="#050505" strokeWidth="2" />
                                <text x={xAt(12) - 4} y={yAt(line.values[12]) - 10} textAnchor="end" fill={line.color} fontSize="10" fontWeight="700">{line.values[12]}%</text>
                              </g>;
                            })}
                          </svg>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/[0.07] pt-3">
                            {series.map((line) => <span key={line.label} className="inline-flex items-center gap-1.5 text-[9px] font-medium text-zinc-300">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: line.color }} />{line.label}
                            </span>)}
                          </div>
                        </>
                      );
                    })()}
                    <p className="mt-3 text-[9px] leading-4 text-zinc-600">The future path is an illustration, not a promise. Your starting points come from your logged shots.</p>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.19em] text-zinc-500">Choose your challenge</p>
                        <p className="mt-1 text-xs font-semibold text-white">One session. Your pace.</p>
                      </div>
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">3 shot types</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Choose baseline workout size">
                    {onboardingBaselines.map((option) => {
                      const total = option.threes + option.midrange + option.freeThrows;
                      const active = baselineId === option.id;
                      return (
                        <button key={option.id} type="button" aria-pressed={baselineId === option.id}
                          onClick={() => { setBaselineId(option.id); setBaselineResults({ threes: "", midrange: "", freeThrows: "" }); setBaselineComplete(false); setBaselineLogging(false); }}
                          className={`min-h-[96px] min-w-0 rounded-xl border px-2 py-2.5 text-left transition-all duration-200 ${active ? "border-orange-400/60 bg-[linear-gradient(145deg,rgba(249,115,22,0.19),rgba(12,12,12,0.94)_72%)] text-white shadow-[0_0_24px_rgba(249,115,22,0.09)]" : "border-white/[0.08] bg-zinc-950/80 text-zinc-400 hover:border-white/20 hover:bg-zinc-900"}`}>
                          <span className="block truncate text-[8px] font-bold uppercase tracking-[0.13em] sm:text-[9px]">{option.name}</span>
                          <span className="mt-1.5 block text-base font-black leading-none sm:text-lg">{total}<span className="ml-1 text-[8px] font-semibold uppercase text-zinc-500">shots</span></span>
                          <span className="mt-2 block truncate text-[8px] leading-3 text-zinc-500">{option.threes} 3PT · {option.midrange} mid · {option.freeThrows} FT</span>
                        </button>
                      );
                    })}
                    </div>
                  </div>

                  {baselineLogging && !baselineComplete && (
                    <div className="mt-4 rounded-2xl border border-orange-500/20 bg-[linear-gradient(145deg,rgba(249,115,22,0.08),rgba(8,8,8,0.92)_48%)] p-3.5 sm:p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-white">Log your makes</p>
                          <p className="mt-0.5 text-[10px] text-zinc-400">{baselineTotal} attempts · one session</p>
                        </div>
                        <button type="button" onClick={() => setBaselineLogging(false)} aria-label="Close baseline logger" className="rounded-md p-1.5 text-zinc-500 hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {previewShotTypes.map(({ key, label, color }) => (
                          <label key={key} className="min-w-0 rounded-xl border border-white/[0.07] bg-black/50 p-3">
                            <span className="flex items-center gap-2 truncate text-[9px] font-bold uppercase tracking-wider text-zinc-300">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}
                            </span>
                            <span className="mt-2 flex items-center gap-2">
                              <input type="number" min={0} max={selectedBaseline[key]} step={1} inputMode="numeric" value={baselineResults[key]} aria-label={`${label} makes`}
                                onChange={(event) => setBaselineResults((current) => ({ ...current, [key]: event.target.value }))}
                                className="h-10 min-w-0 w-full rounded-lg border border-white/10 bg-zinc-950 px-3 text-sm font-bold text-white outline-none transition focus:border-orange-400" />
                              <span className="shrink-0 text-[10px] font-bold text-zinc-500">/ {selectedBaseline[key]}</span>
                            </span>
                            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, Number(baselineResults[key] || 0) / selectedBaseline[key] * 100))}%`, backgroundColor: color }} />
                            </div>
                          </label>
                        ))}
                      </div>
                      <button type="button"
                        disabled={previewShotTypes.some(({ key }) => baselineResults[key] === "" || !Number.isInteger(Number(baselineResults[key])) || Number(baselineResults[key]) < 0 || Number(baselineResults[key]) > selectedBaseline[key])}
                        onClick={() => { setBaselineComplete(true); setBaselineLogging(false); }}
                        className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-4 text-xs font-black uppercase tracking-[0.14em] text-black shadow-[0_8px_24px_rgba(249,115,22,0.2)] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                        data-testid="button-log-onboarding-baseline"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Log my starting point
                      </button>
                    </div>
                  )}

                  {!baselineComplete && !baselineLogging && (
                    <button type="button" onClick={() => setBaselineLogging(true)} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-4 text-xs font-black uppercase tracking-[0.14em] text-black shadow-[0_8px_24px_rgba(249,115,22,0.2)] transition hover:bg-orange-400" data-testid="button-start-onboarding-baseline">
                      Start {selectedBaseline.name.toLowerCase()} <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                  {baselineComplete && (
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2.5">
                      <p className="text-xs font-semibold text-emerald-200">Baseline logged in this preview · {baselineTotal} attempts</p>
                      <button type="button" onClick={() => { setBaselineComplete(false); setBaselineLogging(true); }} className="shrink-0 text-[10px] font-bold text-zinc-400 underline underline-offset-4 hover:text-white">Edit</button>
                    </div>
                  )}
                </section>

                <section className="relative isolate mt-6 overflow-hidden rounded-2xl border border-orange-500/25 bg-[radial-gradient(ellipse_at_50%_0%,rgba(249,115,22,0.14),transparent_54%),#050505] p-2 shadow-[0_14px_40px_rgba(0,0,0,0.28)]" data-testid="card-day-one-trailer">
                  {!trailerPlaying ? (
                    <button type="button" onClick={() => setTrailerPlaying(true)} className="group relative flex aspect-video w-full flex-col justify-end overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_78%_22%,rgba(249,115,22,0.27),transparent_36%),linear-gradient(145deg,#1c120d,#090909_48%,#050505)] p-5 text-left transition sm:p-8" data-testid="button-play-onboarding-trailer">
                      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 transition duration-500 group-hover:scale-105 group-hover:opacity-70">
                        <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border border-orange-300/20" />
                        <div className="absolute -right-2 -top-10 h-44 w-44 rounded-full border border-orange-300/15" />
                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/35 to-transparent" />
                      </div>
                      <span className="relative z-10 inline-flex w-fit items-center gap-2 rounded-full border border-orange-300/25 bg-black/40 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.24em] text-orange-200 backdrop-blur">Day 1 film <span className="h-1 w-1 rounded-full bg-orange-300" /> PLAYR1 original</span>
                      <span className="relative z-10 mt-3 max-w-xl font-heading text-2xl font-black uppercase leading-[0.95] text-white sm:text-4xl">Your story starts<br />with the next rep.</span>
                      <span className="relative z-10 mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-orange-400/40 bg-orange-500 px-4 py-2.5 text-[10px] font-black uppercase tracking-wider text-black shadow-[0_0_28px_rgba(249,115,22,0.2)] transition group-hover:bg-orange-400"><Play className="h-3.5 w-3.5 fill-current" /> Watch the trailer</span>
                    </button>
                  ) : (
                    <video autoPlay className="aspect-video w-full rounded-xl bg-black object-cover" controls preload="metadata" playsInline src={introTrailer} onEnded={() => setTrailerPlaying(false)}>
                      Your browser does not support embedded video.
                    </video>
                  )}
                </section>
          </>
        ) : (
          <>
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
                onClick={() => navigate("/profile/edit?returnTo=%2Fhub")}
                className="group flex min-h-[88px] w-full cursor-pointer items-center gap-3 rounded-xl border border-white/50 bg-black p-3.5 text-left text-zinc-100 transition hover:border-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
                data-testid="button-complete-profile"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400">
                  <UserRound className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-heading text-sm uppercase leading-tight tracking-wide">Complete Your Profile</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-orange-200/60 bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-zinc-950 shadow-[0_0_16px_rgba(249,115,22,0.28)] transition hover:brightness-110 group-active:brightness-95">
                  Complete Profile
                  <ChevronRight className="h-3.5 w-3.5" />
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Log a session", detail: "Track today's work", path: "/log", icon: Dumbbell, testId: "button-start-log" },
              { label: "Start a program", detail: "Follow a plan", path: "/programs", icon: Layers3, testId: "button-start-program" },
              { label: "Drill library", detail: "Find your next drill", path: "/drills", icon: BookOpen, testId: "button-start-drills" },
              {
                label: "Coach P",
                detail: "Ask about your game",
                path: `/coach-p?prompt=${encodeURIComponent(coachPrompt)}`,
                icon: MessageCircle,
                testId: "button-start-coach-p-prompt",
                isCoachPrompt: true,
              },
            ].map(({ label, detail, path, icon: Icon, testId, isCoachPrompt }) => (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                className={`group flex min-h-[104px] w-full cursor-pointer rounded-xl border border-zinc-700 bg-zinc-900 p-3 text-left text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] sm:p-4 ${
                  isCoachPrompt
                    ? "flex-row items-center gap-2"
                    : "flex-col gap-3"
                }`}
                aria-label={isCoachPrompt ? `Open Coach P with prompt: ${detail}` : undefined}
                data-testid={testId}
              >
                {isCoachPrompt ? (
                  <>
                    <span className="flex w-[58px] shrink-0 flex-col items-start gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="whitespace-nowrap font-heading text-sm uppercase leading-tight tracking-wide text-white">{label}</span>
                    </span>
                    <span className="flex min-h-[42px] min-w-0 flex-1 items-center gap-1.5 rounded-full border border-orange-400/20 bg-zinc-950/95 py-1 pl-2.5 pr-1 shadow-[0_0_20px_rgba(249,115,22,0.08)]" aria-hidden="true">
                      <span className="min-w-0 flex-1 truncate whitespace-nowrap text-[9px] leading-tight text-zinc-400">{detail}</span>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-black">
                        <ArrowUp className="h-3.5 w-3.5" />
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block font-heading text-sm uppercase leading-tight tracking-wide">{label}</span>
                      <span className="mt-0.5 block text-[11px] text-zinc-500">{detail}</span>
                    </span>
                  </>
                )}
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
              onClick={() => navigate("/shooting-cohort")}
              className="group relative flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-1 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              aria-label={(supportUnread?.unreadCount || 0) > 0 ? `Shooting Cohort, ${supportUnread?.unreadCount} unread messages` : "Shooting Cohort"}
              data-testid="button-hub-shooting-cohort"
            >
              {(supportUnread?.unreadCount || 0) > 0 && (
                <span className="absolute right-1 top-1 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {supportUnread?.unreadCount}
                </span>
              )}
              <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full border border-orange-200/80 bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 shadow-[0_0_16px_rgba(249,115,22,0.42),inset_0_2px_5px_rgba(255,255,255,0.4)] transition group-hover:scale-[1.04]">
                <Target className="h-8 w-8 text-zinc-950" strokeWidth={2.6} />
              </span>
              <span className="max-w-[100px] text-[10px] font-bold leading-tight text-zinc-300">Shooting Cohort</span>
            </button>
          </div>
        </section>
        )}

          </>
        )}
      </div>
      </div>
  );
}
