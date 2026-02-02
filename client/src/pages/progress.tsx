import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/stats-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HalfCourtMap, type ShotData } from "@/components/half-court-map";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  Trophy,
  Medal,
  Star,
  Plus,
  Crosshair
} from "lucide-react";
import type { DrillProgress, Benchmark, Challenge, UserChallenge, PersonalRecord, TeamAward, Drill, CHALLENGE_CATEGORIES, CHALLENGE_METRICS, CHALLENGE_GOAL_TYPES } from "@shared/schema";

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

  // Shot stats for heatmap
  const { data: shotStats } = useQuery<Array<{ location: string; made: number; missed: number }>>({
    queryKey: ['/api/stats/shots'],
  });

  // Challenges
  const { data: allChallenges } = useQuery<Challenge[]>({
    queryKey: ['/api/challenges'],
  });

  const { data: userChallenges } = useQuery<Array<UserChallenge & { challenge: Challenge }>>({
    queryKey: ['/api/challenges/my-challenges'],
  });

  // Personal Records
  const { data: personalRecords } = useQuery<Array<PersonalRecord & { drill: Drill }>>({
    queryKey: ['/api/personal-records'],
  });

  // Team Awards
  const { data: teamAwards } = useQuery<TeamAward[]>({
    queryKey: ['/api/team-awards'],
  });

  // Challenge creation state
  const [showChallengeDialog, setShowChallengeDialog] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    name: "",
    category: "shooting" as "shooting" | "ball-handling" | "passing" | "workout",
    metric: "makes" as "makes" | "dribbles" | "passes" | "reps" | "time" | "score",
    goalType: "total" as "total" | "consecutive" | "timed",
    targetValue: 100,
    timeLimit: undefined as number | undefined
  });

  const createChallengeMutation = useMutation({
    mutationFn: async (data: typeof newChallenge) => {
      return await apiRequest("POST", '/api/challenges', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
      setShowChallengeDialog(false);
      setNewChallenge({
        name: "",
        category: "shooting",
        metric: "makes",
        goalType: "total",
        targetValue: 100,
        timeLimit: undefined
      });
    }
  });

  const startChallengeMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      return await apiRequest("POST", `/api/challenges/${challengeId}/start`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/challenges/my-challenges'] });
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
        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
          <TabsTrigger value="overview" className="py-2.5 text-xs sm:text-sm" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="trophy-room" className="py-2.5 text-xs sm:text-sm" data-testid="tab-trophy-room">Trophy Room</TabsTrigger>
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

          {/* Shooting Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Crosshair className="w-5 h-5 text-primary" />
                Shooting Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shotHeatmapData.length > 0 ? (
                <HalfCourtMap 
                  shotData={shotHeatmapData} 
                  title="" 
                  className="border-0 shadow-none"
                  compact
                />
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Crosshair className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                    <p>Log shooting drills with shot locations to see your heatmap</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trophy Room Tab */}
        <TabsContent value="trophy-room" className="space-y-6">
          {/* Challenges Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Challenges
              </CardTitle>
              <Dialog open={showChallengeDialog} onOpenChange={setShowChallengeDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-create-challenge">
                    <Plus className="w-4 h-4 mr-1" />
                    Create Challenge
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Challenge</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label htmlFor="challenge-name">Challenge Name</Label>
                      <Input
                        id="challenge-name"
                        placeholder="e.g., 100 Three-Pointers"
                        value={newChallenge.name}
                        onChange={(e) => setNewChallenge({ ...newChallenge, name: e.target.value })}
                        data-testid="input-challenge-name"
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select
                        value={newChallenge.category}
                        onValueChange={(v) => setNewChallenge({ ...newChallenge, category: v as typeof newChallenge.category })}
                      >
                        <SelectTrigger data-testid="select-challenge-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="shooting">Shooting</SelectItem>
                          <SelectItem value="ball-handling">Ball Handling</SelectItem>
                          <SelectItem value="passing">Passing</SelectItem>
                          <SelectItem value="workout">Workout</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Metric</Label>
                      <Select
                        value={newChallenge.metric}
                        onValueChange={(v) => setNewChallenge({ ...newChallenge, metric: v as typeof newChallenge.metric })}
                      >
                        <SelectTrigger data-testid="select-challenge-metric">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="makes">Makes</SelectItem>
                          <SelectItem value="dribbles">Dribbles</SelectItem>
                          <SelectItem value="passes">Passes</SelectItem>
                          <SelectItem value="reps">Reps</SelectItem>
                          <SelectItem value="time">Time (seconds)</SelectItem>
                          <SelectItem value="score">Score</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Goal Type</Label>
                      <Select
                        value={newChallenge.goalType}
                        onValueChange={(v) => setNewChallenge({ ...newChallenge, goalType: v as typeof newChallenge.goalType })}
                      >
                        <SelectTrigger data-testid="select-challenge-goal-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="total">Total (cumulative)</SelectItem>
                          <SelectItem value="consecutive">Consecutive</SelectItem>
                          <SelectItem value="timed">Timed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="target-value">Target Value</Label>
                      <Input
                        id="target-value"
                        type="number"
                        value={newChallenge.targetValue}
                        onChange={(e) => setNewChallenge({ ...newChallenge, targetValue: parseInt(e.target.value) || 0 })}
                        data-testid="input-challenge-target"
                      />
                    </div>
                    {newChallenge.goalType === "timed" && (
                      <div>
                        <Label htmlFor="time-limit">Time Limit (seconds)</Label>
                        <Input
                          id="time-limit"
                          type="number"
                          value={newChallenge.timeLimit || ""}
                          onChange={(e) => setNewChallenge({ ...newChallenge, timeLimit: parseInt(e.target.value) || undefined })}
                          data-testid="input-challenge-time-limit"
                        />
                      </div>
                    )}
                    <Button 
                      className="w-full" 
                      onClick={() => createChallengeMutation.mutate(newChallenge)}
                      disabled={!newChallenge.name || createChallengeMutation.isPending}
                      data-testid="button-submit-challenge"
                    >
                      {createChallengeMutation.isPending ? "Creating..." : "Create Challenge"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {userChallenges && userChallenges.length > 0 ? (
                <div className="space-y-3">
                  {userChallenges.map((uc) => (
                    <div 
                      key={uc.id} 
                      className="p-3 border rounded-lg flex items-center justify-between"
                      data-testid={`challenge-item-${uc.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${uc.isCompleted ? 'bg-green-500/20' : 'bg-primary/10'}`}>
                          {uc.isCompleted ? (
                            <Trophy className="w-5 h-5 text-green-500" />
                          ) : (
                            <Target className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{uc.challenge.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {uc.currentValue || 0} / {uc.challenge.targetValue} {uc.challenge.metric}
                          </p>
                        </div>
                      </div>
                      {uc.isCompleted ? (
                        <Badge variant="secondary" className="bg-green-500/20 text-green-600">Completed</Badge>
                      ) : (
                        <Progress 
                          value={((uc.currentValue || 0) / uc.challenge.targetValue) * 100} 
                          className="w-24 h-2"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : allChallenges && allChallenges.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground mb-3">Available challenges to start:</p>
                  {allChallenges.slice(0, 5).map((challenge) => (
                    <div 
                      key={challenge.id} 
                      className="p-3 border rounded-lg flex items-center justify-between"
                      data-testid={`available-challenge-${challenge.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Target className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{challenge.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {challenge.targetValue} {challenge.metric} • {challenge.goalType}
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => startChallengeMutation.mutate(challenge.id)}
                        disabled={startChallengeMutation.isPending}
                        data-testid={`button-start-challenge-${challenge.id}`}
                      >
                        Start
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8">
                  <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No challenges yet. Create your first challenge!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal Records Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Medal className="w-5 h-5 text-amber-500" />
                Personal Records (PRs)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {personalRecords && personalRecords.length > 0 ? (
                <div className="space-y-3">
                  {personalRecords.map((pr) => (
                    <div 
                      key={pr.id} 
                      className="p-3 border rounded-lg flex items-center justify-between"
                      data-testid={`pr-item-${pr.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                          <Star className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="font-medium">{pr.drill.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {pr.metricName}: {pr.previousValue} → {pr.newValue}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-500/30">
                        +{(Number(pr.newValue) - Number(pr.previousValue)).toFixed(0)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8">
                  <Medal className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Beat your previous records to earn PR badges!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Awards Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Team Awards
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teamAwards && teamAwards.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {teamAwards.map((award) => (
                    <div 
                      key={award.id} 
                      className="p-4 border rounded-lg text-center"
                      data-testid={`award-item-${award.id}`}
                    >
                      <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                      <p className="font-medium">{award.awardName}</p>
                      <p className="text-sm text-muted-foreground">{award.teamName}</p>
                      {award.season && (
                        <Badge variant="outline" className="mt-2">{award.season}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8">
                  <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Team awards you earn will appear here</p>
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
