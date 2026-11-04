import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
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
  Pencil,
  Flame,
  ChevronRight,
  ChevronDown,
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
type TrailerCardPreview = { avatar: string; title: string; stats: string };

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

function toLocalDateTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
  const [scheduleEditing, setScheduleEditing] = useState(false);
  const [baselineResults, setBaselineResults] = useState<Record<PreviewShotKey, string>>({
    threes: "", midrange: "", freeThrows: "",
  });
  const [previewProfile, setPreviewProfile] = useState<{
    playerName?: string; trainingFrequency?: number; frequencyUnit?: "week" | "month";
    trainingDays?: number; sessionLength?: number; nextSession?: string;
  }>(() => {
    try {
      return JSON.parse(sessionStorage.getItem("playr1-onboarding-preview") || "{}") as {
        playerName?: string; trainingFrequency?: number; frequencyUnit?: "week" | "month";
        trainingDays?: number; sessionLength?: number; nextSession?: string;
      };
    } catch {
      return {};
    }
  });
  const updatePreviewProfile = (patch: Partial<typeof previewProfile>) => {
    setPreviewProfile((current) => {
      const updated = { ...current, ...patch };
      try {
        sessionStorage.setItem("playr1-onboarding-preview", JSON.stringify(updated));
      } catch {
        // Keep the preview editable when browser storage is unavailable.
      }
      return updated;
    });
  };
  const [trailerCard, setTrailerCard] = useState<TrailerCardPreview>(() => {
    const defaults: TrailerCardPreview = { avatar: "", title: "The PLAYR1 Vision", stats: "0 views · Just now" };
    try {
      return { ...defaults, ...JSON.parse(sessionStorage.getItem("playr1-onboarding-trailer-card") || "{}") } as TrailerCardPreview;
    } catch {
      return defaults;
    }
  });
  const updateTrailerCard = (patch: Partial<TrailerCardPreview>) => {
    setTrailerCard((current) => {
      const updated = { ...current, ...patch };
      try {
        sessionStorage.setItem("playr1-onboarding-trailer-card", JSON.stringify(updated));
      } catch {
        // Keep the editor usable if browser storage is unavailable.
      }
      return updated;
    });
  };
  const selectedBaseline = onboardingBaselines.find((option) => option.id === baselineId)!;
  const baselineTotal = selectedBaseline.threes + selectedBaseline.midrange + selectedBaseline.freeThrows;
  const frequency = Math.max(1, Number(previewProfile.trainingFrequency ?? previewProfile.trainingDays ?? 1));
  const sessionIntervalDays = (previewProfile.frequencyUnit === "month" ? 30 : 7) / frequency;
  const firstTrainingDate = previewProfile.nextSession && !Number.isNaN(new Date(previewProfile.nextSession).getTime())
    ? new Date(previewProfile.nextSession)
    : new Date();
  const onboardingSchedule = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(firstTrainingDate);
    date.setDate(date.getDate() + Math.round(index * sessionIntervalDays));
    return date;
  });
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
          {!onboardingPreview && !showProfileSetup && streak >= 0 && (() => {
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
        {onboardingPreview && (
          <div className="mt-4" data-testid="onboarding-day-progress">
            <div className="mb-2 flex flex-col items-end gap-1.5">
              <div className="flex items-center justify-end gap-1.5 text-right">
                <p className="text-[9px] font-semibold text-zinc-300">
                  {previewProfile.trainingFrequency ?? previewProfile.trainingDays ?? 1} {previewProfile.frequencyUnit === "month" ? "per month" : "per week"}
                  {previewProfile.sessionLength ? ` · ${previewProfile.sessionLength} min sessions` : ""}
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" aria-label="Edit training frequency and session length" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/40 text-zinc-300 transition hover:border-orange-400/60 hover:text-orange-200">
                      <Pencil className="h-3 w-3" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[min(330px,calc(100vw-24px))] space-y-3 border-orange-400/25 bg-[#101010] p-3 text-white shadow-2xl">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-orange-300">Your training plan</p>
                    <div>
                      <label htmlFor="hub-training-frequency" className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-zinc-400">How often do you train outside of practice?</label>
                      <div className="grid grid-cols-[0.7fr_1.3fr] gap-2">
                        <input
                          id="hub-training-frequency"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={99}
                          value={previewProfile.trainingFrequency ?? ""}
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            updatePreviewProfile({ trainingFrequency: value ? Math.min(99, Math.max(1, Number(value))) : undefined });
                          }}
                          className="h-10 min-w-0 rounded-lg border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-orange-400"
                        />
                        <Select value={previewProfile.frequencyUnit ?? "week"} onValueChange={(value) => updatePreviewProfile({ frequencyUnit: value as "week" | "month" })}>
                          <SelectTrigger aria-label="Training frequency unit" className="h-10 rounded-lg border-white/10 bg-black px-3 text-xs text-white focus:ring-orange-400/40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-orange-500/30 bg-[#111] text-zinc-100">
                            <SelectItem value="week" className="focus:bg-orange-500/15 focus:text-white">per week</SelectItem>
                            <SelectItem value="month" className="focus:bg-orange-500/15 focus:text-white">per month</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="hub-session-length" className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-zinc-400">How long do you usually train for?</label>
                      <Select value={previewProfile.sessionLength ? String(previewProfile.sessionLength) : ""} onValueChange={(value) => updatePreviewProfile({ sessionLength: Number(value) })}>
                        <SelectTrigger id="hub-session-length" className="h-10 rounded-lg border-white/10 bg-black px-3 text-xs text-white focus:ring-orange-400/40">
                          <SelectValue placeholder="Choose session length" />
                        </SelectTrigger>
                        <SelectContent className="border-orange-500/30 bg-[#111] text-zinc-100">
                          {[20, 30, 45, 60, 75, 90].map((minutes) => <SelectItem key={minutes} value={String(minutes)} className="focus:bg-orange-500/15 focus:text-white">{minutes} minutes</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <Popover open={scheduleEditing} onOpenChange={setScheduleEditing}>
                <PopoverTrigger asChild>
                  <button type="button" className="inline-flex min-h-8 items-center gap-2 rounded-full border border-orange-200/45 bg-gradient-to-r from-[#ff984f] via-[#f97316] to-[#cf4307] px-3 py-1 text-[9px] font-black text-black shadow-[0_0_7px_rgba(249,115,22,0.4)] transition hover:brightness-110">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>Next session</span>
                    <span className="font-bold">
                      {previewProfile.nextSession
                        ? new Date(previewProfile.nextSession).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                        : "Choose date & time"}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" side="bottom" sideOffset={8} className="w-[min(21rem,calc(100vw-24px))] border border-orange-500/25 bg-[#0c0c0c] p-3 text-zinc-100 shadow-[0_16px_50px_rgba(0,0,0,0.7)]">
                  <div className="mb-1 flex items-center gap-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300">
                    <CalendarDays className="h-3.5 w-3.5" /> Pick your next session
                  </div>
                  <Calendar
                    mode="single"
                    selected={previewProfile.nextSession && !Number.isNaN(new Date(previewProfile.nextSession).getTime()) ? new Date(previewProfile.nextSession) : undefined}
                    onSelect={(date) => {
                      if (!date) return;
                      const current = previewProfile.nextSession && !Number.isNaN(new Date(previewProfile.nextSession).getTime())
                        ? new Date(previewProfile.nextSession)
                        : new Date();
                      const scheduledDate = new Date(date);
                      scheduledDate.setHours(current.getHours(), current.getMinutes(), 0, 0);
                      updatePreviewProfile({ nextSession: toLocalDateTime(scheduledDate) });
                    }}
                    disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                    initialFocus
                    className="mx-auto"
                    classNames={{
                      caption_label: "text-sm font-semibold text-white",
                      head_cell: "text-zinc-500 rounded-md w-9 font-medium text-[0.7rem]",
                      day: "h-9 w-9 rounded-full p-0 font-normal text-zinc-300 hover:bg-orange-500/15 hover:text-white",
                      day_selected: "bg-orange-500 text-black hover:bg-orange-400 hover:text-black focus:bg-orange-500 focus:text-black",
                      day_today: "border border-orange-400/60 text-orange-300",
                      day_disabled: "text-zinc-700 opacity-40",
                      nav_button: "h-8 w-8 border border-white/10 bg-white/[0.03] p-0 text-zinc-300 hover:bg-white/10 hover:opacity-100",
                    }}
                    data-testid="calendar-next-session"
                  />
                  <div className="flex items-center justify-between gap-3 border-t border-white/10 px-1 pt-3">
                    <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      <Clock3 className="h-3.5 w-3.5 text-orange-400" /> Time
                    </span>
                    <input
                      type="time"
                      value={previewProfile.nextSession?.slice(11, 16) || "17:00"}
                      onChange={(event) => {
                        const next = previewProfile.nextSession && !Number.isNaN(new Date(previewProfile.nextSession).getTime())
                          ? new Date(previewProfile.nextSession)
                          : new Date();
                        const [hours, minutes] = event.currentTarget.value.split(":").map(Number);
                        next.setHours(hours, minutes, 0, 0);
                        updatePreviewProfile({ nextSession: toLocalDateTime(next) });
                      }}
                      aria-label="Next session time"
                      className="h-9 rounded-full border border-orange-500/25 bg-black px-3 text-sm text-white outline-none focus:border-orange-400"
                      data-testid="input-next-session-time"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <div className="grid min-w-0 flex-1 grid-cols-7 gap-1.5" aria-label="Seven scheduled days">
                {onboardingSchedule.map((date, index) => (
                  <div key={index} className="min-w-0 text-center" aria-label={`Day ${index + 1}: ${date.toLocaleDateString()}`}>
                    <span className="block truncate text-[7px] font-semibold uppercase tracking-tight text-zinc-400 sm:text-[9px]">
                      {date.toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
                    </span>
                    <span className={`mt-1 block h-1.5 w-full rounded-full ${index === 0 ? "bg-gradient-to-r from-[#ff984f] via-[#f97316] to-[#cf4307] shadow-[0_0_7px_rgba(249,115,22,0.95),0_0_18px_rgba(249,115,22,0.78)]" : "bg-white/10"}`} />
                    <span className={`mt-1 block text-[7px] font-bold uppercase tracking-tight sm:text-[9px] ${index === 0 ? "text-orange-300" : "text-zinc-600"}`}>{index + 1}</span>
                  </div>
                ))}
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" aria-label="Open your training calendar" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/[0.05] hover:text-orange-300">
                    <CalendarDays className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[min(340px,calc(100vw-24px))] border-orange-400/20 bg-[#101010] p-3 text-white shadow-2xl">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-orange-300">Your training calendar</p>
                  <p className="mt-1 text-[10px] text-zinc-500">Planned from your training rhythm and next session.</p>
                  <div className="mt-3 space-y-1.5">
                    {onboardingSchedule.map((date, index) => (
                      <div key={index} className={`flex items-center justify-between rounded-lg px-2.5 py-2 ${index === 0 ? "bg-orange-500/10" : "bg-white/[0.03]"}`}>
                        <span className={`text-[10px] font-bold ${index === 0 ? "text-orange-200" : "text-zinc-400"}`}>Day {index + 1}</span>
                        <span className="text-[10px] text-zinc-300">{date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 space-y-4 mt-4">
        {onboardingPreview ? (
          <>
            <div className="space-y-4" data-testid="card-day-one-mission">

            <div className="px-1 pt-1">
              <h2 className="font-heading text-xl font-black uppercase leading-tight text-white sm:text-2xl">Welcome to The PLAYR1 Project.</h2>
            </div>

            <div className="space-y-2" data-testid="card-day-one-trailer">
              <button type="button" onClick={() => setTrailerPlaying(true)} className="group relative block aspect-video w-full overflow-hidden rounded-lg bg-black text-left" data-testid="button-play-onboarding-trailer" aria-label="Play the PLAYR1 trailer">
                <img src="/images/playr1-trailer-thumbnail.jpg" alt="PLAYR1 trailer thumbnail" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
                <span className="absolute inset-0 bg-black/10 transition group-hover:bg-black/20" />
                <span className="absolute left-1/2 top-1/2 flex h-12 w-[68px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-[#ff0033] shadow-[0_2px_14px_rgba(0,0,0,0.45)] transition group-hover:scale-110 group-hover:bg-[#e6002e]">
                  <Play className="ml-1 h-6 w-6 fill-white text-white" />
                </span>
                <span className="absolute bottom-2 right-2 rounded bg-black/85 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white">0:05</span>
              </button>
              <div className="flex items-start gap-3 py-1">
                {trailerCard.avatar ? (
                  <img src={trailerCard.avatar} alt="PLAYR1 channel profile" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[10px] font-black text-black">P1</span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-white">{trailerCard.title}</p>
                  <p className="mt-0.5 truncate text-[10px] text-zinc-500">The PLAYR1 Project · {trailerCard.stats}</p>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button type="button" aria-label="Customize trailer profile, title, and statistics" className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/[0.05] hover:text-orange-300">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-[min(320px,calc(100vw-24px))] space-y-3 border-orange-400/20 bg-[#101010] p-3 text-white shadow-2xl">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-orange-300">Customize video preview</p>
                    <div>
                      <label htmlFor="trailer-profile-picture" className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-zinc-400">Channel profile picture</label>
                      <div className="flex items-center gap-2">
                        <input
                          id="trailer-profile-picture"
                          type="file"
                          accept="image/*"
                          className="block w-full text-[10px] text-zinc-400 file:mr-2 file:rounded-full file:border-0 file:bg-orange-500/15 file:px-3 file:py-2 file:text-[9px] file:font-bold file:text-orange-200"
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              const image = new window.Image();
                              image.onload = () => {
                                const cropSize = Math.min(image.width, image.height);
                                const canvas = document.createElement("canvas");
                                canvas.width = 256;
                                canvas.height = 256;
                                const context = canvas.getContext("2d");
                                if (!context) return;
                                context.drawImage(image, (image.width - cropSize) / 2, (image.height - cropSize) / 2, cropSize, cropSize, 0, 0, 256, 256);
                                updateTrailerCard({ avatar: canvas.toDataURL("image/jpeg", 0.84) });
                              };
                              image.src = String(reader.result);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </div>
                    </div>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                      Video title
                      <input value={trailerCard.title} onChange={(event) => updateTrailerCard({ title: event.currentTarget.value })} maxLength={90} className="mt-1.5 h-9 w-full rounded-lg border border-white/10 bg-black px-2.5 text-[11px] font-medium normal-case tracking-normal text-white outline-none focus:border-orange-400" />
                    </label>
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                      Views and upload date
                      <input value={trailerCard.stats} onChange={(event) => updateTrailerCard({ stats: event.currentTarget.value })} maxLength={60} placeholder="2.4M views · 2 weeks ago" className="mt-1.5 h-9 w-full rounded-lg border border-white/10 bg-black px-2.5 text-[11px] font-medium normal-case tracking-normal text-white outline-none focus:border-orange-400" />
                    </label>
                    {trailerCard.avatar && <button type="button" onClick={() => updateTrailerCard({ avatar: "" })} className="text-[9px] font-bold text-zinc-500 hover:text-white">Remove profile picture</button>}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

                <section className="space-y-4 pb-5" data-testid="hub-onboarding-baseline">
                  <div className="relative mt-4 aspect-[1.2/1] min-h-[280px] overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_52%_48%,rgba(91,132,161,0.13),transparent_62%),linear-gradient(145deg,#101216,#050608_70%)] shadow-[0_0_38px_rgba(55,255,150,0.06),inset_0_1px_0_rgba(255,255,255,0.08)] sm:aspect-[2.4/1]" data-testid="card-onboarding-progress-projection">
                    {(() => {
                      const series = [
                        { key: "threes" as const, label: "3PT", color: "#ffd84d", start: 20, goal: 80, progress: [0, .12, .10, .20, .18, .31, .29, .44, .42, .61, .59, .78, 1] },
                        { key: "midrange" as const, label: "MID", color: "#ff5364", start: 30, goal: 70, progress: [0, .13, .11, .23, .20, .34, .32, .47, .45, .64, .62, .81, 1] },
                        { key: "freeThrows" as const, label: "FT", color: "#70f06a", start: 40, goal: 90, progress: [0, .11, .09, .22, .20, .35, .33, .49, .47, .66, .64, .82, 1] },
                      ].map((item) => {
                        const actualStart = baselineComplete
                          ? Math.max(0, Math.min(100, Math.round((Number(baselineResults[item.key]) / selectedBaseline[item.key]) * 100)))
                          : item.start;
                        const volumeMultiplier = baselineId === "full" ? 1.08 : baselineId === "quick" ? 0.92 : 1;
                        const goal = Math.max(actualStart, item.goal);
                        const values = item.progress.map((progress) => {
                          const adjustedProgress = Math.max(0, Math.min(1, progress + (volumeMultiplier - 1) * progress * (1 - progress)));
                          return Math.round(actualStart + (goal - actualStart) * adjustedProgress);
                        });
                        return { ...item, values };
                      });
                      const xAt = (month: number) => 62 + month * 46;
                      const yAt = (percent: number) => 330 - percent * 2.4;
                      return (
                        <>
                          <svg id="onboarding-projection-chart" viewBox="0 0 680 400" preserveAspectRatio="none" role="img" aria-label="Illustrative shooting growth chart with monthly three-point, mid-range, and free-throw percentages" className="absolute inset-0 h-full w-full">
                              <defs>
                                <filter id="shot-line-glow" x="-50%" y="-50%" width="200%" height="200%">
                                  <feGaussianBlur stdDeviation="5" result="blur" />
                                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                                <linearGradient id="shot-chart-wash" x1="0" x2="1" y1="0" y2="1">
                                  <stop offset="0%" stopColor="#70f06a" stopOpacity="0.06" />
                                  <stop offset="48%" stopColor="#ffd84d" stopOpacity="0.025" />
                                  <stop offset="100%" stopColor="#ff5364" stopOpacity="0.05" />
                                </linearGradient>
                                {series.map((line) => (
                                  <linearGradient key={`${line.key}-fill`} id={`shot-fill-${line.key}`} x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor={line.color} stopOpacity="0.23" />
                                    <stop offset="100%" stopColor={line.color} stopOpacity="0" />
                                  </linearGradient>
                                ))}
                              </defs>
                              <rect width="680" height="400" fill="url(#shot-chart-wash)" />
                              {[20, 40, 60, 80, 100].map((tick) => {
                                const y = yAt(tick);
                                return <g key={tick}>
                                  <line x1="54" x2="626" y1={y} y2={y} stroke="rgba(210,224,235,0.15)" strokeDasharray={tick === 20 ? undefined : "3 8"} />
                                  <text x="43" y={y + 4} textAnchor="end" fill="#a0aab4" fontSize="14">{tick}%</text>
                                </g>;
                              })}
                              {[0, 3, 6, 9, 12].map((month) => (
                                <g key={month}>
                                  <line x1={xAt(month)} x2={xAt(month)} y1="78" y2="332" stroke="rgba(147,197,253,0.10)" strokeDasharray="2 9" />
                                  <text x={xAt(month)} y="365" textAnchor="middle" fill="#929ba5" fontSize="12">{month === 0 ? "NOW" : `M${month}`}</text>
                                </g>
                              ))}
                              {series.map((line) => {
                                const points = line.values.map((value, index) => `${xAt(index)},${yAt(value)}`);
                                const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${point}`).join(" ");
                                const fillPath = `${linePath} L${xAt(12)},330 L${xAt(0)},330 Z`;
                                return <g key={line.key}>
                                  <path d={fillPath} fill={`url(#shot-fill-${line.key})`} />
                                  <path d={linePath} fill="none" stroke={line.color} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" opacity="0.24" filter="url(#shot-line-glow)" />
                                  <path d={linePath} fill="none" stroke={line.color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                                  {line.values.map((value, index) => (
                                    <circle key={index} cx={xAt(index)} cy={yAt(value)} r={index === 12 ? 5 : 2.6} fill={index === 12 ? line.color : "#101216"} stroke={line.color} strokeWidth={index === 12 ? 2 : 1.4} />
                                  ))}
                                  <text x={xAt(12) + 9} y={yAt(line.values[12]) + 5} fill={line.color} fontSize="22" fontWeight="800" style={{ paintOrder: "stroke", stroke: "#090a0c", strokeWidth: 4 }}>{line.values[12]}%</text>
                                </g>;
                              })}
                          </svg>
                          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col p-4 sm:p-5">
                            <h3 className="max-w-[270px] text-lg font-black leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:max-w-none sm:text-xl">Here's where your shooting could be</h3>
                            <div className="mt-2 flex items-center gap-3 text-[9px] font-black tracking-wide drop-shadow-[0_1px_5px_rgba(0,0,0,0.95)] sm:text-[10px]">
                              {series.map((line) => <span key={line.key} className="inline-flex items-center gap-1.5" style={{ color: line.color }}>
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: line.color, boxShadow: `0 0 9px ${line.color}` }} />{line.label}
                              </span>)}
                            </div>
                            <span className="mt-auto self-end rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[7px] font-bold uppercase tracking-[0.16em] text-zinc-400">Illustrative</span>
                          </div>
                        </>
                      );
                    })()}
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
                    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 px-0 pt-10 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setBaselineLogging(false)}>
                      <section role="dialog" aria-modal="true" aria-labelledby="baseline-log-title" className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-orange-400/25 bg-[#101010] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-20px_70px_rgba(0,0,0,0.7)] sm:rounded-3xl sm:p-6" onClick={(event) => event.stopPropagation()}>
                        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700 sm:hidden" />
                        <div className="mb-5 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-300">Baseline session</p>
                            <h3 id="baseline-log-title" className="mt-1 font-heading text-xl font-black uppercase text-white">Log your makes</h3>
                            <p className="mt-1 text-[11px] text-zinc-400">{baselineTotal} attempts · {selectedBaseline.name}</p>
                          </div>
                          <button type="button" onClick={() => setBaselineLogging(false)} aria-label="Close baseline logger" className="rounded-full border border-white/10 p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
                        </div>
                        <div className="space-y-2.5">
                          {previewShotTypes.map(({ key, label, color }) => {
                            const makes = Number(baselineResults[key] || 0);
                            const attempts = selectedBaseline[key];
                            return (
                              <div key={key} className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-black/45 p-3">
                                <div className="min-w-0 flex-1">
                                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-300"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</p>
                                  <p className="mt-1 text-[9px] text-zinc-500">{attempts} attempts</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button type="button" aria-label={`Remove one ${label} make`} disabled={makes <= 0} onClick={() => setBaselineResults((current) => ({ ...current, [key]: String(Math.max(0, Number(current[key] || 0) - 1)) }))} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-lg text-zinc-300 transition hover:border-orange-300/40 disabled:opacity-30">−</button>
                                  <span className="min-w-[58px] text-center text-lg font-black tabular-nums text-white">{makes}<span className="ml-1 text-xs font-semibold text-zinc-500">/ {attempts}</span></span>
                                  <button type="button" aria-label={`Add one ${label} make`} disabled={makes >= attempts} onClick={() => setBaselineResults((current) => ({ ...current, [key]: String(Math.min(attempts, Number(current[key] || 0) + 1)) }))} className="flex h-9 w-9 items-center justify-center rounded-full border border-orange-400/40 bg-orange-500/10 text-lg text-orange-200 transition hover:bg-orange-500/20 disabled:opacity-30">+</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <button type="button"
                          disabled={previewShotTypes.some(({ key }) => !Number.isInteger(Number(baselineResults[key])) || Number(baselineResults[key]) < 0 || Number(baselineResults[key]) > selectedBaseline[key])}
                          onClick={() => { setBaselineComplete(true); setBaselineLogging(false); }}
                          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-4 text-xs font-black uppercase tracking-[0.12em] text-black shadow-[0_8px_24px_rgba(249,115,22,0.2)] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                          data-testid="button-log-onboarding-baseline"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Save baseline & reveal your trajectory
                        </button>
                      </section>
                    </div>
                  )}

                  {!baselineComplete && !baselineLogging && (
                    <button type="button" onClick={() => {
                      setBaselineResults((current) => ({
                        threes: current.threes || "0",
                        midrange: current.midrange || "0",
                        freeThrows: current.freeThrows || "0",
                      }));
                      setBaselineLogging(true);
                    }} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-4 text-xs font-black uppercase tracking-[0.14em] text-black shadow-[0_8px_24px_rgba(249,115,22,0.2)] transition hover:bg-orange-400" data-testid="button-start-onboarding-baseline">
                      Start Baseline Session <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                  {baselineComplete && (
                    <div className="mt-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-3 py-3">
                        <p className="flex items-center gap-2 text-xs font-semibold text-emerald-200"><CheckCircle2 className="h-4 w-4 shrink-0" /> Baseline recorded · {baselineTotal} attempts</p>
                        <button type="button" onClick={() => { setBaselineComplete(false); setBaselineLogging(true); }} className="shrink-0 text-[10px] font-bold text-zinc-400 underline underline-offset-4 hover:text-white">Edit results</button>
                      </div>
                      <div className="rounded-xl border border-orange-400/15 bg-[linear-gradient(100deg,rgba(249,115,22,0.09),rgba(10,10,10,0.92))] px-3 py-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-orange-300">Next up</p>
                        <p className="mt-1 text-xs font-bold text-white">The Handle &amp; Footwork Diagnostic</p>
                        <p className="mt-1 text-[10px] text-zinc-500">Unlocks tomorrow. Keep your next session on the calendar.</p>
                      </div>
                    </div>
                  )}
                </section>
            </div>

                {trailerPlaying && (
                  <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="PLAYR1 trailer">
                    <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-orange-400/25 bg-black shadow-[0_0_60px_rgba(249,115,22,0.16)]">
                      <button type="button" onClick={() => setTrailerPlaying(false)} aria-label="Close trailer" className="absolute right-3 top-3 z-10 rounded-full border border-white/20 bg-black/70 p-2 text-white transition hover:bg-orange-500 hover:text-black"><X className="h-4 w-4" /></button>
                      <video autoPlay className="aspect-video w-full bg-black object-contain" controls preload="metadata" playsInline src={introTrailer} onEnded={() => setTrailerPlaying(false)}>
                        Your browser does not support embedded video.
                      </video>
                    </div>
                  </div>
                )}
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
