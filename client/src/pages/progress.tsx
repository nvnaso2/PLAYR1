import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
  const [activeSkill, setActiveSkill] = useState("all");
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("shotsMade");
  const [shareOpen, setShareOpen] = useState(false);
  const [location, setLocation] = useLocation();
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
    enabled: activeSkill === "all" || activeSkill === "shooting",
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
  const totalSessions = overviewStats?.totalSessions || 0;
  const streak = overviewStats?.streak || 0;

  const pieData = categoryStats?.map((cat, index) => ({
    name: categoryLabels[cat.category] || cat.category,
    value: cat.minutes,
    color: CHART_COLORS[index % CHART_COLORS.length],
  })) || [];

  const filteredStats = TRAINING_STAT_DEFS.filter(def => {
    const hasValue = trainingStats && trainingStats[def.key] && trainingStats[def.key] > 0;
    if (!hasValue) return false;
    if (activeSkill === "all") return true;
    return def.skillType === activeSkill;
  });

  const skillsWithData = new Set(
    TRAINING_STAT_DEFS
      .filter(def => trainingStats && trainingStats[def.key] && trainingStats[def.key] > 0)
      .map(def => def.skillType)
  );

  const showShootingHeatmap = activeSkill === "all" || activeSkill === "shooting";

  const activeDef = METRIC_DEFS.find(m => m.key === selectedMetric) || METRIC_DEFS[0];
  const activeMetricIndex = Math.max(0, METRIC_DEFS.findIndex((metric) => metric.key === activeDef.key));
  const chartTouchStart = useRef<number | null>(null);
  const changeMetric = (direction: 1 | -1) => {
    const nextIndex = (activeMetricIndex + direction + METRIC_DEFS.length) % METRIC_DEFS.length;
    setSelectedMetric(METRIC_DEFS[nextIndex].key);
  };
  const handleChartTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    chartTouchStart.current = event.touches[0]?.clientX ?? null;
  };
  const handleChartTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = chartTouchStart.current;
    const endX = event.changedTouches[0]?.clientX;
    chartTouchStart.current = null;
    if (startX === null || endX === undefined || Math.abs(endX - startX) < 40) return;
    changeMetric(endX < startX ? 1 : -1);
  };
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

  const isNewUser = !overviewLoading && totalSessions === 0;

  return (
    <div className="min-h-full w-full min-w-0 overflow-x-clip bg-[#090909] p-4 sm:p-6 max-w-7xl mx-auto space-y-5 sm:space-y-6">
      <header className="space-y-3">
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

      <section className="grid grid-cols-3 gap-2 sm:max-w-[780px] sm:gap-4" aria-label="Training summary">
        {overviewLoading ? (
          <>
            <Skeleton className="h-[68px] rounded-lg sm:h-[72px]" />
            <Skeleton className="h-[68px] rounded-lg sm:h-[72px]" />
            <Skeleton className="h-[68px] rounded-lg sm:h-[72px]" />
          </>
        ) : (
          <>
            <StatsCard
              title="Total Drills"
              value={totalSessions}
              icon={<Target className="h-6 w-6 text-primary" />}
              testId="stats-sessions"
              compact
            />
            <StatsCard
              title="Hours Trained"
              value={Math.floor(totalMinutes / 60)}
              icon={<Clock className="h-6 w-6 text-primary" />}
              testId="stats-hours"
              compact
            />
            <StatsCard
              title="Day Streak"
              value={streak}
              icon={<Zap className="h-6 w-6 text-primary" />}
              testId="stats-streak"
              compact
            />
          </>
        )}
      </section>

      {isNewUser ? (
        <Card className="border-orange-500/25 bg-orange-500/5 shadow-none">
          <CardContent className="p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Activity className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white mb-2">Ready to start your journey?</h2>
              <p className="text-zinc-500 text-sm max-w-sm mx-auto">
                Log your first drill to start tracking your progress. Your stats, streaks, and improvement charts will all appear right here.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                size="lg"
                onClick={() => setLocation("/log")}
                data-testid="button-log-first-drill"
                className="gap-2"
              >
                <PlayCircle className="w-5 h-5" />
                Log a Drill Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setLocation("/drills")}
                data-testid="button-browse-drills"
                className="gap-2"
              >
                <BookOpen className="w-5 h-5" />
                Browse Drill Library
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            <div className="space-y-2" data-testid="skill-tabs">
              <div className="flex items-center justify-between">
                <p className="font-heading text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Breakdown by skill</p>
              </div>
              <div className="flex min-w-0 flex-nowrap gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Filter stats by skill">
              {SKILL_TABS.map((tab) => {
                const hasData = tab.key === "all" || skillsWithData.has(tab.key);
                return (
                  <Button
                    key={tab.key}
                    size="sm"
                    variant={activeSkill === tab.key ? "default" : "outline"}
                    onClick={() => setActiveSkill(tab.key)}
                    className={`h-9 shrink-0 gap-1.5 whitespace-nowrap ${activeSkill === tab.key
                      ? "bg-orange-500 text-black hover:bg-orange-400"
                      : "border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-300"} ${!hasData && tab.key !== "all" ? "opacity-50" : ""}`}
                    role="tab"
                    aria-selected={activeSkill === tab.key}
                    data-testid={`button-skill-${tab.key}`}
                  >
                    {tab.label}
                  </Button>
                );
              })}
              </div>
            </div>

            {trainingLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[72px] rounded-lg" />
                ))}
              </div>
            ) : filteredStats.length > 0 ? (
              <div
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1"
                data-testid="training-stats-container"
              >
                {filteredStats.map((card) => {
                  const val = trainingStats![card.key] ?? 0;
                  const displayVal = card.format ? card.format(val) : val.toLocaleString();
                  return (
                    <StatsCard
                      key={card.key}
                      title={card.title}
                      value={displayVal}
                      icon={card.icon}
                      testId={card.testId}
                      compact
                    />
                  );
                })}
              </div>
            ) : (
              <Card className="min-w-0 border-zinc-800 bg-zinc-950/70 shadow-none">
                <CardContent className="p-6 text-center">
                  <Activity className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">
                    No {activeSkill !== "all" ? categoryLabels[activeSkill] || activeSkill : ""} Stats Yet
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Log training sessions to see your stats here
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setLocation("/log")} data-testid="button-log-drill-stats">
                    <PlayCircle className="w-4 h-4 mr-1.5" />
                    Log a Drill
                  </Button>
                </CardContent>
              </Card>
            )}

            {showShootingHeatmap && (
              shotHeatmapData.length > 0 ? (
                <ShootingHeatmap
                    shotData={shotHeatmapData}
                    title="Shooting Heatmap"
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
          <Card className="min-w-0 border-zinc-800 bg-zinc-950/70 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-primary" />
                  Progress {periodChartTitle[timePeriod]}
                </CardTitle>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => changeMetric(-1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 transition hover:border-orange-500/50 hover:text-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                    aria-label="Show previous progress metric"
                    data-testid="button-previous-chart-metric"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="max-w-[92px] truncate text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-500 sm:max-w-none sm:text-xs">
                    {activeDef.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeMetric(1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 transition hover:border-orange-500/50 hover:text-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                    aria-label="Show next progress metric"
                    data-testid="button-next-chart-metric"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent
              className="px-3 pb-4 sm:px-6 touch-pan-y"
              data-testid="select-chart-metric"
              onTouchStart={handleChartTouchStart}
              onTouchEnd={handleChartTouchEnd}
            >
              {hasTrendData ? (
                <ResponsiveContainer width="100%" height={220}>
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
                <div className="h-[220px] flex flex-col items-center justify-center gap-3 text-muted-foreground text-sm">
                  <LineChart className="w-12 h-12 text-muted-foreground/25" />
                  <p>No {activeDef.label.toLowerCase()} data for {periodChartTitle[timePeriod].toLowerCase()}</p>
                  <Button size="sm" variant="outline" onClick={() => setLocation("/log")} data-testid="button-log-for-chart">
                    <PlayCircle className="w-4 h-4 mr-1.5" />
                    Log a Drill
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            <Card className="min-w-0 border-zinc-800 bg-zinc-950/70 shadow-none">
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Training Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                {weeklyStats && weeklyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={weeklyStats} margin={{ left: -10, right: 5 }}>
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
          </div>
        </>
      )}
      <DashboardShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        initialPeriod={timePeriod}
      />
    </div>
  );
}
