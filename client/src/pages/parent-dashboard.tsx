import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Activity,
  MessageCircle,
  Link2,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Clock,
  Trophy,
  Target,
  UserPlus,
  Eye,
  Shield,
} from "lucide-react";

interface ChildData {
  id: string;
  parentUserId: string;
  playerUserId: string;
  child: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    displayName?: string;
    profilePhotoUrl?: string;
    skillLevel?: string;
    city?: string;
    state?: string;
  } | null;
  career: {
    positions?: string[];
    teamName?: string;
    schoolName?: string;
    level?: number;
    xp?: number;
  } | null;
}

interface ActivityData {
  sessions: any[];
  stats: any;
  connections: any[];
}

interface ConversationData {
  partnerId: string;
  partnerName: string;
  messages: any[];
}

interface ConnectionData {
  id: string;
  playerId: string;
  trainerId: string;
  status: string;
  trainer: {
    id: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    profilePhotoUrl?: string;
  } | null;
}

function LinkChildForm() {
  const [inviteCode, setInviteCode] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const { toast } = useToast();

  const handleLink = async () => {
    if (!inviteCode.trim()) return;
    setIsLinking(true);
    try {
      await apiRequest("POST", "/api/parent/link", { inviteCode: inviteCode.trim() });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/children"] });
      setInviteCode("");
      toast({ title: "Child linked successfully" });
    } catch (error: any) {
      toast({ title: "Failed to link", description: error.message, variant: "destructive" });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Link a Child
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Enter your child's parent invite code to link their account. You can find this code in their profile settings.
        </p>
        <div className="flex gap-2">
          <Input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Enter invite code"
            data-testid="input-invite-code"
          />
          <Button
            onClick={handleLink}
            disabled={isLinking || !inviteCode.trim()}
            data-testid="button-link-child"
          >
            {isLinking ? "Linking..." : "Link"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ChildCard({ child, onSelect }: { child: ChildData; onSelect: () => void }) {
  const info = child.child;
  const career = child.career;

  const name = info
    ? info.displayName || `${info.firstName || ""} ${info.lastName || ""}`.trim() || "Player"
    : "Player";

  const initials = info
    ? `${(info.firstName || "P")[0]}${(info.lastName || "")[0] || ""}`.toUpperCase()
    : "P";

  return (
    <Card className="hover-elevate cursor-pointer" onClick={onSelect} data-testid={`card-child-${child.playerUserId}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={info?.profilePhotoUrl || info?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate" data-testid={`text-child-name-${child.playerUserId}`}>{name}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {career?.teamName && (
                <span className="text-sm text-muted-foreground">{career.teamName}</span>
              )}
              {career?.positions && career.positions.length > 0 && (
                <Badge variant="secondary" className="text-xs">{career.positions.join("/")}</Badge>
              )}
              {info?.skillLevel && (
                <Badge variant="outline" className="text-xs capitalize">{info.skillLevel}</Badge>
              )}
            </div>
            {(info?.city || info?.state) && (
              <p className="text-xs text-muted-foreground mt-1">
                {[info.city, info.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {career?.level && (
              <Badge variant="secondary">
                <Trophy className="h-3 w-3 mr-1" />
                Lv. {career.level}
              </Badge>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChildDetailView({ childId, onBack }: { childId: string; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: children } = useQuery<ChildData[]>({
    queryKey: ["/api/parent/children"],
  });

  const { data: activity, isLoading: activityLoading } = useQuery<ActivityData>({
    queryKey: ["/api/parent/child", childId, "activity"],
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<ConversationData[]>({
    queryKey: ["/api/parent/child", childId, "messages"],
  });

  const { data: connections, isLoading: connectionsLoading } = useQuery<ConnectionData[]>({
    queryKey: ["/api/parent/child", childId, "connections"],
  });

  const child = children?.find((c) => c.playerUserId === childId);
  const childName = child?.child
    ? child.child.displayName || `${child.child.firstName || ""} ${child.child.lastName || ""}`.trim()
    : "Player";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-to-children">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold" data-testid="text-child-detail-name">{childName}</h2>
        <Badge variant="outline">
          <Eye className="h-3 w-3 mr-1" />
          Read-Only
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Activity className="h-4 w-4 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="sessions" data-testid="tab-sessions">
            <Calendar className="h-4 w-4 mr-1" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="messages" data-testid="tab-messages">
            <MessageCircle className="h-4 w-4 mr-1" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="connections" data-testid="tab-connections">
            <Link2 className="h-4 w-4 mr-1" />
            Connections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {activityLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : activity ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Target className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-2xl font-bold" data-testid="text-total-sessions">
                      {activity.stats?.totalSessions || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Sessions</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-2xl font-bold" data-testid="text-total-minutes">
                      {activity.stats?.totalMinutes || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Minutes Trained</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Shield className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-2xl font-bold" data-testid="text-total-connections">
                      {activity.connections?.filter((c: any) => c.status === "accepted").length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Active Trainers</p>
                  </CardContent>
                </Card>
              </div>

              {activity.sessions && activity.sessions.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Sessions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {activity.sessions.slice(0, 5).map((session: any, idx: number) => (
                      <div key={session.id || idx} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{session.sessionType || "Training"}</p>
                          <p className="text-xs text-muted-foreground">
                            {session.sessionDate ? new Date(session.sessionDate).toLocaleDateString() : ""}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {session.status || "completed"}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No recent sessions found.
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No activity data available.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sessions">
          {activityLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : activity?.sessions && activity.sessions.length > 0 ? (
            <div className="space-y-2">
              {activity.sessions.map((session: any, idx: number) => (
                <Card key={session.id || idx}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{session.sessionType || "Training Session"}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          <span>{session.sessionDate ? new Date(session.sessionDate).toLocaleDateString() : ""}</span>
                          {session.startTime && <span>{session.startTime}</span>}
                          {session.trainerName && <span>with {session.trainerName}</span>}
                        </div>
                      </div>
                      <Badge variant={session.status === "confirmed" ? "default" : "secondary"} className="shrink-0">
                        {session.status || "completed"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No training sessions found.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="messages">
          {messagesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-3">
              {messages.map((conv, idx) => (
                <Card key={conv.partnerId || idx}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      {conv.partnerName}
                      <Badge variant="outline" className="text-xs ml-auto">
                        {conv.messages?.length || 0} messages
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                    {conv.messages && conv.messages.length > 0 ? (
                      conv.messages.slice(-10).map((msg: any, mIdx: number) => (
                        <div
                          key={msg.id || mIdx}
                          className={`flex ${msg.senderId === childId ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`rounded-md px-3 py-2 max-w-[80%] text-sm ${
                              msg.senderId === childId
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p>{msg.content}</p>
                            <p className="text-xs opacity-60 mt-1">
                              {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : ""}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center">No messages in this conversation.</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No messages found.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="connections">
          {connectionsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : connections && connections.length > 0 ? (
            <div className="space-y-2">
              {connections.map((conn) => (
                <Card key={conn.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conn.trainer?.profilePhotoUrl || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {conn.trainer
                            ? `${(conn.trainer.firstName || "T")[0]}${(conn.trainer.lastName || "")[0] || ""}`.toUpperCase()
                            : "T"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {conn.trainer
                            ? conn.trainer.displayName || `${conn.trainer.firstName || ""} ${conn.trainer.lastName || ""}`.trim()
                            : "Trainer"}
                        </p>
                      </div>
                      <Badge
                        variant={conn.status === "accepted" ? "default" : conn.status === "pending" ? "secondary" : "outline"}
                        className="shrink-0"
                      >
                        {conn.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No trainer connections found.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ParentDashboard() {
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  const { data: children, isLoading } = useQuery<ChildData[]>({
    queryKey: ["/api/parent/children"],
  });

  if (selectedChildId) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <ChildDetailView childId={selectedChildId} onBack={() => setSelectedChildId(null)} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-parent-dashboard-title">Parent Dashboard</h1>
        <p className="text-muted-foreground">Monitor your children's basketball training activity</p>
      </div>

      <LinkChildForm />

      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Linked Children
        </h2>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : children && children.length > 0 ? (
          <div className="space-y-2">
            {children.map((child) => (
              <ChildCard
                key={child.playerUserId}
                child={child}
                onSelect={() => setSelectedChildId(child.playerUserId)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No children linked yet.</p>
              <p className="text-sm mt-1">Use the invite code from your child's profile to link their account.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
