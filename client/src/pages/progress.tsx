import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
  Dumbbell,
  Shield,
  Lightbulb,
  Film,
  Activity,
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

type SkillTab = {
  key: string;
  label: string;
  icon: React.ReactNode;
};

const SKILL_TABS: SkillTab[] = [
  { key: "all", label: "All", icon: null },
  { key: "shooting", label: "Shooting", icon: null },
  { key: "ball-handling", label: "Ball Handling", icon: null },
  { key: "passing", label: "Passing", icon: null },
  { key: "finishing", label: "Finishing", icon: null },
  { key: "defense", label: "Defense", icon: null },
  { key: "basketball-iq", label: "Basketball IQ", icon: null },
  { key: "workouts", label: "Workouts", icon: null },
];

const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
  annual: "This Year"
};

export default function ProgressPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("weekly");
  const [activeSkill, setActiveSkill] = useState("all");

  const { data: weeklyStats } = useQuery<{ date: string; minutes: number; sessions: number }[]>({
    queryKey: ['/api/stats/weekly', timePeriod],
    queryFn: async () => {
      const res = await fetch(`/api/stats/weekly?period=${timePeriod}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }
  });

  const { data: categoryStats } = useQuery<{ category: string; minutes: number; sessions: number }[]>({
    queryKey: ['/api/stats/by-category', timePeriod],
    queryFn: async () => {
      const res = await fetch(`/api/stats/by-category?period=${timePeriod}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }
  });

  const { data: overviewStats, isLoading: overviewLoading } = useQuery<{
    totalSessions: number;
    totalMinutes: number;
    avgScore: number;
    streak: number;
  }>({
    queryKey: ['/api/stats/overview', timePeriod],
    queryFn: async () => {
      const res = await fetch(`/api/stats/overview?period=${timePeriod}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }
  });

  const { data: shotStats } = useQuery<Array<{ location: string; made: number; missed: number }>>({
    queryKey: ['/api/stats/shots', timePeriod],
    queryFn: async () => {
      const res = await fetch(`/api/stats/shots?period=${timePeriod}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }
  });

  const { data: trainingStats, isLoading: trainingLoading } = useQuery<Record<string, number>>({
    queryKey: ['/api/stats/dashboard-training', timePeriod],
    queryFn: async () => {
      const res = await fetch(`/api/stats/dashboard-training?period=${timePeriod}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch training stats");
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
              title="Total Sessions"
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] rounded-lg" />
            ))}
          </div>
        ) : filteredStats.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2 sm:[&>*:last-child:nth-child(odd)]:col-span-1" data-testid="training-stats-container">
            {filteredStats.map((card) => {
              const val = trainingStats![card.key];
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
            <CardContent className="p-8 text-center">
              <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">No {activeSkill !== "all" ? categoryLabels[activeSkill] || activeSkill : ""} Stats Yet</h3>
              <p className="text-sm text-muted-foreground">
                Log training sessions to see your {activeSkill !== "all" ? (categoryLabels[activeSkill] || activeSkill).toLowerCase() : ""} stats here
              </p>
            </CardContent>
          </Card>
        )}

        {showShootingHeatmap && (
          shotHeatmapData.length > 0 ? (
            <ShootingHeatmap 
              shotData={shotHeatmapData} 
              title="Shooting Heatmap"
            />
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
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { weekday: 'short' });
                    }}
                  />
                  <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} width={30} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar 
                    dataKey="minutes" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    name="Minutes"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                Log sessions to see your training activity
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
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius="40%"
                    outerRadius="70%"
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value: number) => [`${value} min`, '']}
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
                    className="flex items-center gap-1.5 text-foreground"
                  >
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: entry.color }}
                    />
                    {entry.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
