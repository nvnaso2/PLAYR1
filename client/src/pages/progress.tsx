import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/stats-card";
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
  Zap
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
          <h1 className="text-xl sm:text-2xl font-bold mb-1" data-testid="text-page-title">My Progress</h1>
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

      <div className="grid grid-cols-3 gap-4">
        <StatsCard
          title="Total Sessions"
          value={totalSessions}
          change={15}
          icon={<Target className="w-5 h-5 text-primary" />}
          testId="stats-sessions"
        />
        <StatsCard
          title="Hours Trained"
          value={Math.round(totalMinutes / 60 * 10) / 10}
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

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="overview" className="py-2.5 text-xs sm:text-sm" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="categories" className="py-2.5 text-xs sm:text-sm" data-testid="tab-categories">Categories</TabsTrigger>
          <TabsTrigger value="benchmarks" className="py-2.5 text-xs sm:text-sm" data-testid="tab-benchmarks">Benchmarks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Weekly Training
                </CardTitle>
              </CardHeader>
              <CardContent>
                {weeklyStats && weeklyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={weeklyStats}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis 
                        dataKey="date" 
                        className="text-xs fill-muted-foreground"
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString('en-US', { weekday: 'short' });
                        }}
                      />
                      <YAxis className="text-xs fill-muted-foreground" />
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
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Log sessions to see your weekly progress
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Time by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
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
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Start training to see category breakdown
                  </div>
                )}
                {pieData.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
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
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Score Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyStats && weeklyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={weeklyStats}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs fill-muted-foreground"
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis domain={[0, 10]} className="text-xs fill-muted-foreground" />
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
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Not enough data to show trends yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          {categoryStats && categoryStats.length > 0 ? (
            categoryStats.map((cat, index) => (
              <Card key={cat.category} data-testid={`card-category-progress-${cat.category}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}20` }}
                      >
                        <Target 
                          className="w-5 h-5"
                          style={{ color: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium">{categoryLabels[cat.category] || cat.category}</h3>
                        <p className="text-sm text-muted-foreground">
                          {cat.sessions} sessions • {cat.minutes} minutes
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{Math.round(cat.minutes / 60 * 10) / 10} hours</Badge>
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
                  <div className="text-center p-6 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
                    <p className="text-sm text-muted-foreground mb-2">Your Percentile</p>
                    <p className="text-5xl font-bold text-primary" data-testid="text-percentile">
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
