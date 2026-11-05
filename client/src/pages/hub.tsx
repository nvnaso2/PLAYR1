import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DrillCard } from "@/components/drill-card";
import { apiRequest, getObjectUrl, nativeFetch, queryClient, statsUrl } from "@/lib/queryClient";
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
import type { Drill, Workout, WorkoutDrill } from "@shared/schema";
import { selectDailyDrillSuggestions } from "@shared/daily-drill-recommendations";
import { getDailyCoachPrompt } from "@/lib/coach-p-hub-prompts";
import { OnboardingPreviewMenu } from "@/components/onboarding-preview-menu";
import {
  PLAYER_SETUP_GOALS,
  PLAYER_SETUP_SITUATIONS,
  PLAYER_SETUP_SKILLS,
  PLAYER_SETUP_RANK_FIELDS,
  makeUniqueRankings,
} from "@/lib/player-setup-answers";

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
  { key: "threes", label: "3-pointers", color: "#ffd84d" },
  { key: "midrange", label: "Mid-range", color: "#ff5364" },
  { key: "freeThrows", label: "Free throws", color: "#70f06a" },
];
const dayTwoWorkoutId = "playr1-onboarding-day2-find-your-shooting-range";
const dayTwoIntroVideoSrc = "";

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

function MiniCourtRange({ index }: { index: number }) {
  const drillSpots = [
    [[150, 128], [150, 106], [150, 84], [150, 62], [150, 40]],
    [[116, 90], [184, 90], [116, 116], [184, 116]],
    [[72, 70], [106, 48], [150, 40], [194, 48], [228, 70]],
    [[34, 122], [75, 72], [150, 48], [225, 72], [266, 122]],
    [[150, 118]],
    [[230, 106], [211, 90], [190, 75], [169, 60], [150, 48]],
  ][index] ?? [];
  return (
    <svg viewBox="0 0 300 150" role="img" aria-label="Basketball court drill diagram" className="h-full w-full">
      <rect x="3" y="3" width="294" height="144" fill="#fff" stroke="#111" strokeWidth="4" />
      <path d="M70 147V95Q150 12 230 95V147M112 147V91H188V147M128 91V75H172V91M133 147V133a17 17 0 0 1 34 0v14M125 133a25 25 0 0 0 50 0M135 110a15 15 0 0 0 30 0" fill="none" stroke="#171717" strokeWidth="2.5" />
      <path d="M70 95Q150 12 230 95" fill="none" stroke="#999" strokeWidth="1.5" strokeDasharray="4 4" />
      {drillSpots.map(([x, y], spotIndex) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="10" fill="#fff" stroke="#c2410c" strokeWidth="2.5" />
          <text x={x} y={y + 3.5} textAnchor="middle" fontSize="9" fontWeight="900" fill="#111">{index === 0 ? spotIndex + 1 : index === 1 ? 10 : index === 2 ? 8 : index === 3 ? 5 : index === 4 ? 10 : 1}</text>
        </g>
      ))}
      {index === 0 && <path d="M150 126V36" stroke="#c2410c" strokeWidth="2" strokeDasharray="3 5" />}
    </svg>
  );
}

export default function HubPage() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const search = useSearch();
  const onboardingPreview = new URLSearchParams(search).get("preview") === "onboarding"
    || (location.split("?")[0] === "/admin/onboarding-preview" && ["hub", "day2"].includes(new URLSearchParams(search).get("page") || ""));
  const [baselineId, setBaselineId] = useState<"full" | "standard" | "quick">("standard");
  const [baselinePickerOpen, setBaselinePickerOpen] = useState(false);
  const [baselineLogging, setBaselineLogging] = useState(false);
  const [baselineComplete, setBaselineComplete] = useState(false);
  const [activeProjectionType, setActiveProjectionType] = useState<PreviewShotKey | null>(null);
  const [scheduleEditing, setScheduleEditing] = useState(false);
  const [scheduleCalendarIndex, setScheduleCalendarIndex] = useState(0);
  const [trainingCalendarOpen, setTrainingCalendarOpen] = useState(false);
  const [scheduleDatePickerOpen, setScheduleDatePickerOpen] = useState(false);
  const [trainingPlanOpen, setTrainingPlanOpen] = useState(false);
  const [nextSessionOpen, setNextSessionOpen] = useState(false);
  const [previewDay, setPreviewDay] = useState(() => new URLSearchParams(search).get("page") === "day2" ? 2 : 1);
  useEffect(() => {
    if (location.split("?")[0] === "/admin/onboarding-preview") {
      setPreviewDay(new URLSearchParams(search).get("page") === "day2" ? 2 : 1);
    }
  }, [location, search]);
  const [dayTwoProfileOpen, setDayTwoProfileOpen] = useState(false);
  const [dayTwoWorkoutOpen, setDayTwoWorkoutOpen] = useState(false);
  const [dayTwoVideoOpen, setDayTwoVideoOpen] = useState(false);
  const [dayTwoSaving, setDayTwoSaving] = useState(false);
  const [dayTwoError, setDayTwoError] = useState("");
  const [dayTwoAnswers, setDayTwoAnswers] = useState({
    currentSituation: "",
    primaryGoal: "",
    positions: [] as string[],
    skillRankings: makeUniqueRankings(),
    experienceYears: "",
  });
  const [baselineResults, setBaselineResults] = useState<Record<PreviewShotKey, string>>({
    threes: "", midrange: "", freeThrows: "",
  });
  const [previewProfile, setPreviewProfile] = useState<{
    playerName?: string; trainingFrequency?: number; frequencyUnit?: "week" | "month";
    trainingDays?: number; sessionLength?: number; nextSession?: string; trainingSchedule?: string[];
  }>(() => {
    try {
      return JSON.parse(sessionStorage.getItem("playr1-onboarding-preview") || "{}") as {
        playerName?: string; trainingFrequency?: number; frequencyUnit?: "week" | "month";
        trainingDays?: number; sessionLength?: number; nextSession?: string; trainingSchedule?: string[];
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
  const dayTwoWorkoutQuery = useQuery<{
    workout: Workout;
    drills: Array<WorkoutDrill & { drill: Drill }>;
  }>({
    queryKey: ["/api/workouts", dayTwoWorkoutId],
    enabled: dayTwoWorkoutOpen,
    queryFn: async () => {
      const response = await nativeFetch(`/api/workouts/${dayTwoWorkoutId}`);
      if (!response.ok) throw new Error("Could not load the workout.");
      return response.json();
    },
  });
  const selectedBaseline = onboardingBaselines.find((option) => option.id === baselineId)!;
  const baselineTotal = selectedBaseline.threes + selectedBaseline.midrange + selectedBaseline.freeThrows;
  const frequency = Math.max(1, Number(previewProfile.trainingFrequency ?? previewProfile.trainingDays ?? 1));
  const trainingSessionsPerWeek = Math.min(7, frequency * (previewProfile.frequencyUnit === "month" ? 12 / 52 : 1));
  const trainingDose = Math.pow(trainingSessionsPerWeek, 0.7);
  const sessionIntervalDays = (previewProfile.frequencyUnit === "month" ? 30 : 7) / frequency;
  const firstTrainingDate = previewProfile.nextSession && !Number.isNaN(new Date(previewProfile.nextSession).getTime())
    ? new Date(previewProfile.nextSession)
    : new Date();
  const generatedSchedule = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(firstTrainingDate);
    date.setDate(date.getDate() + Math.round(index * sessionIntervalDays));
    return date;
  });
  const onboardingSchedule = generatedSchedule.map((date, index) => {
    const savedDate = previewProfile.trainingSchedule?.[index];
    if (!savedDate) return date;
    const parsedDate = new Date(savedDate);
    return Number.isNaN(parsedDate.getTime()) ? date : parsedDate;
  });
  const updateOnboardingSchedule = (index: number, date: Date) => {
    if (Number.isNaN(date.getTime())) return;
    const updatedSchedule = onboardingSchedule.map((scheduledDate, currentIndex) =>
      toLocalDateTime(currentIndex === index ? date : scheduledDate),
    );
    updatePreviewProfile({
      trainingSchedule: updatedSchedule,
      ...(index === 0 ? { nextSession: updatedSchedule[0] } : {}),
    });
  };
  const updateScheduleDate = (index: number, date: Date) => {
    const updated = new Date(date);
    const current = onboardingSchedule[index];
    updated.setHours(current.getHours(), current.getMinutes(), 0, 0);
    updateOnboardingSchedule(index, updated);
  };
  const updateScheduleTime = (index: number, time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return;
    const updated = new Date(onboardingSchedule[index]);
    updated.setHours(hours, minutes, 0, 0);
    updateOnboardingSchedule(index, updated);
  };
  const [testHubView, setTestHubView] = useState<"onboarding" | "everyday" | null>(null);
  const [recommendationDay, setRecommendationDay] = useState(() => localDateKey(new Date()));
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

  const saveDayTwoProfile = async () => {
    setDayTwoSaving(true);
    setDayTwoError("");
    const answers = {
      ...setupData?.answers,
      currentSituation: dayTwoAnswers.currentSituation,
      primaryGoal: dayTwoAnswers.primaryGoal,
      positions: dayTwoAnswers.positions,
      skillRankings: dayTwoAnswers.skillRankings,
      skillRoles: Object.values(dayTwoAnswers.skillRankings),
      experienceYears: dayTwoAnswers.experienceYears,
    };
    try {
      if (onboardingPreview) {
        sessionStorage.setItem("playr1-onboarding-day2-profile", JSON.stringify(answers));
      } else {
        await apiRequest("PUT", "/api/player-setup", { answers });
        await queryClient.invalidateQueries({ queryKey: ["/api/player-setup"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/career"] });
      }
      setDayTwoProfileOpen(false);
    } catch {
      setDayTwoError("We couldn't save your profile yet. Please try again.");
    } finally {
      setDayTwoSaving(false);
    }
  };

  const firstName = user?.firstName;
  const profileAvatarUrl = getObjectUrl(user?.profileImageUrl);
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
      <div className="px-5 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-1">
        {onboardingPreview && <OnboardingPreviewMenu page={previewDay === 2 ? "day2" : "hub"} inline />}
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
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-12 w-12 shrink-0 rounded-full border border-white/70 bg-white/5 p-[2px] shadow-[0_0_8px_rgba(255,255,255,0.45),0_0_18px_rgba(255,255,255,0.18)]">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-zinc-900">
                {profileAvatarUrl
                  ? <img src={profileAvatarUrl} alt="" className="h-full w-full object-cover" />
                  : <span className="text-sm font-black text-zinc-200">{(onboardingPreview ? previewProfile.playerName : firstName)?.slice(0, 1)?.toUpperCase() || <UserRound className="h-5 w-5 text-zinc-400" />}</span>}
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-zinc-400 text-sm">{formatDate()}</p>
              <h1 className="mt-0.5 truncate text-2xl font-bold text-white">
                {onboardingPreview && previewProfile.playerName ? `Welcome, ${previewProfile.playerName}` : greetText} <span aria-hidden="true">🏀</span>
              </h1>
            </div>
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
              <div className="hidden">
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
                           className="input-no-spinner h-10 min-w-0 rounded-lg border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-orange-400"
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
                      {onboardingSchedule[Math.min(previewDay - 1, onboardingSchedule.length - 1)]
                        .toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
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
                    data-testid="calendar-next-session-hidden"
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
                      data-testid="input-next-session-time-hidden"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <div className="grid min-w-0 flex-1 grid-cols-7 gap-1.5" aria-label="Seven scheduled days">
                {onboardingSchedule.map((date, index) => (
                  <button key={index} type="button" disabled={index > 1} onClick={() => {
                    const day = index + 1;
                    setPreviewDay(day);
                    if (location.split("?")[0] === "/admin/onboarding-preview") navigate(`/admin/onboarding-preview?page=${day === 2 ? "day2" : "hub"}`);
                  }} aria-pressed={previewDay === index + 1} className="min-w-0 text-center disabled:cursor-default" aria-label={`Day ${index + 1}: ${date.toLocaleDateString()}`}>
                    <span className="block truncate text-[7px] font-semibold uppercase tracking-tight text-zinc-400 sm:text-[9px]">
                      {date.toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}
                    </span>
                    <span className={`mt-1 block h-1.5 w-full rounded-full ${
                      index + 1 === previewDay
                        ? "bg-gradient-to-r from-[#ff984f] via-[#f97316] to-[#cf4307] shadow-[0_0_7px_rgba(249,115,22,0.95),0_0_18px_rgba(249,115,22,0.78)]"
                        : index + 1 < previewDay ? "bg-orange-500" : "bg-white/10"
                    }`} />
                    <span className={`mt-1 block text-[7px] font-bold uppercase tracking-tight sm:text-[9px] ${index + 1 <= previewDay ? "text-orange-300" : "text-zinc-600"}`}>{index + 1}</span>
                  </button>
                ))}
              </div>
              <Dialog open={trainingCalendarOpen} onOpenChange={(open) => {
                setTrainingCalendarOpen(open);
                if (!open) setScheduleDatePickerOpen(false);
              }}>
                <DialogTrigger asChild>
                  <button type="button" aria-label="Open your training calendar" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/[0.05] hover:text-orange-300">
                    <CalendarDays className="h-4 w-4" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-h-[88dvh] w-[calc(100vw-24px)] max-w-[390px] gap-0 overflow-y-auto rounded-2xl border border-orange-400/20 bg-[#101010] p-4 text-white shadow-2xl">
                  <DialogTitle className="pr-8 text-[11px] font-black uppercase tracking-[0.18em] text-orange-300">Your training calendar</DialogTitle>
                  <p className="mt-1 text-[10px] text-zinc-500">Select a session, then choose its date and time.</p>
                  <div className="mt-3 space-y-1.5">
                    {onboardingSchedule.map((date, index) => (
                      <button key={index} type="button" onClick={() => {
                        setScheduleCalendarIndex(index);
                        setScheduleDatePickerOpen(true);
                      }} aria-pressed={scheduleCalendarIndex === index} className={`flex w-full min-w-0 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition ${scheduleCalendarIndex === index ? "border-orange-400/50 bg-orange-500/10" : "border-white/[0.06] bg-white/[0.03] hover:border-white/15"}`}>
                        <span className={`shrink-0 text-[10px] font-bold ${scheduleCalendarIndex === index ? "text-orange-200" : "text-zinc-400"}`}>Session {index + 1}</span>
                        <span className="min-w-0 truncate text-right text-[10px] text-zinc-300">{date.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                      </button>
                    ))}
                  </div>
                  {scheduleDatePickerOpen && <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-2">
                    <p className="px-2 pt-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-300">Edit session {scheduleCalendarIndex + 1}</p>
                    <Calendar
                      mode="single"
                      selected={onboardingSchedule[scheduleCalendarIndex]}
                      onSelect={(date) => { if (date) updateScheduleDate(scheduleCalendarIndex, date); }}
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
                      data-testid={`calendar-training-session-${scheduleCalendarIndex + 1}`}
                    />
                    <div className="flex items-center justify-between gap-3 border-t border-white/10 px-2 pt-3">
                      <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400"><Clock3 className="h-3.5 w-3.5 text-orange-400" />Time</span>
                      <input type="time" value={onboardingSchedule[scheduleCalendarIndex].toTimeString().slice(0, 5)} onChange={(event) => updateScheduleTime(scheduleCalendarIndex, event.currentTarget.value)} aria-label={`Session ${scheduleCalendarIndex + 1} time`} data-testid={`input-training-session-time-${scheduleCalendarIndex + 1}`} className="h-9 rounded-full border border-orange-500/25 bg-black px-3 text-sm text-white outline-none focus:border-orange-400" />
                    </div>
                  </div>}
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 space-y-5 mt-4">
        {onboardingPreview ? (
          <>
            <div className={previewDay === 1 ? "space-y-2" : "hidden"} data-testid="card-day-one-mission">

            {/*
            <div className="px-1 pt-1">
              <h2 className="font-heading text-xl font-black uppercase leading-tight text-white sm:text-2xl">Welcome to The PLAYR1 Project.</h2>
            </div>

            <div className="space-y-2" data-testid="card-day-one-trailer">
              <button type="button" onClick={() => setTrailerPlaying(true)} className="relative block aspect-video w-full overflow-hidden rounded-lg bg-black" data-testid="button-play-onboarding-trailer" aria-label="Play the PLAYR1 trailer">
                <img src="/images/playr1-trailer-thumbnail.jpg" alt="PLAYR1 trailer thumbnail" className="h-full w-full object-cover" />
                <span className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/45 bg-black/20 text-white/90 shadow-sm backdrop-blur-[2px] transition hover:bg-black/35">
                  <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
                </span>
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
                    {trailerCardSaveError && <p role="alert" className="text-[10px] text-red-300">{trailerCardSaveError}</p>}
                    <button type="button" onClick={saveTrailerCard} disabled={trailerCardSaving || !trailerCard.title.trim()} className="inline-flex min-h-9 w-full items-center justify-center rounded-lg bg-orange-500 px-3 text-[10px] font-black uppercase tracking-wide text-black disabled:opacity-50" data-testid="button-save-trailer-card">
                      {trailerCardSaving ? "Saving…" : trailerCardSaved ? "Saved for all accounts" : "Save for all accounts"}
                    </button>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            */}

                <section className="-mx-4 space-y-4 pb-2 pt-2" data-testid="hub-onboarding-baseline">
                    {(() => {
                      const series = [
                        { key: "threes" as const, label: "3PT", color: "#ffd84d", start: 20, ceiling: 95, phase: 0.2 },
                        { key: "midrange" as const, label: "MID", color: "#ff5364", start: 30, ceiling: 95, phase: 1.7 },
                        { key: "freeThrows" as const, label: "FT", color: "#70f06a", start: 40, ceiling: 99, phase: 3.1 },
                      ].map((item) => {
                        const actualStart = baselineComplete
                          ? Math.max(0, Math.min(100, Math.round((Number(baselineResults[item.key]) / selectedBaseline[item.key]) * 100)))
                          : item.start;
                        const ceiling = Math.max(actualStart, item.ceiling);
                        const potential = ceiling - actualStart;
                        const startSensitiveRate = 0.12 + 0.16 * (1 - actualStart / 100);
                        const annualGain = potential * (1 - Math.exp(-startSensitiveRate * trainingDose));
                        const projection = Array.from({ length: 13 }, (_, month) => {
                          const progress = (1 - Math.exp(-2.8 * (month / 12))) / (1 - Math.exp(-2.8));
                          const expected = actualStart + annualGain * progress;
                          const yearFraction = month / 12;
                          const wobble = Math.sin(month * 1.55 + item.phase) * yearFraction * (1 - yearFraction) * (8 + trainingDose * 2);
                          const uncertainty = (month / 12) * (2.2 + trainingDose * 0.55);
                          const clampPercent = (value: number) => Math.max(0, Math.min(ceiling, value));
                          return {
                            value: clampPercent(expected + wobble),
                            low: clampPercent(expected - uncertainty),
                            high: clampPercent(expected + uncertainty),
                          };
                        });
                        return {
                          ...item,
                          start: actualStart,
                          ceiling,
                          values: projection.map((point) => point.value),
                          lowValues: projection.map((point) => point.low),
                          highValues: projection.map((point) => point.high),
                        };
                      });
                      const visibleSeries = activeProjectionType
                        ? series.filter((line) => line.key === activeProjectionType)
                        : series;
                      const lowestProjection = Math.min(...visibleSeries.flatMap((line) => line.lowValues));
                      const highestProjection = Math.max(...visibleSeries.flatMap((line) => line.highValues));
                      const chartMin = Math.max(0, Math.floor(lowestProjection / 5) * 5);
                      const tickStep = highestProjection - chartMin <= 40 ? 5 : 10;
                      const chartMax = Math.min(100, Math.max(chartMin + tickStep, Math.ceil((highestProjection + 1) / tickStep) * tickStep));
                      const xAt = (month: number) => 56 + month * (550 / 12);
                      const yAt = (percent: number) => 390 - ((percent - chartMin) * 350) / (chartMax - chartMin);
                      const chartTicks = Array.from({ length: Math.floor((chartMax - chartMin) / tickStep) + 1 }, (_, index) => chartMin + index * tickStep);
                      const currentScheduleIndex = Math.min(previewDay - 1, onboardingSchedule.length - 1);
                      return (
                        <>
                          <div className="mb-4 flex items-center gap-3 px-4">
                            <div className="flex w-full min-w-0 items-center gap-2">
                              <h3 className="min-w-0 flex-1 truncate font-heading text-lg font-black uppercase leading-tight tracking-wide text-white sm:text-2xl">Road to Elite Shooting</h3>
                              <button type="button" onClick={() => setBaselinePickerOpen(true)} className="ml-auto inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-orange-400/70 bg-orange-500/[0.08] px-3 text-[10px] font-black tracking-wide text-white shadow-[0_0_12px_rgba(249,115,22,0.16)] sm:px-4 sm:text-xs" data-testid="button-open-baseline-picker">
                                <Play className="h-3 w-3 fill-current text-orange-300" /> SET YOUR BASELINE
                              </button>
                            </div>
                          </div>
                          <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-4">
                              {visibleSeries.map((line) => <span key={line.key} className="inline-flex items-center gap-1.5 text-[9px] font-black tracking-wide sm:text-[10px]" style={{ color: line.color }}>
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: line.color, boxShadow: `0 0 9px ${line.color}` }} />{line.label}
                              </span>)}
                              <span className="inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wide text-white sm:text-[9px]">
                                <span className="h-2.5 w-2.5 rounded-full border border-white bg-white/20 shadow-[0_0_8px_rgba(255,255,255,0.5)]" />You are here
                              </span>
                            </div>
                            <svg id="onboarding-projection-chart" viewBox="0 0 680 460" role="img" aria-label="Illustrative shooting baseline and monthly projection ranges for three-point, mid-range, and free-throw percentages" className="block h-auto w-full">
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
                              </defs>
                               <rect width="680" height="400" fill="url(#shot-chart-wash)" />
                               {chartTicks.map((tick) => {
                                const y = yAt(tick);
                                 const majorTick = tick % 10 === 0;
                                return <g key={tick}>
                                  {tick !== chartMin && <line x1="56" x2="606" y1={y} y2={y} stroke={majorTick ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.055)"} strokeDasharray="3 8" />}
                                    <text x="46" y={y + 4} textAnchor="end" fill="#a1a7ae" fontSize="12" fontWeight="500">{tick}%</text>
                                </g>;
                              })}
                              {[0, 3, 6, 9, 12].map((month) => (
                                <g key={month}>
                                    <text x={xAt(month)} y="438" textAnchor="middle" fill={month === 0 ? "#fff" : "#929ba5"} fontSize="12" fontWeight={month === 0 ? "800" : "400"}>{month === 0 ? "NOW" : `M${month}`}</text>
                                </g>
                              ))}
                              {[3, 6, 9].map((month) => (
                                  <line key={`month-grid-${month}`} x1={xAt(month)} x2={xAt(month)} y1="40" y2="390" stroke="rgba(255,255,255,0.055)" strokeDasharray="3 8" />
                              ))}
                                <line x1="56" x2="56" y1="40" y2="390" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" />
                                <line x1="56" x2="606" y1="390" y2="390" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" />
                              {visibleSeries.map((line) => {
                                const points = line.values.map((value, index) => `${xAt(index)},${yAt(value)}`);
                                const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${point}`).join(" ");
                                const upperPoints = line.highValues.map((value, index) => `${xAt(index)},${yAt(value)}`);
                                const lowerPoints = line.lowValues.map((value, index) => `${xAt(index)},${yAt(value)}`).reverse();
                                const rangePath = `${upperPoints.map((point, index) => `${index === 0 ? "M" : "L"}${point}`).join(" ")} ${lowerPoints.map((point) => `L${point}`).join(" ")} Z`;
                                const currentY = yAt(line.start);
                                return <g key={line.key}>
                                  <path d={rangePath} fill={line.color} fillOpacity="0.10" />
                                  <path d={linePath} fill="none" stroke={line.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 5" opacity="0.68" />
                                  <circle cx={xAt(0)} cy={currentY} r="8" fill={line.color} fillOpacity="0.18" stroke="white" strokeWidth="1.5" />
                                  <circle cx={xAt(0)} cy={currentY} r="4" fill={line.color} stroke="white" strokeWidth="1.5" />
                                </g>;
                              })}
                          </svg>
                          <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 text-[9px] font-semibold text-zinc-300 sm:text-[11px]" data-testid="onboarding-session-summary">
                            <div className="flex items-center gap-2">
                              <span>{previewProfile.trainingFrequency ?? previewProfile.trainingDays ?? 1} {previewProfile.frequencyUnit === "month" ? "per month" : "per week"}{previewProfile.sessionLength ? ` · ${previewProfile.sessionLength} min sessions` : ""}</span>
                              <Dialog open={trainingPlanOpen} onOpenChange={setTrainingPlanOpen}>
                                <DialogTrigger asChild>
                                  <button type="button" aria-label="Edit training frequency and session length" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/40 text-zinc-300 transition hover:border-orange-400/60 hover:text-orange-200">
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                </DialogTrigger>
                                <DialogContent className="w-[calc(100vw-32px)] max-w-[360px] gap-3 rounded-2xl border border-orange-400/25 bg-[#101010] p-4 text-white shadow-2xl">
                                  <DialogTitle className="pr-8 text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">Your training plan</DialogTitle>
                                  <div>
                                    <label htmlFor="hub-training-frequency-summary" className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-zinc-400">How often do you train outside of practice?</label>
                                    <div className="grid grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] gap-2">
                                      <input
                                        id="hub-training-frequency-summary"
                                        type="number"
                                        inputMode="numeric"
                                        min={1}
                                        max={99}
                                        value={previewProfile.trainingFrequency ?? previewProfile.trainingDays ?? 1}
                                        onChange={(event) => {
                                          const value = event.currentTarget.value;
                                          updatePreviewProfile({ trainingFrequency: value ? Math.min(99, Math.max(1, Number(value))) : undefined });
                                        }}
                                        className="input-no-spinner h-10 min-w-0 rounded-lg border border-white/10 bg-black px-3 text-sm text-white outline-none focus:border-orange-400"
                                      />
                                      <Select value={previewProfile.frequencyUnit ?? "week"} onValueChange={(value) => updatePreviewProfile({ frequencyUnit: value as "week" | "month" })}>
                                        <SelectTrigger aria-label="Training frequency unit" className="h-10 w-full min-w-0 rounded-lg border-white/10 bg-black px-2 text-[11px] text-white focus:ring-orange-400/40">
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
                                    <label htmlFor="hub-session-length-summary" className="mb-1.5 block text-[9px] font-bold uppercase tracking-wider text-zinc-400">How long do you usually train for?</label>
                                    <Select value={previewProfile.sessionLength ? String(previewProfile.sessionLength) : ""} onValueChange={(value) => updatePreviewProfile({ sessionLength: Number(value) })}>
                                      <SelectTrigger id="hub-session-length-summary" className="h-10 w-full min-w-0 rounded-lg border-white/10 bg-black px-3 text-xs text-white focus:ring-orange-400/40">
                                        <SelectValue placeholder="Choose session length" />
                                      </SelectTrigger>
                                      <SelectContent className="border-orange-500/30 bg-[#111] text-zinc-100">
                                        {[20, 30, 45, 60, 75, 90].map((minutes) => <SelectItem key={minutes} value={String(minutes)} className="focus:bg-orange-500/15 focus:text-white">{minutes} minutes</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <Dialog open={nextSessionOpen} onOpenChange={setNextSessionOpen}>
                              <DialogTrigger asChild>
                                <button type="button" aria-label="Edit next session date and time" className="inline-flex items-center gap-1.5 rounded-md py-1 text-left text-orange-200 transition hover:text-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
                                  <CalendarDays className="h-3 w-3 shrink-0" />
                                  <span>Next session · {onboardingSchedule[Math.min(previewDay - 1, onboardingSchedule.length - 1)].toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                                  <Pencil className="h-3 w-3 shrink-0" />
                                </button>
                              </DialogTrigger>
                              <DialogContent className="w-[calc(100vw-24px)] max-w-[360px] gap-3 rounded-2xl border border-orange-400/20 bg-[#101010] p-4 text-white shadow-2xl">
                                <DialogTitle className="pr-8 text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">Edit next session</DialogTitle>
                                <Calendar
                                  mode="single"
                                  selected={onboardingSchedule[currentScheduleIndex]}
                                  onSelect={(date) => { if (date) updateScheduleDate(currentScheduleIndex, date); }}
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
                                  <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400"><Clock3 className="h-3.5 w-3.5 text-orange-400" />Time</span>
                                  <input
                                    type="time"
                                    value={onboardingSchedule[currentScheduleIndex].toTimeString().slice(0, 5)}
                                    onChange={(event) => updateScheduleTime(currentScheduleIndex, event.currentTarget.value)}
                                    aria-label="Next session time"
                                    data-testid="input-next-session-time"
                                    className="h-9 rounded-full border border-orange-500/25 bg-black px-3 text-sm text-white outline-none focus:border-orange-400"
                                  />
                                </div>
                                <p className="text-[10px] text-zinc-500">Changes also update the training calendar above.</p>
                              </DialogContent>
                            </Dialog>
                          </div>
                          <div className="mx-4 mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Filter shooting projection by shot type">
                            {series.map((line) => (
                              <button
                                key={`${line.key}-summary`}
                                type="button"
                                aria-pressed={activeProjectionType === line.key}
                                aria-label={activeProjectionType === line.key ? "Show all shot types" : `Show only ${line.label} projection`}
                                onClick={() => setActiveProjectionType((current) => current === line.key ? null : line.key)}
                                  className={`flex min-h-[92px] min-w-0 flex-col items-stretch justify-center gap-2 rounded-lg border px-2 py-2 text-left transition sm:min-h-[100px] sm:px-3 ${
                                  activeProjectionType === line.key
                                    ? "border-white/40 bg-white/[0.09] shadow-[0_0_12px_rgba(255,255,255,0.12)]"
                                    : activeProjectionType
                                      ? "border-white/10 bg-white/[0.015] opacity-45 hover:opacity-100"
                                      : "border-white/10 bg-white/[0.025] hover:border-white/25 hover:bg-white/[0.05]"
                                }`}
                                data-testid={`button-projection-filter-${line.key}`}
                              >
                                <div className="flex min-w-0 items-center justify-between gap-1">
                                  <span className="flex min-w-0 items-center gap-1 text-[8px] font-black sm:text-[10px]" style={{ color: line.color }}>
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: line.color, boxShadow: `0 0 6px ${line.color}` }} />
                                    <span className="truncate">{line.label}</span>
                                  </span>
                                  <span className="shrink-0 whitespace-nowrap text-[9px] font-black text-white sm:text-xs">{line.start}%</span>
                                </div>
                                <span className="text-[6px] font-bold uppercase tracking-wide text-zinc-500 sm:text-[8px]">Current baseline</span>
                                <p className="text-[6px] font-semibold uppercase tracking-wide text-zinc-500 sm:text-[8px]">
                                  Year range <span className="text-zinc-200">{Math.floor(line.lowValues[12])}–{Math.ceil(line.highValues[12])}%</span>
                                </p>
                              </button>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                  {previewDay === 1 && baselinePickerOpen && (
                    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-black/80 px-0 pt-8 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setBaselinePickerOpen(false)}>
                      <section role="dialog" aria-modal="true" aria-labelledby="baseline-picker-title" className="max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/25 bg-[#101010] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-20px_70px_rgba(0,0,0,0.7)] sm:rounded-3xl sm:p-6" onClick={(event) => event.stopPropagation()}>
                        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700 sm:hidden" />
                        <div className="mb-4 flex items-start justify-between gap-3">
                          <div>
                            <h3 id="baseline-picker-title" className="font-heading text-lg font-black uppercase text-white sm:text-xl">Choose your baseline</h3>
                            <p className="mt-1 text-[10px] text-zinc-400">Pick one workout to start.</p>
                          </div>
                          <button type="button" onClick={() => setBaselinePickerOpen(false)} aria-label="Close baseline choices" className="rounded-full border border-white/10 p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="Choose baseline workout size">
                          {onboardingBaselines.map((option) => {
                            const total = option.threes + option.midrange + option.freeThrows;
                            const active = baselineId === option.id;
                            return (
                              <button key={option.id} type="button" aria-pressed={active}
                                onClick={() => setBaselineId(option.id)}
                                className={`rounded-2xl border p-3 text-left transition-all ${active ? "border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.10),rgba(12,12,12,0.96)_75%)] shadow-[0_0_18px_rgba(255,255,255,0.12)]" : "border-white/[0.09] bg-zinc-950/80 hover:border-white/20 hover:bg-zinc-900"}`}>
                                <span className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white">{option.name}</span>
                                  {active && <CheckCircle2 className="h-4 w-4 text-white" />}
                                </span>
                                <span className="mt-2 block text-2xl font-black leading-none text-white">{total}<span className="ml-1 text-[9px] font-semibold uppercase text-zinc-500">shots</span></span>
                                <span className="mt-3 grid grid-cols-3 gap-1 border-t border-white/[0.08] pt-2 text-center">
                                  <span><span className="block text-sm font-bold" style={{ color: "#ffd84d" }}>{option.threes}</span><span className="text-[7px] uppercase text-zinc-500">3PT</span></span>
                                  <span><span className="block text-sm font-bold" style={{ color: "#ff5364" }}>{option.midrange}</span><span className="text-[7px] uppercase text-zinc-500">Mid</span></span>
                                  <span><span className="block text-sm font-bold" style={{ color: "#70f06a" }}>{option.freeThrows}</span><span className="text-[7px] uppercase text-zinc-500">FT</span></span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        <button type="button" onClick={() => {
                          setBaselineResults({ threes: "0", midrange: "0", freeThrows: "0" });
                          setBaselineComplete(false);
                          setBaselinePickerOpen(false);
                          setBaselineLogging(true);
                        }} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(110deg,#ff7417_0%,#ff8c1e_58%,#ffad32_100%)] px-4 text-xs font-black uppercase tracking-[0.14em] text-black shadow-[0_8px_24px_rgba(255,122,26,0.28)] transition hover:brightness-110 hover:shadow-[0_10px_30px_rgba(255,138,38,0.36)] active:brightness-95" data-testid="button-start-onboarding-baseline">
                          <Play className="h-4 w-4 fill-current" /> Start This Workout
                        </button>
                      </section>
                    </div>
                  )}

                  {previewDay === 1 && baselineLogging && !baselineComplete && (
                    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 px-0 pt-10 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setBaselineLogging(false)}>
                      <section role="dialog" aria-modal="true" aria-labelledby="baseline-log-title" className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-orange-400/25 bg-[#101010] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-[0_-20px_70px_rgba(0,0,0,0.7)] sm:rounded-3xl sm:p-6" onClick={(event) => event.stopPropagation()}>
                        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700 sm:hidden" />
                        <div className="mb-5 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-300">Baseline workout</p>
                            <h3 id="baseline-log-title" className="mt-1 font-heading text-xl font-black uppercase text-white">Log your makes</h3>
                            <p className="mt-1 text-[11px] text-zinc-400">{baselineTotal} attempts · {selectedBaseline.name}</p>
                          </div>
                          <button type="button" onClick={() => setBaselineLogging(false)} aria-label="Close baseline logger" className="rounded-full border border-white/10 p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"><X className="h-4 w-4" /></button>
                        </div>
                        <div className="space-y-2.5">
                          {previewShotTypes.map(({ key, label, color }) => {
                            const attempts = selectedBaseline[key];
                            return (
                              <div key={key} className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-black/45 p-3">
                                <div className="min-w-0 flex-1">
                                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-300"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />{label}</p>
                                  <p className="mt-1 text-[9px] text-zinc-500">{attempts} attempts</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={baselineResults[key] ?? "0"}
                                    onChange={(event) => {
                                      const raw = event.currentTarget.value;
                                      const digits = raw.replace(/\D/g, "");
                                      if (digits === "") {
                                        setBaselineResults((current) => ({ ...current, [key]: "" }));
                                        return;
                                      }
                                      const value = Number(digits);
                                      if (Number.isFinite(value)) {
                                        setBaselineResults((current) => ({ ...current, [key]: String(Math.min(attempts, Math.max(0, value))) }));
                                      }
                                    }}
                                    aria-label={`${label} makes out of ${attempts} attempts`}
                                    className="h-11 w-[5.5rem] rounded-xl border bg-black/70 px-2 text-center text-xl font-black tabular-nums outline-none focus:ring-2"
                                    style={{ borderColor: `${color}88`, color, boxShadow: `inset 0 0 18px ${color}12` }}
                                  />
                                  <span className="text-[10px] font-bold tabular-nums text-zinc-500">/ {attempts}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <button type="button"
                          disabled={previewShotTypes.some(({ key }) => baselineResults[key] === "" || !Number.isInteger(Number(baselineResults[key])) || Number(baselineResults[key]) < 0 || Number(baselineResults[key]) > selectedBaseline[key])}
                          onClick={() => { setBaselineComplete(true); setBaselineLogging(false); }}
                          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-4 text-xs font-black uppercase tracking-[0.12em] text-black shadow-[0_8px_24px_rgba(249,115,22,0.2)] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                          data-testid="button-log-onboarding-baseline"
                        >
                          <CheckCircle2 className="h-4 w-4" /> Finish Baseline Workout
                        </button>
                      </section>
                    </div>
                  )}

                </section>
            </div>

            {previewDay === 2 && (
              <section className="space-y-5 pb-4" data-testid="card-day-two-mission">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="font-heading text-xl font-black uppercase text-white sm:text-2xl">Find Your Shooting Range</h2>
                  <button type="button" onClick={() => {
                    let saved: Record<string, any> = {};
                    if (onboardingPreview) {
                      try { saved = JSON.parse(sessionStorage.getItem("playr1-onboarding-day2-profile") || "{}"); } catch {}
                    }
                    const source = { ...setupData?.answers, ...saved };
                    setDayTwoAnswers({
                      currentSituation: source.currentSituation || "",
                      primaryGoal: source.primaryGoal || "",
                      positions: Array.isArray(source.positions) ? source.positions : [],
                      skillRankings: makeUniqueRankings(source.skillRankings),
                      experienceYears: source.experienceYears === undefined ? "" : String(source.experienceYears),
                    });
                    setDayTwoError("");
                    setDayTwoProfileOpen(true);
                  }} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3 text-[9px] font-black uppercase tracking-wide text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-lg transition hover:border-orange-300/50 hover:bg-orange-500/10">
                    <Pencil className="h-3.5 w-3.5 text-orange-300" /> Complete profile
                  </button>
                </div>
                <article className="overflow-hidden rounded-[1.35rem] border border-zinc-300 bg-[#f6f6f4] text-zinc-950 shadow-[0_14px_38px_rgba(0,0,0,0.35)]" data-testid="day-two-range-workout-card">
                  <div className="relative overflow-hidden px-4 pb-4 pt-4 sm:px-6 sm:pt-5">
                    <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "linear-gradient(135deg, transparent 0 34%, rgba(0,0,0,.035) 34% 35%, transparent 35% 65%, rgba(0,0,0,.025) 65% 66%, transparent 66%), radial-gradient(ellipse at top right, white, transparent 55%)" }} />
                    <div className="relative flex items-start justify-between gap-3 border-b-[3px] border-black pb-2">
                      <div className="min-w-0">
                        <p className="font-heading text-3xl font-black uppercase leading-none tracking-tight sm:text-4xl">Workout <span className="text-orange-600">#2</span></p>
                        <h3 className="mt-2 font-heading text-base font-black uppercase leading-tight sm:text-lg">Find Your Shooting Range</h3>
                        <p className="mt-1 text-[10px] font-semibold text-zinc-600 sm:text-xs">125 shots · 40 bonus layups · 5 cone sets</p>
                      </div>
                      <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-900 shadow-sm"><Dumbbell className="h-5 w-5" /></span>
                    </div>
                    <div className="relative mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-white p-2 shadow-[0_3px_12px_rgba(0,0,0,.08)] sm:p-3">
                      <svg viewBox="0 0 600 220" role="img" aria-label="Basketball court showing the shooting range extending from the basket toward the perimeter" className="h-auto w-full">
                        <rect x="6" y="6" width="588" height="208" fill="#fbfbfa" stroke="#111" strokeWidth="5" />
                        <path d="M160 214V136Q300 15 440 136V214M214 214V151H386V214M245 151V130H355V151M278 214V197a22 22 0 0 1 44 0v17M270 197a30 30 0 0 0 60 0M281 166a19 19 0 0 0 38 0" fill="none" stroke="#171717" strokeWidth="3" />
                        <path d="M160 136Q300 15 440 136" fill="none" stroke="#a8a8a8" strokeWidth="2" strokeDasharray="6 6" />
                        <path d="M245 151Q300 183 355 151" fill="none" stroke="#555" strokeWidth="2" strokeDasharray="5 5" />
                        <path d="M300 194V43" stroke="#c2410c" strokeWidth="2.5" strokeDasharray="4 6" />
                        {[
                          { y: 187, n: "1", r: 12 },
                          { y: 158, n: "2", r: 13 },
                          { y: 127, n: "3", r: 14 },
                          { y: 94, n: "4", r: 15 },
                          { y: 60, n: "5", r: 16 },
                        ].map((spot) => (
                          <g key={spot.n} className="origin-center animate-pulse">
                            <circle cx="300" cy={spot.y} r={spot.r + 6} fill="#f97316" fillOpacity=".12" />
                            <circle cx="300" cy={spot.y} r={spot.r} fill="white" stroke="#c2410c" strokeWidth="3" />
                            <text x="300" y={spot.y + 4} textAnchor="middle" fontSize="12" fontWeight="900" fill="#111">{spot.n}</text>
                          </g>
                        ))}
                        <text x="300" y="32" textAnchor="middle" fontSize="11" fontWeight="800" letterSpacing="2" fill="#555">RANGE EXTENDS</text>
                        <text x="32" y="202" fontSize="10" fontWeight="800" fill="#555">START</text>
                        <text x="476" y="30" fontSize="10" fontWeight="800" fill="#555">GAME RANGE</text>
                      </svg>
                      <div className="mt-1 flex items-center justify-between px-1 text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500 sm:text-[9px]">
                        <span>Start close</span><span>Build your range</span><span>Step back</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => setDayTwoVideoOpen(true)} className="group relative mt-3 block aspect-video w-full overflow-hidden rounded-xl border border-zinc-300 bg-[#171717] text-left shadow-md" data-testid="button-play-day-two-video" aria-label="Play the Day 2 shooting range introduction video">
                      <div className="absolute inset-0 bg-[linear-gradient(125deg,#202020,#080808_56%,#292929)]" />
                      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "repeating-linear-gradient(135deg,transparent 0 28px,rgba(255,255,255,.12) 29px,transparent 31px)" }} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="flex h-12 w-16 items-center justify-center rounded-xl bg-[#e62117] text-white shadow-lg transition-transform group-hover:scale-110"><Play className="ml-1 h-6 w-6 fill-current" /></span>
                        <span className="mt-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/90">Day 2 · Find Your Range</span>
                        <span className="mt-1 text-[8px] font-medium text-white/55">Tap to watch your introduction</span>
                      </div>
                      <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[9px] font-bold text-white">{dayTwoIntroVideoSrc ? "PLAY VIDEO" : "VIDEO COMING SOON"}</span>
                    </button>
                    <button type="button" onClick={() => setDayTwoWorkoutOpen(true)} className="relative mt-3 inline-flex min-h-12 w-full items-center justify-between rounded-xl bg-black px-4 text-left text-white shadow-[0_5px_0_#d4d4d4] transition hover:bg-zinc-800 active:translate-y-0.5 active:shadow-none" data-testid="button-preview-day-two-workout">
                      <span><span className="block text-xs font-black uppercase tracking-[0.12em]">Preview the workout</span><span className="mt-0.5 block text-[9px] text-zinc-300">6 drills · 125 shots plus bonus work</span></span>
                      <ChevronRight className="h-5 w-5 text-orange-400" />
                    </button>
                  </div>
                </article>
              </section>
            )}

            {dayTwoWorkoutOpen && (
              <div className="fixed inset-0 z-[86] flex items-end justify-center bg-black/85 px-0 pt-8 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setDayTwoWorkoutOpen(false)}>
                <section role="dialog" aria-modal="true" aria-labelledby="day-two-workout-title" className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-zinc-300 bg-[#f6f6f4] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-zinc-950 shadow-2xl sm:rounded-3xl sm:p-6" onClick={(event) => event.stopPropagation()}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-sm font-black uppercase tracking-[0.16em] text-orange-700">Workout #2 · 125 shots + bonus</p>
                      <h3 id="day-two-workout-title" className="mt-1 font-heading text-2xl font-black uppercase text-black">Find Your Shooting Range</h3>
                      <p className="mt-1 text-xs font-medium text-zinc-600">40 bonus layups and 5 cone sets included.</p>
                    </div>
                    <button type="button" onClick={() => setDayTwoWorkoutOpen(false)} aria-label="Close workout preview" className="rounded-full border border-zinc-300 bg-white p-2 text-zinc-500 hover:text-black"><X className="h-4 w-4" /></button>
                  </div>
                  <button type="button" onClick={() => setDayTwoVideoOpen(true)} className="group relative mt-4 block aspect-video w-full overflow-hidden rounded-xl border border-zinc-300 bg-zinc-900 text-left" aria-label="Watch the Day 2 video">
                    <div className="absolute inset-0 bg-[linear-gradient(125deg,#262626,#080808_56%,#333)]" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="flex h-12 w-16 items-center justify-center rounded-xl bg-[#e62117] text-white transition-transform group-hover:scale-110"><Play className="ml-1 h-6 w-6 fill-current" /></span>
                      <span className="mt-2 text-[9px] font-black uppercase tracking-[0.16em] text-white">Day 2 · Find Your Range</span>
                      {!dayTwoIntroVideoSrc && <span className="mt-1 text-[9px] text-white/60">Video placeholder — add your intro when ready</span>}
                    </div>
                  </button>
                  <div className="mt-4 space-y-2">
                    {dayTwoWorkoutQuery.isLoading && <p className="py-6 text-center text-sm text-zinc-500">Loading workout…</p>}
                    {dayTwoWorkoutQuery.isError && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">Could not load this workout. Please try again.</p>}
                    {dayTwoWorkoutQuery.data?.drills.map((entry, index) => (
                      <div key={entry.drillId} className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-[0_3px_12px_rgba(0,0,0,.07)] sm:grid-cols-[8.5rem_1fr] sm:items-center sm:p-4">
                        <div className="relative flex aspect-[1.4/1] items-center justify-center overflow-hidden rounded-lg border-2 border-black bg-[#fafafa]">
                          <MiniCourtRange index={index} />
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-[10px] font-black text-orange-800">{String(index + 1).padStart(2, "0")}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-heading text-base font-black uppercase text-black">{entry.drill.title}</p>
                            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-800">{entry.defaultReps ?? "—"} reps · {entry.defaultDuration ?? "—"} min</p>
                            <p className="mt-2 text-xs leading-relaxed text-zinc-700">{entry.drill.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" disabled={!dayTwoWorkoutQuery.data} onClick={() => navigate(`/log?workoutId=${encodeURIComponent(dayTwoWorkoutId)}`)} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-black px-4 text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_5px_0_#c4c4c4] transition hover:bg-zinc-800 active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-log-day-two-workout">
                    <Play className="h-4 w-4 fill-current" /> Log Workout
                  </button>
                </section>
              </div>
            )}

            {dayTwoVideoOpen && (
              <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm" onClick={() => setDayTwoVideoOpen(false)}>
                <section role="dialog" aria-modal="true" aria-labelledby="day-two-video-title" className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/15 bg-[#111] shadow-2xl" onClick={(event) => event.stopPropagation()}>
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                    <h3 id="day-two-video-title" className="font-heading text-sm font-black uppercase text-white">Day 2 · Find Your Range</h3>
                    <button type="button" onClick={() => setDayTwoVideoOpen(false)} aria-label="Close Day 2 video" className="rounded-full border border-white/10 p-2 text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>
                  </div>
                  {dayTwoIntroVideoSrc ? (
                    <video src={dayTwoIntroVideoSrc} controls autoPlay playsInline className="aspect-video w-full bg-black" />
                  ) : (
                    <div className="flex aspect-video flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,#333,#080808_70%)] px-6 text-center">
                      <PlayCircle className="h-14 w-14 text-white/70" />
                      <p className="mt-4 font-heading text-lg font-black uppercase text-white">Your Day 2 video goes here</p>
                      <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">This player is ready for your introduction video. Add the video when it’s finished and it will play here.</p>
                    </div>
                  )}
                </section>
              </div>
            )}

            {dayTwoProfileOpen && (
              <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/80 px-0 pt-8 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setDayTwoProfileOpen(false)}>
                <section role="dialog" aria-modal="true" aria-labelledby="day-two-profile-title" className="max-h-[90dvh] w-full max-w-xl space-y-4 overflow-y-auto rounded-t-3xl border border-orange-400/25 bg-[#101010] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:rounded-3xl sm:p-6" onClick={(event) => event.stopPropagation()}>
                  <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-orange-300">Player profile</p><h3 id="day-two-profile-title" className="mt-1 font-heading text-lg font-black uppercase text-white">Tell us more about your game</h3></div><button type="button" onClick={() => setDayTwoProfileOpen(false)} aria-label="Close profile questions" className="rounded-full border border-white/10 p-2 text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button></div>
                  <label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Basketball situation</span><Select value={dayTwoAnswers.currentSituation} onValueChange={(value) => setDayTwoAnswers((current) => ({ ...current, currentSituation: value }))}><SelectTrigger className="h-11 border-white/10 bg-black text-white"><SelectValue placeholder="Select your situation" /></SelectTrigger><SelectContent className="border-orange-500/30 bg-[#111] text-white">{PLAYER_SETUP_SITUATIONS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></label>
                  <label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Primary goal</span><Select value={dayTwoAnswers.primaryGoal} onValueChange={(value) => setDayTwoAnswers((current) => ({ ...current, primaryGoal: value }))}><SelectTrigger className="h-11 border-white/10 bg-black text-white"><SelectValue placeholder="Select your goal" /></SelectTrigger><SelectContent className="border-orange-500/30 bg-[#111] text-white">{PLAYER_SETUP_GOALS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></label>
                  <fieldset><legend className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Positions</legend><div className="grid grid-cols-5 gap-2">{["PG", "SG", "SF", "PF", "C"].map((position) => <button key={position} type="button" aria-pressed={dayTwoAnswers.positions.includes(position)} onClick={() => setDayTwoAnswers((current) => ({ ...current, positions: current.positions.includes(position) ? current.positions.filter((item) => item !== position) : [...current.positions, position] }))} className={`h-10 rounded-lg border text-xs font-black ${dayTwoAnswers.positions.includes(position) ? "border-orange-400 bg-orange-500/15 text-orange-200" : "border-white/10 bg-black text-zinc-400"}`}>{position}</button>)}</div></fieldset>
                  <div className="space-y-2"><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Rank your skills</p>{PLAYER_SETUP_RANK_FIELDS.map((field) => <label key={field.key} className="grid grid-cols-[7rem_1fr] items-center gap-2"><span className="text-[10px] text-zinc-400">{field.label}</span><Select value={dayTwoAnswers.skillRankings[field.key]} onValueChange={(value) => setDayTwoAnswers((current) => ({ ...current, skillRankings: { ...current.skillRankings, [field.key]: value } }))}><SelectTrigger className="h-10 border-white/10 bg-black text-xs text-white"><SelectValue placeholder="Choose skill" /></SelectTrigger><SelectContent className="border-orange-500/30 bg-[#111] text-white">{PLAYER_SETUP_SKILLS.map((skill) => <SelectItem key={skill} value={skill} disabled={Object.entries(dayTwoAnswers.skillRankings).some(([key, value]) => key !== field.key && value === skill)}>{skill}</SelectItem>)}</SelectContent></Select></label>)}</div>
                  <label className="block space-y-1.5"><span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Years played</span><Select value={dayTwoAnswers.experienceYears} onValueChange={(value) => setDayTwoAnswers((current) => ({ ...current, experienceYears: value }))}><SelectTrigger className="h-11 border-white/10 bg-black text-white"><SelectValue placeholder="Choose years played" /></SelectTrigger><SelectContent className="border-orange-500/30 bg-[#111] text-white">{["0", "1 to 3", "4 to 6", "7 to 10", "10+"].map((value) => <SelectItem key={value} value={value}>{value === "0" ? "Less than 1 year" : `${value} years`}</SelectItem>)}</SelectContent></Select></label>
                  {dayTwoError && <p role="alert" className="text-xs text-red-300">{dayTwoError}</p>}
                  <button type="button" onClick={saveDayTwoProfile} disabled={dayTwoSaving || !dayTwoAnswers.currentSituation || !dayTwoAnswers.primaryGoal || !dayTwoAnswers.positions.length || !dayTwoAnswers.experienceYears || new Set(Object.values(dayTwoAnswers.skillRankings)).size !== 4} className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-orange-500 px-4 text-xs font-black uppercase tracking-[0.14em] text-black disabled:opacity-50">{dayTwoSaving ? "Saving..." : "Save Profile"}</button>
                </section>
              </div>
            )}

                {/*
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
                */}
          </>
        ) : (
          <>
        {showProfileSetup && (
          <>
            {/*
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
            */}

            <section className="space-y-3" data-testid="section-post-onboarding">
              {/*
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
              */}

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
