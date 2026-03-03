import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
} from "recharts";
import {
  Activity,
  Clock,
  Target,
  Trophy,
  Calendar,
  CheckCircle,
  Dumbbell,
  TrendingUp,
  User,
} from "lucide-react";

interface TrainerPlayerData {
  id: string;
  trainerId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  position: string | null;
  jerseyNumber: string | null;
  ageGroup: string | null;
  linkedUserId: string | null;
  groups: Array<{ groupName: string }>;
  teams: Array<{ teamName: string }>;
}

interface PlayerProgress {
  totalSessions: number;
  totalMinutes: number;
  averageScore: number;
  personalRecordsCount: number;
  weeklyActivity: Array<{ week: string; sessions: number; minutes: number }>;
  categoryBreakdown: Array<{ category: string; count: number }>;
  recentLogs: Array<{
    id: string;
    drillId: string;
    drillTitle: string;
    drillCategory: string;
    duration: number;
    score: number | null;
    completedAt: string;
  }>;
  assignmentCompletion: {
    total: number;
    completed: number;
    rate: number;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  "ball-handling": "Ball Handling",
  shooting: "Shooting",
  passing: "Passing",
  finishing: "Finishing",
  defense: "Defense",
  "film-session": "Film Session",
  workouts: "Workouts",
};

const CATEGORY_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(220 70% 50%)",
  "hsl(280 65% 60%)",
];

const weeklyChartConfig: ChartConfig = {
  sessions: {
    label: "Sessions",
    color: "hsl(var(--chart-1))",
  },
};

export default function TrainerProgress() {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");

  const { data: players, isLoading: playersLoading } = useQuery<
    TrainerPlayerData[]
  >({
    queryKey: ["/api/trainer-players"],
  });

  const { data: progress, isLoading: progressLoading } =
    useQuery<PlayerProgress>({
      queryKey: ["/api/trainer/players", selectedPlayerId, "progress"],
      enabled: !!selectedPlayerId,
    });

  const selectedPlayer = players?.find((p) => p.id === selectedPlayerId);

  const categoryChartConfig: ChartConfig = {};
  progress?.categoryBreakdown.forEach((item, i) => {
    categoryChartConfig[item.category] = {
      label: CATEGORY_LABELS[item.category] || item.category,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    };
  });

  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold"
            data-testid="text-progress-title"
          >
            Player Progress
          </h1>
          <p className="text-sm text-muted-foreground">
            Track training trends and analytics for your players
          </p>
        </div>
        <div className="w-72">
          <Select
            value={selectedPlayerId}
            onValueChange={setSelectedPlayerId}
          >
            <SelectTrigger data-testid="select-player">
              <SelectValue placeholder="Select a player" />
            </SelectTrigger>
            <SelectContent>
              {playersLoading ? (
                <div className="p-2">
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : (
                players?.map((p) => (
                  <SelectItem
                    key={p.id}
                    value={p.id}
                    data-testid={`select-player-option-${p.id}`}
                  >
                    <span className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5" />
                      {p.firstName} {p.lastName || ""}
                      {p.position && (
                        <span className="text-muted-foreground text-xs">
                          ({p.position})
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedPlayerId && (
        <Card>
          <CardContent className="py-16 text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground" data-testid="text-no-player-selected">
              Select a player above to view their training progress and analytics.
            </p>
          </CardContent>
        </Card>
      )}

      {selectedPlayerId && progressLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardContent className="py-4">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {selectedPlayerId && progress && !progressLoading && (
        <>
          {selectedPlayer && (
            <div className="flex items-center gap-2 flex-wrap" data-testid="text-selected-player-info">
              <Badge variant="outline" className="no-default-hover-elevate">
                {selectedPlayer.firstName} {selectedPlayer.lastName || ""}
              </Badge>
              {selectedPlayer.position && (
                <Badge variant="secondary" className="no-default-hover-elevate">
                  {selectedPlayer.position}
                </Badge>
              )}
              {selectedPlayer.ageGroup && (
                <Badge variant="secondary" className="no-default-hover-elevate">
                  {selectedPlayer.ageGroup}
                </Badge>
              )}
              {!selectedPlayer.linkedUserId && (
                <Badge variant="destructive" className="no-default-hover-elevate">
                  No linked account
                </Badge>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-stat-sessions">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Sessions
                </CardTitle>
                <Activity className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-sessions">
                  {progress.totalSessions}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-minutes">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Minutes
                </CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-minutes">
                  {progress.totalMinutes}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-score">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Avg Score
                </CardTitle>
                <Target className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-avg-score">
                  {progress.averageScore || "N/A"}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-completion">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Assignment Completion
                </CardTitle>
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-completion-rate">
                  {progress.assignmentCompletion.rate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {progress.assignmentCompletion.completed}/{progress.assignmentCompletion.total} assigned
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="card-weekly-activity">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Weekly Training Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {progress.weeklyActivity.length > 0 ? (
                  <ChartContainer config={weeklyChartConfig} className="h-[250px] w-full">
                    <BarChart data={progress.weeklyActivity} accessibilityLayer>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="week"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        fontSize={12}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                        allowDecimals={false}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="sessions"
                        fill="var(--color-sessions)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                    No training data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-skill-breakdown">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  Skill Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {progress.categoryBreakdown.length > 0 ? (
                  <ChartContainer config={categoryChartConfig} className="h-[250px] w-full">
                    <PieChart accessibilityLayer>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={progress.categoryBreakdown.map((item, i) => ({
                          ...item,
                          name: CATEGORY_LABELS[item.category] || item.category,
                          fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                        }))}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={40}
                        label={({ name }) => name}
                      >
                        {progress.categoryBreakdown.map((_, i) => (
                          <Cell
                            key={i}
                            fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                    No category data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-recent-logs">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Recent Training Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {progress.recentLogs.length > 0 ? (
                <div className="space-y-2">
                  {progress.recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between gap-4 py-2 border-b last:border-b-0 flex-wrap"
                      data-testid={`row-log-${log.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="min-w-0">
                          <p
                            className="text-sm font-medium truncate"
                            data-testid={`text-log-drill-${log.id}`}
                          >
                            {log.drillTitle}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="secondary"
                              className="no-default-hover-elevate text-xs"
                            >
                              {CATEGORY_LABELS[log.drillCategory] || log.drillCategory}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {log.duration} min
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        {log.score !== null && log.score !== undefined && (
                          <div className="text-right">
                            <span className="text-sm font-semibold" data-testid={`text-log-score-${log.id}`}>
                              {log.score}/10
                            </span>
                          </div>
                        )}
                        <span
                          className="text-xs text-muted-foreground whitespace-nowrap"
                          data-testid={`text-log-date-${log.id}`}
                        >
                          {new Date(log.completedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No training logs recorded yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
