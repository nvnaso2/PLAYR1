import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  ClipboardList,
  FileText,
  MessageCircle,
  UserPlus,
  Plus,
  Dumbbell,
  Clock,
  Calendar,
  ArrowRight,
  Activity,
} from "lucide-react";

interface OverviewData {
  totalPlayers: number;
  totalTeams: number;
  totalAssignments: number;
  activeAssignments: number;
  recentLogsCount: number;
  unreadMessages: number;
  recentActivity: RecentActivityItem[];
}

interface RecentActivityItem {
  id: string;
  drillId: string;
  drillTitle?: string;
  duration: number;
  score?: number;
  notes?: string;
  completedAt: string;
  playerName: string;
  teamName?: string;
}

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  testId,
}: {
  title: string;
  value: string | number;
  icon: typeof Users;
  loading: boolean;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold" data-testid={`text-stat-${testId}`}>{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export default function TrainerDashboard() {
  const { data: overview, isLoading } = useQuery<OverviewData>({
    queryKey: ["/api/trainer/overview"],
  });

  const recentActivity = overview?.recentActivity ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-trainer-home-title">
            Trainer Home
          </h1>
          <p className="text-sm text-muted-foreground">
            Overview of your training program
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Total Players"
          value={overview?.totalPlayers ?? 0}
          icon={Users}
          loading={isLoading}
          testId="card-stat-players"
        />
        <StatCard
          title="Active Assignments"
          value={overview?.activeAssignments ?? 0}
          icon={ClipboardList}
          loading={isLoading}
          testId="card-stat-assignments"
        />
        <StatCard
          title="Logs (7 days)"
          value={overview?.recentLogsCount ?? 0}
          icon={FileText}
          loading={isLoading}
          testId="card-stat-logs"
        />
        <StatCard
          title="Unread Messages"
          value={overview?.unreadMessages ?? 0}
          icon={MessageCircle}
          loading={isLoading}
          testId="card-stat-messages"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button asChild data-testid="button-add-player">
          <Link href="/trainer/roster">
            <UserPlus className="w-4 h-4 mr-1" />
            Add Player
          </Link>
        </Button>
        <Button variant="outline" asChild data-testid="button-create-drill">
          <Link href="/trainer/drills">
            <Plus className="w-4 h-4 mr-1" />
            Create Drill
          </Link>
        </Button>
        <Button variant="outline" asChild data-testid="button-assign-workout">
          <Link href="/trainer/drills">
            <Dumbbell className="w-4 h-4 mr-1" />
            Assign Workout
          </Link>
        </Button>
      </div>

      <Card data-testid="card-recent-activity">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
          <Button variant="ghost" size="sm" asChild data-testid="link-view-all-logs">
            <Link href="/trainer/logs">
              View All
              <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <ActivitySkeleton />
          ) : recentActivity.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity yet</p>
              <p className="text-xs mt-1">Training logs from your players will appear here</p>
            </div>
          ) : (
            recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-md bg-muted/50"
                data-testid={`item-activity-${item.id}`}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">
                    {item.playerName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" data-testid={`text-activity-player-${item.id}`}>
                    {item.playerName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.drillTitle || "Drill"}
                    {item.duration > 0 && <span> &middot; {item.duration} min</span>}
                    {item.score != null && <span> &middot; Score: {item.score}</span>}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {item.teamName && (
                      <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">
                        {item.teamName}
                      </Badge>
                    )}
                    {item.completedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3 inline mr-0.5" />
                        {new Date(item.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
