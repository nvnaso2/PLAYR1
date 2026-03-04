import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  personalRecords: number;
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

const CATEGORY_COLORS: string[] = [
  "bg-orange-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-red-500",
  "bg-yellow-500",
  "bg-teal-500",
];

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

  const maxWeeklySessions =
    progress?.weeklyActivity?.length
      ? Math.max(...progress.weeklyActivity.map((w) => w.sessions), 1)
      : 1;

  const maxCategoryCount =
    progress?.categoryBreakdown?.length
      ? Math.max(...progress.categoryBreakdown.map((c) => c.count), 1)
      : 1;

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
                  Average Score
                </CardTitle>
                <Target className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-avg-score">
                  {progress.averageScore || "N/A"}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-records">
              <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Personal Records
                </CardTitle>
                <Trophy className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-personal-records">
                  {progress.personalRecords ?? 0}
                </div>
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
                  <div className="flex items-end gap-2 h-[200px]">
                    {progress.weeklyActivity.slice(-8).map((week, i) => {
                      const heightPercent = (week.sessions / maxWeeklySessions) * 100;
                      return (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center gap-1"
                          data-testid={`bar-week-${i}`}
                        >
                          <span className="text-xs font-medium text-muted-foreground">
                            {week.sessions}
                          </span>
                          <div className="w-full flex items-end" style={{ height: "160px" }}>
                            <div
                              className="w-full bg-primary rounded-md transition-all duration-300"
                              style={{
                                height: `${Math.max(heightPercent, 4)}%`,
                                minHeight: "4px",
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground text-center truncate w-full">
                            {week.week}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    No training data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-skill-breakdown">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  Category Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {progress.categoryBreakdown.length > 0 ? (
                  <div className="space-y-3">
                    {progress.categoryBreakdown.map((item, i) => {
                      const widthPercent = (item.count / maxCategoryCount) * 100;
                      return (
                        <div key={item.category} data-testid={`bar-category-${item.category}`}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-medium truncate">
                              {CATEGORY_LABELS[item.category] || item.category}
                            </span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {item.count} sessions
                            </span>
                          </div>
                          <div className="h-3 w-full rounded-md bg-muted">
                            <div
                              className={`h-full rounded-md transition-all duration-300 ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`}
                              style={{ width: `${Math.max(widthPercent, 2)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    No category data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-assignment-completion">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Assignment Completion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">
                    {progress.assignmentCompletion.completed} of {progress.assignmentCompletion.total} completed
                  </span>
                  <span className="text-sm font-semibold" data-testid="text-completion-rate">
                    {progress.assignmentCompletion.rate}%
                  </span>
                </div>
                <Progress
                  value={progress.assignmentCompletion.rate}
                  className="h-3"
                  data-testid="progress-completion"
                />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-recent-logs">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Recent Training Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {progress.recentLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Drill</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {progress.recentLogs.slice(0, 10).map((log) => (
                      <TableRow key={log.id} data-testid={`row-log-${log.id}`}>
                        <TableCell
                          className="font-medium"
                          data-testid={`text-log-drill-${log.id}`}
                        >
                          {log.drillTitle}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="no-default-hover-elevate text-xs"
                          >
                            {CATEGORY_LABELS[log.drillCategory] || log.drillCategory}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {log.duration} min
                        </TableCell>
                        <TableCell
                          className="text-right"
                          data-testid={`text-log-score-${log.id}`}
                        >
                          {log.score !== null && log.score !== undefined
                            ? `${log.score}/10`
                            : "—"}
                        </TableCell>
                        <TableCell
                          className="text-right whitespace-nowrap"
                          data-testid={`text-log-date-${log.id}`}
                        >
                          {new Date(log.completedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
