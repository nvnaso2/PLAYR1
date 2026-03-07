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
  ArrowRight,
  Activity,
  Calendar,
  CalendarDays,
  Target,
} from "lucide-react";

interface RecentLog {
  id: number;
  drillId: number;
  drillTitle?: string;
  duration: number;
  score?: number;
  notes?: string;
  completedAt: string;
  playerName?: string;
  teamName?: string;
}

interface RecentAssignment {
  id: number;
  drillId: number;
  drillTitle?: string;
  assignedTo?: string;
  teamName?: string;
  groupName?: string;
  dueDate?: string;
  createdAt?: string;
}

interface OverviewData {
  totalPlayers: number;
  totalTeams: number;
  totalGroups: number;
  activeAssignments: number;
  recentLogs: RecentLog[];
  recentAssignments: RecentAssignment[];
  unreadMessages: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  testId,
  href,
}: {
  title: string;
  value: string | number;
  icon: typeof Users;
  loading: boolean;
  testId: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <Card className="cursor-pointer transition-colors hover:border-primary/40" data-testid={testId}>
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
    </Link>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-3 p-3">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface TimelineItem {
  id: string;
  type: "log" | "assignment";
  title: string;
  subtitle: string;
  initials: string;
  date: string;
  badgeLabel?: string;
  meta?: string;
}

function buildTimeline(logs: RecentLog[], assignments: RecentAssignment[]): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const log of logs) {
    const playerName = log.playerName || "Player";
    items.push({
      id: `log-${log.id}`,
      type: "log",
      title: playerName,
      subtitle: `Completed "${log.drillTitle || "Drill"}"${log.duration > 0 ? ` \u00b7 ${log.duration} min` : ""}${log.score != null ? ` \u00b7 Score: ${log.score}` : ""}`,
      initials: playerName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      date: log.completedAt,
      badgeLabel: log.teamName,
    });
  }

  for (const a of assignments) {
    const target = a.teamName || a.groupName || a.assignedTo || "Team";
    items.push({
      id: `assign-${a.id}`,
      type: "assignment",
      title: `Assigned to ${target}`,
      subtitle: a.drillTitle || "Drill",
      initials: target
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
      date: a.dueDate || a.createdAt || "",
      meta: a.dueDate ? `Due ${new Date(a.dueDate).toLocaleDateString()}` : undefined,
    });
  }

  items.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });

  return items;
}

export default function TrainerDashboard() {
  const { data: overview, isLoading } = useQuery<OverviewData>({
    queryKey: ["/api/trainer/overview"],
  });

  const { data: sessions } = useQuery<any[]>({
    queryKey: ["/api/training-sessions/trainer/enriched"],
  });

  const pendingRequests = sessions?.filter((s: any) => s.status === "requested")?.length ?? 0;

  const recentLogs = overview?.recentLogs ?? [];
  const recentAssignments = overview?.recentAssignments ?? [];
  const timeline = buildTimeline(recentLogs, recentAssignments);

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

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          title="Total Players"
          value={overview?.totalPlayers ?? 0}
          icon={Users}
          loading={isLoading}
          testId="card-stat-players"
          href="/trainer/roster"
        />
        <StatCard
          title="Active Assignments"
          value={overview?.activeAssignments ?? 0}
          icon={ClipboardList}
          loading={isLoading}
          testId="card-stat-assignments"
          href="/trainer/drills"
        />
        <StatCard
          title="Logs (7 days)"
          value={recentLogs.length}
          icon={FileText}
          loading={isLoading}
          testId="card-stat-logs"
          href="/trainer/logs"
        />
        <StatCard
          title="Unread Messages"
          value={overview?.unreadMessages ?? 0}
          icon={MessageCircle}
          loading={isLoading}
          testId="card-stat-messages"
          href="/trainer/chat"
        />
        <StatCard
          title="Pending Requests"
          value={pendingRequests}
          icon={CalendarDays}
          loading={!sessions}
          testId="card-stat-requests"
          href="/trainer/schedule"
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
        <Button variant="outline" asChild data-testid="button-view-schedule">
          <Link href="/trainer/schedule">
            <CalendarDays className="w-4 h-4 mr-1" />
            View Schedule
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
          ) : timeline.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm" data-testid="text-empty-activity">No recent activity yet</p>
              <p className="text-xs mt-1">Training logs and assignments will appear here</p>
            </div>
          ) : (
            timeline.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-md bg-muted/50"
                data-testid={`item-activity-${item.id}`}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs">{item.initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate" data-testid={`text-activity-title-${item.id}`}>
                      {item.title}
                    </p>
                    {item.type === "log" && (
                      <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">
                        <FileText className="w-2.5 h-2.5 mr-0.5" />
                        Log
                      </Badge>
                    )}
                    {item.type === "assignment" && (
                      <Badge variant="outline" className="no-default-hover-elevate text-[10px]">
                        <Target className="w-2.5 h-2.5 mr-0.5" />
                        Assignment
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {item.badgeLabel && (
                      <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">
                        {item.badgeLabel}
                      </Badge>
                    )}
                    {item.meta && (
                      <span className="text-[10px] text-muted-foreground">
                        <Calendar className="w-3 h-3 inline mr-0.5" />
                        {item.meta}
                      </span>
                    )}
                    {item.date && (
                      <span className="text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3 inline mr-0.5" />
                        {new Date(item.date).toLocaleDateString()}
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
