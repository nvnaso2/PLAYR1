import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { nativeFetch, statsUrl } from "@/lib/queryClient";
import { QueryError } from "@/components/query-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatsCard } from "@/components/stats-card";
import { ShootingHeatmap, type ShotData } from "@/components/shooting-heatmap";
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
  Timer,
  BarChart3,
  Activity,
  PlayCircle,
  BookOpen,
  TrendingDown,
  LineChart,
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
  { key: "totalShotsMade", title: "Total Shots Made", icon: <Target className="w-4 h-4" />, testId: "stats-total-shots", skillType: "shooting" },
  { key: "threePointersMade", title: "3-Pointers Made", icon: <CircleDot className="w-4 h-4" />, testId: "stats-three-pointers", skillType: "shooting" },
  { key: "freeThrowsMade", title: "Free Throws Made", icon: <Zap className="w-4 h-4" />, testId: "stats-free-throws", skillType: "shooting" },
  { key: "fieldGoalsMade", title: "Field Goals Made", icon: <TrendingUp className="w-4 h-4" />, testId: "stats-field-goals", skillType: "shooting" },
  { key: "formShotsMade", title: "Form Shots Made", icon: <Target className="w-4 h-4" />, testId: "stats-form-shots", skillType: "shooting" },
  { key: "layupsMade", title: "Layups Made", icon: <Flame className="w-4 h-4" />, testId: "stats-layups", skillType: "finishing" },
  { key: "timeBallHandling", title: "Ball Handling", icon: <HandMetal className="w-4 h-4" />, testId: "stats-ball-handling", skillType: "ball-handling" },
  { key: "leftHandBallHandling", title: "Left-Hand Handling", icon: <HandMetal className="w-4 h-4" />, testId: "stats-left-hand", skillType: "ball-handling" },
  { key: "rightHandBallHandling", title: "Right-Hand Handling", icon: <HandMetal className="w-4 h-4" />, testId: "stats-right-hand", skillType: "ball-handling" },
  { key: "passesMade", title: "Passes Made", icon: <Crosshair className="w-4 h-4" />, testId: "stats-passes", skillType: "passing" },
  { key: "conditioningTime", title: "Conditioning Time", icon: <Timer className="w-4 h-4" />, format: (v) => { const h = Math.floor(v / 60); const m = v % 60; return h > 0 ? `${h}h ${m}m` : `${m}m`; }, testId: "stats-conditioning", skillType: "workouts" },
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
  const [, setLocation] = useLocation();

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
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <QueryError message="Unable to load your stats. Check your connection and try again." onRetry={refetchOverview} />
      </div>
    );
  }

  const isNewUser = !overviewLoading && totalSessions === 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-1" data-testid="text-page-title">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track your improvement and training performance
          </p>
        </div>
        <div className="flex gap-1 flex-wrap">
          {(["daily", "weekly", "monthly", "annual"] as TimePeriod[]).map((period) => (
            <Button
              key={period}
              size="sm"
              variant={timePeriod === period ? "default" : "outline"}
              onClick={() => setTimePeriod(period)}
              data-testid={`button-period-${period}`}
            >
              {TIME_PERIOD_LABELS[period]}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {overviewLoading ? (
          <>
            <Skeleton className="h-[72px] rounded-lg" />
            <Skeleton className="h-[72px] rounded-lg" />
            <Skeleton className="h-[72px] rounded-lg" />
          </>
        ) : (
          <>
            <StatsCard
              title="Total Drills"
              value={totalSessions}
              icon={<Target className="w-5 h-5 text-primary" />}
              testId="stats-sessions"
            />
            <StatsCard
              title="Hours Trained"
              value={`${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`}
              icon={<Clock className="w-5 h-5 text-primary" />}
              testId="stats-hours"
            />
            <StatsCard
              title="Day Streak"
              value={streak}
              icon={<Zap className="w-5 h-5 text-primary" />}
              testId="stats-streak"
            />
          </>
        )}
      </div>

      {isNewUser ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Activity className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">Ready to start your journey?</h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
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
            <div className="flex gap-1.5 flex-wrap" data-testid="skill-tabs">
              {SKILL_TABS.map((tab) => {
                const hasData = tab.key === "all" || skillsWithData.has(tab.key);
                return (
                  <Button
                    key={tab.key}
                    size="sm"
                    variant={activeSkill === tab.key ? "default" : "outline"}
                    onClick={() => setActiveSkill(tab.key)}
                    className={`gap-1.5 ${!hasData && tab.key !== "all" ? "opacity-50" : ""}`}
                    data-testid={`button-skill-${tab.key}`}
                  >
                    {tab.label}
                  </Button>
                );
              })}
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
                    />
                  );
                })}
              </div>
            ) : (
              <Card>
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
                <ShootingHeatmap shotData={shotHeatmapData} title="Shooting Heatmap" />
              ) : (
                <Card>
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

          {/* Progress Chart — single chart with metric selector */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-primary" />
                  Progress — {periodChartTitle[timePeriod]}
                </CardTitle>
                <Select
                  value={selectedMetric}
                  onValueChange={(v) => setSelectedMetric(v as MetricKey)}
                >
                  <SelectTrigger className="w-full sm:w-52" data-testid="select-chart-metric">
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    {METRIC_DEFS.map((m) => (
                      <SelectItem key={m.key} value={m.key} data-testid={`option-metric-${m.key}`}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-6 pb-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Card>
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

            <Card>
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
    </div>
  );
}
