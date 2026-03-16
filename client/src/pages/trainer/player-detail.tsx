import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmojiPicker } from "@/components/emoji-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  User,
  ClipboardList,
  MessageCircle,
  Video,
  Calendar,
  BarChart3,
  CheckCircle,
  Circle,
  Clock,
  Star,
  Send,
  Share2,
  Trophy,
  Target,
  Dumbbell,
  ChevronRight,
  Play,
  Eye,
  EyeOff,
  FileText,
  CalendarDays,
  Award,
} from "lucide-react";

interface TrainerPlayerData {
  id: string;
  trainerId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
  jerseyNumber: string | null;
  ageGroup: string | null;
  teamType: string | null;
  gradYear: number | null;
  notes: string | null;
  linkedUserId: string | null;
  createdAt: string;
  updatedAt: string;
  groups: Array<{ id: string; groupName: string }>;
  teams: Array<{ id: string; teamName: string }>;
}

interface PlayerAssignment {
  id: string;
  drillId: string;
  drillTitle: string;
  drillCategory: string;
  teamId: string | null;
  teamName?: string;
  assignedTo: string | null;
  dueDate: string | null;
  notes: string | null;
  status: string;
  trainingLogId: string | null;
  createdAt: string;
}

interface PlayerVideo {
  id: string;
  userId: string;
  playerName: string;
  title: string;
  videoUrl: string;
  description: string | null;
  createdAt: string | null;
}

interface PlayerMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

interface PlayerEvaluation {
  id: string;
  trainerId: string;
  playerId: string;
  evaluationType: string;
  notes: string | null;
  evaluationDate: string;
  sharedWithPlayer: boolean;
  createdAt: string;
}

interface TrainingLogEntry {
  id: string;
  userId: string;
  drillId: string | null;
  drillTitle: string | null;
  duration: number | null;
  notes: string | null;
  completedAt: string;
}

interface TrainingSession {
  id: string;
  trainerId: string;
  playerId: string;
  sessionDate: string;
  startTime: string | null;
  endTime: string | null;
  status: string;
  notes: string | null;
  locationId: string | null;
  sessionType: string | null;
  createdAt: string;
}

interface PlayerProgress {
  totalSessions: number;
  totalMinutes: number;
  completionRate: number;
  categoryBreakdown: Array<{ category: string; count: number }>;
  recentActivity: Array<{ date: string; count: number }>;
}

const EVAL_CATEGORIES: Record<string, string[]> = {
  "Offense": ["Shooting Form", "Shooting Range", "Ball Handling", "Passing", "Finishing", "Post Moves", "Free Throws"],
  "Defense": ["On-Ball Defense", "Help Defense", "Rebounding", "Shot Blocking", "Steals"],
  "Intangibles": ["Basketball IQ", "Coachability", "Leadership", "Hustle", "Communication", "Attitude"],
  "Physical": ["Speed", "Agility", "Strength", "Vertical", "Endurance", "Conditioning"],
};

export default function TrainerPlayerDetail() {
  const [, params] = useRoute("/trainer/roster/:playerId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const playerId = params?.playerId || "";
  const chatInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState("overview");
  const [chatMessage, setChatMessage] = useState("");
  const [viewingLogId, setViewingLogId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get("tab");
    if (tab) setActiveTab(tab);
  }, []);

  const { data: allPlayers } = useQuery<TrainerPlayerData[]>({
    queryKey: ["/api/trainer-players"],
  });

  const player = allPlayers?.find(p => p.id === playerId);

  const { data: assignments, isLoading: assignmentsLoading } = useQuery<PlayerAssignment[]>({
    queryKey: ["/api/trainer/players", playerId, "assignments"],
    enabled: !!playerId,
  });

  const { data: viewedLog, isLoading: logLoading } = useQuery<{
    id: string; duration: number | null; notes: string | null;
    completedAt: string | null; score: number | null;
    metrics: Array<{ metricId: string; value: string | null }>;
  }>({
    queryKey: ["/api/trainer/players", playerId, "training-logs", viewingLogId],
    enabled: !!viewingLogId && !!playerId,
  });

  const { data: videos, isLoading: videosLoading } = useQuery<PlayerVideo[]>({
    queryKey: ["/api/trainer/players", playerId, "videos"],
    enabled: !!playerId,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<PlayerMessage[]>({
    queryKey: ["/api/trainer/players", playerId, "messages"],
    enabled: !!playerId,
  });

  const { data: evaluations, isLoading: evaluationsLoading } = useQuery<PlayerEvaluation[]>({
    queryKey: ["/api/trainer/players", playerId, "evaluations"],
    enabled: !!playerId,
    staleTime: 0,
  });

  const { data: trainingLogs, isLoading: logsLoading } = useQuery<TrainingLogEntry[]>({
    queryKey: ["/api/trainer/players", playerId, "training-logs"],
    enabled: !!playerId,
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery<TrainingSession[]>({
    queryKey: ["/api/trainer/players", playerId, "sessions"],
    enabled: !!playerId,
  });

  const { data: progress, isLoading: progressLoading } = useQuery<PlayerProgress>({
    queryKey: ["/api/trainer/players", playerId, "progress"],
    enabled: !!playerId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const receiverId = player?.linkedUserId || playerId;
      return await apiRequest("POST", "/api/messages", { receiverId, content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/players", playerId, "messages"] });
      setChatMessage("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to send message", variant: "destructive" });
    },
  });

  const toggleShareMutation = useMutation({
    mutationFn: async ({ evalId, shared }: { evalId: string; shared: boolean }) => {
      return await apiRequest("PUT", `/api/player-evaluations/${evalId}/share`, { shared });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/players", playerId, "evaluations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-evaluations"] });
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.startsWith("/api/player-evaluations") });
      toast({ title: "Updated", description: "Evaluation sharing updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update sharing", variant: "destructive" });
    },
  });

  const handleSendChat = () => {
    if (!chatMessage.trim()) return;
    sendMessageMutation.mutate(chatMessage.trim());
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "in-progress": return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return dateStr; }
  };

  const formatTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } catch { return ""; }
  };

  if (!allPlayers) {
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <Button variant="ghost" onClick={() => setLocation("/trainer/roster")} data-testid="button-back-to-roster">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Player Management
        </Button>
        <div className="py-12 text-center text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Player not found</p>
        </div>
      </div>
    );
  }

  const completedAssignments = assignments?.filter(a => a.status === "completed") || [];
  const activeAssignments = assignments?.filter(a => a.status !== "completed") || [];
  const upcomingSessions = sessions?.filter(s => s.status === "confirmed" || s.status === "pending") || [];
  const completedSessions = sessions?.filter(s => s.status === "completed") || [];

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4 pb-24">
      <Button variant="ghost" size="sm" onClick={() => setLocation("/trainer/roster")} data-testid="button-back-to-roster">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back
      </Button>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-xl font-bold bg-primary text-primary-foreground">
                {(player.firstName?.[0] || '') + (player.lastName?.[0] || '')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold" data-testid="text-player-detail-name">
                {player.firstName} {player.lastName || ""}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {player.position && <Badge variant="outline">{player.position}</Badge>}
                {player.jerseyNumber && <span className="text-sm font-mono text-muted-foreground">#{player.jerseyNumber}</span>}
                {player.ageGroup && <Badge variant="secondary">{player.ageGroup}</Badge>}
                {player.gradYear && <Badge variant="secondary">Class of {player.gradYear}</Badge>}
                {player.teamType && player.teamType !== "None" && <Badge variant="secondary">{player.teamType}</Badge>}
              </div>
              {player.email && <p className="text-sm text-muted-foreground mt-1">{player.email}</p>}
              {(player.teams || []).length > 0 && (
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  {(player.teams || []).map((t: any) => (
                    <Badge key={t.id} variant="default" className="no-default-hover-elevate text-xs">{t.teamName}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex overflow-x-auto" data-testid="tabs-player-detail">
          <TabsTrigger value="overview" className="flex-1 text-xs" data-testid="tab-overview">
            <BarChart3 className="w-3 h-3 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="evaluations" className="flex-1 text-xs" data-testid="tab-evaluations">
            <Star className="w-3 h-3 mr-1" />
            Evaluations
          </TabsTrigger>
          <TabsTrigger value="drills" className="flex-1 text-xs" data-testid="tab-drills">
            <ClipboardList className="w-3 h-3 mr-1" />
            Drills
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex-1 text-xs" data-testid="tab-sessions">
            <Calendar className="w-3 h-3 mr-1" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex-1 text-xs" data-testid="tab-logs">
            <Dumbbell className="w-3 h-3 mr-1" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex-1 text-xs" data-testid="tab-videos">
            <Video className="w-3 h-3 mr-1" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex-1 text-xs" data-testid="tab-chat">
            <MessageCircle className="w-3 h-3 mr-1" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex-1 text-xs" data-testid="tab-progress">
            <Target className="w-3 h-3 mr-1" />
            Progress
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold" data-testid="text-total-sessions">{progress?.totalSessions || 0}</p>
                <p className="text-xs text-muted-foreground">Sessions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold" data-testid="text-total-minutes">{progress?.totalMinutes || 0}</p>
                <p className="text-xs text-muted-foreground">Minutes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold" data-testid="text-completion-rate">{progress?.completionRate || 0}%</p>
                <p className="text-xs text-muted-foreground">Completion</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-bold" data-testid="text-eval-count">{evaluations?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Evaluations</p>
              </CardContent>
            </Card>
          </div>

          {activeAssignments && activeAssignments.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Active Assignments ({activeAssignments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {activeAssignments.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm">
                    {statusIcon(a.status)}
                    <span className="flex-1 truncate">{a.drillTitle}</span>
                    <Badge variant="outline" className="no-default-hover-elevate text-[10px]">{a.drillCategory}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {upcomingSessions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Upcoming Sessions ({upcomingSessions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingSessions.slice(0, 3).map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span>{formatDate(s.sessionDate)}</span>
                    <Badge variant={s.status === "confirmed" ? "default" : "secondary"} className="no-default-hover-elevate">{s.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {player.notes && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{player.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="evaluations" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">{evaluations?.length || 0} Evaluations</h3>
            <Button size="sm" onClick={() => setLocation(`/trainer/evaluations?player=${playerId}`)} data-testid="button-new-evaluation">
              <Star className="w-4 h-4 mr-1" />
              New Evaluation
            </Button>
          </div>
          {evaluationsLoading ? (
            <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-16" />)}</div>
          ) : !evaluations?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No evaluations yet</p>
            </div>
          ) : (
            evaluations.map((ev) => (
              <Card key={ev.id} data-testid={`card-evaluation-${ev.id}`}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={ev.evaluationType === "initial" ? "default" : "secondary"} className="no-default-hover-elevate text-xs">
                        {ev.evaluationType === "initial" ? "Initial" : "Progress"}
                      </Badge>
                      <span className="text-sm">{formatDate(ev.evaluationDate)}</span>
                    </div>
                    {ev.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{ev.notes}</p>}
                  </div>
                  <Button
                    size="icon"
                    variant={ev.sharedWithPlayer ? "default" : "ghost"}
                    className="h-8 w-8 shrink-0"
                    title={ev.sharedWithPlayer ? "Shared with player" : "Share with player"}
                    onClick={() => toggleShareMutation.mutate({ evalId: ev.id, shared: !ev.sharedWithPlayer })}
                    data-testid={`button-toggle-share-${ev.id}`}
                  >
                    {ev.sharedWithPlayer ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="drills" className="space-y-4 mt-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Active Assignments ({activeAssignments.length})</h3>
            {assignmentsLoading ? (
              <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-14" />)}</div>
            ) : !activeAssignments.length ? (
              <div className="py-6 text-center text-muted-foreground">
                <ClipboardList className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No active assignments</p>
              </div>
            ) : (
              <div className="space-y-2">
                {activeAssignments.map((a) => (
                  <Card key={a.id} data-testid={`card-assignment-${a.id}`}>
                    <CardContent className="p-3 flex items-center gap-2">
                      {statusIcon(a.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.drillTitle}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="no-default-hover-elevate text-[10px]">{a.drillCategory}</Badge>
                          {a.dueDate && <span className="text-[10px] text-muted-foreground">Due {formatDate(a.dueDate)}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">{a.status}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-medium mb-2">Completed ({completedAssignments.length})</h3>
            {!completedAssignments.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">No completed drills yet</p>
            ) : (
              <div className="space-y-1">
                {completedAssignments.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/50" data-testid={`card-completed-${a.id}`}>
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    <span className="text-sm flex-1 truncate">{a.drillTitle}</span>
                    <Badge variant="outline" className="no-default-hover-elevate text-[10px]">{a.drillCategory}</Badge>
                    {a.trainingLogId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px] gap-1"
                        onClick={() => setViewingLogId(a.trainingLogId!)}
                        data-testid={`button-view-log-${a.id}`}
                      >
                        <FileText className="w-3 h-3" />
                        Log
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4 mt-4">
          <div>
            <h3 className="text-sm font-medium mb-2">Upcoming & Active ({upcomingSessions.length})</h3>
            {sessionsLoading ? (
              <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-14" />)}</div>
            ) : !upcomingSessions.length ? (
              <div className="py-6 text-center text-muted-foreground">
                <Calendar className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No upcoming sessions</p>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingSessions.map((s) => (
                  <Card key={s.id} data-testid={`card-session-${s.id}`}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{formatDate(s.sessionDate)}</p>
                        {s.startTime && <p className="text-xs text-muted-foreground">{s.startTime}{s.endTime ? ` - ${s.endTime}` : ""}</p>}
                        {s.sessionType && <Badge variant="outline" className="no-default-hover-elevate text-[10px] mt-1">{s.sessionType}</Badge>}
                      </div>
                      <Badge variant={s.status === "confirmed" ? "default" : "secondary"} className="no-default-hover-elevate capitalize">{s.status}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-medium mb-2">Completed Sessions ({completedSessions.length})</h3>
            {!completedSessions.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">No completed sessions yet</p>
            ) : (
              <div className="space-y-1">
                {completedSessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50" data-testid={`card-completed-session-${s.id}`}>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      <span className="text-sm">{formatDate(s.sessionDate)}</span>
                    </div>
                    {s.notes && <span className="text-xs text-muted-foreground truncate max-w-[150px]">{s.notes}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-3 mt-4">
          <h3 className="text-sm font-medium">{trainingLogs?.length || 0} Training Log Entries</h3>
          {logsLoading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>
          ) : !trainingLogs?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No training logs yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trainingLogs.map((log) => (
                <Card key={log.id} data-testid={`card-log-${log.id}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{log.drillTitle || "Training Session"}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(log.completedAt)}</p>
                      </div>
                      {log.duration && <span className="text-sm text-muted-foreground">{log.duration} min</span>}
                    </div>
                    {log.notes && <p className="text-xs text-muted-foreground mt-1">{log.notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="videos" className="space-y-3 mt-4">
          <h3 className="text-sm font-medium">{videos?.length || 0} Videos</h3>
          {videosLoading ? (
            <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-14" />)}</div>
          ) : !videos?.length ? (
            <div className="py-8 text-center text-muted-foreground">
              <Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No videos yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {videos.map((v) => (
                <Card key={v.id} data-testid={`card-video-${v.id}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                      <Play className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{v.title}</p>
                      {v.description && <p className="text-xs text-muted-foreground truncate">{v.description}</p>}
                      {v.createdAt && <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(v.createdAt)}</p>}
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <a href={v.videoUrl} target="_blank" rel="noopener noreferrer" data-testid={`button-watch-video-${v.id}`}>
                        Watch
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <Card className="h-[400px] flex flex-col">
            <CardHeader className="pb-2 shrink-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Chat with {player.firstName}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden p-3 pt-0">
              <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                {messagesLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}</div>
                ) : !messages?.length ? (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`} data-testid={`message-${msg.id}`}>
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <p>{msg.content}</p>
                          <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <EmojiPicker onEmojiSelect={(emoji) => setChatMessage(prev => prev + emoji)} />
                <Input
                  ref={chatInputRef}
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  data-testid="input-chat-message"
                />
                <Button size="icon" onClick={handleSendChat} disabled={!chatMessage.trim() || sendMessageMutation.isPending} data-testid="button-send-chat">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4 mt-4">
          {progressLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-48" />
            </div>
          ) : !progress ? (
            <div className="py-8 text-center text-muted-foreground">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No progress data available yet</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold">{progress.totalSessions}</p>
                    <p className="text-xs text-muted-foreground">Total Drills</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold">{progress.totalMinutes}</p>
                    <p className="text-xs text-muted-foreground">Total Minutes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-2xl font-bold">{progress.completionRate}%</p>
                    <p className="text-xs text-muted-foreground">Completion Rate</p>
                  </CardContent>
                </Card>
              </div>

              {progress.categoryBreakdown && progress.categoryBreakdown.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Training Breakdown by Category</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {progress.categoryBreakdown.map((cat) => {
                      const maxCount = Math.max(...progress.categoryBreakdown.map(c => c.count));
                      return (
                        <div key={cat.category} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{cat.category}</span>
                            <span className="text-muted-foreground">{cat.count}</span>
                          </div>
                          <Progress value={maxCount > 0 ? (cat.count / maxCount) * 100 : 0} className="h-2" />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {progress.recentActivity && progress.recentActivity.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {progress.recentActivity.slice(0, 10).map((a, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1">
                        <span className="text-muted-foreground">{formatDate(a.date)}</span>
                        <Badge variant="secondary" className="no-default-hover-elevate">{a.count} sessions</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!viewingLogId} onOpenChange={(open) => { if (!open) setViewingLogId(null); }}>
        <DialogContent data-testid="dialog-view-player-log">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Training Log — {(assignments || []).find(a => a.trainingLogId === viewingLogId)?.drillTitle || "Drill"}
            </DialogTitle>
          </DialogHeader>
          {logLoading ? (
            <div className="space-y-2 py-4">{[1,2,3].map(i => <Skeleton key={i} className="h-5 w-full" />)}</div>
          ) : viewedLog ? (
            <div className="space-y-3 py-2">
              {viewedLog.completedAt && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="font-medium">{new Date(viewedLog.completedAt).toLocaleDateString()}</span>
                </div>
              )}
              {viewedLog.duration != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">{viewedLog.duration} min</span>
                </div>
              )}
              {viewedLog.score != null && (
                <div className="flex items-center gap-2 text-sm">
                  <Award className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Score:</span>
                  <span className="font-medium">{viewedLog.score}</span>
                </div>
              )}
              {viewedLog.metrics && viewedLog.metrics.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Metrics</p>
                  <div className="grid grid-cols-2 gap-2">
                    {viewedLog.metrics.map((m, i) => (
                      <div key={i} className="bg-muted/50 rounded p-2 text-sm">
                        <span className="font-medium">{m.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewedLog.notes && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</p>
                  <p className="text-sm italic bg-muted/50 rounded px-3 py-2">"{viewedLog.notes}"</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Log details unavailable</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
