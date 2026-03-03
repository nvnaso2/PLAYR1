import { useMemo } from "react";
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
  CheckCircle,
  Circle,
  Calendar,
  ArrowRight,
} from "lucide-react";

interface TrainerPlayerData {
  id: string;
  trainerId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  groups: Array<{ id: string; groupId: string; groupName: string }>;
  teams: Array<{ id: string; teamId: string; teamName: string }>;
}

interface TrainingLogEntry {
  id: string;
  drillId: string;
  drillTitle?: string;
  duration: number;
  score?: number;
  notes?: string;
  completedAt: string;
  playerName: string;
  playerId: string;
  groupId?: string;
  groupName?: string;
}

interface Assignment {
  id: string;
  drillId: string;
  drillTitle: string;
  teamId: string;
  assignedBy: string;
  dueDate?: string;
  notes?: string;
  status: string;
  createdAt: string;
}

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerImage?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface TrainerGroup {
  id: string;
  name: string;
  description: string;
  teamCode: string;
  memberCount?: number;
}

interface CoachTeam {
  id: string;
  name: string;
  description: string;
  teamCode: string;
  memberCount: number;
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

export default function TrainerDashboard() {
  const { data: players, isLoading: playersLoading } = useQuery<TrainerPlayerData[]>({
    queryKey: ["/api/trainer-players"],
  });

  const { data: trainingLogs, isLoading: logsLoading } = useQuery<TrainingLogEntry[]>({
    queryKey: ["/api/trainer/all-training-logs"],
  });

  const { data: conversations, isLoading: convosLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/messages/conversations"],
  });

  const { data: groups } = useQuery<TrainerGroup[]>({
    queryKey: ["/api/trainer/groups"],
  });

  const { data: coachTeams } = useQuery<CoachTeam[]>({
    queryKey: ["/api/coach/teams"],
  });

  const allEntityIds = useMemo(() => {
    const ids = new Set<string>();
    groups?.forEach((g) => ids.add(g.id));
    coachTeams?.forEach((t) => ids.add(t.id));
    return Array.from(ids);
  }, [groups, coachTeams]);

  const { data: assignmentsByGroup, isLoading: assignmentsLoading } = useQuery<
    Record<string, Assignment[]>
  >({
    queryKey: ["/api/trainer/all-assignments", allEntityIds.join(",")],
    queryFn: async () => {
      const results: Record<string, Assignment[]> = {};
      if (!allEntityIds.length) return {};
      await Promise.all(
        allEntityIds.map(async (entityId) => {
          const res = await fetch(`/api/trainer/groups/${entityId}/assignments`, {
            credentials: "include",
          });
          if (!res.ok) return;
          results[entityId] = await res.json();
        })
      );
      return results;
    },
    enabled: allEntityIds.length > 0,
  });

  const totalPlayers = players?.length || 0;

  const activeAssignments = useMemo(() => {
    if (!assignmentsByGroup) return 0;
    let count = 0;
    Object.values(assignmentsByGroup).forEach((assigns) => {
      count += assigns.filter((a) => a.status !== "completed").length;
    });
    return count;
  }, [assignmentsByGroup]);

  const recentLogs7Days = useMemo(() => {
    if (!trainingLogs) return 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return trainingLogs.filter(
      (log) => new Date(log.completedAt) >= sevenDaysAgo
    ).length;
  }, [trainingLogs]);

  const unreadMessages = useMemo(() => {
    if (!conversations) return 0;
    return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  }, [conversations]);

  const recentTrainingLogs = useMemo(() => {
    if (!trainingLogs) return [];
    return trainingLogs.slice(0, 5);
  }, [trainingLogs]);

  const recentAssignments = useMemo(() => {
    if (!assignmentsByGroup) return [];
    const all: { assignment: Assignment; groupName: string }[] = [];
    Object.entries(assignmentsByGroup).forEach(([entityId, assigns]) => {
      const group = groups?.find((g) => g.id === entityId);
      const team = coachTeams?.find((t) => t.id === entityId);
      const name = group?.name || team?.name || "Unknown";
      assigns.forEach((a) => all.push({ assignment: a, groupName: name }));
    });
    all.sort(
      (a, b) =>
        new Date(b.assignment.createdAt).getTime() -
        new Date(a.assignment.createdAt).getTime()
    );
    return all.slice(0, 5);
  }, [assignmentsByGroup, groups, coachTeams]);

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "in-progress":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const isLoading = playersLoading || logsLoading || convosLoading || assignmentsLoading;

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
          value={totalPlayers}
          icon={Users}
          loading={playersLoading}
          testId="card-stat-players"
        />
        <StatCard
          title="Active Assignments"
          value={activeAssignments}
          icon={ClipboardList}
          loading={assignmentsLoading}
          testId="card-stat-assignments"
        />
        <StatCard
          title="Logs (7 days)"
          value={recentLogs7Days}
          icon={FileText}
          loading={logsLoading}
          testId="card-stat-logs"
        />
        <StatCard
          title="Unread Messages"
          value={unreadMessages}
          icon={MessageCircle}
          loading={convosLoading}
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

      <div className="grid md:grid-cols-2 gap-4">
        <Card data-testid="card-recent-logs">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Recent Training Logs</CardTitle>
            <Button variant="ghost" size="sm" asChild data-testid="link-view-all-logs">
              <Link href="/trainer/logs">
                View All
                <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {logsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recentTrainingLogs.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No training logs yet</p>
              </div>
            ) : (
              recentTrainingLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-md bg-muted/50"
                  data-testid={`item-log-${log.id}`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-xs">
                      {log.playerName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`text-log-player-${log.id}`}>
                      {log.playerName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {log.drillTitle || "Drill"} &middot; {log.duration} min
                      {log.score != null && ` &middot; Score: ${log.score}`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {log.groupName && (
                        <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">
                          {log.groupName}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        <Calendar className="w-3 h-3 inline mr-0.5" />
                        {new Date(log.completedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-recent-assignments">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Recent Assignments</CardTitle>
            <Button variant="ghost" size="sm" asChild data-testid="link-view-all-assignments">
              <Link href="/trainer/drills">
                View All
                <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {assignmentsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recentAssignments.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No assignments yet</p>
              </div>
            ) : (
              recentAssignments.map(({ assignment, groupName }) => (
                <div
                  key={assignment.id}
                  className="flex items-start gap-3 p-3 rounded-md bg-muted/50"
                  data-testid={`item-assignment-${assignment.id}`}
                >
                  {statusIcon(assignment.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" data-testid={`text-assignment-title-${assignment.id}`}>
                      {assignment.drillTitle}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">
                        {groupName}
                      </Badge>
                      <span className="text-xs text-muted-foreground capitalize">
                        {assignment.status}
                      </span>
                    </div>
                    {assignment.dueDate && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        <Calendar className="w-3 h-3 inline mr-0.5" />
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
