import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  CheckCircle,
  Circle,
  Calendar,
  Search,
  Copy,
  ExternalLink,
  UserMinus,
  Edit2,
  UserCheck,
  Check,
  Shield,
  ChevronRight,
  Clock,
  Play,
  X,
  Mail,
  Eye,
  Video,
  MessageCircle,
} from "lucide-react";
import { insertTrainerTeamSchema } from "@shared/schema";

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

interface Invitation {
  id: string;
  teamId: string;
  invitedBy: string;
  email: string;
  playerName?: string;
  status: string;
  createdAt: string;
}

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

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const PLAYER_POSITIONS = ["PG", "SG", "SF", "PF", "C", "Guard", "Wing", "Forward", "Bigs"];
const PLAYER_AGES = ["6U", "7U", "8U", "9U", "10U", "11U", "12U", "13U", "14U", "15U", "16U", "17U", "18U", "Adult"];
const TEAM_TYPES = ["None", "Rec", "Club/AAU", "Middle School", "MS - 7th Grade", "MS - 8th Grade", "High School", "HS - Freshman", "HS - JV", "HS - Varsity", "College", "Post Grad", "Pro"];
const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced", "Elite"];
const CLASS_OPTIONS = Array.from({ length: 11 }, (_, i) => String(new Date().getFullYear() + i));
const AGE_GROUP_OPTIONS = ["6U", "7U", "8U", "9U", "10U", "11U", "12U", "13U", "14U", "15U", "16U", "17U", "18U", "Adult"];

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

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "in-progress": return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-green-500";
      case "in-progress": return "text-yellow-500";
      default: return "text-muted-foreground";
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
                            {a.teamName && <span className="text-xs text-muted-foreground">{a.teamName}</span>}
                            {a.assignedTo && !a.teamId && <Badge variant="outline" className="no-default-hover-elevate text-[10px]">Direct</Badge>}
                          </div>
                          {a.dueDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              Due: {new Date(a.dueDate).toLocaleDateString()}
                            </p>
                          )}
                          {a.notes && <p className="text-xs text-muted-foreground mt-1 italic">{a.notes}</p>}
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
                          {v.description && <p className="text-xs text-muted-foreground mt-1">{v.description}</p>}
                          {v.createdAt && <p className="text-xs text-muted-foreground mt-0.5">{new Date(v.createdAt).toLocaleDateString()}</p>}
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
                  {!player.linkedUserId && <p className="text-xs mt-1">This player doesn't have a linked account yet.</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  {chatMessages.map((msg) => {
                    const isFromCoach = msg.senderId !== player.linkedUserId;
                    return (
                      <div key={msg.id} className={`flex ${isFromCoach ? "justify-end" : "justify-start"}`} data-testid={`message-${msg.id}`}>
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

export default function TrainerRoster() {
  const { toast } = useToast();

  const [activePanel, setActivePanel] = useState<"teams" | "groups">("teams");
  const [selectedTeam, setSelectedTeam] = useState<CoachTeam | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<TrainerGroup | null>(null);

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
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupAgeGroup, setGroupAgeGroup] = useState<string[]>([]);
  const [groupPosition, setGroupPosition] = useState<string[]>([]);
  const [groupLevel, setGroupLevel] = useState<string[]>([]);
  const [groupPlayerClass, setGroupPlayerClass] = useState<string[]>([]);

  const [addPlayersOpen, setAddPlayersOpen] = useState(false);
  const [addPlayersToGroupOpen, setAddPlayersToGroupOpen] = useState(false);
  const [rosterAddPlayerIds, setRosterAddPlayerIds] = useState<string[]>([]);
  const [rosterPlayerSearch, setRosterPlayerSearch] = useState("");

  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<TrainerPlayerData | null>(null);
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null);
  const [newPlayerTeamIds, setNewPlayerTeamIds] = useState<string[]>([]);

  const [removeMember, setRemoveMember] = useState<{ teamId: string; userId: string; name: string } | null>(null);
  const [editingMember, setEditingMember] = useState<RosterMember | null>(null);
  const [editPosition, setEditPosition] = useState("");
  const [editJersey, setEditJersey] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePlayerName, setInvitePlayerName] = useState("");
  const [inviteTargetId, setInviteTargetId] = useState("");


  const [detailPlayer, setDetailPlayer] = useState<TrainerPlayerData | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState("all");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [bulkAssignTeamOpen, setBulkAssignTeamOpen] = useState(false);
  const [bulkAssignGroupOpen, setBulkAssignGroupOpen] = useState(false);
  const [bulkTeamId, setBulkTeamId] = useState("");
  const [bulkGroupId, setBulkGroupId] = useState("");

  const addForm = useForm<TrainerPlayerForm>({
    resolver: zodResolver(trainerPlayerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", position: "", jerseyNumber: "", ageGroup: "", teamType: "", gradYear: "", notes: "" },
  });

  const editForm = useForm<TrainerPlayerForm>({
    resolver: zodResolver(trainerPlayerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", position: "", jerseyNumber: "", ageGroup: "", teamType: "", gradYear: "", notes: "" },
  });

  const teamForm = useForm<CreateTeamForm>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { name: "", description: "", seasonYear: currentYear, ageGroup: "", position: "", level: "", playerClass: "" },
  });

  const { data: teams, isLoading: teamsLoading } = useQuery<CoachTeam[]>({
    queryKey: ["/api/coach/teams"],
  });

  const { data: groups, isLoading: groupsLoading } = useQuery<TrainerGroup[]>({
    queryKey: ["/api/trainer/groups"],
  });

  const { data: allPlayers, isLoading: playersLoading } = useQuery<TrainerPlayerData[]>({
    queryKey: ["/api/trainer-players"],
  });

  const { data: teamMembers, isLoading: teamMembersLoading } = useQuery<RosterMember[]>({
    queryKey: ["/api/coach/teams", selectedTeam?.id, "members"],
    enabled: !!selectedTeam,
  });

  const { data: groupMembers } = useQuery<PlayerMember[]>({
    queryKey: ["/api/trainer/groups", selectedGroup?.id, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/trainer/groups/${selectedGroup!.id}/members`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: !!selectedGroup,
  });


  const { data: invitations, isLoading: invitationsLoading } = useQuery<Invitation[]>({
    queryKey: ["/api/invitations", inviteOpen ? (selectedTeam?.id || selectedGroup?.id) : ""],
    enabled: inviteOpen && !!(selectedTeam?.id || selectedGroup?.id),
  });

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
      if (selectedTeam?.id === deleteTeamId) setSelectedTeam(null);
      toast({ title: "Team deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete team", description: error.message, variant: "destructive" });
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
      if (selectedGroup?.id === deleteGroupId) setSelectedGroup(null);
      toast({ title: "Group deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete group", description: error.message, variant: "destructive" });
    },
  });

  const removeGroupMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      apiRequest("DELETE", `/api/trainer/groups/${groupId}/members/${userId}`),
    onSuccess: () => {
      if (selectedGroup) {
        queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups", selectedGroup.id, "members"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups"] });
      toast({ title: "Member removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove member", description: error.message, variant: "destructive" });
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

  const createPlayerMutation = useMutation({
    mutationFn: async (data: TrainerPlayerForm) => {
      const res = await apiRequest("POST", "/api/trainer-players", { ...data, teamIds: newPlayerTeamIds });
      return res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coach/teams"] });
      setAddPlayerOpen(false);
      addForm.reset();
      setNewPlayerTeamIds([]);
      const parts: string[] = [];
      if (result?.autoAssignedTeams?.length) parts.push(`Teams: ${result.autoAssignedTeams.join(", ")}`);
      if (result?.autoAssignedGroups?.length) parts.push(`Groups: ${result.autoAssignedGroups.join(", ")}`);
      toast({ title: "Player added!", description: parts.length ? `Assigned to ${parts.join(" | ")}` : undefined });
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
        toast({ title: "Player updated!" });
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

  const inviteMutation = useMutation({
    mutationFn: (data: { teamId: string; email: string; playerName?: string }) =>
      apiRequest("POST", "/api/invitations", data),
    onSuccess: () => {
      const entityId = selectedTeam?.id || selectedGroup?.id;
      queryClient.invalidateQueries({ queryKey: ["/api/invitations", entityId] });
      setInviteEmail("");
      setInvitePlayerName("");
      toast({ title: "Invitation sent!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send invitation", description: error.message, variant: "destructive" });
    },
  });

  const deleteInviteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/invitations/${id}`),
    onSuccess: () => {
      const entityId = selectedTeam?.id || selectedGroup?.id;
      queryClient.invalidateQueries({ queryKey: ["/api/invitations", entityId] });
      toast({ title: "Invitation removed" });
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

  const addPlayersToGroupMutation = useMutation({
    mutationFn: ({ groupId, playerIds }: { groupId: string; playerIds: string[] }) =>
      apiRequest("POST", "/api/trainer-players/bulk-assign", { playerIds, groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-players"] });
      if (selectedGroup) {
        queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups", selectedGroup.id, "members"] });
      }
      setAddPlayersToGroupOpen(false);
      setRosterAddPlayerIds([]);
      setRosterPlayerSearch("");
      toast({ title: "Players added to group!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add players", description: error.message, variant: "destructive" });
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

  const resetGroupForm = () => {
    setGroupName("");
    setGroupDescription("");
    setGroupAgeGroup([]);
    setGroupPosition([]);
    setGroupLevel([]);
    setGroupPlayerClass([]);
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

  const openEditGroup = (group: TrainerGroup) => {
    setEditGroupId(group.id);
    setGroupName(group.name);
    setGroupDescription(group.description || "");
    setGroupAgeGroup(group.ageGroup ? group.ageGroup.split(",").map(s => s.trim()).filter(Boolean) : []);
    setGroupPosition(group.position ? group.position.split(",").map(s => s.trim()).filter(Boolean) : []);
    setGroupLevel(group.level ? group.level.split(",").map(s => s.trim()).filter(Boolean) : []);
    setGroupPlayerClass(group.playerClass ? group.playerClass.split(",").map(s => s.trim()).filter(Boolean) : []);
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

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Code copied!" });
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

  const handleInvite = () => {
    const entityId = selectedTeam?.id || selectedGroup?.id || inviteTargetId;
    if (!entityId || !inviteEmail.trim()) return;
    inviteMutation.mutate({ teamId: entityId, email: inviteEmail.trim(), playerName: invitePlayerName.trim() || undefined });
  };

  const availablePlayersForRoster = useMemo(() => {
    if (!allPlayers || !selectedTeam) return [];
    const alreadyAssigned = new Set(
      allPlayers.filter(p => (p.teams || []).some(t => t.teamId === selectedTeam.id)).map(p => p.id)
    );
    let available = allPlayers.filter(p => !alreadyAssigned.has(p.id));
    if (rosterPlayerSearch) {
      const q = rosterPlayerSearch.toLowerCase();
      available = available.filter(p => `${p.firstName} ${p.lastName || ""}`.toLowerCase().includes(q));
    }
    return available;
  }, [allPlayers, selectedTeam, rosterPlayerSearch]);

  const availablePlayersForGroup = useMemo(() => {
    if (!allPlayers || !selectedGroup) return [];
    const alreadyInGroup = new Set(
      allPlayers.filter(p => (p.groups || []).some(g => g.groupId === selectedGroup.id)).map(p => p.id)
    );
    let available = allPlayers.filter(p => !alreadyInGroup.has(p.id));
    if (rosterPlayerSearch) {
      const q = rosterPlayerSearch.toLowerCase();
      available = available.filter(p => `${p.firstName} ${p.lastName || ""}`.toLowerCase().includes(q));
    }
    return available;
  }, [allPlayers, selectedGroup, rosterPlayerSearch]);

  const filteredPlayers = useMemo(() => {
    if (!allPlayers) return [];
    return allPlayers.filter((p) => {
      const nameMatch = !searchQuery || `${p.firstName} ${p.lastName || ""}`.toLowerCase().includes(searchQuery.toLowerCase());
      const posGroupMap: Record<string, string[]> = {
        "Guard": ["PG", "SG", "Guard"],
        "Wing": ["SG", "SF", "Wing"],
        "Forward": ["SF", "PF", "Forward"],
        "Bigs": ["PF", "C", "Bigs"],
      };
      const posMatch = positionFilter === "all" || p.position === positionFilter || (posGroupMap[positionFilter]?.includes(p.position || "")) || (p.position && posGroupMap[p.position]?.includes(positionFilter));
      const ageMatch = ageFilter === "all" || p.ageGroup === ageFilter;
      return nameMatch && posMatch && ageMatch;
    });
  }, [allPlayers, searchQuery, positionFilter, ageFilter]);

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

  const toggleNewPlayerTeam = (teamId: string) => {
    setNewPlayerTeamIds(prev => prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]);
  };

  const positionOptions = ["PG", "SG", "SF", "PF", "C", "Guard", "Wing", "Forward", "Bigs", "G", "F", "G/F"];

  const selectedEntityName = selectedTeam?.name || selectedGroup?.name || "";
  const selectedEntityCode = selectedTeam?.teamCode || selectedGroup?.teamCode || "";

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
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold" data-testid="text-roster-page-heading">Roster</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setInviteEmail(""); setInvitePlayerName(""); setInviteOpen(true); }} data-testid="button-top-invite-player">
            <Mail className="w-4 h-4" />
            Invite Player
          </Button>
          <Button onClick={() => { addForm.reset(); setNewPlayerTeamIds([]); setAddPlayerOpen(true); }} data-testid="button-add-player">
            <Plus className="w-4 h-4" />
            Add Player
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <Tabs value={activePanel} onValueChange={(v) => { setActivePanel(v as "teams" | "groups"); setSelectedTeam(null); setSelectedGroup(null); }}>
            <TabsList className="w-full" data-testid="tabs-roster-type">
              <TabsTrigger value="teams" className="flex-1" data-testid="tab-teams">
                <Shield className="w-4 h-4 mr-1" />
                Teams
              </TabsTrigger>
              <TabsTrigger value="groups" className="flex-1" data-testid="tab-groups">
                <Users className="w-4 h-4 mr-1" />
                Groups
              </TabsTrigger>
            </TabsList>

            <TabsContent value="teams" className="space-y-3 mt-3">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => { resetTeamForm(); setEditTeamId(null); setCreateTeamOpen(true); }}
                data-testid="button-create-team"
              >
                <Plus className="w-4 h-4" />
                New Team
              </Button>

              {teamsLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
                </div>
              ) : !teams?.length ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No teams yet.</p>
                </div>
              ) : (
                teams.map((team) => (
                  <Card
                    key={team.id}
                    className={`cursor-pointer transition-colors ${selectedTeam?.id === team.id ? "ring-2 ring-primary" : ""}`}
                    onClick={() => { setSelectedTeam(selectedTeam?.id === team.id ? null : team); setSelectedGroup(null); }}
                    data-testid={`card-team-${team.id}`}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            <p className="text-sm font-medium truncate" data-testid={`text-team-name-${team.id}`}>{team.name}</p>
                            {selectedTeam?.id === team.id && <ChevronRight className="w-3 h-3 text-primary shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {team.seasonYear && (
                              <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">
                                {team.seasonYear}-{(team.seasonYear + 1).toString().slice(-2)}
                              </Badge>
                            )}
                            {team.ageGroup && <Badge variant="outline" className="no-default-hover-elevate text-[10px]">{team.ageGroup}</Badge>}
                            {team.level && team.level !== "none" && <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">{team.level}</Badge>}
                          </div>
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            <Badge variant="outline" className="no-default-hover-elevate font-mono text-[10px]">{team.teamCode}</Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); copyCode(team.teamCode); }}
                              data-testid={`button-copy-team-code-${team.id}`}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Badge variant="secondary" className="no-default-hover-elevate text-[10px] ml-auto">
                              <Users className="w-3 h-3 mr-0.5" />
                              {team.memberCount}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); openEditTeam(team); setCreateTeamOpen(true); }}
                            data-testid={`button-edit-team-${team.id}`}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); setDeleteTeamId(team.id); }}
                            data-testid={`button-delete-team-${team.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="groups" className="space-y-3 mt-3">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => { resetGroupForm(); setEditGroupId(null); setCreateGroupOpen(true); }}
                data-testid="button-create-group"
              >
                <Plus className="w-4 h-4" />
                New Group
              </Button>

              {groupsLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
                </div>
              ) : !groups?.length ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No groups yet.</p>
                </div>
              ) : (
                groups.map((group) => {
                  const groupMemberCount = allPlayers?.filter(p => p.groups?.some((g: any) => g.groupId === group.id)).length || 0;
                  return (
                  <Card
                    key={group.id}
                    className={`cursor-pointer transition-colors ${selectedGroup?.id === group.id ? "ring-2 ring-primary" : ""}`}
                    onClick={() => { setSelectedGroup(selectedGroup?.id === group.id ? null : group); setSelectedTeam(null); }}
                    data-testid={`card-group-${group.id}`}
                  >
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 flex-wrap">
                            <p className="text-sm font-medium truncate" data-testid={`text-group-name-${group.id}`}>{group.name}</p>
                            {selectedGroup?.id === group.id && <ChevronRight className="w-3 h-3 text-primary shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {group.ageGroup && <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">Age {group.ageGroup}</Badge>}
                            {group.position && <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">{group.position}</Badge>}
                            {group.level && <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">{group.level}</Badge>}
                          </div>
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            <Badge variant="outline" className="no-default-hover-elevate font-mono text-[10px]">{group.teamCode}</Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); copyCode(group.teamCode); }}
                              data-testid={`button-copy-group-code-${group.id}`}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Badge variant="secondary" className="no-default-hover-elevate text-[10px] ml-auto">
                              <Users className="w-3 h-3 mr-0.5" />
                              {groupMemberCount}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); openEditGroup(group); setCreateGroupOpen(true); }}
                            data-testid={`button-edit-group-${group.id}`}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); setDeleteGroupId(group.id); }}
                            data-testid={`button-delete-group-${group.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {selectedTeam ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base" data-testid="text-roster-members-heading">
                  {selectedTeam.name}
                  {selectedTeam.seasonYear && ` (${selectedTeam.seasonYear}-${(selectedTeam.seasonYear + 1).toString().slice(-2)})`}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setInviteEmail(""); setInvitePlayerName(""); setInviteOpen(true); }}
                    data-testid="button-invite-email"
                  >
                    <Mail className="w-4 h-4" />
                    Invite
                  </Button>
                  <Button size="sm" onClick={() => { setRosterAddPlayerIds([]); setRosterPlayerSearch(""); setAddPlayersOpen(true); }} data-testid="button-roster-add-players">
                    <UserPlus className="w-4 h-4" />
                    Add Players
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {teamMembersLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded" />)}
                  </div>
                ) : !teamMembers?.length ? (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-roster-members">
                    No players on the roster yet. Add players or share the team code.
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
                    {teamMembers.map((member) => (
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
                              setDetailPlayer(found);
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
                              setDetailPlayer(synthPlayer);
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
          ) : selectedGroup ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base" data-testid="text-group-members-heading">
                  {selectedGroup.name}
                  {selectedGroup.ageGroup && ` (${selectedGroup.ageGroup})`}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setInviteEmail(""); setInvitePlayerName(""); setInviteOpen(true); }}
                    data-testid="button-group-invite-email"
                  >
                    <Mail className="w-4 h-4" />
                    Invite
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => { setRosterAddPlayerIds([]); setRosterPlayerSearch(""); setAddPlayersToGroupOpen(true); }}
                    data-testid="button-group-add-players"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Players
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!groupMembers?.length ? (
                  <p className="text-sm text-muted-foreground" data-testid="text-no-group-members">
                    No members in this group yet. Share the group code to invite players.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {groupMembers.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                        data-testid={`row-group-member-${member.userId}`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.profileImageUrl} />
                          <AvatarFallback className="text-xs">
                            {(member.firstName?.[0] || '') + (member.lastName?.[0] || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{member.firstName} {member.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                        {member.position && <Badge variant="outline" className="no-default-hover-elevate text-xs">{member.position}</Badge>}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeGroupMemberMutation.mutate({ groupId: selectedGroup.id, userId: member.userId })}
                          data-testid={`button-remove-group-member-${member.userId}`}
                        >
                          <UserMinus className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Select a team or group to view members</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-base" data-testid="text-all-players-heading">All Players</CardTitle>
              <span className="text-sm text-muted-foreground">{allPlayers?.length || 0} total</span>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search players..."
                    className="pl-9"
                    data-testid="input-search-players"
                  />
                </div>
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="w-[130px]" data-testid="select-filter-position">
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
                  <SelectTrigger className="w-[110px]" data-testid="select-filter-age">
                    <SelectValue placeholder="All Ages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ages</SelectItem>
                    {PLAYER_AGES.map((age) => (
                      <SelectItem key={age} value={age}>{age}</SelectItem>
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
                      <Button size="sm" variant="outline" onClick={() => setBulkAssignTeamOpen(true)} data-testid="button-bulk-assign-team">
                        <Shield className="w-4 h-4" />
                        Assign {selectedPlayerIds.size} to Team
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setBulkAssignGroupOpen(true)} data-testid="button-bulk-assign-group">
                        <Users className="w-4 h-4" />
                        Assign {selectedPlayerIds.size} to Group
                      </Button>
                    </>
                  )}
                </div>
              )}

              {playersLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
                </div>
              ) : !allPlayers?.length ? (
                <div className="py-8 text-center text-muted-foreground" data-testid="text-no-players">
                  <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No players yet. Add your first player to get started.</p>
                </div>
              ) : !filteredPlayers.length ? (
                <div className="py-6 text-center text-muted-foreground" data-testid="text-no-matching-players">
                  <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No players match your search.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
                      data-testid={`card-player-${player.id}`}
                    >
                      <div className="pt-0.5">
                        <Checkbox
                          checked={selectedPlayerIds.has(player.id)}
                          onCheckedChange={() => togglePlayer(player.id)}
                          data-testid={`checkbox-player-${player.id}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailPlayer(player)} data-testid={`button-view-player-${player.id}`}>
                        <div className="flex items-center gap-1 flex-wrap">
                          <p className="text-sm font-medium hover:underline" data-testid={`text-player-name-${player.id}`}>
                            {player.firstName} {player.lastName || ""}
                          </p>
                          {player.position && <Badge variant="outline" className="no-default-hover-elevate text-[10px]">{player.position}</Badge>}
                          {player.jerseyNumber && <span className="text-[10px] font-mono text-muted-foreground">#{player.jerseyNumber}</span>}
                          {player.ageGroup && <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">Age {player.ageGroup}</Badge>}
                          {player.gradYear && <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">Class of {player.gradYear}</Badge>}
                        </div>
                        {player.email && <p className="text-xs text-muted-foreground mt-0.5">{player.email}</p>}
                        {(player.teams || []).length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">Teams:</span>
                            {(player.teams || []).map((t) => (
                              <Badge
                                key={t.id}
                                variant="default"
                                className="no-default-hover-elevate text-[10px] cursor-pointer"
                                data-testid={`badge-player-team-${t.id}`}
                                onClick={(e) => { e.stopPropagation(); removeTeamAssignmentMutation.mutate(t.id); }}
                                title={`Click to remove from ${t.teamName}`}
                              >
                                {t.teamName}
                                <Trash2 className="w-2 h-2 ml-0.5" />
                              </Badge>
                            ))}
                          </div>
                        )}
                        {player.groups.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">Groups:</span>
                            {player.groups.map((g) => (
                              <Badge
                                key={g.id}
                                variant="default"
                                className="no-default-hover-elevate text-[10px] cursor-pointer bg-secondary text-secondary-foreground"
                                data-testid={`badge-player-group-${g.id}`}
                                onClick={(e) => { e.stopPropagation(); removeGroupAssignmentMutation.mutate(g.id); }}
                                title={`Click to remove from ${g.groupName}`}
                              >
                                {g.groupName}
                                <Trash2 className="w-2 h-2 ml-0.5" />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="ghost" onClick={() => openEditPlayer(player)} data-testid={`button-edit-player-${player.id}`}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeletePlayerId(player.id)} data-testid={`button-delete-player-${player.id}`}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={createTeamOpen} onOpenChange={(open) => { if (!open) { setCreateTeamOpen(false); setEditTeamId(null); } }}>
        <DialogContent data-testid="dialog-create-team">
          <DialogHeader>
            <DialogTitle>{editTeamId ? "Edit Team" : "Create Team"}</DialogTitle>
            <DialogDescription>{editTeamId ? "Update team details." : "Create a new team and share the code with your players."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Team Name</label>
              <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="e.g. Eagles Varsity" data-testid="input-team-name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Season Year</label>
                <Select value={teamSeasonYear} onValueChange={setTeamSeasonYear}>
                  <SelectTrigger data-testid="select-season-year">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}-{(y + 1).toString().slice(-2)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Age Group</label>
                <MultiSelect
                  options={AGE_GROUP_OPTIONS}
                  selected={teamAgeGroup}
                  onChange={setTeamAgeGroup}
                  placeholder="Select age groups"
                  data-testid="select-team-age-group"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea value={teamDescription} onChange={(e) => setTeamDescription(e.target.value)} placeholder="Optional team description..." data-testid="input-team-description" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Position</label>
                <MultiSelect options={PLAYER_POSITIONS} selected={teamPosition} onChange={setTeamPosition} placeholder="Select" data-testid="select-team-position" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Level</label>
                <MultiSelect options={LEVEL_OPTIONS} selected={teamLevel} onChange={setTeamLevel} placeholder="Select" data-testid="select-team-level" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Class</label>
                <MultiSelect options={CLASS_OPTIONS} selected={teamPlayerClass} onChange={setTeamPlayerClass} placeholder="Select" data-testid="select-team-class" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleTeamSubmit} disabled={!teamName.trim() || createTeamMutation.isPending || updateTeamMutation.isPending} data-testid="button-submit-team">
                {(createTeamMutation.isPending || updateTeamMutation.isPending) ? "Saving..." : editTeamId ? "Save Changes" : "Create Team"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createGroupOpen} onOpenChange={(open) => { if (!open) { setCreateGroupOpen(false); setEditGroupId(null); } }}>
        <DialogContent data-testid="dialog-create-group">
          <DialogHeader>
            <DialogTitle>{editGroupId ? "Edit Group" : "Create Group"}</DialogTitle>
            <DialogDescription>{editGroupId ? "Update group details." : "Create a new training group."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Group Name</label>
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Guards Training" data-testid="input-group-name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description (optional)</label>
              <Textarea value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} placeholder="Optional group description..." data-testid="input-group-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Age Group</label>
                <MultiSelect options={AGE_GROUP_OPTIONS} selected={groupAgeGroup} onChange={setGroupAgeGroup} placeholder="Select" data-testid="select-group-age" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Position</label>
                <MultiSelect options={PLAYER_POSITIONS} selected={groupPosition} onChange={setGroupPosition} placeholder="Select" data-testid="select-group-position" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Level</label>
                <MultiSelect options={LEVEL_OPTIONS} selected={groupLevel} onChange={setGroupLevel} placeholder="Select" data-testid="select-group-level" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Class</label>
                <MultiSelect options={CLASS_OPTIONS} selected={groupPlayerClass} onChange={setGroupPlayerClass} placeholder="Select" data-testid="select-group-class" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleGroupSubmit} disabled={!groupName.trim() || createGroupMutation.isPending || updateGroupMutation.isPending} data-testid="button-submit-group">
                {(createGroupMutation.isPending || updateGroupMutation.isPending) ? "Saving..." : editGroupId ? "Save Changes" : "Create Group"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

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
                  {allPlayers?.length ? "All players are already on this team." : "No players created yet."}
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
                      {player.position && <Badge variant="outline" className="no-default-hover-elevate text-xs">{player.position}</Badge>}
                      {player.jerseyNumber && <span className="text-xs text-muted-foreground">#{player.jerseyNumber}</span>}
                    </div>
                    {rosterAddPlayerIds.includes(player.id) && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
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

      <Dialog open={addPlayersToGroupOpen} onOpenChange={setAddPlayersToGroupOpen}>
        <DialogContent data-testid="dialog-group-add-players">
          <DialogHeader>
            <DialogTitle>Add Players to {selectedGroup?.name}</DialogTitle>
            <DialogDescription>Select players to add to this group.</DialogDescription>
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
                  data-testid="input-group-player-search"
                />
              </div>
            )}
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {availablePlayersForGroup.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {allPlayers?.length ? "All players are already in this group." : "No players created yet."}
                </p>
              ) : (
                availablePlayersForGroup.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between gap-2 p-2 rounded-md border cursor-pointer ${rosterAddPlayerIds.includes(player.id) ? "border-primary bg-primary/10" : "hover-elevate"}`}
                    onClick={() => setRosterAddPlayerIds(prev => prev.includes(player.id) ? prev.filter(id => id !== player.id) : [...prev, player.id])}
                    data-testid={`button-group-pick-player-${player.id}`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{player.firstName} {player.lastName || ""}</span>
                      {player.position && <Badge variant="outline" className="no-default-hover-elevate text-xs">{player.position}</Badge>}
                      {player.jerseyNumber && <span className="text-xs text-muted-foreground">#{player.jerseyNumber}</span>}
                    </div>
                    {rosterAddPlayerIds.includes(player.id) && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => selectedGroup && addPlayersToGroupMutation.mutate({ groupId: selectedGroup.id, playerIds: rosterAddPlayerIds })}
              disabled={rosterAddPlayerIds.length === 0 || addPlayersToGroupMutation.isPending}
              data-testid="button-group-confirm-add-players"
            >
              {addPlayersToGroupMutation.isPending ? "Adding..." : `Add ${rosterAddPlayerIds.length} Player${rosterAddPlayerIds.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addPlayerOpen} onOpenChange={setAddPlayerOpen}>
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
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Jersey Number</label>
              <Input value={editJersey} onChange={(e) => setEditJersey(e.target.value)} placeholder="e.g. 23" maxLength={3} data-testid="input-edit-jersey" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMember(null)} data-testid="button-cancel-edit-member">Cancel</Button>
            <Button onClick={saveEditMember} disabled={updateMemberMutation.isPending} data-testid="button-save-edit-member">
              {updateMemberMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); if (!open) setInviteTargetId(""); }}>
        <DialogContent data-testid="dialog-invite">
          <DialogHeader>
            <DialogTitle>Invite Players</DialogTitle>
            <DialogDescription>
              {selectedEntityName ? `Send an invitation to join ${selectedEntityName}.` : "Send an invitation to join a team or group."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedTeam && !selectedGroup && (
              <div>
                <label className="text-sm font-medium">Team / Group</label>
                <Select value={inviteTargetId} onValueChange={setInviteTargetId}>
                  <SelectTrigger className="mt-1" data-testid="select-invite-target">
                    <SelectValue placeholder="Select team or group" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} (Team)</SelectItem>
                    ))}
                    {groups?.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name} (Group)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium">Player Email</label>
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="player@email.com"
                  type="email"
                  className="mt-1"
                  data-testid="input-invite-email"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Player Name (optional)</label>
                <Input
                  value={invitePlayerName}
                  onChange={(e) => setInvitePlayerName(e.target.value)}
                  placeholder="First Last"
                  className="mt-1"
                  data-testid="input-invite-name"
                />
              </div>
            </div>
            <Button
              onClick={handleInvite}
              disabled={!inviteEmail.trim() || (!selectedTeam && !selectedGroup && !inviteTargetId) || inviteMutation.isPending}
              className="w-full sm:w-auto"
              data-testid="button-send-invite"
            >
              <Mail className="w-4 h-4" />
              {inviteMutation.isPending ? "Sending..." : "Send Invite"}
            </Button>

            {selectedEntityCode && (
              <div className="space-y-2 pt-2 border-t">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1 flex-wrap">
                  <Copy className="w-3 h-3" />
                  Or share code: <Badge variant="outline" className="no-default-hover-elevate font-mono text-xs">{selectedEntityCode}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => copyCode(selectedEntityCode)} data-testid="button-copy-invite-code">
                    <Copy className="w-3 h-3" />
                  </Button>
                </span>
              </div>
            )}

            {invitations && invitations.length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <span className="text-sm font-medium text-muted-foreground">Pending Invitations</span>
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50" data-testid={`card-invitation-${inv.id}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{inv.playerName || inv.email}</p>
                      <p className="text-xs text-muted-foreground">{inv.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={inv.status === "accepted" ? "default" : "outline"} className="no-default-hover-elevate text-xs">{inv.status}</Badge>
                      <Button size="icon" variant="ghost" onClick={() => deleteInviteMutation.mutate(inv.id)} data-testid={`button-delete-invite-${inv.id}`}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                      {team.name}{team.seasonYear ? ` (${team.seasonYear})` : ""}
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

      <AlertDialog open={!!deleteTeamId} onOpenChange={(open) => !open && setDeleteTeamId(null)}>
        <AlertDialogContent data-testid="dialog-delete-team-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the team and its roster. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-team">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTeamId && deleteTeamMutation.mutate(deleteTeamId)} data-testid="button-confirm-delete-team">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteGroupId} onOpenChange={(open) => !open && setDeleteGroupId(null)}>
        <AlertDialogContent data-testid="dialog-delete-group-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the group. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-group">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteGroupId && deleteGroupMutation.mutate(deleteGroupId)} data-testid="button-confirm-delete-group">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!removeMember} onOpenChange={(open) => !open && setRemoveMember(null)}>
        <AlertDialogContent data-testid="dialog-remove-member-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Roster?</AlertDialogTitle>
            <AlertDialogDescription>Remove {removeMember?.name} from the team roster?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove-member">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => removeMember && removeMemberMutation.mutate(removeMember)} data-testid="button-confirm-remove-member">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletePlayerId} onOpenChange={(open) => !open && setDeletePlayerId(null)}>
        <AlertDialogContent data-testid="dialog-delete-player-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Player?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this player and remove them from all teams and groups.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-player">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletePlayerId && deletePlayerMutation.mutate(deletePlayerId)} data-testid="button-confirm-delete-player">Delete</AlertDialogAction>
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
