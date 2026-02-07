import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { 
  TrendingUp, 
  Clock, 
  Target, 
  Award,
  Users,
  BarChart3,
  Zap,
  Crosshair,
  CircleDot,
  Flame,
  HandMetal,
  Timer
} from "lucide-react";
import type { DrillProgress, Benchmark } from "@shared/schema";

const CHART_COLORS = ["#f97316", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#ef4444"];

const categoryLabels: Record<string, string> = {
  "ball-handling": "Ball Handling",
  "shooting": "Shooting",
  "passing": "Passing",
  "finishing": "Finishing",
  "defense": "Defense",
  "film-session": "Film Session",
  "workouts": "Workouts",
};

type TimePeriod = "daily" | "weekly" | "monthly" | "annual";

type TrainingStatDef = {
  key: string;
  title: string;
  icon: React.ReactNode;
  format?: (val: number) => string;
  testId: string;
};

const TRAINING_STAT_DEFS: TrainingStatDef[] = [
  { key: "totalShotsMade", title: "Total Shots Made", icon: <Target className="w-4 h-4" />, testId: "stats-total-shots" },
  { key: "threePointersMade", title: "3-Pointers Made", icon: <CircleDot className="w-4 h-4" />, testId: "stats-three-pointers" },
  { key: "freeThrowsMade", title: "Free Throws Made", icon: <Zap className="w-4 h-4" />, testId: "stats-free-throws" },
  { key: "fieldGoalsMade", title: "Field Goals Made", icon: <TrendingUp className="w-4 h-4" />, testId: "stats-field-goals" },
  { key: "layupsMade", title: "Layups Made", icon: <Flame className="w-4 h-4" />, testId: "stats-layups" },
  { key: "timeBallHandling", title: "Ball Handling", icon: <HandMetal className="w-4 h-4" />, testId: "stats-ball-handling" },
  { key: "passesMade", title: "Passes Made", icon: <Crosshair className="w-4 h-4" />, testId: "stats-passes" },
  { key: "leftHandBallHandling", title: "Left-Hand Handling", icon: <HandMetal className="w-4 h-4" />, testId: "stats-left-hand" },
  { key: "rightHandBallHandling", title: "Right-Hand Handling", icon: <HandMetal className="w-4 h-4" />, testId: "stats-right-hand" },
  { key: "formShotsMade", title: "Form Shots Made", icon: <Target className="w-4 h-4" />, testId: "stats-form-shots" },
  { key: "conditioningTime", title: "Conditioning Time", icon: <Timer className="w-4 h-4" />, format: (v) => { const h = Math.floor(v / 60); const m = v % 60; return h > 0 ? `${h}h ${m}m` : `${m}m`; }, testId: "stats-conditioning" },
];

function TrainingStatsCards({ trainingStats }: { trainingStats: Record<string, number> | undefined }) {
  const visibleCards = TRAINING_STAT_DEFS.filter(def => trainingStats && trainingStats[def.key] && trainingStats[def.key] > 0);

  if (visibleCards.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="training-stats-container">
      {visibleCards.map((card) => {
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
  );
}

const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  daily: "Today",
  weekly: "This Week",
  monthly: "This Month",
  annual: "This Year"
};

export default function ProgressPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("weekly");

  const { data: progress, isLoading: progressLoading } = useQuery<DrillProgress[]>({
    queryKey: ['/api/progress'],
  });

  const { data: benchmarks } = useQuery<Benchmark[]>({
    queryKey: ['/api/benchmarks'],
  });

  const { data: weeklyStats } = useQuery<{ date: string; minutes: number; sessions: number }[]>({
    queryKey: ['/api/stats/weekly', timePeriod],
    queryFn: async () => {
      const res = await fetch(`/api/stats/weekly?period=${timePeriod}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }
  });

  const { data: categoryStats } = useQuery<{ category: string; minutes: number; sessions: number }[]>({
    queryKey: ['/api/stats/by-category', timePeriod],
    queryFn: async () => {
      const res = await fetch(`/api/stats/by-category?period=${timePeriod}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }
  });

  const { data: overviewStats } = useQuery<{
    totalSessions: number;
    totalMinutes: number;
    avgScore: number;
    streak: number;
    rank?: number;
    percentile?: number;
  }>({
    queryKey: ['/api/stats/overview', timePeriod],
    queryFn: async () => {
      const res = await fetch(`/api/stats/overview?period=${timePeriod}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    }
  });

  // Shot stats for heatmap
  const { data: shotStats } = useQuery<Array<{ location: string; made: number; missed: number }>>({
    queryKey: ['/api/stats/shots'],
  });

  const { data: trainingStats } = useQuery<Record<string, number>>({
    queryKey: ['/api/stats/dashboard-training', timePeriod],
    queryFn: async () => {
      const res = await fetch(`/api/stats/dashboard-training?period=${timePeriod}`);
      if (!res.ok) throw new Error("Failed to fetch training stats");
      return res.json();
    }
  });

  // Convert shot stats to ShotData format for heatmap
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

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-1" data-testid="text-page-title">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track your improvement and see how you compare to other players
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
        <StatsCard
          title="Total Sessions"
          value={totalSessions}
          change={15}
          icon={<Target className="w-5 h-5 text-primary" />}
          testId="stats-sessions"
        />
        <StatsCard
          title="Hours Trained"
          value={`${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`}
          change={12}
          icon={<Clock className="w-5 h-5 text-primary" />}
          testId="stats-hours"
        />
        <StatsCard
          title="Day Streak"
          value={streak}
          icon={<Zap className="w-5 h-5 text-primary" />}
          testId="stats-streak"
        />
      </div>

      <TrainingStatsCards trainingStats={trainingStats} />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="overview" className="py-2.5 text-xs sm:text-sm" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="categories" className="py-2.5 text-xs sm:text-sm" data-testid="tab-categories">Categories</TabsTrigger>
          <TabsTrigger value="benchmarks" className="py-2.5 text-xs sm:text-sm" data-testid="tab-benchmarks">Benchmarks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Weekly Training
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
                    Log sessions to see your weekly progress
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Score Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {weeklyStats && weeklyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={weeklyStats} margin={{ left: -10, right: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs fill-muted-foreground"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis domain={[0, 10]} className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} width={30} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sessions" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                  Not enough data to show trends yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shooting Heatmap */}
          {shotHeatmapData.length > 0 ? (
            <ShootingHeatmap 
              shotData={shotHeatmapData} 
              title="Shooting Heatmap"
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Crosshair className="w-5 h-5 text-primary" />
                  Shooting Heatmap
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Crosshair className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                    <p>Log shooting drills with shot locations to see your heatmap</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          {categoryStats && categoryStats.length > 0 ? (
            categoryStats.map((cat, index) => (
              <Card key={cat.category} data-testid={`card-category-progress-${cat.category}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}20` }}
                      >
                        <Target 
                          className="w-5 h-5"
                          style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium truncate">{categoryLabels[cat.category] || cat.category}</h3>
                        <p className="text-sm text-muted-foreground">
                          {cat.sessions} sessions • {cat.minutes} min
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{Math.round(cat.minutes / 60 * 10) / 10} hrs</Badge>
                  </div>
                  <Progress value={Math.min(100, (cat.minutes / 300) * 100)} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {Math.min(100, Math.round((cat.minutes / 300) * 100))}% towards weekly goal
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Category Data Yet</h3>
                <p className="text-muted-foreground">
                  Start logging training sessions to see your progress by category.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Community Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overviewStats?.percentile ? (
                <div className="space-y-6">
                  <div className="text-center p-4 sm:p-6 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
                    <p className="text-sm text-muted-foreground mb-2">Your Percentile</p>
                    <p className="text-3xl sm:text-5xl font-bold text-primary" data-testid="text-percentile">
                      Top {100 - overviewStats.percentile}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      You're outperforming {overviewStats.percentile}% of players your age
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">How You Compare</h4>
                    {benchmarks?.map((benchmark) => (
                      <div key={benchmark.id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{categoryLabels[benchmark.category] || benchmark.category}</span>
                          <span className="text-muted-foreground">
                            Avg: {benchmark.averageScore}/10
                          </span>
                        </div>
                        <Progress value={Number(benchmark.averageScore) * 10} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center p-8">
                  <Award className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Benchmarks Coming Soon</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Complete your profile with your age and location to see how you compare 
                    to other players in your area and nationwide.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
