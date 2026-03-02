import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Users,
  Plus,
  Trash2,
  ClipboardList,
  UserPlus,
  BookOpen,
  CheckCircle,
  Circle,
  Calendar,
  Search,
  Copy,
  ExternalLink,
  UserMinus,
  GraduationCap,
  Filter,
  FileText,
  MessageCircle,
  Video,
  Mail,
  Send,
  LogOut,
  Edit2,
  UserCheck,
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Settings,
  Dumbbell,
  MoreVertical,
  Eye,
  Shield,
  ChevronRight,
  Clock,
  Play,
  X,
  Upload,
  Link2,
} from "lucide-react";
import { insertTrainerTeamSchema, insertDrillAssignmentSchema, DRILL_CATEGORIES, DIFFICULTY_LEVELS } from "@shared/schema";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TrainerGroup {
  id: string;
  name: string;
  description: string;
  teamCode: string;
  ageGroup?: string;
  position?: string;
  level?: string;
  playerClass?: string;
  memberCount?: number;
  createdAt: string;
}

interface PlayerMember {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
  position?: string;
  jerseyNumber?: string;
  joinedAt: string;
}

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
  groups: Array<{ id: string; trainerPlayerId: string; groupId: string; groupName: string; ageGroup?: string | null; position: string | null; jerseyNumber: string | null; assignedAt: string }>;
  teams: Array<{ id: string; playerId: string; teamId: string; teamName: string; seasonYear?: number | null; ageGroup?: string | null; position: string | null; jerseyNumber: string | null; assignedAt: string }>;
}


interface CoachTeam {
  id: string;
  name: string;
  description: string;
  teamCode: string;
  seasonYear?: number;
  ageGroup?: string;
  position?: string;
  level?: string;
  playerClass?: string;
  memberCount: number;
  createdAt: string;
}

interface RosterMember {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
  position?: string;
  jerseyNumber?: string;
  joinedAt: string;
  isCoachPlayer?: boolean;
  coachPlayerId?: string;
  assignmentId?: string;
}


interface DrillItem {
  id: string;
  title: string;
  category: string;
  difficulty: string;
}

interface TrainerDrill {
  id: string;
  title: string;
  description: string | null;
  category: string;
  difficulty: string;
  duration: number | null;
  equipment: string[] | null;
  tips: string[] | null;
  trackShots: boolean | null;
  videoUrl: string | null;
  userId: string;
  createdAt: string;
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
  position?: string | null;
  ageGroup?: string | null;
}

interface ChatContact {
  id: string;
  name: string;
  image?: string;
  teamName: string;
  position?: string;
  isAppUser?: boolean;
}

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerImage?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  teamId?: string;
  teamName?: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  teamId?: string;
}

interface Invitation {
  id: string;
  teamId: string;
  invitedBy: string;
  email: string;
  playerName?: string;
  status: string;
  createdAt: string;
}

interface PlayerVideo {
  userId: string;
  playerName: string;
  videos: Array<{
    id: string;
    title: string;
    videoUrl: string;
    thumbnailUrl?: string;
    description?: string;
    createdAt: string;
  }>;
}

interface ChatThread {
  id: string;
  name: string;
  mode: string;
  scopeType: string;
  scopeId: string | null;
  createdBy: string;
  createdAt: string;
  memberCount: number;
  lastMessage?: string;
  lastMessageAt?: string;
}

interface ThreadMessage {
  id: string;
  threadId: string;
  senderId: string;
  content: string;
  createdAt: string;
  senderName: string;
  senderImage: string | null;
}

interface PlayerTeam {
  id: string;
  name: string;
  description: string;
  coachName: string;
  joinedAt: string;
}

interface PlayerAssignment {
  id: string;
  drillId: string;
  drillTitle: string;
  teamId: string;
  teamName: string;
  assignedBy: string;
  assignedByName: string;
  dueDate?: string;
  notes?: string;
  status: string;
  createdAt: string;
}

const createGroupSchema = insertTrainerTeamSchema
  .pick({ name: true, description: true })
  .extend({
    name: z.string().min(1, "Group name is required").max(100),
    description: z.string().max(500).optional().default(""),
    ageGroup: z.string().optional().default(""),
  });

const assignDrillSchema = insertDrillAssignmentSchema
  .pick({ drillId: true, teamId: true, notes: true })
  .extend({
    drillId: z.string().min(1, "Select a drill"),
    teamId: z.string().min(1, "Select a group"),
    dueDate: z.string().optional().default(""),
    notes: z.string().max(500).optional().default(""),
  });

const joinTeamSchema = z.object({
  teamCode: z.string().min(1, "Team code is required"),
});
type JoinTeamForm = z.infer<typeof joinTeamSchema>;

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const createTeamSchema = insertTrainerTeamSchema
  .pick({ name: true, description: true })
  .extend({
    name: z.string().min(1, "Team name is required").max(100),
    description: z.string().max(500).optional().default(""),
    seasonYear: z.coerce.number().optional(),
    ageGroup: z.string().optional().default(""),
    position: z.string().optional().default(""),
    level: z.string().optional().default(""),
    playerClass: z.string().optional().default(""),
  });

type CreateTeamForm = z.infer<typeof createTeamSchema>;

type CreateGroupForm = z.infer<typeof createGroupSchema>;
type AssignDrillForm = z.infer<typeof assignDrillSchema>;

const PLAYER_POSITIONS = ["PG", "SG", "SF", "PF", "C", "Guard", "Wing", "Forward", "Bigs"];
const PLAYER_AGES = ["6U", "7U", "8U", "9U", "10U", "11U", "12U", "13U", "14U", "15U", "16U", "17U", "18U", "Adult"];
const TEAM_TYPES = ["None", "Rec", "Club/AAU", "Middle School", "MS - 7th Grade", "MS - 8th Grade", "High School", "HS - Freshman", "HS - JV", "HS - Varsity", "College", "Post Grad", "Pro"];
const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced", "Elite"];
const CLASS_OPTIONS = Array.from({ length: 11 }, (_, i) => String(new Date().getFullYear() + i));
const AGE_GROUP_OPTIONS = ["6U", "7U", "8U", "9U", "10U", "11U", "12U", "13U", "14U", "15U", "16U", "17U", "18U", "Adult"];

const trainerPlayerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional().default(""),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  position: z.string().optional().default(""),
  jerseyNumber: z.string().optional().default(""),
  ageGroup: z.string().optional().default(""),
  teamType: z.string().optional().default(""),
  gradYear: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

type TrainerPlayerForm = z.infer<typeof trainerPlayerSchema>;

interface PlayerDetailAssignment {
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
  createdAt: string;
}

interface PlayerDetailVideo {
  id: string;
  userId: string;
  playerName: string;
  title: string;
  videoUrl: string;
  description: string | null;
  assignmentId: string | null;
  teamName: string;
  createdAt: string | null;
}

interface PlayerDetailMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

function PlayerDetailPanel({ player, open, onClose }: { player: TrainerPlayerData | null; open: boolean; onClose: () => void }) {
  const [detailTab, setDetailTab] = useState("assignments");

  const { data: assignments, isLoading: assignmentsLoading } = useQuery<PlayerDetailAssignment[]>({
    queryKey: ["/api/trainer/players", player?.id, "assignments"],
    enabled: !!player && open,
  });

  const { data: videos, isLoading: videosLoading } = useQuery<PlayerDetailVideo[]>({
    queryKey: ["/api/trainer/players", player?.id, "videos"],
    enabled: !!player && open,
  });

  const { data: chatMessages, isLoading: messagesLoading } = useQuery<PlayerDetailMessage[]>({
    queryKey: ["/api/trainer/players", player?.id, "messages"],
    enabled: !!player && open,
  });

  if (!player) return null;

  const statusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-500";
      case "in-progress": return "text-yellow-500";
      default: return "text-muted-foreground";
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "in-progress": return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto" data-testid="sheet-player-detail">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2" data-testid="text-player-detail-name">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {(player.firstName?.[0] || '') + (player.lastName?.[0] || '')}
              </AvatarFallback>
            </Avatar>
            <div>
              <span>{player.firstName} {player.lastName || ""}</span>
              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                {player.position && <Badge variant="outline" className="no-default-hover-elevate text-[10px]">{player.position}</Badge>}
                {player.jerseyNumber && <span className="text-[10px] font-mono text-muted-foreground">#{player.jerseyNumber}</span>}
                {player.gradYear && <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">Class of {player.gradYear}</Badge>}
              </div>
            </div>
          </SheetTitle>
          <SheetDescription className="sr-only">Player detail view</SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          <Tabs value={detailTab} onValueChange={setDetailTab}>
            <TabsList className="w-full" data-testid="tabs-player-detail">
              <TabsTrigger value="assignments" className="flex-1 text-xs" data-testid="tab-player-assignments">
                <ClipboardList className="w-3 h-3 mr-1" />
                Drills ({assignments?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="videos" className="flex-1 text-xs" data-testid="tab-player-videos">
                <Video className="w-3 h-3 mr-1" />
                Videos ({videos?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex-1 text-xs" data-testid="tab-player-chat">
                <MessageCircle className="w-3 h-3 mr-1" />
                Chat ({chatMessages?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assignments" className="mt-3 space-y-2">
              {assignmentsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !assignments?.length ? (
                <div className="py-8 text-center text-muted-foreground">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No drills assigned yet.</p>
                </div>
              ) : (
                assignments.map((a) => (
                  <Card key={a.id} data-testid={`card-player-assignment-${a.id}`}>
                    <CardContent className="py-3">
                      <div className="flex items-start gap-2">
                        {statusIcon(a.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" data-testid={`text-assignment-title-${a.id}`}>{a.drillTitle}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">{a.drillCategory}</Badge>
                            <span className={`text-xs capitalize ${statusColor(a.status)}`} data-testid={`text-assignment-status-${a.id}`}>{a.status}</span>
                            {a.teamName && (
                              <span className="text-xs text-muted-foreground">{a.teamName}</span>
                            )}
                            {a.assignedTo && !a.teamId && (
                              <Badge variant="outline" className="no-default-hover-elevate text-[10px]">Direct</Badge>
                            )}
                          </div>
                          {a.dueDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              Due: {new Date(a.dueDate).toLocaleDateString()}
                            </p>
                          )}
                          {a.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">{a.notes}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="videos" className="mt-3 space-y-2">
              {videosLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !videos?.length ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No shared videos yet.</p>
                </div>
              ) : (
                videos.map((v) => (
                  <Card key={v.id} data-testid={`card-player-video-${v.id}`}>
                    <CardContent className="py-3">
                      <div className="flex items-start gap-2">
                        <Play className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <a
                            href={v.videoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:underline truncate block"
                            data-testid={`link-player-video-${v.id}`}
                          >
                            {v.title}
                            <ExternalLink className="w-3 h-3 inline ml-1" />
                          </a>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">{v.teamName}</span>
                            <span className="text-xs text-muted-foreground">by {v.playerName}</span>
                          </div>
                          {v.description && (
                            <p className="text-xs text-muted-foreground mt-1">{v.description}</p>
                          )}
                          {v.createdAt && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(v.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="chat" className="mt-3 space-y-2">
              {messagesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : !chatMessages?.length ? (
                <div className="py-8 text-center text-muted-foreground">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No chat history with this player.</p>
                  {!player.linkedUserId && (
                    <p className="text-xs mt-1">This player doesn't have a linked account yet.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {chatMessages.map((msg) => {
                    const isFromCoach = msg.senderId !== player.linkedUserId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isFromCoach ? "justify-end" : "justify-start"}`}
                        data-testid={`message-${msg.id}`}
                      >
                        <div className={`max-w-[80%] rounded-md px-3 py-2 ${isFromCoach ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-[10px] mt-0.5 ${isFromCoach ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {new Date(msg.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RosterTab() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<CoachTeam | null>(null);
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const [removeMember, setRemoveMember] = useState<{ teamId: string; userId: string; name: string } | null>(null);
  const [editingMember, setEditingMember] = useState<RosterMember | null>(null);
  const [editPosition, setEditPosition] = useState("");
  const [editJersey, setEditJersey] = useState("");
  const [newTeamPlayerIds, setNewTeamPlayerIds] = useState<string[]>([]);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [addPlayersOpen, setAddPlayersOpen] = useState(false);
  const [rosterAddPlayerIds, setRosterAddPlayerIds] = useState<string[]>([]);
  const [rosterPlayerSearch, setRosterPlayerSearch] = useState("");
  const [rosterDetailPlayer, setRosterDetailPlayer] = useState<TrainerPlayerData | null>(null);

  const form = useForm<CreateTeamForm>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { name: "", description: "", seasonYear: currentYear, ageGroup: "", position: "", level: "", playerClass: "" },
  });

  const { data: teams, isLoading: teamsLoading } = useQuery<CoachTeam[]>({
    queryKey: ["/api/coach/teams"],
  });

  const { data: members, isLoading: membersLoading } = useQuery<RosterMember[]>({
    queryKey: ["/api/coach/teams", selectedTeam?.id, "members"],
    enabled: !!selectedTeam,
  });

  const { data: allPlayers } = useQuery<TrainerPlayerData[]>({
    queryKey: ["/api/trainer-players"],
  });

  const filteredCreatePlayers = useMemo(() => {
    if (!allPlayers) return [];
    if (!playerSearchQuery) return allPlayers;
    const q = playerSearchQuery.toLowerCase();
    return allPlayers.filter(p => `${p.firstName} ${p.lastName || ""}`.toLowerCase().includes(q));
  }, [allPlayers, playerSearchQuery]);

  const toggleNewTeamPlayer = (playerId: string) => {
    setNewTeamPlayerIds(prev => prev.includes(playerId) ? prev.filter(id => id !== playerId) : [...prev, playerId]);
  };

  const createTeamMutation = useMutation({
    mutationFn: async (data: CreateTeamForm) => {
      const res = await apiRequest("POST", "/api/coach/teams", { ...data, playerIds: newTeamPlayerIds });
      return res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-players"] });
      setCreateOpen(false);
      form.reset();
      setNewTeamPlayerIds([]);
      setPlayerSearchQuery("");
      const assignedCount = result?.assignedPlayers?.length || 0;
      toast({ title: "Team created successfully!", description: assignedCount > 0 ? `${assignedCount} player(s) added to team` : undefined });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create team", description: error.message, variant: "destructive" });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/coach/teams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/teams"] });
      setDeleteTeamId(null);
      if (selectedTeam?.id === deleteTeamId) setSelectedTeam(null);
      toast({ title: "Team deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete team", description: error.message, variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      apiRequest("DELETE", `/api/coach/teams/${teamId}/members/${userId}`),
    onSuccess: () => {
      if (selectedTeam) {
        queryClient.invalidateQueries({ queryKey: ["/api/coach/teams", selectedTeam.id, "members"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/coach/teams"] });
      setRemoveMember(null);
      toast({ title: "Player removed from roster" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove player", description: error.message, variant: "destructive" });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ teamId, userId, position, jerseyNumber }: { teamId: string; userId: string; position: string; jerseyNumber: string }) =>
      apiRequest("PUT", `/api/coach/teams/${teamId}/members/${userId}`, { position, jerseyNumber }),
    onSuccess: () => {
      if (selectedTeam) {
        queryClient.invalidateQueries({ queryKey: ["/api/coach/teams", selectedTeam.id, "members"] });
      }
      setEditingMember(null);
      toast({ title: "Player updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update player", description: error.message, variant: "destructive" });
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: (assignmentId: string) => apiRequest("DELETE", `/api/coach-player-assignments/${assignmentId}`),
    onSuccess: () => {
      if (selectedTeam) {
        queryClient.invalidateQueries({ queryKey: ["/api/coach/teams", selectedTeam.id, "members"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/coach-players"] });
      toast({ title: "Player removed from team" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove player", description: error.message, variant: "destructive" });
    },
  });

  const addPlayersToTeamMutation = useMutation({
    mutationFn: async ({ teamId, playerIds }: { teamId: string; playerIds: string[] }) => {
      for (const playerId of playerIds) {
        await apiRequest("POST", `/api/trainer-players/${playerId}/assign-team`, { teamId });
      }
    },
    onSuccess: () => {
      if (selectedTeam) {
        queryClient.invalidateQueries({ queryKey: ["/api/coach/teams", selectedTeam.id, "members"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/teams"] });
      setAddPlayersOpen(false);
      setRosterAddPlayerIds([]);
      setRosterPlayerSearch("");
      toast({ title: "Players added to team!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add players", description: error.message, variant: "destructive" });
    },
  });

  const availablePlayersForRoster = useMemo(() => {
    if (!allPlayers || !selectedTeam) return [];
    const memberUserIds = new Set(members?.map(m => m.userId) || []);
    const alreadyAssigned = new Set(
      allPlayers.filter(p => (p.teams || []).some(t => t.teamId === selectedTeam.id)).map(p => p.id)
    );
    let available = allPlayers.filter(p => !alreadyAssigned.has(p.id));
    if (rosterPlayerSearch) {
      const q = rosterPlayerSearch.toLowerCase();
      available = available.filter(p => `${p.firstName} ${p.lastName || ""}`.toLowerCase().includes(q));
    }
    return available;
  }, [allPlayers, members, selectedTeam, rosterPlayerSearch]);

  const copyTeamCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Team code copied!" });
  };

  const openEditMember = (member: RosterMember) => {
    setEditingMember(member);
    setEditPosition(member.position || "");
    setEditJersey(member.jerseyNumber || "");
  };

  const saveEditMember = () => {
    if (editingMember && selectedTeam) {
      updateMemberMutation.mutate({
        teamId: selectedTeam.id,
        userId: editingMember.userId,
        position: editPosition,
        jerseyNumber: editJersey,
      });
    }
  };

  const positionOptions = ["PG", "SG", "SF", "PF", "C", "Guard", "Wing", "Forward", "Bigs", "G", "F", "G/F"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold" data-testid="text-roster-heading">Team Roster</h2>
        <Button onClick={() => { form.reset(); setNewTeamPlayerIds([]); setPlayerSearchQuery(""); setCreateOpen(true); }} data-testid="button-create-team">
          <Plus className="w-4 h-4" />
          New Team
        </Button>
      </div>

      {teamsLoading ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
        </div>
      ) : !teams?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-teams">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No teams yet. Create your first team roster to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          {teams.map((team) => (
            <Card
              key={team.id}
              className={`cursor-pointer transition-colors ${selectedTeam?.id === team.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => setSelectedTeam(selectedTeam?.id === team.id ? null : team)}
              data-testid={`card-team-${team.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate" data-testid={`text-team-name-${team.id}`}>{team.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {team.seasonYear && (
                        <Badge variant="secondary" className="no-default-hover-elevate text-xs">
                          {team.seasonYear}-{(team.seasonYear + 1).toString().slice(-2)}
                        </Badge>
                      )}
                      {team.ageGroup && (
                        <Badge variant="outline" className="no-default-hover-elevate text-xs">
                          {team.ageGroup}
                        </Badge>
                      )}
                      {team.position && team.position !== "none" && (
                        <Badge variant="secondary" className="no-default-hover-elevate text-xs">
                          {team.position}
                        </Badge>
                      )}
                      {team.level && team.level !== "none" && (
                        <Badge variant="secondary" className="no-default-hover-elevate text-xs">
                          {team.level}
                        </Badge>
                      )}
                      {team.playerClass && team.playerClass !== "none" && (
                        <Badge variant="secondary" className="no-default-hover-elevate text-xs">
                          {team.playerClass}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); setDeleteTeamId(team.id); }}
                    data-testid={`button-delete-team-${team.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="no-default-hover-elevate font-mono text-xs" data-testid={`badge-team-code-${team.id}`}>
                    {team.teamCode}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); copyTeamCode(team.teamCode); }}
                    data-testid={`button-copy-code-${team.id}`}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Badge variant="secondary" className="no-default-hover-elevate ml-auto" data-testid={`badge-member-count-${team.id}`}>
                    <Users className="w-3 h-3 mr-1" />
                    {team.memberCount}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedTeam && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base" data-testid="text-roster-members-heading">
              Roster - {selectedTeam.name}
              {selectedTeam.seasonYear && ` (${selectedTeam.seasonYear}-${(selectedTeam.seasonYear + 1).toString().slice(-2)})`}
            </CardTitle>
            <Button size="sm" onClick={() => { setRosterAddPlayerIds([]); setRosterPlayerSearch(""); setAddPlayersOpen(true); }} data-testid="button-roster-add-players">
              <UserPlus className="w-4 h-4" />
              Add Players
            </Button>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded" />)}
              </div>
            ) : !members?.length ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-roster-members">
                No players on the roster yet. Add players in the Players tab or share the team code.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 items-center px-2 text-xs font-medium text-muted-foreground">
                  <span className="w-8"></span>
                  <span>Player</span>
                  <span className="w-10 text-center">#</span>
                  <span className="w-12 text-center">Pos</span>
                  <span className="w-16"></span>
                </div>
                {members.map((member) => (
                  <div
                    key={member.userId}
                    className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 items-center p-2 rounded-md bg-muted/50"
                    data-testid={`row-roster-member-${member.userId}`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.profileImageUrl} />
                      <AvatarFallback className="text-xs">
                        {(member.firstName?.[0] || '') + (member.lastName?.[0] || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className="min-w-0 cursor-pointer"
                      onClick={() => {
                        const playerId = member.userId.startsWith("tp_") ? member.userId.slice(3) : member.userId;
                        const found = allPlayers?.find(p => p.id === playerId || p.linkedUserId === member.userId);
                        if (found) {
                          setRosterDetailPlayer(found);
                        } else {
                          const synthPlayer: TrainerPlayerData = {
                            id: member.userId,
                            trainerId: "",
                            firstName: member.firstName,
                            lastName: member.lastName,
                            email: member.email,
                            phone: null,
                            position: member.position || null,
                            jerseyNumber: member.jerseyNumber || null,
                            ageGroup: null,
                            teamType: null,
                            gradYear: null,
                            notes: null,
                            linkedUserId: member.userId,
                            createdAt: member.joinedAt,
                            updatedAt: member.joinedAt,
                            groups: [],
                            teams: [],
                          };
                          setRosterDetailPlayer(synthPlayer);
                        }
                      }}
                      data-testid={`button-roster-view-player-${member.userId}`}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium truncate hover:underline" data-testid={`text-roster-name-${member.userId}`}>
                          {member.firstName} {member.lastName}
                        </p>
                        {member.isCoachPlayer && (
                          <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">Added by coach</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    <span className="w-10 text-center text-sm font-mono" data-testid={`text-jersey-${member.userId}`}>
                      {member.jerseyNumber || "-"}
                    </span>
                    <span className="w-12 text-center">
                      {member.position ? (
                        <Badge variant="outline" className="no-default-hover-elevate text-xs">{member.position}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </span>
                    <div className="w-16 flex items-center gap-1 justify-end">
                      {!member.isCoachPlayer && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditMember(member)}
                          data-testid={`button-edit-member-${member.userId}`}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (member.isCoachPlayer && member.assignmentId) {
                            removeAssignmentMutation.mutate(member.assignmentId);
                          } else {
                            setRemoveMember({ teamId: selectedTeam.id, userId: member.userId, name: `${member.firstName} ${member.lastName}` });
                          }
                        }}
                        data-testid={`button-remove-member-${member.userId}`}
                      >
                        <UserMinus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={addPlayersOpen} onOpenChange={setAddPlayersOpen}>
        <DialogContent data-testid="dialog-roster-add-players">
          <DialogHeader>
            <DialogTitle>Add Players to {selectedTeam?.name}</DialogTitle>
            <DialogDescription>Select players to add to this team roster.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {allPlayers && allPlayers.length > 5 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input
                  value={rosterPlayerSearch}
                  onChange={(e) => setRosterPlayerSearch(e.target.value)}
                  placeholder="Search players..."
                  className="pl-8"
                  data-testid="input-roster-player-search"
                />
              </div>
            )}
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {availablePlayersForRoster.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {allPlayers?.length ? "All players are already on this team." : "No players created yet. Add players in the Players tab first."}
                </p>
              ) : (
                availablePlayersForRoster.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between gap-2 p-2 rounded-md border cursor-pointer ${rosterAddPlayerIds.includes(player.id) ? "border-primary bg-primary/10" : "hover-elevate"}`}
                    onClick={() => setRosterAddPlayerIds(prev => prev.includes(player.id) ? prev.filter(id => id !== player.id) : [...prev, player.id])}
                    data-testid={`button-roster-pick-player-${player.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{player.firstName} {player.lastName || ""}</span>
                      {player.position && (
                        <Badge variant="outline" className="no-default-hover-elevate text-xs">{player.position}</Badge>
                      )}
                      {player.jerseyNumber && (
                        <span className="text-xs text-muted-foreground">#{player.jerseyNumber}</span>
                      )}
                    </div>
                    {rosterAddPlayerIds.includes(player.id) && (
                      <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => selectedTeam && addPlayersToTeamMutation.mutate({ teamId: selectedTeam.id, playerIds: rosterAddPlayerIds })}
              disabled={rosterAddPlayerIds.length === 0 || addPlayersToTeamMutation.isPending}
              data-testid="button-roster-confirm-add-players"
            >
              {addPlayersToTeamMutation.isPending ? "Adding..." : `Add ${rosterAddPlayerIds.length} Player${rosterAddPlayerIds.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent data-testid="dialog-create-team">
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
            <DialogDescription>Create a new team roster and share the code with your players.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createTeamMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Eagles Varsity" {...field} data-testid="input-team-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="seasonYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Season Year</FormLabel>
                      <FormControl>
                        <Select value={field.value?.toString() || ""} onValueChange={(v) => field.onChange(parseInt(v))}>
                          <SelectTrigger data-testid="select-season-year">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            {yearOptions.map((y) => (
                              <SelectItem key={y} value={y.toString()} data-testid={`option-year-${y}`}>
                                {y}-{(y + 1).toString().slice(-2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ageGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age Group</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={AGE_GROUP_OPTIONS}
                          selected={field.value ? field.value.split(",").map(s => s.trim()).filter(Boolean) : []}
                          onChange={(vals) => field.onChange(vals.join(", "))}
                          placeholder="Select age groups"
                          data-testid="select-age-group"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional team description..." {...field} data-testid="input-team-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={PLAYER_POSITIONS}
                          selected={field.value ? field.value.split(",").map(s => s.trim()).filter(Boolean) : []}
                          onChange={(vals) => field.onChange(vals.join(", "))}
                          placeholder="Select positions"
                          data-testid="select-team-position"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={LEVEL_OPTIONS}
                          selected={field.value ? field.value.split(",").map(s => s.trim()).filter(Boolean) : []}
                          onChange={(vals) => field.onChange(vals.join(", "))}
                          placeholder="Select levels"
                          data-testid="select-team-level"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="playerClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={CLASS_OPTIONS}
                          selected={field.value ? field.value.split(",").map(s => s.trim()).filter(Boolean) : []}
                          onChange={(vals) => field.onChange(vals.join(", "))}
                          placeholder="Select classes"
                          data-testid="select-team-class"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {allPlayers && allPlayers.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Add Players (optional)</label>
                  {allPlayers.length > 5 && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input
                        value={playerSearchQuery}
                        onChange={(e) => setPlayerSearchQuery(e.target.value)}
                        placeholder="Search players..."
                        className="pl-8 h-8 text-sm"
                        data-testid="input-team-player-search"
                      />
                    </div>
                  )}
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {filteredCreatePlayers.map((player) => (
                      <div
                        key={player.id}
                        className={`flex items-center justify-between gap-2 p-2 rounded-md border cursor-pointer ${newTeamPlayerIds.includes(player.id) ? "border-primary bg-primary/10" : "hover-elevate"}`}
                        onClick={() => toggleNewTeamPlayer(player.id)}
                        data-testid={`button-team-player-pick-${player.id}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-medium truncate">{player.firstName} {player.lastName || ""}</span>
                          {player.position && <Badge variant="outline" className="no-default-hover-elevate text-xs shrink-0">{player.position}</Badge>}
                          {player.jerseyNumber && <span className="text-xs text-muted-foreground shrink-0">#{player.jerseyNumber}</span>}
                        </div>
                        {newTeamPlayerIds.includes(player.id) && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                    ))}
                    {filteredCreatePlayers.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        {playerSearchQuery ? "No matching players." : "No players yet."}
                      </p>
                    )}
                  </div>
                  {newTeamPlayerIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">{newTeamPlayerIds.length} player(s) selected</p>
                  )}
                </div>
              )}
              <DialogFooter>
                <Button type="submit" disabled={createTeamMutation.isPending} data-testid="button-submit-create-team">
                  {createTeamMutation.isPending ? "Creating..." : "Create Team"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent data-testid="dialog-edit-member">
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
            <DialogDescription>
              Update roster details for {editingMember?.firstName} {editingMember?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Position</label>
              <Select value={editPosition} onValueChange={setEditPosition}>
                <SelectTrigger data-testid="select-edit-position">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {positionOptions.map((pos) => (
                    <SelectItem key={pos} value={pos} data-testid={`option-pos-${pos}`}>
                      {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Jersey Number</label>
              <Input
                value={editJersey}
                onChange={(e) => setEditJersey(e.target.value)}
                placeholder="e.g. 23"
                maxLength={3}
                data-testid="input-edit-jersey"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)} data-testid="button-cancel-edit-member">
              Cancel
            </Button>
            <Button onClick={saveEditMember} disabled={updateMemberMutation.isPending} data-testid="button-save-edit-member">
              {updateMemberMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTeamId} onOpenChange={(open) => !open && setDeleteTeamId(null)}>
        <AlertDialogContent data-testid="dialog-delete-team-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the team and its roster. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-team">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTeamId && deleteTeamMutation.mutate(deleteTeamId)}
              data-testid="button-confirm-delete-team"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!removeMember} onOpenChange={(open) => !open && setRemoveMember(null)}>
        <AlertDialogContent data-testid="dialog-remove-member-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Roster?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {removeMember?.name} from the team roster?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove-member">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeMember && removeMemberMutation.mutate(removeMember)}
              data-testid="button-confirm-remove-member"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PlayerDetailPanel
        player={rosterDetailPlayer}
        open={!!rosterDetailPlayer}
        onClose={() => setRosterDetailPlayer(null)}
      />
    </div>
  );
}

function PlayersTab() {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<TrainerPlayerData | null>(null);
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null);
  const [assignPlayerId, setAssignPlayerId] = useState<string | null>(null);
  const [assignTargetType, setAssignTargetType] = useState<"team" | "group">("group");
  const [assignGroupId, setAssignGroupId] = useState("");
  const [assignTeamId, setAssignTeamId] = useState("");
  const [assignPosition, setAssignPosition] = useState("");
  const [assignJersey, setAssignJersey] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [bulkAssignTeamOpen, setBulkAssignTeamOpen] = useState(false);
  const [bulkAssignGroupOpen, setBulkAssignGroupOpen] = useState(false);
  const [bulkTeamId, setBulkTeamId] = useState("");
  const [bulkGroupId, setBulkGroupId] = useState("");
  const [newPlayerTeamIds, setNewPlayerTeamIds] = useState<string[]>([]);
  const [detailPlayer, setDetailPlayer] = useState<TrainerPlayerData | null>(null);

  const addForm = useForm<TrainerPlayerForm>({
    resolver: zodResolver(trainerPlayerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", position: "", jerseyNumber: "", ageGroup: "", teamType: "", gradYear: "", notes: "" },
  });

  const editForm = useForm<TrainerPlayerForm>({
    resolver: zodResolver(trainerPlayerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", position: "", jerseyNumber: "", ageGroup: "", teamType: "", gradYear: "", notes: "" },
  });

  const { data: players, isLoading: playersLoading } = useQuery<TrainerPlayerData[]>({
    queryKey: ["/api/trainer-players"],
  });

  const { data: groups } = useQuery<TrainerGroup[]>({
    queryKey: ["/api/trainer/groups"],
  });

  const { data: teams } = useQuery<CoachTeam[]>({
    queryKey: ["/api/coach/teams"],
  });

  const createPlayerMutation = useMutation({
    mutationFn: async (data: TrainerPlayerForm) => {
      const res = await apiRequest("POST", "/api/trainer-players", { ...data, teamIds: newPlayerTeamIds });
      return res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/teams"] });
      setAddOpen(false);
      addForm.reset();
      setNewPlayerTeamIds([]);
      const parts: string[] = [];
      if (result?.autoAssignedTeams?.length) parts.push(`Teams: ${result.autoAssignedTeams.join(", ")}`);
      if (result?.autoAssignedGroups?.length) parts.push(`Groups: ${result.autoAssignedGroups.join(", ")}`);
      toast({ title: "Player added successfully!", description: parts.length ? `Assigned to ${parts.join(" | ")}` : undefined });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add player", description: error.message, variant: "destructive" });
    },
  });

  const updatePlayerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TrainerPlayerForm }) => {
      const res = await apiRequest("PUT", `/api/trainer-players/${id}`, data);
      return res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups"] });
      setEditingPlayer(null);
      const autoGroups = result?.autoAssignedGroups;
      if (autoGroups?.length) {
        toast({ title: "Player updated!", description: `Auto-assigned to: ${autoGroups.join(", ")}` });
      } else {
        toast({ title: "Player updated successfully!" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update player", description: error.message, variant: "destructive" });
    },
  });

  const deletePlayerMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/trainer-players/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-players"] });
      setDeletePlayerId(null);
      toast({ title: "Player deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete player", description: error.message, variant: "destructive" });
    },
  });

  const assignPlayerToGroupMutation = useMutation({
    mutationFn: ({ playerId, groupId, position, jerseyNumber }: { playerId: string; groupId: string; position?: string; jerseyNumber?: string }) =>
      apiRequest("POST", `/api/trainer-players/${playerId}/assign`, { groupId, position: position || undefined, jerseyNumber: jerseyNumber || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-players"] });
      setAssignPlayerId(null);
      setAssignGroupId("");
      setAssignPosition("");
      setAssignJersey("");
      toast({ title: "Player assigned to group!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign player", description: error.message, variant: "destructive" });
    },
  });

  const assignPlayerToTeamMutation = useMutation({
    mutationFn: ({ playerId, teamId, position, jerseyNumber }: { playerId: string; teamId: string; position?: string; jerseyNumber?: string }) =>
      apiRequest("POST", `/api/trainer-players/${playerId}/assign-team`, { teamId, position: position || undefined, jerseyNumber: jerseyNumber || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-players"] });
      setAssignPlayerId(null);
      setAssignTeamId("");
      setAssignPosition("");
      setAssignJersey("");
      toast({ title: "Player assigned to team!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign player", description: error.message, variant: "destructive" });
    },
  });

  const bulkAssignToGroupMutation = useMutation({
    mutationFn: ({ playerIds, groupId }: { playerIds: string[]; groupId: string }) =>
      apiRequest("POST", "/api/trainer-players/bulk-assign", { playerIds, groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-players"] });
      setBulkAssignGroupOpen(false);
      setBulkGroupId("");
      setSelectedPlayerIds(new Set());
      toast({ title: "Players assigned to group!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign players", description: error.message, variant: "destructive" });
    },
  });

  const bulkAssignToTeamMutation = useMutation({
    mutationFn: ({ playerIds, teamId }: { playerIds: string[]; teamId: string }) =>
      apiRequest("POST", "/api/trainer-players/bulk-assign-team", { playerIds, teamId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-players"] });
      setBulkAssignTeamOpen(false);
      setBulkTeamId("");
      setSelectedPlayerIds(new Set());
      toast({ title: "Players assigned to team!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign players", description: error.message, variant: "destructive" });
    },
  });

  const removeGroupAssignmentMutation = useMutation({
    mutationFn: (assignmentId: string) => apiRequest("DELETE", `/api/trainer-player-assignments/${assignmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-players"] });
      toast({ title: "Player removed from group" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove assignment", description: error.message, variant: "destructive" });
    },
  });

  const removeTeamAssignmentMutation = useMutation({
    mutationFn: (assignmentId: string) => apiRequest("DELETE", `/api/player-team-assignments/${assignmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-players"] });
      toast({ title: "Player removed from team" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove assignment", description: error.message, variant: "destructive" });
    },
  });

  const filteredPlayers = useMemo(() => {
    if (!players) return [];
    return players.filter((p) => {
      const nameMatch = !searchQuery || `${p.firstName} ${p.lastName || ""}`.toLowerCase().includes(searchQuery.toLowerCase());
      const posGroupMap: Record<string, string[]> = {
        "Guard": ["PG", "SG", "Guard"],
        "Wing": ["SG", "SF", "Wing"],
        "Forward": ["SF", "PF", "Forward"],
        "Bigs": ["PF", "C", "Bigs"],
      };
      const posMatch = positionFilter === "all" || p.position === positionFilter || (posGroupMap[positionFilter]?.includes(p.position || "")) || (p.position && posGroupMap[p.position]?.includes(positionFilter));
      const teamMatch = teamFilter === "all" || (p.teams || []).some(t => t.teamId === teamFilter);
      const groupMatch = groupFilter === "all" || p.groups.some(g => g.groupId === groupFilter);
      const ageMatch = ageFilter === "all" || p.ageGroup === ageFilter;
      const levelMatch = levelFilter === "all" || p.groups.some(g => {
        const group = groups?.find(gr => gr.id === g.groupId);
        return group?.level?.split(",").map(s => s.trim()).includes(levelFilter);
      }) || (p.teams || []).some(t => {
        const team = teams?.find(tm => tm.id === t.teamId);
        return team?.level?.split(",").map(s => s.trim()).includes(levelFilter);
      });
      const classMatch = classFilter === "all" || (p.gradYear && String(p.gradYear) === classFilter) || p.groups.some(g => {
        const group = groups?.find(gr => gr.id === g.groupId);
        return group?.playerClass?.split(",").map(s => s.trim()).includes(classFilter);
      }) || (p.teams || []).some(t => {
        const team = teams?.find(tm => tm.id === t.teamId);
        return team?.playerClass?.split(",").map(s => s.trim()).includes(classFilter);
      });
      return nameMatch && posMatch && teamMatch && groupMatch && ageMatch && levelMatch && classMatch;
    });
  }, [players, groups, teams, searchQuery, positionFilter, teamFilter, groupFilter, ageFilter, levelFilter, classFilter]);

  const allSelected = filteredPlayers.length > 0 && filteredPlayers.every((p) => selectedPlayerIds.has(p.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedPlayerIds(new Set());
    } else {
      setSelectedPlayerIds(new Set(filteredPlayers.map((p) => p.id)));
    }
  };

  const togglePlayer = (id: string) => {
    const next = new Set(selectedPlayerIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedPlayerIds(next);
  };

  const openEditPlayer = (player: TrainerPlayerData) => {
    setEditingPlayer(player);
    editForm.reset({
      firstName: player.firstName,
      lastName: player.lastName || "",
      email: player.email || "",
      phone: player.phone || "",
      position: player.position || "",
      jerseyNumber: player.jerseyNumber || "",
      ageGroup: player.ageGroup || "",
      teamType: player.teamType || "",
      gradYear: player.gradYear ? String(player.gradYear) : "",
      notes: player.notes || "",
    });
  };

  const handleAssignSubmit = () => {
    if (!assignPlayerId) return;
    if (assignTargetType === "team") {
      assignPlayerToTeamMutation.mutate({ playerId: assignPlayerId, teamId: assignTeamId, position: assignPosition, jerseyNumber: assignJersey });
    } else {
      assignPlayerToGroupMutation.mutate({ playerId: assignPlayerId, groupId: assignGroupId, position: assignPosition, jerseyNumber: assignJersey });
    }
  };

  const assignDisabled = assignTargetType === "team"
    ? (!assignTeamId || assignPlayerToTeamMutation.isPending)
    : (!assignGroupId || assignPlayerToGroupMutation.isPending);

  const assignPending = assignTargetType === "team" ? assignPlayerToTeamMutation.isPending : assignPlayerToGroupMutation.isPending;

  const toggleNewPlayerTeam = (teamId: string) => {
    setNewPlayerTeamIds(prev => prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]);
  };

  const renderPlayerForm = (form: ReturnType<typeof useForm<TrainerPlayerForm>>, onSubmit: (data: TrainerPlayerForm) => void, isPending: boolean, submitLabel: string, options?: { showTeamPicker?: boolean }) => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="First name" {...field} data-testid="input-player-first-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Last name" {...field} data-testid="input-player-last-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="email@example.com" type="email" {...field} data-testid="input-player-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="Phone number" {...field} data-testid="input-player-phone" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Position</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-player-position">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAYER_POSITIONS.map((pos) => (
                        <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="jerseyNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jersey #</FormLabel>
                <FormControl>
                  <Input placeholder="#" maxLength={3} {...field} data-testid="input-player-jersey" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ageGroup"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-player-age">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAYER_AGES.map((age) => (
                        <SelectItem key={age} value={age}>{age}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="teamType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Team Type</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-player-team-type">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_TYPES.map((tt) => (
                        <SelectItem key={tt} value={tt}>{tt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gradYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Class (Grad Year)</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-player-grad-year">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {CLASS_OPTIONS.map((yr) => (
                        <SelectItem key={yr} value={yr}>{yr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Optional notes..." {...field} data-testid="input-player-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {options?.showTeamPicker && teams && teams.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Assign to Teams (optional)</label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className={`flex items-center justify-between gap-2 p-2 rounded-md border cursor-pointer ${newPlayerTeamIds.includes(team.id) ? "border-primary bg-primary/10" : "hover-elevate"}`}
                  onClick={() => toggleNewPlayerTeam(team.id)}
                  data-testid={`button-player-team-pick-${team.id}`}
                >
                  <span className="text-sm truncate">{team.name}{team.seasonYear ? ` (${team.seasonYear})` : ""}{team.ageGroup ? ` - ${team.ageGroup}` : ""}</span>
                  {newPlayerTeamIds.includes(team.id) && <Check className="w-4 h-4 text-primary shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button type="submit" disabled={isPending} data-testid="button-submit-player">
            {isPending ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold" data-testid="text-players-heading">Players</h2>
        <Button onClick={() => { addForm.reset(); setNewPlayerTeamIds([]); setAddOpen(true); }} data-testid="button-add-player">
          <Plus className="w-4 h-4" />
          Add Player
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players..."
            className="pl-9"
            data-testid="input-search-players"
          />
        </div>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-team">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams?.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}{t.seasonYear ? ` (${t.seasonYear})` : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-filter-group">
            <SelectValue placeholder="All Groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {groups?.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}{g.ageGroup ? ` (${g.ageGroup})` : ""}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-filter-position">
            <SelectValue placeholder="All Positions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            {PLAYER_POSITIONS.map((pos) => (
              <SelectItem key={pos} value={pos}>{pos}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ageFilter} onValueChange={setAgeFilter}>
          <SelectTrigger className="w-[120px]" data-testid="select-filter-age">
            <SelectValue placeholder="All Ages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ages</SelectItem>
            {PLAYER_AGES.map((age) => (
              <SelectItem key={age} value={age}>{age}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-filter-level">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {LEVEL_OPTIONS.map((lvl) => (
              <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-filter-class">
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {CLASS_OPTIONS.map((cls) => (
              <SelectItem key={cls} value={cls}>{cls}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredPlayers.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleSelectAll}
              data-testid="checkbox-select-all-players"
            />
            <span className="text-sm text-muted-foreground">Select All</span>
          </div>
          {selectedPlayerIds.size > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkAssignTeamOpen(true)}
                data-testid="button-bulk-assign-team"
              >
                <Shield className="w-4 h-4" />
                Assign {selectedPlayerIds.size} to Team
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkAssignGroupOpen(true)}
                data-testid="button-bulk-assign-group"
              >
                <Users className="w-4 h-4" />
                Assign {selectedPlayerIds.size} to Group
              </Button>
            </>
          )}
        </div>
      )}

      {playersLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : !players?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-players">
            <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No players yet. Add your first player to get started!</p>
          </CardContent>
        </Card>
      ) : !filteredPlayers.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-matching-players">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No players match your search criteria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredPlayers.map((player) => (
            <Card key={player.id} data-testid={`card-player-${player.id}`}>
              <CardContent className="py-3">
                <div className="flex items-start gap-3">
                  <div className="pt-1">
                    <Checkbox
                      checked={selectedPlayerIds.has(player.id)}
                      onCheckedChange={() => togglePlayer(player.id)}
                      data-testid={`checkbox-player-${player.id}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailPlayer(player)} data-testid={`button-view-player-${player.id}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium hover:underline" data-testid={`text-player-name-${player.id}`}>
                        {player.firstName} {player.lastName || ""}
                      </p>
                      {player.position && (
                        <Badge variant="outline" className="no-default-hover-elevate text-xs" data-testid={`badge-player-position-${player.id}`}>
                          {player.position}
                        </Badge>
                      )}
                      {player.jerseyNumber && (
                        <span className="text-xs font-mono text-muted-foreground" data-testid={`text-player-jersey-${player.id}`}>
                          #{player.jerseyNumber}
                        </span>
                      )}
                      {player.ageGroup && (
                        <Badge variant="secondary" className="no-default-hover-elevate text-xs" data-testid={`badge-player-age-${player.id}`}>
                          Age {player.ageGroup}
                        </Badge>
                      )}
                      {player.teamType && player.teamType !== "None" && (
                        <Badge variant="secondary" className="no-default-hover-elevate text-xs" data-testid={`badge-player-team-type-${player.id}`}>
                          {player.teamType}
                        </Badge>
                      )}
                      {player.gradYear && (
                        <Badge variant="secondary" className="no-default-hover-elevate text-xs" data-testid={`badge-player-grad-year-${player.id}`}>
                          Class of {player.gradYear}
                        </Badge>
                      )}
                    </div>
                    {player.email && (
                      <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-player-email-${player.id}`}>{player.email}</p>
                    )}
                    {(player.teams || []).length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">Teams:</span>
                        {(player.teams || []).map((t) => (
                          <Badge
                            key={t.id}
                            variant="default"
                            className="no-default-hover-elevate text-xs cursor-pointer"
                            data-testid={`badge-player-team-${t.id}`}
                            onClick={() => removeTeamAssignmentMutation.mutate(t.id)}
                            title={`Click to remove from ${t.teamName}`}
                          >
                            {t.teamName}{t.seasonYear ? ` (${t.seasonYear}-${(t.seasonYear + 1).toString().slice(-2)})` : ""}{t.ageGroup ? ` - ${t.ageGroup}` : ""}
                            <Trash2 className="w-2.5 h-2.5 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    )}
                    {player.groups.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">Groups:</span>
                        {player.groups.map((g) => (
                          <Badge
                            key={g.id}
                            variant="default"
                            className="no-default-hover-elevate text-xs cursor-pointer bg-secondary text-secondary-foreground"
                            data-testid={`badge-player-group-${g.id}`}
                            onClick={() => removeGroupAssignmentMutation.mutate(g.id)}
                            title={`Click to remove from ${g.groupName}`}
                          >
                            {g.groupName}{g.ageGroup ? ` - ${g.ageGroup}` : ""}
                            <Trash2 className="w-2.5 h-2.5 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setAssignPlayerId(player.id);
                        setAssignTargetType("group");
                        setAssignGroupId("");
                        setAssignTeamId("");
                        setAssignPosition("");
                        setAssignJersey("");
                      }}
                      data-testid={`button-assign-player-${player.id}`}
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditPlayer(player)}
                      data-testid={`button-edit-player-${player.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeletePlayerId(player.id)}
                      data-testid={`button-delete-player-${player.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[85vh] flex flex-col" data-testid="dialog-add-player">
          <DialogHeader>
            <DialogTitle>Add Player</DialogTitle>
            <DialogDescription>Add a new player to your roster. You can assign them to teams or groups later.</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1">
            {renderPlayerForm(addForm, (data) => createPlayerMutation.mutate(data), createPlayerMutation.isPending, "Add Player", { showTeamPicker: true })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingPlayer} onOpenChange={(open) => { if (!open) setEditingPlayer(null); }}>
        <DialogContent className="max-h-[85vh] flex flex-col" data-testid="dialog-edit-player">
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
            <DialogDescription>Update player information.</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1">
            {editingPlayer && renderPlayerForm(editForm, (data) => updatePlayerMutation.mutate({ id: editingPlayer.id, data }), updatePlayerMutation.isPending, "Save Changes")}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignPlayerId} onOpenChange={(open) => { if (!open) setAssignPlayerId(null); }}>
        <DialogContent data-testid="dialog-assign-player">
          <DialogHeader>
            <DialogTitle>Assign Player</DialogTitle>
            <DialogDescription>Choose a team or group, and optionally set position and jersey number.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assign to</label>
              <Select value={assignTargetType} onValueChange={(v) => setAssignTargetType(v as "team" | "group")}>
                <SelectTrigger data-testid="select-assign-target-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {assignTargetType === "team" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Team</label>
                <Select value={assignTeamId} onValueChange={setAssignTeamId}>
                  <SelectTrigger data-testid="select-assign-team">
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams?.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}{team.seasonYear ? ` (${team.seasonYear}-${(team.seasonYear + 1).toString().slice(-2)})` : ""}{team.ageGroup ? ` - ${team.ageGroup}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Group</label>
                <Select value={assignGroupId} onValueChange={setAssignGroupId}>
                  <SelectTrigger data-testid="select-assign-group">
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups?.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}{group.ageGroup ? ` (${group.ageGroup})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Position (optional)</label>
                <Select value={assignPosition} onValueChange={setAssignPosition}>
                  <SelectTrigger data-testid="select-assign-position">
                    <SelectValue placeholder="Position" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAYER_POSITIONS.map((pos) => (
                      <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Jersey # (optional)</label>
                <Input
                  value={assignJersey}
                  onChange={(e) => setAssignJersey(e.target.value)}
                  placeholder="#"
                  maxLength={3}
                  data-testid="input-assign-jersey"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleAssignSubmit}
                disabled={assignDisabled}
                data-testid="button-confirm-assign"
              >
                {assignPending ? "Assigning..." : "Assign"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkAssignTeamOpen} onOpenChange={setBulkAssignTeamOpen}>
        <DialogContent data-testid="dialog-bulk-assign-team">
          <DialogHeader>
            <DialogTitle>Bulk Assign to Team</DialogTitle>
            <DialogDescription>Assign {selectedPlayerIds.size} selected player(s) to a team.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Team</label>
              <Select value={bulkTeamId} onValueChange={setBulkTeamId}>
                <SelectTrigger data-testid="select-bulk-team">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}{team.seasonYear ? ` (${team.seasonYear}-${(team.seasonYear + 1).toString().slice(-2)})` : ""}{team.ageGroup ? ` - ${team.ageGroup}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                onClick={() => bulkAssignToTeamMutation.mutate({ playerIds: Array.from(selectedPlayerIds), teamId: bulkTeamId })}
                disabled={!bulkTeamId || bulkAssignToTeamMutation.isPending}
                data-testid="button-confirm-bulk-assign-team"
              >
                {bulkAssignToTeamMutation.isPending ? "Assigning..." : "Assign All"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkAssignGroupOpen} onOpenChange={setBulkAssignGroupOpen}>
        <DialogContent data-testid="dialog-bulk-assign-group">
          <DialogHeader>
            <DialogTitle>Bulk Assign to Group</DialogTitle>
            <DialogDescription>Assign {selectedPlayerIds.size} selected player(s) to a group.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Group</label>
              <Select value={bulkGroupId} onValueChange={setBulkGroupId}>
                <SelectTrigger data-testid="select-bulk-group">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups?.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}{group.ageGroup ? ` (${group.ageGroup})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                onClick={() => bulkAssignToGroupMutation.mutate({ playerIds: Array.from(selectedPlayerIds), groupId: bulkGroupId })}
                disabled={!bulkGroupId || bulkAssignToGroupMutation.isPending}
                data-testid="button-confirm-bulk-assign-group"
              >
                {bulkAssignToGroupMutation.isPending ? "Assigning..." : "Assign All"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletePlayerId} onOpenChange={(open) => !open && setDeletePlayerId(null)}>
        <AlertDialogContent data-testid="dialog-delete-player-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Player?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this player and remove them from all teams and groups. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-player">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePlayerId && deletePlayerMutation.mutate(deletePlayerId)}
              data-testid="button-confirm-delete-player"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PlayerDetailPanel
        player={detailPlayer}
        open={!!detailPlayer}
        onClose={() => setDetailPlayer(null)}
      />
    </div>
  );
}

const DRILL_DIFFICULTIES = ["beginner", "intermediate", "advanced"];

function AssignDrillsTab() {
  const { toast } = useToast();
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignStep, setAssignStep] = useState<"choose" | "drill" | "cohort" | "details">("choose");
  const [assignPath, setAssignPath] = useState<"drill-first" | "cohort-first" | null>(null);
  const [selectedDrill, setSelectedDrill] = useState<DrillItem | null>(null);
  const [assignGroupId, setAssignGroupId] = useState("");
  const [assignTeamId, setAssignTeamId] = useState("");
  const [assignPlayerIds, setAssignPlayerIds] = useState<Set<string>>(new Set());
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [drillSearch, setDrillSearch] = useState("");
  const [drillCategoryFilter, setDrillCategoryFilter] = useState("all");
  const [playerSearch, setPlayerSearch] = useState("");
  const [assignPosFilter, setAssignPosFilter] = useState("all");
  const [assignAgeFilter, setAssignAgeFilter] = useState("all");
  const [assignLevelFilter, setAssignLevelFilter] = useState("all");
  const [assignClassFilter, setAssignClassFilter] = useState("all");
  const [activeCohortAttr, setActiveCohortAttr] = useState<"player" | "team" | "group" | "position" | "age" | "level" | "class" | null>(null);
  const [deleteAssignmentId, setDeleteAssignmentId] = useState<string | null>(null);

  const { data: groups } = useQuery<TrainerGroup[]>({
    queryKey: ["/api/trainer/groups"],
  });

  const { data: coachTeams } = useQuery<CoachTeam[]>({
    queryKey: ["/api/coach/teams"],
  });

  const { data: drills, isLoading: drillsLoading } = useQuery<DrillItem[]>({
    queryKey: ["/api/drills"],
  });

  const { data: myCustomDrills } = useQuery<TrainerDrill[]>({
    queryKey: ["/api/trainer/drills"],
  });

  const allDrills = useMemo(() => {
    const base: DrillItem[] = drills || [];
    const custom: DrillItem[] = (myCustomDrills || []).map(d => ({
      id: d.id,
      title: d.title,
      category: d.category,
      difficulty: d.difficulty,
    }));
    const ids = new Set(base.map(d => d.id));
    return [...base, ...custom.filter(d => !ids.has(d.id))];
  }, [drills, myCustomDrills]);

  const { data: trainerPlayers } = useQuery<TrainerPlayerData[]>({
    queryKey: ["/api/trainer-players"],
  });

  const groupIds = useMemo(() => groups?.map(g => g.id).sort().join(",") || "", [groups]);
  const teamIds = useMemo(() => coachTeams?.map(t => t.id).sort().join(",") || "", [coachTeams]);
  const { data: assignmentsByGroup, isLoading: assignmentsLoading } = useQuery<Record<string, Assignment[]>>({
    queryKey: ["/api/trainer/all-assignments", groupIds, teamIds],
    queryFn: async () => {
      const results: Record<string, Assignment[]> = {};
      const allEntities = [...(groups || []), ...(coachTeams || [])];
      if (!allEntities.length) return {};
      const seen = new Set<string>();
      const unique = allEntities.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
      await Promise.all(unique.map(async (entity) => {
        const res = await fetch(`/api/trainer/groups/${entity.id}/assignments`, { credentials: "include" });
        if (!res.ok) return;
        results[entity.id] = await res.json();
      }));
      return results;
    },
    enabled: !!(groups?.length || coachTeams?.length),
  });

  const flatAssignments = useMemo(() => {
    if (!assignmentsByGroup) return [];
    const all: { assignment: Assignment; groupName: string }[] = [];
    Object.entries(assignmentsByGroup).forEach(([entityId, assigns]) => {
      const group = groups?.find(g => g.id === entityId);
      const team = coachTeams?.find(t => t.id === entityId);
      const name = group?.name || team?.name || "Unknown";
      assigns.forEach(a => all.push({ assignment: a, groupName: name }));
    });
    return all;
  }, [assignmentsByGroup, groups, coachTeams]);

  const filteredAssignments = flatAssignments;

  const assignMutation = useMutation({
    mutationFn: (data: { drillId: string; teamId?: string; assignedTo?: string; dueDate?: string; notes?: string }) =>
      apiRequest("POST", "/api/trainer/assignments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/all-assignments"] });
      groups?.forEach(g => queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups", g.id, "assignments"] }));
      toast({ title: "Drill assigned successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign drill", description: error.message, variant: "destructive" });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/trainer/assignments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/all-assignments"] });
      groups?.forEach(g => queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups", g.id, "assignments"] }));
      setDeleteAssignmentId(null);
      toast({ title: "Assignment removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove assignment", description: error.message, variant: "destructive" });
    },
  });

  const dialogDrills = useMemo(() => {
    return allDrills.filter((d) => {
      if (drillSearch && !d.title.toLowerCase().includes(drillSearch.toLowerCase())) return false;
      if (drillCategoryFilter !== "all" && d.category !== drillCategoryFilter) return false;
      return true;
    });
  }, [allDrills, drillSearch, drillCategoryFilter]);

  const cohortPlayers = useMemo(() => {
    if (!trainerPlayers) return [];
    return trainerPlayers.filter(p => {
      const posGroupMap: Record<string, string[]> = {
        "Guard": ["PG", "SG", "Guard"],
        "Wing": ["SG", "SF", "Wing"],
        "Forward": ["SF", "PF", "Forward"],
        "Bigs": ["PF", "C", "Bigs"],
      };
      const posMatch = assignPosFilter === "all" || p.position === assignPosFilter || (posGroupMap[assignPosFilter]?.includes(p.position || "")) || (p.position && posGroupMap[p.position]?.includes(assignPosFilter));
      const ageMatch = assignAgeFilter === "all" || p.ageGroup === assignAgeFilter;
      const groupMatch = !assignGroupId || p.groups.some(g => g.groupId === assignGroupId);
      const teamMatch = !assignTeamId || p.teams.some(t => t.teamId === assignTeamId);
      const levelMatch = assignLevelFilter === "all" || p.groups.some(g => {
        const group = groups?.find(gr => gr.id === g.groupId);
        const levels = group?.level?.split(",").map(s => s.trim()) ?? [];
        return levels.includes(assignLevelFilter);
      });
      const classMatch = assignClassFilter === "all" || (p.gradYear && String(p.gradYear) === assignClassFilter) || p.groups.some(g => {
        const group = groups?.find(gr => gr.id === g.groupId);
        const classes = group?.playerClass?.split(",").map(s => s.trim()) ?? [];
        return classes.includes(assignClassFilter);
      }) || (p.teams || []).some(t => {
        const team = coachTeams?.find(tm => tm.id === t.teamId);
        return team?.playerClass?.split(",").map(s => s.trim()).includes(assignClassFilter);
      });
      return posMatch && ageMatch && groupMatch && teamMatch && levelMatch && classMatch;
    });
  }, [trainerPlayers, groups, coachTeams, assignGroupId, assignTeamId, assignPosFilter, assignAgeFilter, assignLevelFilter, assignClassFilter]);

  const visibleCohortPlayers = useMemo(() => {
    if (!playerSearch) return cohortPlayers;
    return cohortPlayers.filter(p => {
      const name = `${p.firstName} ${p.lastName || ""}`.toLowerCase();
      return name.includes(playerSearch.toLowerCase());
    });
  }, [cohortPlayers, playerSearch]);

  const hasAnyAttrFilter = assignPosFilter !== "all" || assignAgeFilter !== "all" || assignLevelFilter !== "all" || assignClassFilter !== "all";
  const hasAnyFilter = assignGroupId !== "" || assignTeamId !== "" || hasAnyAttrFilter;

  const openAssignDialog = () => {
    setAssignStep("choose");
    setAssignPath(null);
    setSelectedDrill(null);
    setAssignGroupId("");
    setAssignTeamId("");
    setAssignPlayerIds(new Set());
    setAssignDueDate("");
    setAssignNotes("");
    setDrillSearch("");
    setDrillCategoryFilter("all");
    setPlayerSearch("");
    setAssignPosFilter("all");
    setAssignAgeFilter("all");
    setAssignLevelFilter("all");
    setAssignClassFilter("all");
    setActiveCohortAttr(null);
    setAssignOpen(true);
  };

  const handleAssignSubmit = async () => {
    if (!selectedDrill) return;
    if (assignPlayerIds.size > 0) {
      for (const playerId of Array.from(assignPlayerIds)) {
        await assignMutation.mutateAsync({
          drillId: selectedDrill.id,
          assignedTo: playerId,
          dueDate: assignDueDate || undefined,
          notes: assignNotes || undefined,
        });
      }
    } else if (assignGroupId && !assignTeamId && !hasAnyAttrFilter) {
      await assignMutation.mutateAsync({
        drillId: selectedDrill.id,
        teamId: assignGroupId,
        dueDate: assignDueDate || undefined,
        notes: assignNotes || undefined,
      });
    } else if (assignTeamId && !assignGroupId && !hasAnyAttrFilter) {
      await assignMutation.mutateAsync({
        drillId: selectedDrill.id,
        teamId: assignTeamId,
        dueDate: assignDueDate || undefined,
        notes: assignNotes || undefined,
      });
    } else {
      for (const player of cohortPlayers) {
        await assignMutation.mutateAsync({
          drillId: selectedDrill.id,
          assignedTo: player.id,
          dueDate: assignDueDate || undefined,
          notes: assignNotes || undefined,
        });
      }
    }
    setAssignOpen(false);
  };

  const togglePlayer = (id: string) => {
    setAssignPlayerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getStepAfterChoose = (path: "drill-first" | "cohort-first") => {
    setAssignPath(path);
    setAssignStep(path === "drill-first" ? "drill" : "cohort");
  };

  const getNextStep = () => {
    if (assignPath === "drill-first" && assignStep === "drill") setAssignStep("cohort");
    else if (assignPath === "cohort-first" && assignStep === "cohort") setAssignStep("drill");
    else if (assignStep === "drill" || assignStep === "cohort") setAssignStep("details");
  };

  const canGoNext = () => {
    if (assignStep === "drill") return !!selectedDrill;
    if (assignStep === "cohort") {
      if (assignPlayerIds.size > 0) return true;
      if (assignGroupId && !assignTeamId && !hasAnyAttrFilter) return true;
      if (assignTeamId && !assignGroupId && !hasAnyAttrFilter) return true;
      if ((assignGroupId || assignTeamId || hasAnyAttrFilter) && cohortPlayers.length > 0) return true;
      return false;
    }
    return false;
  };

  const getSecondStep = () => {
    if (assignPath === "drill-first") return "cohort";
    return "drill";
  };

  const isOnSecondStep = () => {
    if (assignPath === "drill-first" && assignStep === "cohort") return true;
    if (assignPath === "cohort-first" && assignStep === "drill") return true;
    return false;
  };

  const cohortSummary = () => {
    if (assignPlayerIds.size > 0) {
      const names = trainerPlayers?.filter(p => assignPlayerIds.has(p.id)).map(p => `${p.firstName} ${p.lastName || ""}`.trim());
      return names?.join(", ") || "";
    }
    if (assignGroupId && !assignTeamId && !hasAnyAttrFilter) {
      const group = groups?.find(g => g.id === assignGroupId);
      return group ? `Group: ${group.name}` : "";
    }
    if (assignTeamId && !assignGroupId && !hasAnyAttrFilter) {
      const team = coachTeams?.find(t => t.id === assignTeamId);
      return team ? `Team: ${team.name}` : "";
    }
    const parts: string[] = [];
    if (assignGroupId) {
      const group = groups?.find(g => g.id === assignGroupId);
      if (group) parts.push(group.name);
    }
    if (assignTeamId) {
      const team = coachTeams?.find(t => t.id === assignTeamId);
      if (team) parts.push(team.name);
    }
    if (assignPosFilter !== "all") parts.push(assignPosFilter);
    if (assignAgeFilter !== "all") parts.push(assignAgeFilter);
    if (assignLevelFilter !== "all") parts.push(assignLevelFilter);
    if (assignClassFilter !== "all") parts.push(assignClassFilter);
    return `${parts.join(" / ")} (${cohortPlayers.length} player${cohortPlayers.length !== 1 ? "s" : ""})`;
  };

  const toggleCohortAttr = (attr: typeof activeCohortAttr) => {
    setActiveCohortAttr(prev => prev === attr ? null : attr);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold" data-testid="text-trainer-assign-heading">Assign Drills</h2>
        <Button onClick={openAssignDialog} data-testid="button-open-trainer-assign">
          <ClipboardList className="w-4 h-4" />
          Assign
        </Button>
      </div>

      <div className="pt-2">
        <h3 className="text-sm font-semibold mb-3" data-testid="text-trainer-current-assignments-heading">Current Assignments</h3>
        {assignmentsLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded" />)}
          </div>
        ) : !filteredAssignments.length ? (
          <p className="text-sm text-muted-foreground" data-testid="text-no-trainer-assignments">
            {!groups?.length && !coachTeams?.length ? "Create a group or team first to assign drills." : "No assignments yet. Hit Assign to get started."}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredAssignments.map(({ assignment, groupName }) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                data-testid={`row-trainer-assignment-${assignment.id}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{assignment.drillTitle}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="default" className="no-default-hover-elevate text-xs">{groupName}</Badge>
                    {assignment.dueDate && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    <Badge
                      variant={assignment.status === "completed" ? "default" : "outline"}
                      className="no-default-hover-elevate text-xs"
                    >
                      {assignment.status}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0"
                  onClick={() => setDeleteAssignmentId(assignment.id)}
                  data-testid={`button-delete-trainer-assignment-${assignment.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-trainer-assign-drill">
          <DialogHeader>
            <DialogTitle>
              {assignStep === "choose" && "Assign a Drill"}
              {assignStep === "drill" && "Select a Drill"}
              {assignStep === "cohort" && "Build Cohort"}
              {assignStep === "details" && "Assignment Details"}
            </DialogTitle>
            <DialogDescription>
              {assignStep === "choose" && "How would you like to start?"}
              {assignStep === "drill" && "Search and pick a drill to assign."}
              {assignStep === "cohort" && "Build your cohort by selecting attributes."}
              {assignStep === "details" && `"${selectedDrill?.title}" → ${cohortSummary()}`}
            </DialogDescription>
          </DialogHeader>

          {assignStep === "choose" && (
            <div className="grid grid-cols-2 gap-3 py-2">
              <div
                className="flex flex-col items-center gap-2 p-4 rounded-md border hover-elevate cursor-pointer"
                onClick={() => getStepAfterChoose("drill-first")}
                data-testid="button-trainer-path-drill-first"
              >
                <ClipboardList className="w-6 h-6" />
                <span className="text-sm font-medium text-center">Start with Drill</span>
                <span className="text-xs text-muted-foreground text-center">Pick a drill, then choose who to assign it to</span>
              </div>
              <div
                className="flex flex-col items-center gap-2 p-4 rounded-md border hover-elevate cursor-pointer"
                onClick={() => getStepAfterChoose("cohort-first")}
                data-testid="button-trainer-path-cohort-first"
              >
                <Users className="w-6 h-6" />
                <span className="text-sm font-medium text-center">Start with Cohort</span>
                <span className="text-xs text-muted-foreground text-center">Build your target group, then choose the drill</span>
              </div>
            </div>
          )}

          {assignStep === "drill" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search drills..."
                    value={drillSearch}
                    onChange={(e) => setDrillSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-trainer-assign-drill-search"
                  />
                </div>
                <Select value={drillCategoryFilter} onValueChange={setDrillCategoryFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="select-trainer-assign-drill-category">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {DRILL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1">
                {drillsLoading ? (
                  <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 rounded" />)}</div>
                ) : dialogDrills.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No drills found</p>
                ) : (
                  dialogDrills.map((drill) => (
                    <div
                      key={drill.id}
                      className={`flex items-center justify-between gap-2 p-2 rounded-md border cursor-pointer ${selectedDrill?.id === drill.id ? "border-primary bg-primary/10" : "hover-elevate"}`}
                      onClick={() => setSelectedDrill(drill)}
                      data-testid={`button-trainer-pick-drill-${drill.id}`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{drill.title}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge variant="outline" className="no-default-hover-elevate text-[10px]">{drill.category}</Badge>
                          <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">{drill.difficulty}</Badge>
                        </div>
                      </div>
                      {selectedDrill?.id === drill.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </div>
                  ))
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAssignStep(assignPath === "drill-first" ? "choose" : "cohort")} data-testid="button-trainer-assign-back">
                  <ArrowLeft className="w-3 h-3" /> Back
                </Button>
                <Button size="sm" disabled={!selectedDrill} onClick={() => { isOnSecondStep() ? setAssignStep("details") : getNextStep(); }} data-testid="button-trainer-assign-next-drill">
                  Next <ArrowRight className="w-3 h-3" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {assignStep === "cohort" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant={activeCohortAttr === "player" ? "default" : (assignPlayerIds.size > 0 ? "secondary" : "outline")} onClick={() => toggleCohortAttr("player")} data-testid="button-trainer-cohort-player">
                  <User className="w-3 h-3" /> Player {assignPlayerIds.size > 0 && `(${assignPlayerIds.size})`}
                </Button>
                <Button size="sm" variant={activeCohortAttr === "team" ? "default" : (assignTeamId ? "secondary" : "outline")} onClick={() => toggleCohortAttr("team")} data-testid="button-trainer-cohort-team">
                  <Shield className="w-3 h-3" /> Team {assignTeamId && coachTeams?.find(t => t.id === assignTeamId) ? `(${coachTeams.find(t => t.id === assignTeamId)!.name})` : ""}
                </Button>
                <Button size="sm" variant={activeCohortAttr === "group" ? "default" : (assignGroupId ? "secondary" : "outline")} onClick={() => toggleCohortAttr("group")} data-testid="button-trainer-cohort-group">
                  <Users className="w-3 h-3" /> Group {assignGroupId && groups?.find(g => g.id === assignGroupId) ? `(${groups.find(g => g.id === assignGroupId)!.name})` : ""}
                </Button>
                <Button size="sm" variant={activeCohortAttr === "position" ? "default" : (assignPosFilter !== "all" ? "secondary" : "outline")} onClick={() => toggleCohortAttr("position")} data-testid="button-trainer-cohort-position">
                  Position {assignPosFilter !== "all" && `(${assignPosFilter})`}
                </Button>
                <Button size="sm" variant={activeCohortAttr === "age" ? "default" : (assignAgeFilter !== "all" ? "secondary" : "outline")} onClick={() => toggleCohortAttr("age")} data-testid="button-trainer-cohort-age">
                  Age {assignAgeFilter !== "all" && `(${assignAgeFilter})`}
                </Button>
                <Button size="sm" variant={activeCohortAttr === "level" ? "default" : (assignLevelFilter !== "all" ? "secondary" : "outline")} onClick={() => toggleCohortAttr("level")} data-testid="button-trainer-cohort-level">
                  Level {assignLevelFilter !== "all" && `(${assignLevelFilter})`}
                </Button>
                <Button size="sm" variant={activeCohortAttr === "class" ? "default" : (assignClassFilter !== "all" ? "secondary" : "outline")} onClick={() => toggleCohortAttr("class")} data-testid="button-trainer-cohort-class">
                  Class {assignClassFilter !== "all" && `(${assignClassFilter})`}
                </Button>
              </div>

              {activeCohortAttr === "group" && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {groups?.map((group) => (
                    <div
                      key={group.id}
                      className={`flex items-center justify-between gap-2 p-2 rounded-md border cursor-pointer ${assignGroupId === group.id ? "border-primary bg-primary/10" : "hover-elevate"}`}
                      onClick={() => setAssignGroupId(prev => prev === group.id ? "" : group.id)}
                      data-testid={`button-cohort-pick-group-${group.id}`}
                    >
                      <span className="text-sm font-medium truncate">{group.name}{group.ageGroup ? ` (${group.ageGroup})` : ""}</span>
                      {assignGroupId === group.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </div>
                  ))}
                  {!groups?.length && <p className="text-xs text-muted-foreground text-center py-2">No groups found.</p>}
                </div>
              )}

              {activeCohortAttr === "team" && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {coachTeams?.map((team) => (
                    <div
                      key={team.id}
                      className={`flex items-center justify-between gap-2 p-2 rounded-md border cursor-pointer ${assignTeamId === team.id ? "border-primary bg-primary/10" : "hover-elevate"}`}
                      onClick={() => setAssignTeamId(prev => prev === team.id ? "" : team.id)}
                      data-testid={`button-cohort-pick-team-${team.id}`}
                    >
                      <span className="text-sm font-medium truncate">{team.name}{team.seasonYear ? ` (${team.seasonYear})` : ""}{team.ageGroup ? ` - ${team.ageGroup}` : ""}</span>
                      {assignTeamId === team.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </div>
                  ))}
                  {!coachTeams?.length && <p className="text-xs text-muted-foreground text-center py-2">No teams found.</p>}
                </div>
              )}

              {activeCohortAttr === "position" && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PLAYER_POSITIONS.map((pos) => (
                    <Button
                      key={pos}
                      size="sm"
                      variant={assignPosFilter === pos ? "default" : "outline"}
                      onClick={() => setAssignPosFilter(prev => prev === pos ? "all" : pos)}
                      data-testid={`button-trainer-cohort-pos-${pos}`}
                    >
                      {pos}
                    </Button>
                  ))}
                </div>
              )}

              {activeCohortAttr === "age" && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PLAYER_AGES.map((age) => (
                    <Button
                      key={age}
                      size="sm"
                      variant={assignAgeFilter === age ? "default" : "outline"}
                      onClick={() => setAssignAgeFilter(prev => prev === age ? "all" : age)}
                      data-testid={`button-trainer-cohort-age-${age}`}
                    >
                      {age}
                    </Button>
                  ))}
                </div>
              )}

              {activeCohortAttr === "level" && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {LEVEL_OPTIONS.map((lvl) => (
                    <Button
                      key={lvl}
                      size="sm"
                      variant={assignLevelFilter === lvl ? "default" : "outline"}
                      onClick={() => setAssignLevelFilter(prev => prev === lvl ? "all" : lvl)}
                      data-testid={`button-trainer-cohort-level-${lvl}`}
                    >
                      {lvl}
                    </Button>
                  ))}
                </div>
              )}

              {activeCohortAttr === "class" && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {CLASS_OPTIONS.map((cls) => (
                    <Button
                      key={cls}
                      size="sm"
                      variant={assignClassFilter === cls ? "default" : "outline"}
                      onClick={() => setAssignClassFilter(prev => prev === cls ? "all" : cls)}
                      data-testid={`button-trainer-cohort-class-${cls}`}
                    >
                      {cls}
                    </Button>
                  ))}
                </div>
              )}

              {activeCohortAttr === "player" && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search players..."
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-trainer-assign-player-search"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {visibleCohortPlayers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">No players found.</p>
                    ) : (
                      visibleCohortPlayers.map((player) => (
                        <div
                          key={player.id}
                          className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer ${assignPlayerIds.has(player.id) ? "border-primary bg-primary/10" : "hover-elevate"}`}
                          onClick={() => togglePlayer(player.id)}
                          data-testid={`button-trainer-pick-player-${player.id}`}
                        >
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarFallback className="text-[10px]">{player.firstName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{player.firstName} {player.lastName || ""}</p>
                            <div className="flex items-center gap-1">
                              {player.position && <Badge variant="outline" className="no-default-hover-elevate text-[10px]">{player.position}</Badge>}
                              {player.groups.length > 0 && (
                                <span className="text-[10px] text-muted-foreground truncate">{player.groups[0].groupName}</span>
                              )}
                            </div>
                          </div>
                          {assignPlayerIds.has(player.id) && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-1">
                {assignPlayerIds.size > 0
                  ? `${assignPlayerIds.size} player${assignPlayerIds.size !== 1 ? "s" : ""} manually selected`
                  : assignGroupId && !hasAnyAttrFilter
                    ? `Entire group: ${groups?.find(g => g.id === assignGroupId)?.name || ""}`
                    : hasAnyFilter || assignGroupId
                      ? `${cohortPlayers.length} player${cohortPlayers.length !== 1 ? "s" : ""} matching`
                      : "Select at least one attribute to build your cohort"}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAssignStep(assignPath === "cohort-first" ? "choose" : "drill")} data-testid="button-trainer-assign-back-cohort">
                  <ArrowLeft className="w-3 h-3" /> Back
                </Button>
                <Button size="sm" disabled={!canGoNext()} onClick={() => { isOnSecondStep() ? setAssignStep("details") : getNextStep(); }} data-testid="button-trainer-assign-next-cohort">
                  Next <ArrowRight className="w-3 h-3" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {assignStep === "details" && (
            <div className="space-y-4">
              <div className="space-y-1 p-3 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{selectedDrill?.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm text-muted-foreground">{cohortSummary()}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date (optional)</label>
                <Input
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  data-testid="input-trainer-due-date"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  placeholder="Any notes for the players..."
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  data-testid="input-trainer-assignment-notes"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAssignStep(getSecondStep() as "drill" | "cohort")} data-testid="button-trainer-assign-back-details">
                  <ArrowLeft className="w-3 h-3" /> Back
                </Button>
                <Button onClick={handleAssignSubmit} disabled={assignMutation.isPending} data-testid="button-submit-trainer-assign">
                  {assignMutation.isPending ? "Assigning..." : "Assign Drill"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAssignmentId} onOpenChange={(open) => !open && setDeleteAssignmentId(null)}>
        <AlertDialogContent data-testid="dialog-delete-trainer-assignment-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the drill assignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-trainer-assignment">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAssignmentId && deleteAssignmentMutation.mutate(deleteAssignmentId)}
              data-testid="button-confirm-delete-trainer-assignment"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TrainingLogsTab() {
  const [groupFilter, setGroupFilter] = useState("all");
  const [playerFilter, setPlayerFilter] = useState("all");
  const [drillFilter, setDrillFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const { data: groups } = useQuery<TrainerGroup[]>({
    queryKey: ["/api/trainer/groups"],
  });

  const { data: logs, isLoading: logsLoading } = useQuery<TrainingLogEntry[]>({
    queryKey: ["/api/trainer/all-training-logs"],
  });

  const uniqueGroups = useMemo(() => {
    if (!logs) return [];
    const seen = new Map<string, { id: string; name: string }>();
    logs.forEach(l => {
      if (l.groupId && l.groupName && !seen.has(l.groupId)) {
        seen.set(l.groupId, { id: l.groupId, name: l.groupName });
      }
    });
    return Array.from(seen.values());
  }, [logs]);

  const uniquePlayers = useMemo(() => {
    if (!logs) return [];
    const seen = new Set<string>();
    logs.forEach(l => seen.add(l.playerName));
    return Array.from(seen).sort();
  }, [logs]);

  const uniqueDrills = useMemo(() => {
    if (!logs) return [];
    const seen = new Set<string>();
    logs.forEach(l => seen.add(l.drillTitle || `Drill ${l.drillId}`));
    return Array.from(seen).sort();
  }, [logs]);

  const uniquePositions = useMemo(() => {
    if (!logs) return [];
    const seen = new Set<string>();
    logs.forEach(l => { if (l.position) seen.add(l.position); });
    return Array.from(seen).sort();
  }, [logs]);

  const uniqueAgeGroups = useMemo(() => {
    if (!logs) return [];
    const seen = new Set<string>();
    logs.forEach(l => { if (l.ageGroup) seen.add(l.ageGroup); });
    return Array.from(seen).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    const now = new Date();
    return logs.filter(l => {
      if (groupFilter !== "all" && l.groupId !== groupFilter) return false;
      if (playerFilter !== "all" && l.playerName !== playerFilter) return false;
      if (positionFilter !== "all" && l.position !== positionFilter) return false;
      if (ageFilter !== "all" && l.ageGroup !== ageFilter) return false;
      const title = l.drillTitle || `Drill ${l.drillId}`;
      if (drillFilter !== "all" && title !== drillFilter) return false;
      if (dateFilter !== "all") {
        const logDate = new Date(l.completedAt);
        if (dateFilter === "today") {
          if (logDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === "week") {
          const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
          if (logDate < weekAgo) return false;
        } else if (dateFilter === "month") {
          const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);
          if (logDate < monthAgo) return false;
        } else if (dateFilter === "year") {
          const yearAgo = new Date(now); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
          if (logDate < yearAgo) return false;
        }
      }
      return true;
    });
  }, [logs, groupFilter, playerFilter, drillFilter, positionFilter, ageFilter, dateFilter]);

  const activeFilterCount = [groupFilter, playerFilter, drillFilter, positionFilter, ageFilter, dateFilter].filter(f => f !== "all").length;

  const clearFilters = () => {
    setGroupFilter("all");
    setPlayerFilter("all");
    setDrillFilter("all");
    setPositionFilter("all");
    setAgeFilter("all");
    setDateFilter("all");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold" data-testid="text-trainer-logs-heading">Player Training Logs</h2>
        {activeFilterCount > 0 && (
          <Button size="sm" variant="ghost" onClick={clearFilters} data-testid="button-clear-trainer-log-filters">
            Clear Filters ({activeFilterCount})
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-trainer-logs-group-filter">
            <SelectValue placeholder="All Groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {uniqueGroups.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={playerFilter} onValueChange={setPlayerFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-trainer-logs-player-filter">
            <SelectValue placeholder="All Players" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Players</SelectItem>
            {uniquePlayers.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={drillFilter} onValueChange={setDrillFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-trainer-logs-drill-filter">
            <SelectValue placeholder="All Drills" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Drills</SelectItem>
            {uniqueDrills.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {uniquePositions.length > 0 && (
          <Select value={positionFilter} onValueChange={setPositionFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-trainer-logs-position-filter">
              <SelectValue placeholder="All Positions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Positions</SelectItem>
              {uniquePositions.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {uniqueAgeGroups.length > 0 && (
          <Select value={ageFilter} onValueChange={setAgeFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-trainer-logs-age-filter">
              <SelectValue placeholder="All Ages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ages</SelectItem>
              {uniqueAgeGroups.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-trainer-logs-date-filter">
            <SelectValue placeholder="All Time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {logsLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : !filteredLogs.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-trainer-logs">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>{!groups?.length ? "Create a group first to view training logs." : logs?.length ? "No logs match your filters." : "No training logs yet from your players."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground" data-testid="text-trainer-logs-count">
            Showing {filteredLogs.length} of {logs?.length || 0} logs
          </p>
          {filteredLogs.map((log) => (
            <Card key={log.id} data-testid={`card-trainer-log-${log.id}`}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-medium" data-testid={`text-log-player-${log.id}`}>
                      {log.playerName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {log.drillTitle || `Drill ${log.drillId}`}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {log.groupName && (
                        <Badge variant="default" className="no-default-hover-elevate text-xs">{log.groupName}</Badge>
                      )}
                      {log.position && (
                        <Badge variant="outline" className="no-default-hover-elevate text-xs">{log.position}</Badge>
                      )}
                      {log.ageGroup && (
                        <Badge variant="secondary" className="no-default-hover-elevate text-xs">{log.ageGroup}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.completedAt).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="no-default-hover-elevate text-xs">
                        {log.duration} min
                      </Badge>
                      {log.score != null && (
                        <Badge variant="secondary" className="no-default-hover-elevate text-xs">
                          Score: {log.score}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {log.notes && (
                  <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">{log.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ChatTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [chatMode, setChatMode] = useState<"direct" | "group">("direct");

  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [selectedContactName, setSelectedContactName] = useState("");
  const [messageText, setMessageText] = useState("");

  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [threadMessageText, setThreadMessageText] = useState("");
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupScopeType, setNewGroupScopeType] = useState<"group" | "position" | "age" | "custom">("group");
  const [newGroupScopeId, setNewGroupScopeId] = useState("");
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<Set<string>>(new Set());
  const [groupMemberSearch, setGroupMemberSearch] = useState("");
  const [deleteThreadId, setDeleteThreadId] = useState<string | null>(null);

  const { data: conversations, isLoading: convsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/messages/conversations"],
    refetchInterval: 10000,
  });

  const { data: contacts } = useQuery<ChatContact[]>({
    queryKey: ["/api/messages/contacts/trainer"],
  });

  const { data: groups } = useQuery<TrainerGroup[]>({
    queryKey: ["/api/trainer/groups"],
  });

  const { data: chatMessages, isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/messages", selectedContact],
    enabled: !!selectedContact,
    refetchInterval: 5000,
  });

  const { data: chatThreads, isLoading: threadsLoading } = useQuery<ChatThread[]>({
    queryKey: ["/api/chat-threads", "trainer"],
    queryFn: async () => {
      const res = await fetch("/api/chat-threads?mode=trainer", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch threads");
      return res.json();
    },
  });

  const { data: threadMessages, isLoading: threadMessagesLoading } = useQuery<ThreadMessage[]>({
    queryKey: ["/api/chat-threads", selectedThread?.id, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/chat-threads/${selectedThread!.id}/messages`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!selectedThread,
    refetchInterval: 5000,
  });

  const { data: groupMembersForScope } = useQuery<PlayerMember[]>({
    queryKey: ["/api/trainer/groups", newGroupScopeId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/trainer/groups/${newGroupScopeId}/members`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: newGroupScopeType === "group" && !!newGroupScopeId,
  });

  const { data: trainerPlayersForChat } = useQuery<TrainerPlayerData[]>({
    queryKey: ["/api/trainer-players"],
  });

  const positionContacts = useMemo(() => {
    if (!contacts || newGroupScopeType !== "position" || !newGroupScopeId) return [];
    return contacts.filter(c => c.position === newGroupScopeId);
  }, [contacts, newGroupScopeType, newGroupScopeId]);

  const ageContacts = useMemo(() => {
    if (!trainerPlayersForChat || newGroupScopeType !== "age" || !newGroupScopeId) return [];
    return trainerPlayersForChat
      .filter(p => p.ageGroup === newGroupScopeId && p.linkedUserId)
      .map(p => ({
        id: p.linkedUserId!,
        name: `${p.firstName} ${p.lastName || ""}`.trim(),
        position: p.position,
      }));
  }, [trainerPlayersForChat, newGroupScopeType, newGroupScopeId]);

  const ageGroups = useMemo(() => {
    if (!trainerPlayersForChat) return [];
    const ageSet = new Set(trainerPlayersForChat.map(p => p.ageGroup).filter(Boolean));
    return Array.from(ageSet) as string[];
  }, [trainerPlayersForChat]);

  const positions = useMemo(() => {
    if (!contacts) return [];
    const posSet = new Set(contacts.map(c => c.position).filter(Boolean));
    return Array.from(posSet) as string[];
  }, [contacts]);

  const groupMemberCandidates = useMemo(() => {
    if (!contacts) return [];
    let candidates = [...contacts];
    if (groupMemberSearch) {
      candidates = candidates.filter(c => c.name.toLowerCase().includes(groupMemberSearch.toLowerCase()));
    }
    return candidates;
  }, [contacts, groupMemberSearch]);

  const autoPopulateMembers = useMemo(() => {
    if (newGroupScopeType === "group" && groupMembersForScope) {
      return groupMembersForScope.filter(m => m.userId).map(m => m.userId);
    }
    if (newGroupScopeType === "position" && positionContacts.length > 0) {
      return positionContacts.map(c => c.id);
    }
    if (newGroupScopeType === "age" && ageContacts.length > 0) {
      return ageContacts.map(c => c.id);
    }
    return [];
  }, [newGroupScopeType, groupMembersForScope, positionContacts, ageContacts]);

  const handleScopeChange = (scopeType: "group" | "position" | "age" | "custom") => {
    setNewGroupScopeType(scopeType);
    setNewGroupScopeId("");
    setNewGroupMemberIds(new Set());
  };

  const handleScopeIdChange = (scopeId: string) => {
    setNewGroupScopeId(scopeId);
    setNewGroupMemberIds(new Set());
  };

  useEffect(() => {
    if (autoPopulateMembers.length > 0 && newGroupScopeId) {
      setNewGroupMemberIds(new Set(autoPopulateMembers));
    }
  }, [autoPopulateMembers, newGroupScopeId]);

  const sendMutation = useMutation({
    mutationFn: (data: { receiverId: string; content: string }) =>
      apiRequest("POST", "/api/messages", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", selectedContact] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/conversations"] });
      setMessageText("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send message", description: error.message, variant: "destructive" });
    },
  });

  const sendThreadMessageMutation = useMutation({
    mutationFn: ({ threadId, content }: { threadId: string; content: string }) =>
      apiRequest("POST", `/api/chat-threads/${threadId}/messages`, { content }),
    onSuccess: () => {
      if (selectedThread) {
        queryClient.invalidateQueries({ queryKey: ["/api/chat-threads", selectedThread.id, "messages"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/chat-threads", "trainer"] });
      setThreadMessageText("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send message", description: error.message, variant: "destructive" });
    },
  });

  const createThreadMutation = useMutation({
    mutationFn: (data: { name: string; mode: string; scopeType: string; scopeId?: string; memberIds: string[] }) =>
      apiRequest("POST", "/api/chat-threads", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-threads", "trainer"] });
      setCreateGroupOpen(false);
      setNewGroupName("");
      setNewGroupScopeType("group");
      setNewGroupScopeId("");
      setNewGroupMemberIds(new Set());
      setGroupMemberSearch("");
      queryClient.invalidateQueries({ queryKey: ["/api/chat-threads", "trainer"] });
      toast({ title: "Group chat created!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create group chat", description: error.message, variant: "destructive" });
    },
  });

  const deleteThreadMutation = useMutation({
    mutationFn: (threadId: string) => apiRequest("DELETE", `/api/chat-threads/${threadId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-threads", "trainer"] });
      setDeleteThreadId(null);
      if (selectedThread?.id === deleteThreadId) setSelectedThread(null);
      toast({ title: "Group chat deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete group chat", description: error.message, variant: "destructive" });
    },
  });

  const handleSend = () => {
    if (!messageText.trim() || !selectedContact) return;
    sendMutation.mutate({ receiverId: selectedContact, content: messageText.trim() });
  };

  const handleThreadSend = () => {
    if (!threadMessageText.trim() || !selectedThread) return;
    sendThreadMessageMutation.mutate({ threadId: selectedThread.id, content: threadMessageText.trim() });
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || newGroupMemberIds.size === 0) return;
    createThreadMutation.mutate({
      name: newGroupName.trim(),
      mode: "trainer",
      scopeType: newGroupScopeType,
      scopeId: newGroupScopeId || undefined,
      memberIds: Array.from(newGroupMemberIds),
    });
  };

  const toggleGroupMember = (id: string) => {
    setNewGroupMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (selectedThread) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setSelectedThread(null)} data-testid="trainer-button-back-to-threads">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate" data-testid="trainer-text-thread-name">{selectedThread.name}</h2>
            <p className="text-xs text-muted-foreground">
              {selectedThread.memberCount} member{selectedThread.memberCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-3">
            <div className="h-64 overflow-y-auto space-y-2 mb-3" data-testid="trainer-thread-messages-container">
              {threadMessagesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
                </div>
              ) : !threadMessages?.length ? (
                <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Start the conversation!</p>
              ) : (
                threadMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
                    data-testid={`trainer-thread-message-${msg.id}`}
                  >
                    <div className={`flex items-end gap-2 max-w-[80%] ${msg.senderId === user?.id ? "flex-row-reverse" : ""}`}>
                      {msg.senderId !== user?.id && (
                        <Avatar className="h-6 w-6 shrink-0">
                          {msg.senderImage && <AvatarImage src={msg.senderImage} />}
                          <AvatarFallback className="text-[10px]">{msg.senderName?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`rounded-lg px-3 py-2 text-sm ${
                          msg.senderId === user?.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {msg.senderId !== user?.id && (
                          <p className="text-[10px] font-medium mb-0.5 opacity-70">{msg.senderName}</p>
                        )}
                        <p>{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${msg.senderId === user?.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={threadMessageText}
                onChange={(e) => setThreadMessageText(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleThreadSend()}
                data-testid="trainer-input-thread-message"
              />
              <Button
                size="icon"
                onClick={handleThreadSend}
                disabled={!threadMessageText.trim() || sendThreadMessageMutation.isPending}
                data-testid="trainer-button-send-thread-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedContact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setSelectedContact(null)} data-testid="button-back-to-conversations">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <h2 className="text-lg font-semibold" data-testid="text-chat-partner-name">{selectedContactName}</h2>
        </div>

        <Card>
          <CardContent className="p-3">
            <div className="h-64 overflow-y-auto space-y-2 mb-3" data-testid="chat-messages-container">
              {messagesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
                </div>
              ) : !chatMessages?.length ? (
                <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Start the conversation!</p>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderId === user?.id ? "justify-end" : "justify-start"}`}
                    data-testid={`chat-message-${msg.id}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                        msg.senderId === user?.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p>{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.senderId === user?.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                data-testid="input-chat-message"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!messageText.trim() || sendMutation.isPending}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={chatMode} onValueChange={(v) => setChatMode(v as "direct" | "group")} data-testid="trainer-tabs-chat-mode">
        <TabsList className="grid w-full grid-cols-2" data-testid="trainer-tabs-chat-mode-list">
          <TabsTrigger value="direct" data-testid="trainer-tab-direct-messages">
            <MessageCircle className="w-4 h-4 mr-1" />
            Direct Messages
          </TabsTrigger>
          <TabsTrigger value="group" data-testid="trainer-tab-group-chats">
            <Users className="w-4 h-4 mr-1" />
            Group Chats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="space-y-4 mt-4">
          <h2 className="text-lg font-semibold" data-testid="text-trainer-chat-heading">Messages</h2>

          {contacts && contacts.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Start a New Conversation</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-3">
                <div className="flex flex-wrap gap-2">
                  {contacts.map((contact) => (
                    <Button
                      key={contact.id}
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedContact(contact.id);
                        setSelectedContactName(contact.name);
                      }}
                      data-testid={`button-start-chat-${contact.id}`}
                    >
                      <MessageCircle className="w-3 h-3" />
                      {contact.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {convsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : !conversations?.length ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-conversations">
                <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No conversations yet. Select a player above to start chatting.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <Card
                  key={conv.partnerId}
                  className="hover-elevate cursor-pointer"
                  onClick={() => {
                    setSelectedContact(conv.partnerId);
                    setSelectedContactName(conv.partnerName);
                  }}
                  data-testid={`card-conversation-${conv.partnerId}`}
                >
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          {conv.partnerImage && <AvatarImage src={conv.partnerImage} />}
                          <AvatarFallback className="text-xs">{conv.partnerName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{conv.partnerName}</p>
                          <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {conv.unreadCount > 0 && (
                          <Badge variant="default" className="no-default-hover-elevate text-xs">{conv.unreadCount}</Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(conv.lastMessageAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="group" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-semibold" data-testid="trainer-text-group-chats-heading">Group Chats</h2>
            <Button size="sm" onClick={() => setCreateGroupOpen(true)} data-testid="trainer-button-new-group-chat">
              <Plus className="w-4 h-4" />
              New Group Chat
            </Button>
          </div>

          {threadsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : !chatThreads?.length ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground" data-testid="trainer-text-no-group-chats">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No group chats yet. Create one to start messaging your players!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {chatThreads.map((thread) => (
                <Card
                  key={thread.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => setSelectedThread(thread)}
                  data-testid={`trainer-card-thread-${thread.id}`}
                >
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" data-testid={`trainer-text-thread-name-${thread.id}`}>{thread.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {thread.lastMessage || "No messages yet"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="no-default-hover-elevate text-xs" data-testid={`trainer-badge-thread-members-${thread.id}`}>
                          <Users className="w-3 h-3 mr-1" />
                          {thread.memberCount}
                        </Badge>
                        {thread.lastMessageAt && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(thread.lastMessageAt).toLocaleDateString()}
                          </span>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); setDeleteThreadId(thread.id); }}
                          data-testid={`trainer-button-delete-thread-${thread.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createGroupOpen} onOpenChange={setCreateGroupOpen}>
        <DialogContent className="max-w-lg" data-testid="trainer-dialog-create-group-chat">
          <DialogHeader>
            <DialogTitle>New Group Chat</DialogTitle>
            <DialogDescription>Create a group chat with your players.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Group Name</label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Training Group Chat"
                data-testid="trainer-input-group-name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Scope Type</label>
              <Select value={newGroupScopeType} onValueChange={(v) => handleScopeChange(v as "group" | "position" | "age" | "custom")}>
                <SelectTrigger data-testid="trainer-select-group-scope-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Team / Group</SelectItem>
                  <SelectItem value="position">Position Group</SelectItem>
                  <SelectItem value="age">Age Group</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newGroupScopeType === "group" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Group</label>
                <Select value={newGroupScopeId} onValueChange={handleScopeIdChange}>
                  <SelectTrigger data-testid="trainer-select-group-scope-group">
                    <SelectValue placeholder="Choose a group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {groups?.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}{g.ageGroup ? ` (${g.ageGroup})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {newGroupScopeType === "position" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Position</label>
                <Select value={newGroupScopeId} onValueChange={handleScopeIdChange}>
                  <SelectTrigger data-testid="trainer-select-group-scope-position">
                    <SelectValue placeholder="Choose a position..." />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {newGroupScopeType === "age" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Age Group</label>
                <Select value={newGroupScopeId} onValueChange={handleScopeIdChange}>
                  <SelectTrigger data-testid="trainer-select-group-scope-age">
                    <SelectValue placeholder="Choose an age group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ageGroups.map((ag) => (
                      <SelectItem key={ag} value={ag}>{ag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-sm font-medium">Members ({newGroupMemberIds.size} selected)</label>
              </div>
              {newGroupScopeType === "custom" && (
                <Input
                  placeholder="Search players..."
                  value={groupMemberSearch}
                  onChange={(e) => setGroupMemberSearch(e.target.value)}
                  data-testid="trainer-input-group-member-search"
                />
              )}
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
                {newGroupScopeType === "custom" ? (
                  groupMemberCandidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No players found.</p>
                  ) : (
                    groupMemberCandidates.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-2 p-1.5 rounded-md"
                        data-testid={`trainer-group-member-option-${contact.id}`}
                      >
                        <Checkbox
                          checked={newGroupMemberIds.has(contact.id)}
                          onCheckedChange={() => toggleGroupMember(contact.id)}
                          data-testid={`trainer-checkbox-group-member-${contact.id}`}
                        />
                        <Avatar className="h-6 w-6 shrink-0">
                          {contact.image && <AvatarImage src={contact.image} />}
                          <AvatarFallback className="text-[10px]">{contact.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{contact.name}</p>
                          <p className="text-[10px] text-muted-foreground">{contact.teamName}</p>
                        </div>
                        {contact.position && (
                          <Badge variant="outline" className="no-default-hover-elevate text-[10px]">{contact.position}</Badge>
                        )}
                      </div>
                    ))
                  )
                ) : newGroupScopeType === "group" && groupMembersForScope ? (
                  groupMembersForScope.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No players in this group.</p>
                  ) : (
                    groupMembersForScope.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center gap-2 p-1.5 rounded-md"
                        data-testid={`trainer-group-member-option-${member.userId}`}
                      >
                        <Checkbox
                          checked={newGroupMemberIds.has(member.userId)}
                          onCheckedChange={() => toggleGroupMember(member.userId)}
                          data-testid={`trainer-checkbox-group-member-${member.userId}`}
                        />
                        <Avatar className="h-6 w-6 shrink-0">
                          {member.profileImageUrl && <AvatarImage src={member.profileImageUrl} />}
                          <AvatarFallback className="text-[10px]">
                            {(member.firstName?.[0] || '') + (member.lastName?.[0] || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{member.firstName} {member.lastName}</p>
                        </div>
                        {member.position && (
                          <Badge variant="outline" className="no-default-hover-elevate text-[10px]">{member.position}</Badge>
                        )}
                      </div>
                    ))
                  )
                ) : newGroupScopeType === "position" ? (
                  positionContacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No players found for this position.</p>
                  ) : (
                    positionContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-2 p-1.5 rounded-md"
                        data-testid={`trainer-group-member-option-${contact.id}`}
                      >
                        <Checkbox
                          checked={newGroupMemberIds.has(contact.id)}
                          onCheckedChange={() => toggleGroupMember(contact.id)}
                          data-testid={`trainer-checkbox-group-member-${contact.id}`}
                        />
                        <Avatar className="h-6 w-6 shrink-0">
                          {contact.image && <AvatarImage src={contact.image} />}
                          <AvatarFallback className="text-[10px]">{contact.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{contact.name}</p>
                          <p className="text-[10px] text-muted-foreground">{contact.teamName}</p>
                        </div>
                      </div>
                    ))
                  )
                ) : newGroupScopeType === "age" ? (
                  ageContacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No linked players found for this age group.</p>
                  ) : (
                    ageContacts.map((ac) => (
                      <div
                        key={ac.id}
                        className="flex items-center gap-2 p-1.5 rounded-md"
                        data-testid={`trainer-group-member-option-${ac.id}`}
                      >
                        <Checkbox
                          checked={newGroupMemberIds.has(ac.id)}
                          onCheckedChange={() => toggleGroupMember(ac.id)}
                          data-testid={`trainer-checkbox-group-member-${ac.id}`}
                        />
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarFallback className="text-[10px]">{ac.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">{ac.name}</p>
                        </div>
                        {ac.position && (
                          <Badge variant="outline" className="no-default-hover-elevate text-[10px]">{ac.position}</Badge>
                        )}
                      </div>
                    ))
                  )
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">Select a scope to see available members.</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || newGroupMemberIds.size === 0 || createThreadMutation.isPending}
                data-testid="trainer-button-create-group-submit"
              >
                {createThreadMutation.isPending ? "Creating..." : "Create Group Chat"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteThreadId} onOpenChange={(open) => !open && setDeleteThreadId(null)}>
        <AlertDialogContent data-testid="trainer-dialog-delete-thread-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group Chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this group chat and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="trainer-button-cancel-delete-thread">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteThreadId && deleteThreadMutation.mutate(deleteThreadId)}
              data-testid="trainer-button-confirm-delete-thread"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface AggregatedVideo {
  id: string;
  userId: string;
  playerName: string;
  title: string;
  videoUrl: string;
  description: string | null;
  assignmentId: string | null;
  createdAt: string;
  groupId: string;
  groupName: string;
  position: string | null;
  ageGroup: string | null;
  playerAge: string | null;
}

function VideosTab() {
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [playerFilter, setPlayerFilter] = useState<string>("all");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [ageFilter, setAgeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const { data: groups } = useQuery<TrainerGroup[]>({
    queryKey: ["/api/trainer/groups"],
  });

  const { data: allVideos, isLoading: videosLoading } = useQuery<AggregatedVideo[]>({
    queryKey: ["/api/trainer/all-videos"],
  });

  const uniquePlayers = useMemo(() => {
    if (!allVideos) return [];
    const names = new Set(allVideos.map((v) => v.playerName).filter(Boolean));
    return Array.from(names).sort();
  }, [allVideos]);

  const uniquePositions = useMemo(() => {
    if (!allVideos) return [];
    const positions = new Set(allVideos.map((v) => v.position).filter((p): p is string => !!p));
    return Array.from(positions).sort();
  }, [allVideos]);

  const uniqueAges = useMemo(() => {
    if (!allVideos) return [];
    const ages = new Set(allVideos.map((v) => v.playerAge).filter((a): a is string => !!a));
    return Array.from(ages).sort();
  }, [allVideos]);

  const filteredVideos = useMemo(() => {
    if (!allVideos) return [];
    const now = new Date();
    return allVideos.filter((video) => {
      if (groupFilter !== "all" && video.groupId !== groupFilter) return false;
      if (playerFilter !== "all" && video.playerName !== playerFilter) return false;
      if (positionFilter !== "all" && video.position !== positionFilter) return false;
      if (ageFilter !== "all" && video.playerAge !== ageFilter) return false;
      if (dateFilter !== "all") {
        const created = new Date(video.createdAt);
        const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        if (dateFilter === "7" && diffDays > 7) return false;
        if (dateFilter === "30" && diffDays > 30) return false;
        if (dateFilter === "90" && diffDays > 90) return false;
      }
      return true;
    });
  }, [allVideos, groupFilter, playerFilter, positionFilter, ageFilter, dateFilter]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold" data-testid="text-trainer-videos-heading">Shared Videos</h2>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-video-group-filter">
            <SelectValue placeholder="All Groups" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {groups?.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={playerFilter} onValueChange={setPlayerFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-video-player-filter">
            <SelectValue placeholder="All Players" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Players</SelectItem>
            {uniquePlayers.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-video-position-filter">
            <SelectValue placeholder="All Positions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            {uniquePositions.map((pos) => (
              <SelectItem key={pos} value={pos}>
                {pos}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ageFilter} onValueChange={setAgeFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-video-age-filter">
            <SelectValue placeholder="All Ages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ages</SelectItem>
            {uniqueAges.map((age) => (
              <SelectItem key={age} value={age}>
                {age}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-video-date-filter">
            <SelectValue placeholder="All Time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {videosLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : !filteredVideos.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-player-videos">
            <Video className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No shared videos found. Adjust your filters or wait for players to share videos.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredVideos.map((video) => (
            <Card key={video.id} data-testid={`card-shared-video-${video.id}`}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium" data-testid={`text-video-title-${video.id}`}>{video.title}</p>
                      <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate text-xs" data-testid={`badge-video-player-${video.id}`}>{video.playerName}</Badge>
                      <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs" data-testid={`badge-video-group-${video.id}`}>{video.groupName}</Badge>
                      {video.position && (
                        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs" data-testid={`badge-video-position-${video.id}`}>{video.position}</Badge>
                      )}
                    </div>
                    {video.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2" data-testid={`text-video-desc-${video.id}`}>{video.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1" data-testid={`text-video-date-${video.id}`}>
                      {new Date(video.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" asChild className="shrink-0" data-testid={`button-watch-video-${video.id}`}>
                    <a href={video.videoUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3" />
                      Watch
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function InvitePlayersTab() {
  const { toast } = useToast();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [email, setEmail] = useState("");
  const [playerName, setPlayerName] = useState("");

  const { data: groups } = useQuery<TrainerGroup[]>({
    queryKey: ["/api/trainer/groups"],
  });

  const { data: invitations, isLoading: invitationsLoading } = useQuery<Invitation[]>({
    queryKey: ["/api/invitations", selectedGroupId],
    enabled: !!selectedGroupId,
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { teamId: string; email: string; playerName?: string }) =>
      apiRequest("POST", "/api/invitations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations", selectedGroupId] });
      setEmail("");
      setPlayerName("");
      toast({ title: "Invitation sent!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send invitation", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/invitations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations", selectedGroupId] });
      toast({ title: "Invitation removed" });
    },
  });

  const handleInvite = () => {
    if (!selectedGroupId || !email.trim()) return;
    inviteMutation.mutate({ teamId: selectedGroupId, email: email.trim(), playerName: playerName.trim() || undefined });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold" data-testid="text-invite-players-heading">Invite Players</h2>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Select Group</label>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger className="mt-1" data-testid="select-invite-group">
                <SelectValue placeholder="Choose a group..." />
              </SelectTrigger>
              <SelectContent>
                {groups?.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedGroupId && (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium">Player Email</label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="player@email.com"
                    type="email"
                    className="mt-1"
                    data-testid="input-invite-email"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">Player Name (optional)</label>
                  <Input
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="First Last"
                    className="mt-1"
                    data-testid="input-invite-name"
                  />
                </div>
              </div>
              <Button
                onClick={handleInvite}
                disabled={!email.trim() || inviteMutation.isPending}
                className="w-full sm:w-auto"
                data-testid="button-send-invite"
              >
                <Mail className="w-4 h-4" />
                {inviteMutation.isPending ? "Sending..." : "Send Invite"}
              </Button>

              <div className="space-y-2 pt-2 border-t">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Copy className="w-3 h-3" />
                  Or share group code: <Badge variant="outline" className="no-default-hover-elevate font-mono text-xs">{groups?.find(g => g.id === selectedGroupId)?.teamCode}</Badge>
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {selectedGroupId && (
        <>
          <h3 className="text-base font-semibold">Pending Invitations</h3>
          {invitationsLoading ? (
            <Skeleton className="h-20 rounded-lg" />
          ) : !invitations?.length ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground" data-testid="text-no-invitations">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending invitations for this group.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {invitations.map((inv) => (
                <Card key={inv.id} data-testid={`card-invitation-${inv.id}`}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{inv.playerName || inv.email}</p>
                        <p className="text-xs text-muted-foreground">{inv.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={inv.status === "accepted" ? "default" : "outline"} className="no-default-hover-elevate text-xs">
                          {inv.status}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(inv.id)}
                          data-testid={`button-delete-invite-${inv.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function JoinGroupTab() {
  const { toast } = useToast();
  const [leaveTeamId, setLeaveTeamId] = useState<string | null>(null);

  const form = useForm<JoinTeamForm>({
    resolver: zodResolver(joinTeamSchema),
    defaultValues: { teamCode: "" },
  });

  const { data: myTeams, isLoading: myTeamsLoading } = useQuery<PlayerTeam[]>({
    queryKey: ["/api/my-teams"],
  });

  const joinMutation = useMutation({
    mutationFn: (data: JoinTeamForm) => apiRequest("POST", "/api/teams/join", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-teams"] });
      form.reset();
      toast({ title: "Joined group successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to join group", description: error.message, variant: "destructive" });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: (teamId: string) => apiRequest("POST", `/api/teams/${teamId}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-teams"] });
      setLeaveTeamId(null);
      toast({ title: "Left group" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to leave group", description: error.message, variant: "destructive" });
    },
  });

  const [shareGroupId, setShareGroupId] = useState<string>("");
  const [shareTitle, setShareTitle] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [shareDescription, setShareDescription] = useState("");
  const [shareVideoUploading, setShareVideoUploading] = useState(false);
  const [shareVideoUploadProgress, setShareVideoUploadProgress] = useState(0);

  const handleShareVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShareVideoUploading(true);
    setShareVideoUploadProgress(10);
    try {
      const metaRes = await fetch("/api/user/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "video/mp4" }),
      });
      if (!metaRes.ok) {
        const err = await metaRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get upload URL");
      }
      const { uploadURL, objectPath } = await metaRes.json();
      setShareVideoUploadProgress(30);
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "video/mp4" },
      });
      if (!uploadRes.ok) throw new Error("Failed to upload file");
      setShareVideoUploadProgress(100);
      setShareUrl(objectPath);
      toast({ title: "Video uploaded!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setShareVideoUploading(false);
      setShareVideoUploadProgress(0);
    }
  };

  const { data: mySharedVideos, isLoading: sharedVideosLoading } = useQuery<Array<{
    id: string;
    title: string;
    videoUrl: string;
    description: string | null;
    teamName: string;
    createdAt: string;
  }>>({
    queryKey: ["/api/my-shared-videos"],
  });

  const shareVideoMutation = useMutation({
    mutationFn: (data: { teamId: string; title: string; videoUrl: string; description?: string }) =>
      apiRequest("POST", "/api/shared-videos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-shared-videos"] });
      setShareTitle("");
      setShareUrl("");
      setShareDescription("");
      toast({ title: "Video shared with your group!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to share video", description: error.message, variant: "destructive" });
    },
  });

  const deleteSharedVideoMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/shared-videos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-shared-videos"] });
      toast({ title: "Shared video removed" });
    },
  });

  const handleShareVideo = () => {
    if (!shareGroupId || !shareTitle.trim() || !shareUrl.trim()) return;
    shareVideoMutation.mutate({
      teamId: shareGroupId,
      title: shareTitle.trim(),
      videoUrl: shareUrl.trim(),
      description: shareDescription.trim() || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold" data-testid="text-join-group-heading">Join a Group</h2>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => joinMutation.mutate(data))} className="flex flex-col sm:flex-row sm:items-end gap-3">
              <FormField
                control={form.control}
                name="teamCode"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Group Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter group code..." {...field} data-testid="input-group-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={joinMutation.isPending} className="w-full sm:w-auto" data-testid="button-join-group">
                <UserPlus className="w-4 h-4" />
                {joinMutation.isPending ? "Joining..." : "Join"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <h3 className="text-base font-semibold" data-testid="text-my-joined-groups-heading">My Groups</h3>

      {myTeamsLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : !myTeams?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-joined-groups">
            <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>You haven't joined any groups yet. Enter a group code above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {myTeams.map((team) => (
            <Card key={team.id} data-testid={`card-joined-group-${team.id}`}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{team.name}</p>
                    {team.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{team.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Trainer: {team.coachName}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLeaveTeamId(team.id)}
                    className="self-end sm:self-center shrink-0"
                    data-testid={`button-leave-group-${team.id}`}
                  >
                    <LogOut className="w-3 h-3" />
                    Leave
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <h3 className="text-base font-semibold mt-6" data-testid="text-share-video-heading">Share a Video</h3>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div>
            <label className="text-sm font-medium">Select Group</label>
            <Select value={shareGroupId} onValueChange={setShareGroupId}>
              <SelectTrigger className="mt-1" data-testid="select-share-video-group">
                <SelectValue placeholder="Choose a group..." />
              </SelectTrigger>
              <SelectContent>
                {myTeams?.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {shareGroupId && (
            <>
              <div>
                <label className="text-sm font-medium">Video Title</label>
                <Input
                  value={shareTitle}
                  onChange={(e) => setShareTitle(e.target.value)}
                  placeholder="e.g. Ball Handling Drill Session"
                  className="mt-1"
                  data-testid="input-share-video-title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Video</label>
                {shareUrl ? (
                  <div className="flex items-center gap-2 p-2 mt-1 rounded-md border border-primary/30 bg-primary/5">
                    <Video className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm truncate flex-1" data-testid="text-share-video-attached">
                      {shareUrl.startsWith("http") && !shareUrl.includes("/uploads/") ? shareUrl : "Video file attached"}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => setShareUrl("")} data-testid="button-remove-share-video">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="mt-1 space-y-2">
                    <label className="flex items-center justify-center gap-2 p-3 rounded-md border-2 border-dashed cursor-pointer hover:border-primary/50 transition-colors">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {shareVideoUploading ? `Uploading... ${shareVideoUploadProgress}%` : "Upload a video file"}
                      </span>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={handleShareVideoFileUpload}
                        disabled={shareVideoUploading}
                        data-testid="input-share-video-file"
                      />
                    </label>
                    {shareVideoUploading && (
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all" style={{ width: `${shareVideoUploadProgress}%` }} />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">or paste a link</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <Input
                      value={shareUrl}
                      onChange={(e) => setShareUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      data-testid="input-share-video-url"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <Input
                  value={shareDescription}
                  onChange={(e) => setShareDescription(e.target.value)}
                  placeholder="What's in this video?"
                  className="mt-1"
                  data-testid="input-share-video-description"
                />
              </div>
              <Button
                onClick={handleShareVideo}
                disabled={!shareTitle.trim() || !shareUrl.trim() || shareVideoMutation.isPending}
                className="w-full sm:w-auto"
                data-testid="button-share-video"
              >
                <Video className="w-4 h-4" />
                {shareVideoMutation.isPending ? "Sharing..." : "Share Video"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {mySharedVideos && mySharedVideos.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">My Shared Videos</h4>
          {mySharedVideos.map((video) => (
            <Card key={video.id} data-testid={`card-my-shared-video-${video.id}`}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{video.title}</p>
                    <p className="text-xs text-muted-foreground">{video.teamName} - {new Date(video.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" asChild data-testid={`button-view-shared-${video.id}`}>
                      <a href={video.videoUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteSharedVideoMutation.mutate(video.id)}
                      data-testid={`button-delete-shared-${video.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!leaveTeamId} onOpenChange={(open) => !open && setLeaveTeamId(null)}>
        <AlertDialogContent data-testid="dialog-leave-group-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Group?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this group? You can rejoin later with the group code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-leave-group">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => leaveTeamId && leaveMutation.mutate(leaveTeamId)}
              data-testid="button-confirm-leave-group"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AdminTab({ initialSection }: { initialSection?: string }) {
  const { toast } = useToast();
  const [adminSection, setAdminSection] = useState<"teams" | "groups" | "players" | "drills" | "videos">((initialSection as any) || "teams");

  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [editTeamId, setEditTeamId] = useState<string | null>(null);
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamSeasonYear, setTeamSeasonYear] = useState<string>(String(currentYear));
  const [teamAgeGroup, setTeamAgeGroup] = useState<string[]>([]);
  const [teamPosition, setTeamPosition] = useState<string[]>([]);
  const [teamLevel, setTeamLevel] = useState<string[]>([]);
  const [teamPlayerClass, setTeamPlayerClass] = useState<string[]>([]);

  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [viewMembersGroupId, setViewMembersGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupAgeGroup, setGroupAgeGroup] = useState<string[]>([]);
  const [groupPosition, setGroupPosition] = useState<string[]>([]);
  const [groupLevel, setGroupLevel] = useState<string[]>([]);
  const [groupPlayerClass, setGroupPlayerClass] = useState<string[]>([]);

  const [adminAddPlayerOpen, setAdminAddPlayerOpen] = useState(false);
  const [adminEditPlayer, setAdminEditPlayer] = useState<TrainerPlayerData | null>(null);
  const [adminDeletePlayerId, setAdminDeletePlayerId] = useState<string | null>(null);
  const [adminNewPlayerTeamIds, setAdminNewPlayerTeamIds] = useState<string[]>([]);

  const [createDrillOpen, setCreateDrillOpen] = useState(false);
  const [editDrillId, setEditDrillId] = useState<string | null>(null);
  const [deleteDrillId, setDeleteDrillId] = useState<string | null>(null);
  const [drillTitle, setDrillTitle] = useState("");
  const [drillDescription, setDrillDescription] = useState("");
  const [drillCategory, setDrillCategory] = useState("");
  const [drillDifficulty, setDrillDifficulty] = useState("beginner");
  const [drillDuration, setDrillDuration] = useState("");
  const [drillTrackShots, setDrillTrackShots] = useState(false);
  const [drillInstructions, setDrillInstructions] = useState<string[]>([]);

  const [createVideoOpen, setCreateVideoOpen] = useState(false);
  const [editVideoId, setEditVideoId] = useState<string | null>(null);
  const [deleteVideoId, setDeleteVideoId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoCategory, setVideoCategory] = useState("");
  const [videoDifficulty, setVideoDifficulty] = useState("beginner");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState("");
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [playVideoUrl, setPlayVideoUrl] = useState<string | null>(null);
  const [assignVideoToDrillId, setAssignVideoToDrillId] = useState<string | null>(null);
  const [assignDrillTargetId, setAssignDrillTargetId] = useState<string>("");

  const { data: groups, isLoading: groupsLoading } = useQuery<TrainerGroup[]>({
    queryKey: ["/api/trainer/groups"],
  });

  const { data: trainerDrills, isLoading: drillsLoading } = useQuery<TrainerDrill[]>({
    queryKey: ["/api/trainer/drills"],
  });

  const { data: groupMembers } = useQuery<PlayerMember[]>({
    queryKey: ["/api/trainer/groups", viewMembersGroupId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/trainer/groups/${viewMembersGroupId}/members`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: !!viewMembersGroupId,
  });

  const { data: adminPlayers, isLoading: adminPlayersLoading } = useQuery<TrainerPlayerData[]>({
    queryKey: ["/api/trainer-players"],
  });

  const { data: coachTeams, isLoading: coachTeamsLoading } = useQuery<CoachTeam[]>({
    queryKey: ["/api/coach/teams"],
  });

  interface TrainerVideoData {
    id: string;
    trainerId: string;
    title: string;
    description: string | null;
    videoUrl: string;
    thumbnailUrl: string | null;
    category: string | null;
    difficulty: string | null;
    tags: string[] | null;
    createdAt: string;
  }

  const { data: trainerContentVideos, isLoading: contentVideosLoading } = useQuery<TrainerVideoData[]>({
    queryKey: ["/api/trainer/videos"],
  });

  const createVideoMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; videoUrl: string; thumbnailUrl?: string; category?: string; difficulty?: string }) =>
      apiRequest("POST", "/api/trainer/videos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/videos"] });
      setCreateVideoOpen(false);
      resetVideoForm();
      toast({ title: "Video uploaded!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to upload video", description: error.message, variant: "destructive" });
    },
  });

  const updateVideoMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title: string; description?: string; videoUrl: string; thumbnailUrl?: string; category?: string; difficulty?: string } }) =>
      apiRequest("PUT", `/api/trainer/videos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/videos"] });
      setEditVideoId(null);
      resetVideoForm();
      toast({ title: "Video updated!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update video", description: error.message, variant: "destructive" });
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/trainer/videos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/videos"] });
      setDeleteVideoId(null);
      toast({ title: "Video deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete video", description: error.message, variant: "destructive" });
    },
  });

  const assignVideoToDrillMutation = useMutation({
    mutationFn: ({ drillId, videoUrl }: { drillId: string; videoUrl: string }) =>
      apiRequest("PUT", `/api/trainer/drills/${drillId}`, { videoUrl }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/drills"] });
      setAssignVideoToDrillId(null);
      setAssignDrillTargetId("");
      toast({ title: "Video assigned to drill" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign video", description: error.message, variant: "destructive" });
    },
  });

  const resetVideoForm = () => {
    setVideoTitle("");
    setVideoDescription("");
    setVideoCategory("");
    setVideoDifficulty("beginner");
    setVideoUrl("");
    setVideoThumbnailUrl("");
  };

  const openEditVideo = (video: TrainerVideoData) => {
    setEditVideoId(video.id);
    setVideoTitle(video.title);
    setVideoDescription(video.description || "");
    setVideoCategory(video.category || "");
    setVideoDifficulty(video.difficulty || "beginner");
    setVideoUrl(video.videoUrl);
    setVideoThumbnailUrl(video.thumbnailUrl || "");
    setCreateVideoOpen(true);
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoUploading(true);
    setVideoUploadProgress(10);
    try {
      const metaRes = await fetch("/api/user/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "video/mp4" }),
      });
      if (!metaRes.ok) {
        const err = await metaRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get upload URL");
      }
      const { uploadURL, objectPath } = await metaRes.json();
      setVideoUploadProgress(30);
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "video/mp4" },
      });
      if (!uploadRes.ok) throw new Error("Failed to upload file");
      setVideoUploadProgress(100);
      setVideoUrl(objectPath);
      toast({ title: "Video file uploaded!" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setVideoUploading(false);
      setVideoUploadProgress(0);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const metaRes = await fetch("/api/user/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "image/jpeg" }),
      });
      if (!metaRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await metaRes.json();
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "image/jpeg" },
      });
      if (!uploadRes.ok) throw new Error("Failed to upload thumbnail");
      setVideoThumbnailUrl(objectPath);
      toast({ title: "Thumbnail uploaded!" });
    } catch (err: any) {
      toast({ title: "Thumbnail upload failed", description: err.message, variant: "destructive" });
    }
  };

  const createTeamMutation = useMutation({
    mutationFn: (data: { name: string; description: string; seasonYear?: number; ageGroup?: string; position?: string; level?: string; playerClass?: string }) =>
      apiRequest("POST", "/api/coach/teams", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/teams"] });
      setCreateTeamOpen(false);
      resetTeamForm();
      toast({ title: "Team created!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create team", description: error.message, variant: "destructive" });
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description: string; seasonYear?: number; ageGroup?: string; position?: string; level?: string; playerClass?: string } }) =>
      apiRequest("PUT", `/api/coach/teams/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/teams"] });
      setEditTeamId(null);
      resetTeamForm();
      toast({ title: "Team updated!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update team", description: error.message, variant: "destructive" });
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/coach/teams/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/teams"] });
      setDeleteTeamId(null);
      toast({ title: "Team deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete team", description: error.message, variant: "destructive" });
    },
  });

  const adminAddForm = useForm<TrainerPlayerForm>({
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", position: "", jerseyNumber: "", ageGroup: "", teamType: "None", gradYear: "", notes: "" },
  });

  const adminCreatePlayerMutation = useMutation({
    mutationFn: async (data: TrainerPlayerForm) => {
      const res = await apiRequest("POST", "/api/trainer-players", { ...data, teamIds: adminNewPlayerTeamIds });
      return res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/teams"] });
      setAdminAddPlayerOpen(false);
      adminAddForm.reset();
      setAdminNewPlayerTeamIds([]);
      const parts: string[] = [];
      if (result?.autoAssignedTeams?.length) parts.push(`Teams: ${result.autoAssignedTeams.join(", ")}`);
      if (result?.autoAssignedGroups?.length) parts.push(`Groups: ${result.autoAssignedGroups.join(", ")}`);
      toast({ title: "Player added!", description: parts.length ? `Assigned to ${parts.join(" | ")}` : undefined });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add player", description: error.message, variant: "destructive" });
    },
  });

  const adminUpdatePlayerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TrainerPlayerForm }) => {
      const res = await apiRequest("PUT", `/api/trainer-players/${id}`, data);
      return res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups"] });
      setAdminEditPlayer(null);
      const groups = result?.autoAssignedGroups;
      if (groups?.length) {
        toast({ title: "Player updated!", description: `Auto-assigned to: ${groups.join(", ")}` });
      } else {
        toast({ title: "Player updated!" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update player", description: error.message, variant: "destructive" });
    },
  });

  const adminDeletePlayerMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/trainer-players/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-players"] });
      setAdminDeletePlayerId(null);
      toast({ title: "Player deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete player", description: error.message, variant: "destructive" });
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: (data: { name: string; description: string; ageGroup?: string; position?: string; level?: string; playerClass?: string }) =>
      apiRequest("POST", "/api/trainer/groups", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups"] });
      setCreateGroupOpen(false);
      resetGroupForm();
      toast({ title: "Group created!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create group", description: error.message, variant: "destructive" });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description: string; ageGroup?: string; position?: string; level?: string; playerClass?: string } }) =>
      apiRequest("PUT", `/api/trainer/groups/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups"] });
      setEditGroupId(null);
      resetGroupForm();
      toast({ title: "Group updated!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update group", description: error.message, variant: "destructive" });
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/trainer/groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups"] });
      setDeleteGroupId(null);
      toast({ title: "Group deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete group", description: error.message, variant: "destructive" });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      apiRequest("DELETE", `/api/trainer/groups/${groupId}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups", viewMembersGroupId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups"] });
      toast({ title: "Member removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove member", description: error.message, variant: "destructive" });
    },
  });

  const createDrillMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; category: string; difficulty: string; duration?: string; trackShots?: boolean }) =>
      apiRequest("POST", "/api/trainer/drills", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/drills"] });
      setCreateDrillOpen(false);
      resetDrillForm();
      toast({ title: "Drill created!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create drill", description: error.message, variant: "destructive" });
    },
  });

  const updateDrillMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title: string; description?: string; category: string; difficulty: string; duration?: string; trackShots?: boolean } }) =>
      apiRequest("PUT", `/api/trainer/drills/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/drills"] });
      setEditDrillId(null);
      resetDrillForm();
      toast({ title: "Drill updated!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update drill", description: error.message, variant: "destructive" });
    },
  });

  const deleteDrillMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/trainer/drills/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/drills"] });
      setDeleteDrillId(null);
      toast({ title: "Drill deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete drill", description: error.message, variant: "destructive" });
    },
  });

  const resetTeamForm = () => {
    setTeamName("");
    setTeamDescription("");
    setTeamSeasonYear(String(currentYear));
    setTeamAgeGroup([]);
    setTeamPosition([]);
    setTeamLevel([]);
    setTeamPlayerClass([]);
  };

  const openEditTeam = (team: CoachTeam) => {
    setEditTeamId(team.id);
    setTeamName(team.name);
    setTeamDescription(team.description || "");
    setTeamSeasonYear(team.seasonYear ? String(team.seasonYear) : String(currentYear));
    setTeamAgeGroup(team.ageGroup ? team.ageGroup.split(",").map(s => s.trim()).filter(Boolean) : []);
    setTeamPosition(team.position ? team.position.split(",").map(s => s.trim()).filter(Boolean) : []);
    setTeamLevel(team.level ? team.level.split(",").map(s => s.trim()).filter(Boolean) : []);
    setTeamPlayerClass(team.playerClass ? team.playerClass.split(",").map(s => s.trim()).filter(Boolean) : []);
  };

  const handleTeamSubmit = () => {
    if (!teamName.trim()) return;
    const data = {
      name: teamName.trim(),
      description: teamDescription.trim(),
      seasonYear: teamSeasonYear ? parseInt(teamSeasonYear) : undefined,
      ageGroup: teamAgeGroup.length > 0 ? teamAgeGroup.join(", ") : undefined,
      position: teamPosition.length > 0 ? teamPosition.join(", ") : undefined,
      level: teamLevel.length > 0 ? teamLevel.join(", ") : undefined,
      playerClass: teamPlayerClass.length > 0 ? teamPlayerClass.join(", ") : undefined,
    };
    if (editTeamId) {
      updateTeamMutation.mutate({ id: editTeamId, data });
    } else {
      createTeamMutation.mutate(data);
    }
  };

  const resetGroupForm = () => {
    setGroupName("");
    setGroupDescription("");
    setGroupAgeGroup([]);
    setGroupPosition([]);
    setGroupLevel([]);
    setGroupPlayerClass([]);
  };

  const resetDrillForm = () => {
    setDrillTitle("");
    setDrillDescription("");
    setDrillCategory("");
    setDrillDifficulty("beginner");
    setDrillDuration("");
    setDrillTrackShots(false);
    setDrillInstructions([]);
  };

  const openEditGroup = (group: TrainerGroup) => {
    setEditGroupId(group.id);
    setGroupName(group.name);
    setGroupDescription(group.description || "");
    setGroupAgeGroup(group.ageGroup ? group.ageGroup.split(",").map(s => s.trim()).filter(Boolean) : []);
    setGroupPosition(group.position ? group.position.split(",").map(s => s.trim()).filter(Boolean) : []);
    setGroupLevel(group.level ? group.level.split(",").map(s => s.trim()).filter(Boolean) : []);
    setGroupPlayerClass(group.playerClass ? group.playerClass.split(",").map(s => s.trim()).filter(Boolean) : []);
  };

  const openEditDrill = (drill: TrainerDrill) => {
    setEditDrillId(drill.id);
    setDrillTitle(drill.title);
    setDrillDescription(drill.description || "");
    setDrillCategory(drill.category);
    setDrillDifficulty(drill.difficulty);
    setDrillDuration(drill.duration ? String(drill.duration) : "");
    setDrillTrackShots(drill.trackShots || false);
    setDrillInstructions(drill.tips || []);
  };

  const handleGroupSubmit = () => {
    if (!groupName.trim()) return;
    const data = {
      name: groupName.trim(),
      description: groupDescription.trim(),
      ageGroup: groupAgeGroup.length > 0 ? groupAgeGroup.join(", ") : undefined,
      position: groupPosition.length > 0 ? groupPosition.join(", ") : undefined,
      level: groupLevel.length > 0 ? groupLevel.join(", ") : undefined,
      playerClass: groupPlayerClass.length > 0 ? groupPlayerClass.join(", ") : undefined,
    };
    if (editGroupId) {
      updateGroupMutation.mutate({ id: editGroupId, data });
    } else {
      createGroupMutation.mutate(data);
    }
  };

  const handleDrillSubmit = () => {
    if (!drillTitle.trim() || !drillCategory) return;
    const data = {
      title: drillTitle.trim(),
      description: drillDescription.trim() || undefined,
      category: drillCategory,
      difficulty: drillDifficulty,
      duration: drillDuration || undefined,
      trackShots: drillTrackShots,
      tips: drillInstructions.filter(s => s.trim()),
    };
    if (editDrillId) {
      updateDrillMutation.mutate({ id: editDrillId, data });
    } else {
      createDrillMutation.mutate(data);
    }
  };

  const formatCategory = (cat: string) => cat.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold" data-testid="text-admin-heading">Admin</h2>
      </div>

      <Tabs value={adminSection} onValueChange={(v) => setAdminSection(v as "teams" | "groups" | "players" | "drills" | "videos")} data-testid="tabs-admin-section">
        <TabsList className="grid w-full grid-cols-5" data-testid="tabs-admin-list">
          <TabsTrigger value="teams" className="text-xs sm:text-sm" data-testid="tab-admin-teams">
            <Shield className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">Teams</span>
          </TabsTrigger>
          <TabsTrigger value="groups" className="text-xs sm:text-sm" data-testid="tab-admin-groups">
            <Users className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">Groups</span>
          </TabsTrigger>
          <TabsTrigger value="players" className="text-xs sm:text-sm" data-testid="tab-admin-players">
            <UserPlus className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">Players</span>
          </TabsTrigger>
          <TabsTrigger value="drills" className="text-xs sm:text-sm" data-testid="tab-admin-drills">
            <Dumbbell className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">Drills</span>
          </TabsTrigger>
          <TabsTrigger value="videos" className="text-xs sm:text-sm" data-testid="tab-admin-videos">
            <Video className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">Videos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">Manage your teams and rosters.</p>
            <Button onClick={() => { resetTeamForm(); setCreateTeamOpen(true); }} data-testid="button-coach-admin-create-team">
              <Plus className="w-4 h-4" />
              New Team
            </Button>
          </div>

          {coachTeamsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : !coachTeams?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-coach-admin-teams">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No teams yet. Create your first team to organize your roster.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {coachTeams.map((team) => (
                <Card key={team.id} data-testid={`card-coach-admin-team-${team.id}`}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium truncate" data-testid={`text-coach-admin-team-name-${team.id}`}>{team.name}</h3>
                          {team.seasonYear && (
                            <Badge variant="secondary" className="no-default-hover-elevate text-xs">
                              {team.seasonYear}-{(team.seasonYear + 1).toString().slice(-2)}
                            </Badge>
                          )}
                          {team.ageGroup && (
                            <Badge variant="secondary" className="no-default-hover-elevate text-xs">{team.ageGroup}</Badge>
                          )}
                          {team.position && team.position !== "none" && (
                            <Badge variant="secondary" className="no-default-hover-elevate text-xs">{team.position}</Badge>
                          )}
                          {team.level && team.level !== "none" && (
                            <Badge variant="secondary" className="no-default-hover-elevate text-xs">{team.level}</Badge>
                          )}
                          {team.playerClass && team.playerClass !== "none" && (
                            <Badge variant="secondary" className="no-default-hover-elevate text-xs">{team.playerClass}</Badge>
                          )}
                          <Badge variant="outline" className="no-default-hover-elevate text-xs">
                            {team.memberCount || 0} members
                          </Badge>
                        </div>
                        {team.description && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">{team.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="no-default-hover-elevate text-[10px] font-mono">
                            <Copy className="w-3 h-3 mr-1" />
                            {team.teamCode}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEditTeam(team)} data-testid={`button-coach-admin-edit-team-${team.id}`}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteTeamId(team.id)} data-testid={`button-coach-admin-delete-team-${team.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="groups" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">Manage your training groups. Groups are available across all tabs.</p>
            <Button onClick={() => { resetGroupForm(); setCreateGroupOpen(true); }} data-testid="button-admin-create-group">
              <Plus className="w-4 h-4" />
              New Group
            </Button>
          </div>

          {groupsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : !groups?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-admin-groups">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No groups yet. Create your first group to organize players.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => (
                <Card key={group.id} data-testid={`card-admin-group-${group.id}`}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium truncate" data-testid={`text-admin-group-name-${group.id}`}>{group.name}</h3>
                          {group.ageGroup && (
                            <Badge variant="secondary" className="no-default-hover-elevate text-xs">Age {group.ageGroup}</Badge>
                          )}
                          {group.position && (
                            <Badge variant="secondary" className="no-default-hover-elevate text-xs">{group.position}</Badge>
                          )}
                          {group.level && (
                            <Badge variant="secondary" className="no-default-hover-elevate text-xs">{group.level}</Badge>
                          )}
                          {group.playerClass && (
                            <Badge variant="secondary" className="no-default-hover-elevate text-xs">{group.playerClass}</Badge>
                          )}
                          <Badge variant="outline" className="no-default-hover-elevate text-xs">
                            {group.memberCount || 0} members
                          </Badge>
                        </div>
                        {group.description && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">{group.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="no-default-hover-elevate text-[10px] font-mono">
                            <Copy className="w-3 h-3 mr-1" />
                            {group.teamCode}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setViewMembersGroupId(group.id)}
                          data-testid={`button-admin-view-members-${group.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditGroup(group)}
                          data-testid={`button-admin-edit-group-${group.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteGroupId(group.id)}
                          data-testid={`button-admin-delete-group-${group.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="players" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">Manage all your players from one place.</p>
            <Button onClick={() => { adminAddForm.reset(); setAdminNewPlayerTeamIds([]); setAdminAddPlayerOpen(true); }} data-testid="button-admin-create-player">
              <Plus className="w-4 h-4" />
              New Player
            </Button>
          </div>

          {adminPlayersLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : !adminPlayers?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-admin-players">
                <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No players yet. Add your first player to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {adminPlayers.map((player) => (
                <Card key={player.id} data-testid={`card-admin-player-${player.id}`}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium truncate" data-testid={`text-admin-player-name-${player.id}`}>
                            {player.firstName} {player.lastName || ""}
                          </h3>
                          {player.position && (
                            <Badge variant="secondary" className="no-default-hover-elevate text-xs">{player.position}</Badge>
                          )}
                          {player.ageGroup && (
                            <Badge variant="secondary" className="no-default-hover-elevate text-xs">Age {player.ageGroup}</Badge>
                          )}
                          {player.teamType && player.teamType !== "None" && (
                            <Badge variant="outline" className="no-default-hover-elevate text-xs">{player.teamType}</Badge>
                          )}
                          {player.gradYear && (
                            <Badge variant="secondary" className="no-default-hover-elevate text-xs">Class of {player.gradYear}</Badge>
                          )}
                          {player.jerseyNumber && (
                            <Badge variant="outline" className="no-default-hover-elevate text-xs">#{player.jerseyNumber}</Badge>
                          )}
                        </div>
                        {player.email && (
                          <p className="text-xs text-muted-foreground mt-1">{player.email}</p>
                        )}
                        {player.groups?.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {player.groups.map((g) => (
                              <Badge key={g.id} variant="outline" className="no-default-hover-elevate text-[10px]">{g.groupName}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setAdminEditPlayer(player);
                            adminAddForm.reset({
                              firstName: player.firstName,
                              lastName: player.lastName || "",
                              email: player.email || "",
                              phone: player.phone || "",
                              position: player.position || "",
                              jerseyNumber: player.jerseyNumber || "",
                              ageGroup: player.ageGroup || "",
                              teamType: player.teamType || "None",
                              gradYear: player.gradYear ? String(player.gradYear) : "",
                              notes: player.notes || "",
                            });
                          }}
                          data-testid={`button-admin-edit-player-${player.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setAdminDeletePlayerId(player.id)}
                          data-testid={`button-admin-delete-player-${player.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="drills" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">Create custom drills you can assign to your players.</p>
            <Button onClick={() => { resetDrillForm(); setCreateDrillOpen(true); }} data-testid="button-admin-create-drill">
              <Plus className="w-4 h-4" />
              New Drill
            </Button>
          </div>

          {drillsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : !trainerDrills?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-admin-drills">
                <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No custom drills yet. Create drills to assign to your players.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {trainerDrills.map((drill) => (
                <Card key={drill.id} data-testid={`card-admin-drill-${drill.id}`}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium truncate" data-testid={`text-admin-drill-title-${drill.id}`}>{drill.title}</h3>
                          <Badge variant="secondary" className="no-default-hover-elevate text-xs">{formatCategory(drill.category)}</Badge>
                          <Badge variant="outline" className="no-default-hover-elevate text-xs capitalize">{drill.difficulty}</Badge>
                        </div>
                        {drill.description && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">{drill.description}</p>
                        )}
                        {drill.duration && (
                          <p className="text-xs text-muted-foreground mt-1">{Math.floor(drill.duration / 60)}m {drill.duration % 60}s</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDrill(drill)}
                          data-testid={`button-admin-edit-drill-${drill.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteDrillId(drill.id)}
                          data-testid={`button-admin-delete-drill-${drill.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="videos" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">Upload instructional videos for your drills and workouts.</p>
            <Button onClick={() => { resetVideoForm(); setEditVideoId(null); setCreateVideoOpen(true); }} data-testid="button-admin-upload-video">
              <Upload className="w-4 h-4" />
              Upload Video
            </Button>
          </div>

          {contentVideosLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : !trainerContentVideos?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-trainer-videos">
                <Video className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No videos yet. Upload your first instructional video.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {trainerContentVideos.map((video) => (
                <Card key={video.id} data-testid={`card-trainer-video-${video.id}`}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium truncate" data-testid={`text-trainer-video-title-${video.id}`}>{video.title}</h3>
                          {video.category && (
                            <Badge variant="secondary" className="no-default-hover-elevate text-xs">{formatCategory(video.category)}</Badge>
                          )}
                          {video.difficulty && (
                            <Badge variant="outline" className="no-default-hover-elevate text-xs capitalize">{video.difficulty}</Badge>
                          )}
                        </div>
                        {video.description && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">{video.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <p className="text-xs text-muted-foreground">
                            {new Date(video.createdAt).toLocaleDateString()}
                          </p>
                          {trainerDrills?.filter(d => d.videoUrl === video.videoUrl).map(d => (
                            <Badge key={d.id} variant="secondary" className="no-default-hover-elevate text-xs gap-1" data-testid={`badge-video-linked-drill-${d.id}`}>
                              <Link2 className="w-3 h-3" />
                              {d.title}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setPlayVideoUrl(video.videoUrl)}
                          title="Play"
                          data-testid={`button-play-trainer-video-${video.id}`}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { setAssignVideoToDrillId(video.id); setAssignDrillTargetId(""); }}
                          title="Assign to Drill"
                          data-testid={`button-assign-video-${video.id}`}
                        >
                          <Link2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditVideo(video)}
                          title="Edit"
                          data-testid={`button-edit-trainer-video-${video.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteVideoId(video.id)}
                          title="Delete"
                          data-testid={`button-delete-trainer-video-${video.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={createVideoOpen} onOpenChange={(open) => { if (!open) { setCreateVideoOpen(false); setEditVideoId(null); resetVideoForm(); } }}>
        <DialogContent className="max-h-[85vh] flex flex-col" data-testid="dialog-trainer-video">
          <DialogHeader>
            <DialogTitle>{editVideoId ? "Edit Video" : "Upload Video"}</DialogTitle>
            <DialogDescription>{editVideoId ? "Update video details." : "Upload an instructional video for your players."}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g. Crossover Drill Breakdown"
                data-testid="input-trainer-video-title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                placeholder="What does this video cover?"
                className="resize-none"
                data-testid="input-trainer-video-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={videoCategory} onValueChange={setVideoCategory}>
                  <SelectTrigger data-testid="select-trainer-video-category">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {DRILL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{formatCategory(cat)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty</label>
                <Select value={videoDifficulty} onValueChange={setVideoDifficulty}>
                  <SelectTrigger data-testid="select-trainer-video-difficulty">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_LEVELS.map((d) => (
                      <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Video File</label>
              {videoUrl ? (
                <div className="flex items-center gap-2 p-2 rounded-md border border-primary/30 bg-primary/5">
                  <Video className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm truncate flex-1">Video uploaded</span>
                  <Button size="sm" variant="ghost" onClick={() => setVideoUrl("")} data-testid="button-remove-video-file">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div>
                  <label className="flex items-center justify-center gap-2 p-4 rounded-md border-2 border-dashed cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{videoUploading ? `Uploading... ${videoUploadProgress}%` : "Click to upload video"}</span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleVideoFileUpload}
                      disabled={videoUploading}
                      data-testid="input-trainer-video-file"
                    />
                  </label>
                  {videoUploading && (
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${videoUploadProgress}%` }} />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Thumbnail (optional)</label>
              {videoThumbnailUrl ? (
                <div className="flex items-center gap-2 p-2 rounded-md border border-primary/30 bg-primary/5">
                  <Eye className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm truncate flex-1">Thumbnail uploaded</span>
                  <Button size="sm" variant="ghost" onClick={() => setVideoThumbnailUrl("")} data-testid="button-remove-thumbnail">
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-3 rounded-md border-2 border-dashed cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload thumbnail</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleThumbnailUpload}
                    data-testid="input-trainer-video-thumbnail"
                  />
                </label>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  const data = {
                    title: videoTitle,
                    description: videoDescription || undefined,
                    videoUrl,
                    thumbnailUrl: videoThumbnailUrl || undefined,
                    category: videoCategory || undefined,
                    difficulty: videoDifficulty || undefined,
                  };
                  if (editVideoId) {
                    updateVideoMutation.mutate({ id: editVideoId, data });
                  } else {
                    createVideoMutation.mutate(data);
                  }
                }}
                disabled={!videoTitle.trim() || !videoUrl || createVideoMutation.isPending || updateVideoMutation.isPending}
                data-testid="button-submit-trainer-video"
              >
                {(createVideoMutation.isPending || updateVideoMutation.isPending) ? "Saving..." : (editVideoId ? "Update" : "Upload")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteVideoId} onOpenChange={(open) => { if (!open) setDeleteVideoId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this video? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-video">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteVideoId && deleteVideoMutation.mutate(deleteVideoId)}
              data-testid="button-confirm-delete-video"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!playVideoUrl} onOpenChange={(open) => { if (!open) setPlayVideoUrl(null); }}>
        <DialogContent className="max-w-2xl" data-testid="dialog-play-trainer-video">
          <DialogHeader>
            <DialogTitle>Video Player</DialogTitle>
            <DialogDescription>Playing instructional video</DialogDescription>
          </DialogHeader>
          {playVideoUrl && (
            <video
              src={playVideoUrl}
              controls
              autoPlay
              className="w-full rounded-md max-h-[60vh]"
              data-testid="video-trainer-player"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignVideoToDrillId} onOpenChange={(open) => { if (!open) { setAssignVideoToDrillId(null); setAssignDrillTargetId(""); } }}>
        <DialogContent data-testid="dialog-assign-video-to-drill">
          <DialogHeader>
            <DialogTitle>Assign Video to Drill</DialogTitle>
            <DialogDescription>
              Link this video to one of your custom drills so players can watch it when practicing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {drillsLoading ? (
              <div className="space-y-2 py-4">
                {[1, 2].map(i => <Skeleton key={i} className="h-8 rounded" />)}
              </div>
            ) : !trainerDrills?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-drills-to-assign">
                No custom drills yet. Create a drill first in the Drills tab.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Drill</label>
                  <Select value={assignDrillTargetId} onValueChange={setAssignDrillTargetId}>
                    <SelectTrigger data-testid="select-assign-drill-target">
                      <SelectValue placeholder="Choose a drill..." />
                    </SelectTrigger>
                    <SelectContent>
                      {trainerDrills.map((drill) => (
                        <SelectItem key={drill.id} value={drill.id}>
                          <span className="flex items-center gap-2">
                            {drill.title}
                            {drill.videoUrl && <span className="text-xs text-muted-foreground">(has video)</span>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {assignDrillTargetId && trainerDrills.find(d => d.id === assignDrillTargetId)?.videoUrl && (
                  <p className="text-sm text-amber-500 dark:text-amber-400" data-testid="text-drill-has-video-warning">
                    This drill already has a video assigned. Assigning this video will replace the existing one.
                  </p>
                )}
                <DialogFooter>
                  <Button
                    onClick={() => {
                      const video = trainerContentVideos?.find(v => v.id === assignVideoToDrillId);
                      if (video && assignDrillTargetId) {
                        assignVideoToDrillMutation.mutate({ drillId: assignDrillTargetId, videoUrl: video.videoUrl });
                      }
                    }}
                    disabled={!assignDrillTargetId || assignVideoToDrillMutation.isPending}
                    data-testid="button-confirm-assign-video"
                  >
                    {assignVideoToDrillMutation.isPending ? "Assigning..." : "Assign Video"}
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createGroupOpen || !!editGroupId} onOpenChange={(open) => { if (!open) { setCreateGroupOpen(false); setEditGroupId(null); resetGroupForm(); } }}>
        <DialogContent data-testid="dialog-admin-group">
          <DialogHeader>
            <DialogTitle>{editGroupId ? "Edit Group" : "Create Group"}</DialogTitle>
            <DialogDescription>{editGroupId ? "Update group details." : "Create a new training group."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Group Name</label>
              <Input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Team Alpha, U12 Guards"
                data-testid="input-admin-group-name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Optional description..."
                className="resize-none"
                data-testid="input-admin-group-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Age</label>
                <MultiSelect options={AGE_GROUP_OPTIONS} selected={groupAgeGroup} onChange={setGroupAgeGroup} placeholder="Select age groups (optional)" data-testid="select-admin-group-age" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Position</label>
                <MultiSelect options={PLAYER_POSITIONS} selected={groupPosition} onChange={setGroupPosition} placeholder="Select positions (optional)" data-testid="select-admin-group-position" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Level</label>
                <MultiSelect options={LEVEL_OPTIONS} selected={groupLevel} onChange={setGroupLevel} placeholder="Select levels (optional)" data-testid="select-admin-group-level" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Class</label>
                <MultiSelect options={CLASS_OPTIONS} selected={groupPlayerClass} onChange={setGroupPlayerClass} placeholder="Select classes (optional)" data-testid="select-admin-group-class" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleGroupSubmit}
              disabled={!groupName.trim() || createGroupMutation.isPending || updateGroupMutation.isPending}
              data-testid="button-admin-submit-group"
            >
              {(createGroupMutation.isPending || updateGroupMutation.isPending) ? "Saving..." : (editGroupId ? "Update" : "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewMembersGroupId} onOpenChange={(open) => { if (!open) setViewMembersGroupId(null); }}>
        <DialogContent data-testid="dialog-admin-view-members">
          <DialogHeader>
            <DialogTitle>Group Members</DialogTitle>
            <DialogDescription>
              {groups?.find(g => g.id === viewMembersGroupId)?.name} - {groupMembers?.length || 0} members
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {!groupMembers?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">No members in this group yet.</p>
            ) : (
              groupMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-2 p-2 rounded-md" data-testid={`admin-member-${member.id}`}>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Avatar className="h-8 w-8 shrink-0">
                      {member.profileImageUrl && <AvatarImage src={member.profileImageUrl} />}
                      <AvatarFallback className="text-xs">{member.firstName?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{member.firstName} {member.lastName}</p>
                      {member.position && (
                        <Badge variant="outline" className="no-default-hover-elevate text-[10px]">{member.position}</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeMemberMutation.mutate({ groupId: viewMembersGroupId!, userId: member.userId })}
                    disabled={removeMemberMutation.isPending}
                    data-testid={`button-admin-remove-member-${member.id}`}
                  >
                    <UserMinus className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createDrillOpen || !!editDrillId} onOpenChange={(open) => { if (!open) { setCreateDrillOpen(false); setEditDrillId(null); resetDrillForm(); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto" data-testid="dialog-admin-drill">
          <DialogHeader>
            <DialogTitle>{editDrillId ? "Edit Drill" : "Create Custom Drill"}</DialogTitle>
            <DialogDescription>{editDrillId ? "Update drill details." : "Create a new drill to assign to players."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Drill Title</label>
              <Input
                value={drillTitle}
                onChange={(e) => setDrillTitle(e.target.value)}
                placeholder="e.g. Crossover Combo, Free Throw Routine"
                data-testid="input-admin-drill-title"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={drillDescription}
                onChange={(e) => setDrillDescription(e.target.value)}
                placeholder="Describe the drill..."
                className="resize-none"
                data-testid="input-admin-drill-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={drillCategory} onValueChange={setDrillCategory}>
                  <SelectTrigger data-testid="select-admin-drill-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {DRILL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{formatCategory(cat)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Difficulty</label>
                <Select value={drillDifficulty} onValueChange={setDrillDifficulty}>
                  <SelectTrigger data-testid="select-admin-drill-difficulty">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_LEVELS.map((d) => (
                      <SelectItem key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration (seconds)</label>
                <Input
                  value={drillDuration}
                  onChange={(e) => setDrillDuration(e.target.value)}
                  placeholder="e.g. 300"
                  type="number"
                  data-testid="input-admin-drill-duration"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  checked={drillTrackShots}
                  onCheckedChange={(c) => setDrillTrackShots(c === true)}
                  data-testid="checkbox-admin-drill-track-shots"
                />
                <label className="text-sm">Track shot locations</label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Instructions / Steps</label>
              <div className="space-y-2">
                {drillInstructions.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-xs font-bold text-muted-foreground mt-2.5 w-5 shrink-0">{idx + 1}.</span>
                    <Input
                      value={step}
                      onChange={(e) => {
                        const updated = [...drillInstructions];
                        updated[idx] = e.target.value;
                        setDrillInstructions(updated);
                      }}
                      placeholder={`Step ${idx + 1}`}
                      data-testid={`input-drill-instruction-${idx}`}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="shrink-0 h-9 w-9"
                      onClick={() => setDrillInstructions(prev => prev.filter((_, i) => i !== idx))}
                      data-testid={`button-remove-instruction-${idx}`}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setDrillInstructions(prev => [...prev, ""])}
                  data-testid="button-add-instruction"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Step
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleDrillSubmit}
              disabled={!drillTitle.trim() || !drillCategory || createDrillMutation.isPending || updateDrillMutation.isPending}
              data-testid="button-admin-submit-drill"
            >
              {(createDrillMutation.isPending || updateDrillMutation.isPending) ? "Saving..." : (editDrillId ? "Update" : "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteGroupId} onOpenChange={(open) => { if (!open) setDeleteGroupId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this group? This will remove all member assignments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-admin-group">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGroupId && deleteGroupMutation.mutate(deleteGroupId)}
              data-testid="button-confirm-delete-admin-group"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteDrillId} onOpenChange={(open) => { if (!open) setDeleteDrillId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Drill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this custom drill? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-admin-drill">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDrillId && deleteDrillMutation.mutate(deleteDrillId)}
              data-testid="button-confirm-delete-admin-drill"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={adminAddPlayerOpen || !!adminEditPlayer} onOpenChange={(open) => { if (!open) { setAdminAddPlayerOpen(false); setAdminEditPlayer(null); adminAddForm.reset(); } }}>
        <DialogContent className="max-h-[85vh] flex flex-col" data-testid="dialog-admin-player">
          <DialogHeader>
            <DialogTitle>{adminEditPlayer ? "Edit Player" : "Add Player"}</DialogTitle>
            <DialogDescription>{adminEditPlayer ? "Update player details." : "Add a new player to your roster."}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 pr-1">
          <Form {...adminAddForm}>
            <form onSubmit={adminAddForm.handleSubmit((data) => {
              if (adminEditPlayer) {
                adminUpdatePlayerMutation.mutate({ id: adminEditPlayer.id, data });
              } else {
                adminCreatePlayerMutation.mutate(data);
              }
            })} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={adminAddForm.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl><Input placeholder="First name" {...field} data-testid="input-admin-player-first-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={adminAddForm.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl><Input placeholder="Last name" {...field} data-testid="input-admin-player-last-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={adminAddForm.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input placeholder="email@example.com" type="email" {...field} data-testid="input-admin-player-email" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={adminAddForm.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="Phone number" {...field} data-testid="input-admin-player-phone" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <FormField control={adminAddForm.control} name="position" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-admin-player-position"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {PLAYER_POSITIONS.map((pos) => (<SelectItem key={pos} value={pos}>{pos}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={adminAddForm.control} name="jerseyNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jersey #</FormLabel>
                    <FormControl><Input placeholder="#" maxLength={3} {...field} data-testid="input-admin-player-jersey" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={adminAddForm.control} name="ageGroup" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-admin-player-age"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {PLAYER_AGES.map((age) => (<SelectItem key={age} value={age}>{age}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={adminAddForm.control} name="teamType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Type</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-admin-player-team-type"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {TEAM_TYPES.map((tt) => (<SelectItem key={tt} value={tt}>{tt}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={adminAddForm.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl><Textarea placeholder="Optional notes..." {...field} data-testid="input-admin-player-notes" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {!adminEditPlayer && coachTeams && coachTeams.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assign to Teams (optional)</label>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {coachTeams.map((team) => (
                      <div
                        key={team.id}
                        className={`flex items-center justify-between gap-2 p-2 rounded-md border cursor-pointer ${adminNewPlayerTeamIds.includes(team.id) ? "border-primary bg-primary/10" : "hover-elevate"}`}
                        onClick={() => setAdminNewPlayerTeamIds(prev => prev.includes(team.id) ? prev.filter(id => id !== team.id) : [...prev, team.id])}
                        data-testid={`button-admin-player-team-pick-${team.id}`}
                      >
                        <span className="text-sm truncate">{team.name}{team.seasonYear ? ` (${team.seasonYear})` : ""}{team.ageGroup ? ` - ${team.ageGroup}` : ""}</span>
                        {adminNewPlayerTeamIds.includes(team.id) && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="submit" disabled={adminCreatePlayerMutation.isPending || adminUpdatePlayerMutation.isPending} data-testid="button-submit-admin-player">
                  {(adminCreatePlayerMutation.isPending || adminUpdatePlayerMutation.isPending) ? "Saving..." : (adminEditPlayer ? "Update" : "Add Player")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!adminDeletePlayerId} onOpenChange={(open) => { if (!open) setAdminDeletePlayerId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Player</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this player? This will remove all their group assignments. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-admin-player">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => adminDeletePlayerId && adminDeletePlayerMutation.mutate(adminDeletePlayerId)}
              data-testid="button-confirm-delete-admin-player"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createTeamOpen || !!editTeamId} onOpenChange={(open) => { if (!open) { setCreateTeamOpen(false); setEditTeamId(null); resetTeamForm(); } }}>
        <DialogContent data-testid="dialog-coach-admin-team">
          <DialogHeader>
            <DialogTitle>{editTeamId ? "Edit Team" : "Create Team"}</DialogTitle>
            <DialogDescription>{editTeamId ? "Update team details." : "Create a new team roster."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Team Name</label>
              <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Eagles Varsity" data-testid="input-coach-admin-team-name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea value={teamDescription} onChange={(e) => setTeamDescription(e.target.value)} placeholder="Optional description..." className="resize-none" data-testid="input-coach-admin-team-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Season Year</label>
                <Select value={teamSeasonYear} onValueChange={setTeamSeasonYear}>
                  <SelectTrigger data-testid="select-coach-admin-season-year"><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}-{(y + 1).toString().slice(-2)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Age Group</label>
                <MultiSelect options={AGE_GROUP_OPTIONS} selected={teamAgeGroup} onChange={setTeamAgeGroup} placeholder="Select age groups (optional)" data-testid="select-coach-admin-age-group" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Position</label>
                <MultiSelect options={PLAYER_POSITIONS} selected={teamPosition} onChange={setTeamPosition} placeholder="Select positions" data-testid="select-coach-admin-team-position" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Level</label>
                <MultiSelect options={LEVEL_OPTIONS} selected={teamLevel} onChange={setTeamLevel} placeholder="Select levels" data-testid="select-coach-admin-team-level" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Class</label>
                <MultiSelect options={CLASS_OPTIONS} selected={teamPlayerClass} onChange={setTeamPlayerClass} placeholder="Select classes" data-testid="select-coach-admin-team-class" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleTeamSubmit} disabled={!teamName.trim() || createTeamMutation.isPending || updateTeamMutation.isPending} data-testid="button-coach-admin-submit-team">
              {(createTeamMutation.isPending || updateTeamMutation.isPending) ? "Saving..." : (editTeamId ? "Update" : "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTeamId} onOpenChange={(open) => { if (!open) setDeleteTeamId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this team? This will remove all member assignments. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-coach-admin-team">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTeamId && deleteTeamMutation.mutate(deleteTeamId)} data-testid="button-confirm-delete-coach-admin-team">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

function MyAssignmentsTab() {
  const { toast } = useToast();

  const { data: assignments, isLoading } = useQuery<PlayerAssignment[]>({
    queryKey: ["/api/assigned-drills"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiRequest("PUT", `/api/assignments/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assigned-drills"] });
      toast({ title: "Assignment updated!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update assignment", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold" data-testid="text-my-assignments-heading">My Assignments</h2>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      ) : !assignments?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-player-assignments">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No assignments yet. Join a group to receive drill assignments from your trainer.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <Card key={assignment.id} data-testid={`card-assignment-${assignment.id}`}>
              <CardContent className="py-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <p className="font-medium">{assignment.drillTitle}</p>
                      <Badge
                        variant={assignment.status === "completed" ? "default" : "outline"}
                        className="no-default-hover-elevate"
                      >
                        {assignment.status === "completed" ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <Circle className="w-3 h-3 mr-1" />
                        )}
                        {assignment.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                    <span>Group: {assignment.teamName}</span>
                    <span>Assigned by: {assignment.assignedByName}</span>
                    {assignment.dueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {assignment.notes && (
                    <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      {assignment.notes}
                    </p>
                  )}

                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {assignment.status !== "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatusMutation.mutate({ id: assignment.id, status: "completed" })}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`button-complete-assignment-${assignment.id}`}
                      >
                        <CheckCircle className="w-3 h-3" />
                        Complete
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                      data-testid={`link-practice-drill-${assignment.id}`}
                    >
                      <Link href={`/drill/${assignment.drillId}`}>
                        <ExternalLink className="w-3 h-3" />
                        Practice
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CoachTrainerPage() {
  const { user } = useAuth();
  const trainerSearch = useSearch();
  const trainerParams = new URLSearchParams(trainerSearch);
  const initialTab = trainerParams.get('tab') || "roster";
  const initialAdminSub = trainerParams.get('adminTab') || undefined;
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-trainer-page-title">Coach / Trainer</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="-mx-2 px-2">
          <TabsList className="grid w-full grid-cols-5 gap-1 h-auto flex-wrap" data-testid="tabs-trainer-main">
            <TabsTrigger value="admin" className="text-xs sm:text-sm py-2" data-testid="tab-trainer-admin">
              <Settings className="w-4 h-4 mr-1 shrink-0" />
              <span className="truncate">Admin</span>
            </TabsTrigger>
            <TabsTrigger value="roster" className="text-xs sm:text-sm py-2" data-testid="tab-roster">
              <Shield className="w-4 h-4 mr-1 shrink-0" />
              <span className="truncate">Roster</span>
            </TabsTrigger>
            <TabsTrigger value="players" className="text-xs sm:text-sm py-2" data-testid="tab-players">
              <Users className="w-4 h-4 mr-1 shrink-0" />
              <span className="truncate">Players</span>
            </TabsTrigger>
            <TabsTrigger value="assign-drills" className="text-xs sm:text-sm py-2" data-testid="tab-trainer-assign">
              <ClipboardList className="w-4 h-4 mr-1 shrink-0" />
              <span className="truncate">Assign</span>
            </TabsTrigger>
            <TabsTrigger value="training-logs" className="text-xs sm:text-sm py-2" data-testid="tab-trainer-logs">
              <FileText className="w-4 h-4 mr-1 shrink-0" />
              <span className="truncate">Logs</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="text-xs sm:text-sm py-2" data-testid="tab-trainer-chat">
              <MessageCircle className="w-4 h-4 mr-1 shrink-0" />
              <span className="truncate">Chat</span>
            </TabsTrigger>
            <TabsTrigger value="videos" className="text-xs sm:text-sm py-2" data-testid="tab-trainer-videos">
              <Video className="w-4 h-4 mr-1 shrink-0" />
              <span className="truncate">Videos</span>
            </TabsTrigger>
            <TabsTrigger value="invite" className="text-xs sm:text-sm py-2" data-testid="tab-trainer-invite">
              <Mail className="w-4 h-4 mr-1 shrink-0" />
              <span className="truncate">Invite</span>
            </TabsTrigger>
            <TabsTrigger value="join-group" className="text-xs sm:text-sm py-2" data-testid="tab-join-group">
              <UserPlus className="w-4 h-4 mr-1 shrink-0" />
              <span className="truncate">Join</span>
            </TabsTrigger>
            <TabsTrigger value="my-assignments" className="text-xs sm:text-sm py-2" data-testid="tab-trainer-my-assignments">
              <BookOpen className="w-4 h-4 mr-1 shrink-0" />
              <span className="truncate">Assigned</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="admin">
          <AdminTab initialSection={initialAdminSub} />
        </TabsContent>
        <TabsContent value="roster">
          <RosterTab />
        </TabsContent>
        <TabsContent value="players">
          <PlayersTab />
        </TabsContent>
        <TabsContent value="assign-drills">
          <AssignDrillsTab />
        </TabsContent>
        <TabsContent value="training-logs">
          <TrainingLogsTab />
        </TabsContent>
        <TabsContent value="chat">
          <ChatTab />
        </TabsContent>
        <TabsContent value="videos">
          <VideosTab />
        </TabsContent>
        <TabsContent value="invite">
          <InvitePlayersTab />
        </TabsContent>
        <TabsContent value="join-group">
          <JoinGroupTab />
        </TabsContent>
        <TabsContent value="my-assignments">
          <MyAssignmentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
