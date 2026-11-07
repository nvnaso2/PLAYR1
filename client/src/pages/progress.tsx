import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { nativeFetch, statsUrl } from "@/lib/queryClient";
import { QueryError } from "@/components/query-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/stats-card";
import { ShootingHeatmap, type ShotData } from "@/components/shooting-heatmap";
import { DashboardShareDialog } from "@/components/dashboard-share-dialog";
import {
  EMPTY_SHOT_HEATMAP_BASELINES,
  type ShotHeatmapBaselineResponse,
} from "@shared/shot-heatmap";
import {
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line as RechartsLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  Clock,
  Target,
  Zap,
  Crosshair,
  CircleDot,
  Flame,
  HandMetal,
  BarChart3,
  Activity,
  PlayCircle,
  BookOpen,
  TrendingDown,
  LineChart,
  ChevronLeft,
  ChevronRight,
  Share2,
  Settings2,
  ChevronDown,
} from "lucide-react";

const CHART_COLORS = ["#f97316", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#ef4444"];

const categoryLabels: Record<string, string> = {
  "ball-handling": "Ball Handling",
  "shooting": "Shooting",
  "passing": "Passing",
  "finishing": "Finishing",
  "defense": "Defense",
  "film-session": "Film Session",
  "workouts": "Workouts",
  "basketball-iq": "Basketball IQ",
};

type TimePeriod = "daily" | "weekly" | "monthly" | "annual";

type TrainingStatDef = {
  key: string;
  title: string;
  icon: React.ReactNode;
  format?: (val: number) => string;
  testId: string;
  skillType: string;
};

const TRAINING_STAT_DEFS: TrainingStatDef[] = [
  { key: "totalShotsMade", title: "Total Shots Made", icon: <Target className="h-7 w-7" />, testId: "stats-total-shots", skillType: "shooting" },
  { key: "threePointersMade", title: "3-Pointers Made", icon: <CircleDot className="h-7 w-7" />, testId: "stats-three-pointers", skillType: "shooting" },
  { key: "freeThrowsMade", title: "Free Throws Made", icon: <Zap className="h-7 w-7" />, testId: "stats-free-throws", skillType: "shooting" },
  { key: "fieldGoalsMade", title: "Field Goals Made", icon: <TrendingUp className="h-7 w-7" />, testId: "stats-field-goals", skillType: "shooting" },
  { key: "formShotsMade", title: "Form Shots Made", icon: <Target className="h-7 w-7" />, testId: "stats-form-shots", skillType: "shooting" },
  { key: "layupsMade", title: "Layups Made", icon: <Flame className="h-7 w-7" />, testId: "stats-layups", skillType: "finishing" },
  { key: "timeBallHandling", title: "Ball Handling", icon: <HandMetal className="h-7 w-7" />, testId: "stats-ball-handling", skillType: "ball-handling" },
  { key: "leftHandBallHandling", title: "Left-Hand Handling", icon: <HandMetal className="h-7 w-7" />, testId: "stats-left-hand", skillType: "ball-handling" },
  { key: "rightHandBallHandling", title: "Right-Hand Handling", icon: <HandMetal className="h-7 w-7" />, testId: "stats-right-hand", skillType: "ball-handling" },
  { key: "passesMade", title: "Passes Made", icon: <Crosshair className="h-7 w-7" />, testId: "stats-passes", skillType: "passing" },
  { key: "fgPct", title: "FG%", icon: <Target className="h-7 w-7" />, format: (v) => `${v}%`, testId: "stats-fg-pct", skillType: "shooting" },
];

type SkillTab = { key: string; label: string };

const SKILL_TABS: SkillTab[] = [
  { key: "all", label: "All" },
  { key: "shooting", label: "Shooting" },
  { key: "ball-handling", label: "Ball Handling" },
  { key: "passing", label: "Passing" },
  { key: "finishing", label: "Finishing" },
  { key: "defense", label: "Defense" },
  { key: "basketball-iq", label: "Basketball IQ" },
  { key: "workouts", label: "Workouts" },
];

const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
  annual: "This Year",
};

type TrendPoint = {
  label: string;
  shotsMade: number; shotsAttempted: number;
  threesMade: number; threesAttempted: number;
  freeThrowsMade: number; freeThrowsAttempted: number;
  layupsMade: number; layupsAttempted: number;
  midRangeMade: number; midRangeAttempted: number;
  minutes: number; sessions: number;
};

type MetricKey =
  | "shotsMade" | "shotsAttempted" | "threesMade"
  | "freeThrowsMade" | "layupsMade" | "midRangeMade"
  | "minutes" | "sessions"
  | "fgPct" | "threePct" | "midRangePct";

type MetricDef = {
  key: MetricKey;
  label: string;
  color: string;
  isPercent?: boolean;
  getValue: (p: TrendPoint) => number;
  formatTooltip: (v: number) => string;
};

const METRIC_DEFS: MetricDef[] = [
  {
    key: "shotsMade", label: "Shots Made", color: "#f97316",
    getValue: p => p.shotsMade,
    formatTooltip: v => `${v} shots made`,
  },
  {
    key: "shotsAttempted", label: "Shots Taken", color: "#fb923c",
    getValue: p => p.shotsAttempted,
    formatTooltip: v => `${v} shots taken`,
  },
  {
    key: "threesMade", label: "3's Made", color: "#22c55e",
    getValue: p => p.threesMade,
    formatTooltip: v => `${v} 3-pointers made`,
  },
  {
    key: "freeThrowsMade", label: "Free Throws Made", color: "#3b82f6",
    getValue: p => p.freeThrowsMade,
    formatTooltip: v => `${v} free throws made`,
  },
  {
    key: "layupsMade", label: "Layups Made", color: "#8b5cf6",
    getValue: p => p.layupsMade,
    formatTooltip: v => `${v} layups made`,
  },
  {
    key: "midRangeMade", label: "Mid-Range Made", color: "#ec4899",
    getValue: p => p.midRangeMade,
    formatTooltip: v => `${v} mid-range shots made`,
  },
  {
    key: "minutes", label: "Minutes Trained", color: "#14b8a6",
    getValue: p => p.minutes,
    formatTooltip: v => `${v} min`,
  },
  {
    key: "sessions", label: "Drills Completed", color: "#f59e0b",
    getValue: p => p.sessions,
    formatTooltip: v => `${v} drills`,
  },
  {
    key: "fgPct", label: "FG%", color: "#ef4444", isPercent: true,
    getValue: p => p.shotsAttempted > 0 ? Math.round((p.shotsMade / p.shotsAttempted) * 100) : 0,
    formatTooltip: v => `${v}%`,
  },
  {
    key: "threePct", label: "3-Point %", color: "#a3e635", isPercent: true,
    getValue: p => p.threesAttempted > 0 ? Math.round((p.threesMade / p.threesAttempted) * 100) : 0,
    formatTooltip: v => `${v}%`,
  },
  {
    key: "midRangePct", label: "Mid-Range %", color: "#67e8f9", isPercent: true,
    getValue: p => p.midRangeAttempted > 0 ? Math.round((p.midRangeMade / p.midRangeAttempted) * 100) : 0,
    formatTooltip: v => `${v}%`,
  },
];

export default function ProgressPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("weekly");
  const [selectedDashboardPage, setSelectedDashboardPage] = useState<"completion" | "shooting" | null>(null);
  const [chartIndex, setChartIndex] = useState(0);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("shotsMade");
  const [shareOpen, setShareOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const { data: accountProfile } = useQuery<{ preferredWorkoutLoggingMode?: "complete" | "track" | null }>({ queryKey: ["/api/profile"] });
  const { data: playerSetup } = useQuery<{
    answers?: {
      shootingBaseline?: Partial<Record<"threes" | "midrange" | "freeThrows", { makes: number; attempts: number }>>;
      trainingDaysPerUnit?: number;
      trainingPeriodUnit?: "week" | "month";
    };
  }>({ queryKey: ["/api/player-setup"] });
  const savedShootingBaseline = playerSetup?.answers?.shootingBaseline;
  const baselineSeries = [
    { key: "threes" as const, chartKey: "threePoint", label: "3PT", color: "#ffd84d", start: 20, ceiling: 95, phase: 0.2 },
    { key: "midrange" as const, chartKey: "midRange", label: "Mid-range", color: "#ff5364", start: 30, ceiling: 95, phase: 1.7 },
    { key: "freeThrows" as const, chartKey: "freeThrows", label: "Free throws", color: "#70f06a", start: 40, ceiling: 99, phase: 3.1 },
  ];
  const trainingFrequency = Math.max(1, Number(playerSetup?.answers?.trainingDaysPerUnit ?? 1));
  const sessionsPerWeek = Math.min(7, trainingFrequency * (playerSetup?.answers?.trainingPeriodUnit === "month" ? 12 / 52 : 1));
  const trainingDose = Math.pow(sessionsPerWeek, 0.7);
  const baselineProjectionData = Array.from({ length: 13 }, (_, month) => {
    const row: Record<string, string | number> = { month: month === 0 ? "NOW" : `M${month}` };
    baselineSeries.forEach((series) => {
      const saved = savedShootingBaseline?.[series.key];
      const start = saved && saved.attempts > 0 ? Math.round((saved.makes / saved.attempts) * 100) : series.start;
      const ceiling = Math.max(start, series.ceiling);
      const potential = ceiling - start;
      const rate = 0.12 + 0.16 * (1 - start / 100);
      const annualGain = potential * (1 - Math.exp(-rate * trainingDose));
      const progress = (1 - Math.exp(-2.8 * (month / 12))) / (1 - Math.exp(-2.8));
      const yearFraction = month / 12;
      const wobble = Math.sin(month * 1.55 + series.phase) * yearFraction * (1 - yearFraction) * (8 + trainingDose * 2);
      row[series.chartKey] = Math.max(0, Math.min(ceiling, start + annualGain * progress + wobble));
    });
    return row;
  });
  const activeDashboardPage = selectedDashboardPage ?? (accountProfile?.preferredWorkoutLoggingMode === "track" ? "shooting" : "completion");
  const sectionDragStart = useRef<number | null>(null);
  const chartDragStart = useRef<number | null>(null);
  const sectionWheelAt = useRef(0);
  const chartWheelAt = useRef(0);
  const shootingChartMetrics = METRIC_DEFS.filter((metric) => metric.key !== "minutes" && metric.key !== "sessions");
  const dashboardChartCount = activeDashboardPage === "completion" ? 3 : shootingChartMetrics.length + 1;
  const changeSectionBySwipe = (direction: 1 | -1) => {
    setSelectedDashboardPage(direction === 1
      ? activeDashboardPage === "completion" ? "shooting" : "completion"
      : activeDashboardPage === "shooting" ? "completion" : "shooting");
    setChartIndex(0);
  };
  const handleSectionPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    sectionDragStart.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handleSectionPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = sectionDragStart.current;
    sectionDragStart.current = null;
    if (start === null || Math.abs(event.clientX - start) < 48) return;
    changeSectionBySwipe(event.clientX < start ? 1 : -1);
  };
  const handleSectionWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaX) < 20 || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    const now = Date.now();
    if (now - sectionWheelAt.current < 450) return;
    sectionWheelAt.current = now;
    changeSectionBySwipe(event.deltaX > 0 ? 1 : -1);
  };
  const handleChartPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    chartDragStart.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handleChartPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = chartDragStart.current;
    chartDragStart.current = null;
    if (start === null || Math.abs(event.clientX - start) < 48) return;
    const direction = event.clientX < start ? 1 : -1;
    const next = (chartIndex + direction + dashboardChartCount) % dashboardChartCount;
    setChartIndex(next);
    if (activeDashboardPage === "shooting" && next > 0) setSelectedMetric(shootingChartMetrics[(next - 1) % shootingChartMetrics.length].key);
  };
  const handleChartWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaX) < 20 || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    const now = Date.now();
    if (now - chartWheelAt.current < 450) return;
    chartWheelAt.current = now;
    const direction = event.deltaX > 0 ? 1 : -1;
    const next = (chartIndex + direction + dashboardChartCount) % dashboardChartCount;
    setChartIndex(next);
    if (activeDashboardPage === "shooting" && next > 0) setSelectedMetric(shootingChartMetrics[(next - 1) % shootingChartMetrics.length].key);
  };
  const dayThreeTrainingLogId = new URLSearchParams(search).get("day3TrainingLogId");
  const fromHub = location.includes("from=hub");

  const { data: weeklyStats } = useQuery<{ date: string; minutes: number; sessions: number }[]>({
    queryKey: ['/api/stats/weekly', timePeriod],
    queryFn: async () => {
      const res = await nativeFetch(statsUrl(`/api/stats/weekly`, timePeriod));
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }
  });

  const { data: categoryStats } = useQuery<{ category: string; minutes: number; sessions: number }[]>({
    queryKey: ['/api/stats/by-category', timePeriod],
    queryFn: async () => {
      const res = await nativeFetch(statsUrl(`/api/stats/by-category`, timePeriod));
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }
  });

  const { data: overviewStats, isLoading: overviewLoading, isError: overviewError, refetch: refetchOverview } = useQuery<{
    totalSessions: number;
    totalMinutes: number;
    avgScore: number;
    streak: number;
  }>({
    queryKey: ['/api/stats/overview', timePeriod],
    queryFn: async () => {
      const res = await nativeFetch(statsUrl(`/api/stats/overview`, timePeriod));
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }
  });

  const { data: shotStats } = useQuery<Array<{ location: string; made: number; missed: number }>>({
    queryKey: ['/api/stats/shots', timePeriod],
    queryFn: async () => {
      const res = await nativeFetch(statsUrl(`/api/stats/shots`, timePeriod));
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }
  });

  const {
    data: shotHeatmapBaselines,
    isLoading: shotHeatmapBaselinesLoading,
    isError: shotHeatmapBaselinesError,
  } = useQuery<ShotHeatmapBaselineResponse>({
    queryKey: ["/api/stats/shot-heatmap-baselines"],
    queryFn: async () => {
      const res = await nativeFetch("/api/stats/shot-heatmap-baselines");
      if (!res.ok) throw new Error("Failed to fetch recent shooting averages");
      return res.json();
    },
  });

  const { data: trainingStats, isLoading: trainingLoading } = useQuery<Record<string, number>>({
    queryKey: ['/api/stats/dashboard-training', timePeriod],
    queryFn: async () => {
      const res = await nativeFetch(statsUrl(`/api/stats/dashboard-training`, timePeriod));
      if (!res.ok) throw new Error("Failed to fetch training stats");
      return res.json();
    }
  });

  const { data: trendsData } = useQuery<TrendPoint[]>({
    queryKey: ['/api/stats/trends', timePeriod],
    queryFn: async () => {
      const res = await nativeFetch(statsUrl(`/api/stats/trends`, timePeriod));
      if (!res.ok) throw new Error("Failed to fetch trends");
      return res.json();
    }
  });

  const shotHeatmapData: ShotData[] = shotStats?.map(s => ({
    location: s.location,
    made: s.made,
    attempted: s.made + s.missed
  })) || [];

  const totalMinutes = overviewStats?.totalMinutes || 0;
  const streak = overviewStats?.streak || 0;

  const pieData = categoryStats?.map((cat, index) => ({
    name: categoryLabels[cat.category] || cat.category,
    value: cat.minutes,
    color: CHART_COLORS[index % CHART_COLORS.length],
  })) || [];

  const activeDef = METRIC_DEFS.find(m => m.key === selectedMetric) || METRIC_DEFS[0];
  const chartData = trendsData?.map(p => ({
    label: p.label,
    value: activeDef.getValue(p),
  }));
  const hasTrendData = chartData?.some(p => p.value > 0);

  const periodChartTitle: Record<TimePeriod, string> = {
    daily: "Last 7 Days",
    weekly: "This Week",
    monthly: "This Month",
    annual: "This Year",
  };

  if (overviewError) {
    return (
      <div className="w-full min-w-0 overflow-x-clip p-4 sm:p-6 max-w-7xl mx-auto">
        <QueryError message="Unable to load your stats. Check your connection and try again." onRetry={refetchOverview} />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[#090909] p-3 sm:p-5 max-w-7xl mx-auto gap-3">
      {dayThreeTrainingLogId && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-400/25 bg-orange-500/10 p-4" data-testid="day-three-dashboard-journal-next-step">
          <div>
            <p className="font-heading font-black uppercase text-white">Your Volume Workout is on the Dashboard</p>
            <p className="text-sm text-zinc-400">Review your results, then capture how the session felt in your Journal.</p>
          </div>
          <Button onClick={() => setLocation(`/journal?type=post-workout&trainingLogId=${encodeURIComponent(dayThreeTrainingLogId)}`)} className="bg-orange-500 font-bold text-black hover:bg-orange-400" data-testid="button-day-three-journal-next">Continue to Journal</Button>
        </div>
      )}
      <header className="shrink-0 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="mt-1 text-2xl sm:text-3xl font-black uppercase tracking-wide text-white" data-testid="text-page-title">Dashboard</h1>
          <div className="flex shrink-0 items-center justify-end gap-2">
            <Button
              size="icon"
              onClick={() => setShareOpen(true)}
              className="h-9 w-9 border border-orange-400/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20 hover:text-orange-200"
              data-testid="button-share-dashboard"
              aria-label="Share dashboard"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setLocation(`/progress/customize${fromHub ? "?from=hub" : ""}`)}
              className="h-9 w-9 border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-orange-400/40 hover:bg-zinc-800 hover:text-orange-300"
              data-testid="button-customize-dashboard-stats"
              aria-label="Customize dashboard"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid w-full grid-cols-4 gap-1 sm:w-auto" role="group" aria-label="Choose dashboard time range">
            {(["daily", "weekly", "monthly", "annual"] as TimePeriod[]).map((period) => (
              <Button
                key={period}
                size="sm"
                variant={timePeriod === period ? "default" : "outline"}
                onClick={() => setTimePeriod(period)}
                className={timePeriod === period
                  ? "h-9 min-w-0 bg-orange-500 px-1 text-[10px] font-bold text-black hover:bg-orange-400 sm:h-10 sm:px-2 sm:text-xs"
                  : "h-9 min-w-0 border-zinc-800 bg-transparent px-1 text-[10px] text-zinc-400 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-300 sm:h-10 sm:px-2 sm:text-xs"}
                data-testid={`button-period-${period}`}
              >
                {TIME_PERIOD_LABELS[period]}
              </Button>
            ))}
        </div>
      </header>

      {(
        <section
          className="shrink-0 select-none touch-pan-y"
          aria-label="Swipe between training and shooting statistics"
          onPointerDown={handleSectionPointerDown}
          onPointerUp={handleSectionPointerUp}
          onPointerCancel={() => { sectionDragStart.current = null; }}
          onWheel={handleSectionWheel}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="font-heading text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              {activeDashboardPage === "completion" ? "Training" : "Shooting"}
            </p>
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {[0, 1].map((index) => <span key={index} className={`h-1.5 rounded-full transition-all ${index === (activeDashboardPage === "completion" ? 0 : 1) ? "w-5 bg-orange-400" : "w-1.5 bg-zinc-700"}`} />)}
            </div>
          </div>
          {activeDashboardPage === "completion" ? (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <StatsCard title="Drills Completed" value={trainingStats?.drillsCompleted ?? 0} icon={<Target className="h-5 w-5 text-primary" />} testId="stats-sessions" compact />
              <StatsCard title="Hours Trained" value={Math.round((totalMinutes / 60) * 10) / 10} icon={<Clock className="h-5 w-5 text-primary" />} testId="stats-hours" compact />
              <StatsCard title="Workouts" value={trainingStats?.workoutsCompleted ?? 0} icon={<PlayCircle className="h-5 w-5 text-primary" />} testId="stats-workouts-completed" compact />
              <StatsCard title="Shots Taken" value={(trendsData ?? []).reduce((sum, point) => sum + point.shotsAttempted, 0).toLocaleString()} icon={<Target className="h-5 w-5 text-primary" />} testId="stats-shots-taken" compact />
              <StatsCard title="Dribbles Logged" value={(trainingStats?.totalDribbles ?? 0).toLocaleString()} icon={<Activity className="h-5 w-5 text-primary" />} testId="stats-ball-handling-total" compact />
              <StatsCard title="Day Streak" value={streak} icon={<Zap className="h-5 w-5 text-primary" />} testId="stats-streak" compact />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3" data-testid="shooting-stat-breakdown">
              {TRAINING_STAT_DEFS.filter((stat) => ["totalShotsMade", "threePointersMade", "freeThrowsMade", "fieldGoalsAttempted", "fgPct"].includes(stat.key)).map((stat) => {
                const value = trainingStats?.[stat.key] ?? 0;
                return <StatsCard key={stat.key} title={stat.title} value={stat.format ? stat.format(value) : value.toLocaleString()} icon={<Target className="h-5 w-5 text-primary" />} testId={stat.testId} compact />;
              })}
            </div>
          )}
        </section>
      )}

      {activeDashboardPage === "completion" ? (
        <div
          className="flex min-h-0 flex-1 flex-col touch-pan-y select-none"
          data-testid="completion-chart-carousel"
          onPointerDown={handleChartPointerDown}
          onPointerUp={handleChartPointerUp}
          onPointerCancel={() => { chartDragStart.current = null; }}
          onWheel={handleChartWheel}
        >
          <Card className="flex min-h-0 flex-1 flex-col border-zinc-800 bg-zinc-950/70 shadow-none">
            <CardHeader className="shrink-0 pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  {chartIndex === 0 ? <Target className="h-5 w-5 text-primary" /> : chartIndex === 1 ? <BarChart3 className="h-5 w-5 text-primary" /> : <Activity className="h-5 w-5 text-primary" />}
                  {["Day 1 Shooting Baseline", "Training Activity", "Time by Category"][chartIndex]}
                </CardTitle>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{chartIndex + 1} / 3</span>
              </div>
              {chartIndex === 0 && <p className="text-xs text-zinc-500">Your saved baseline or the same starting values used in the Day 1 Hub.</p>}
            </CardHeader>
            <CardContent className="min-h-0 flex-1 px-2 pb-3 sm:px-5">
              {chartIndex === 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={baselineProjectionData} margin={{ left: -12, right: 12, top: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={38} />
                    <Tooltip formatter={(value: number) => [`${Math.round(value)}%`, "Projected make rate"]} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "rgba(249,115,22,0.3)", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                    {baselineSeries.map((series) => <RechartsLine key={series.chartKey} type="monotone" dataKey={series.chartKey} name={series.label} stroke={series.color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />)}
                  </RechartsLineChart>
                </ResponsiveContainer>
              )}
              {chartIndex === 1 && (
                weeklyStats?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyStats ?? []} margin={{ left: -12, right: 8, top: 12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { weekday: "short" })} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={32} />
                      <Tooltip formatter={(value: number) => [`${value} min`, "Training time"]} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "rgba(249,115,22,0.3)", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                      <Bar dataKey="minutes" fill="#f97316" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="flex h-full items-center justify-center text-sm text-zinc-500">Training activity will appear here as you log workouts.</div>
              )}
              {chartIndex === 2 && (
                pieData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius="45%" outerRadius="72%" paddingAngle={3} dataKey="value" strokeWidth={0}>
                        {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value} min`, "Training time"]} contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "rgba(249,115,22,0.3)", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="flex h-full items-center justify-center text-sm text-zinc-500">Category totals will appear as you log training.</div>
              )}
            </CardContent>
          </Card>
          <div className="flex shrink-0 items-center justify-center gap-1.5 py-2" aria-label={`Training chart ${chartIndex + 1} of 3`}>
            {[0, 1, 2].map((index) => <span key={index} className={`h-1.5 rounded-full transition-all ${index === chartIndex ? "w-5 bg-orange-400" : "w-1.5 bg-zinc-700"}`} />)}
          </div>
        </div>
      ) : activeDashboardPage === "shooting" ? (
        <div
          className="flex min-h-0 flex-1 flex-col touch-pan-y select-none"
          data-testid="shooting-chart-carousel"
          onPointerDown={handleChartPointerDown}
          onPointerUp={handleChartPointerUp}
          onPointerCancel={() => { chartDragStart.current = null; }}
          onWheel={handleChartWheel}
        >
          <div className={chartIndex === 0 ? "flex min-h-0 flex-1 flex-col" : "hidden"}>
            {(
              shotHeatmapData.length > 0 ? (
                <ShootingHeatmap
                    shotData={shotHeatmapData}
                    title="Shooting Heatmap"
                    compact
                    personalizedScale
                    personalBaselines={shotHeatmapBaselines?.sections ?? EMPTY_SHOT_HEATMAP_BASELINES}
                    baselineLoading={shotHeatmapBaselinesLoading}
                    baselineError={shotHeatmapBaselinesError}
                  />
              ) : (
                <Card className="border-zinc-800 bg-zinc-950/70 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Crosshair className="w-5 h-5 text-primary" />
                      Shooting Heatmap
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Crosshair className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm">Log shooting drills with shot locations to see your heatmap</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>

          {/* Progress Chart — single chart with swipeable metric carousel */}
          <Card className={`min-h-0 min-w-0 flex-1 flex-col border-zinc-800 bg-zinc-950/70 shadow-none ${chartIndex === 0 ? "hidden" : "flex"}`}>
            <CardHeader className="shrink-0 pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <LineChart className="w-5 h-5 text-primary" />
                  {activeDef.label} · {periodChartTitle[timePeriod]}
                </CardTitle>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{chartIndex} / {dashboardChartCount - 1}</span>
              </div>
            </CardHeader>
            <CardContent
              className="min-h-0 flex-1 px-3 pb-3 sm:px-6"
              data-testid="select-chart-metric"
            >
              {hasTrendData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={activeDef.color} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={activeDef.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      interval={timePeriod === "monthly" ? Math.floor((chartData?.length ?? 1) / 5) : "preserveStartEnd"}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={activeDef.isPercent ? 36 : 30}
                      tickFormatter={activeDef.isPercent ? (v) => `${v}%` : undefined}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: `${activeDef.color}4d`,
                        borderRadius: "8px",
                        fontSize: 12,
                        color: "hsl(var(--foreground))",
                        boxShadow: `0 4px 20px ${activeDef.color}26`,
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600, marginBottom: 4 }}
                      formatter={(v: number) => [activeDef.formatTooltip(v), activeDef.label]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={activeDef.color}
                      strokeWidth={2.5}
                      fill="url(#metricGrad)"
                      dot={timePeriod === "monthly" ? false : { r: 3, fill: activeDef.color, strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: activeDef.color, strokeWidth: 2, stroke: 'rgba(255,255,255,0.3)' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
                  <LineChart className="w-12 h-12 text-muted-foreground/25" />
                  <p>No {activeDef.label.toLowerCase()} data for {periodChartTitle[timePeriod].toLowerCase()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {false && <div className="hidden">
            <Card className="min-w-0 border-zinc-800 bg-zinc-950/70 shadow-none">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Training Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                {weeklyStats?.length ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={weeklyStats ?? []} margin={{ left: -10, right: 5 }}>
                      <defs>
                        <linearGradient id="activityBarGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f97316" stopOpacity={0.95} />
                          <stop offset="100%" stopColor="#f97316" stopOpacity={0.4} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString('en-US', { weekday: 'short' });
                        }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'rgba(249,115,22,0.3)',
                          borderRadius: '8px',
                          color: 'hsl(var(--foreground))',
                          boxShadow: '0 4px 20px rgba(249,115,22,0.15)',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                        cursor={{ fill: 'rgba(249,115,22,0.06)' }}
                      />
                      <Bar dataKey="minutes" fill="url(#activityBarGrad)" radius={[5, 5, 0, 0]} name="Minutes" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
                    <p>Log sessions to see your training activity</p>
                    <Button size="sm" variant="outline" onClick={() => setLocation("/log")} data-testid="button-log-activity">
                      <PlayCircle className="w-4 h-4 mr-1.5" />
                      Log a Drill
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0 border-zinc-800 bg-zinc-950/70 shadow-none">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Time by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <defs>
                        {pieData.map((entry, index) => (
                          <radialGradient key={index} id={`pieGrad-${index}`} cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                            <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                          </radialGradient>
                        ))}
                      </defs>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius="42%"
                        outerRadius="72%"
                        paddingAngle={3}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`url(#pieGrad-${index})`} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const entry = payload[0];
                          const color = (entry.payload as { color: string }).color;
                          return (
                            <div style={{
                              backgroundColor: 'hsl(var(--card))',
                              border: `1px solid ${color}66`,
                              borderRadius: '8px',
                              padding: '8px 12px',
                              boxShadow: `0 4px 20px ${color}33`,
                            }}>
                              <p style={{ color, fontWeight: 700, margin: 0, fontSize: 13 }}>{entry.name}</p>
                              <p style={{ color, margin: 0, fontSize: 12, opacity: 0.9 }}>{entry.value} min</p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    Start training to see category breakdown
                  </div>
                )}
                {pieData.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center mt-3">
                    {pieData.map((entry, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="flex items-center gap-1.5 text-foreground font-medium border-white/10"
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color, boxShadow: `0 0 6px ${entry.color}80` }} />
                        {entry.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>}
          <div className="flex shrink-0 items-center justify-center gap-1.5 py-2" aria-label={`Shooting chart ${chartIndex} of ${dashboardChartCount - 1}`}>
            {Array.from({ length: dashboardChartCount }, (_, index) => <span key={index} className={`h-1.5 rounded-full transition-all ${index === chartIndex ? "w-5 bg-orange-400" : "w-1.5 bg-zinc-700"}`} />)}
          </div>
        </div>
      ) : null}
      <DashboardShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        initialPeriod={timePeriod}
      />
    </div>
  );
}
