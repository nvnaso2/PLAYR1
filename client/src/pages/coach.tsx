import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Checkbox } from "@/components/ui/checkbox";
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
  Shield,
  LogOut,
  FileText,
  Edit2,
  MessageCircle,
  Video,
  Mail,
  Send,
  UserCheck,
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Settings,
} from "lucide-react";
import { insertTrainerTeamSchema, insertDrillAssignmentSchema } from "@shared/schema";

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

interface Assignment {
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

interface PlayerTeam {
  id: string;
  name: string;
  description: string;
  coachName: string;
  joinedAt: string;
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
  teamId?: string;
  teamName?: string;
  seasonYear?: number;
  position?: string | null;
  ageGroup?: string | null;
}

interface ChatContact {
  id: string;
  name: string;
  image?: string;
  teamName: string;
  teamId: string;
  position?: string;
  jerseyNumber?: string;
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

interface CoachPlayerData {
  id: string;
  coachId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  position: string | null;
  jerseyNumber: string | null;
  ageGroup: string | null;
  teamType: string | null;
  notes: string | null;
  linkedUserId: string | null;
  createdAt: string;
  updatedAt: string;
  teams: Array<{ id: string; coachPlayerId: string; teamId: string; teamName: string; seasonYear?: number | null; ageGroup?: string | null; position: string | null; jerseyNumber: string | null; assignedAt: string }>;
}

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

const joinTeamSchema = z.object({
  teamCode: z.string().min(1, "Team code is required"),
});

const assignDrillSchema = insertDrillAssignmentSchema
  .pick({ drillId: true, teamId: true, notes: true })
  .extend({
    drillId: z.string().min(1, "Select a drill"),
    teamId: z.string().min(1, "Select a team"),
    dueDate: z.string().optional().default(""),
    notes: z.string().max(500).optional().default(""),
  });

type CreateTeamForm = z.infer<typeof createTeamSchema>;
type JoinTeamForm = z.infer<typeof joinTeamSchema>;
type AssignDrillForm = z.infer<typeof assignDrillSchema>;

function RosterTab() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<CoachTeam | null>(null);
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const [removeMember, setRemoveMember] = useState<{ teamId: string; userId: string; name: string } | null>(null);
  const [editingMember, setEditingMember] = useState<RosterMember | null>(null);
  const [editPosition, setEditPosition] = useState("");
  const [editJersey, setEditJersey] = useState("");

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

  const createTeamMutation = useMutation({
    mutationFn: (data: CreateTeamForm) => apiRequest("POST", "/api/coach/teams", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/teams"] });
      setCreateOpen(false);
      form.reset();
      toast({ title: "Team created successfully!" });
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
        <Button onClick={() => setCreateOpen(true)} data-testid="button-create-team">
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
          <CardHeader>
            <CardTitle className="text-base" data-testid="text-roster-members-heading">
              Roster - {selectedTeam.name}
              {selectedTeam.seasonYear && ` (${selectedTeam.seasonYear}-${(selectedTeam.seasonYear + 1).toString().slice(-2)})`}
            </CardTitle>
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
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-medium truncate" data-testid={`text-roster-name-${member.userId}`}>
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
    </div>
  );
}

const DRILL_CATEGORIES = ["ball-handling", "shooting", "passing", "finishing", "defense", "film-session", "workouts"];
const DRILL_DIFFICULTIES = ["beginner", "intermediate", "advanced"];

function AssignDrillsTab() {
  const { toast } = useToast();
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignStep, setAssignStep] = useState<"choose" | "drill" | "target" | "details">("choose");
  const [assignPath, setAssignPath] = useState<"drill-first" | "target-first" | null>(null);
  const [selectedDrill, setSelectedDrill] = useState<DrillItem | null>(null);
  const [assignTargetType, setAssignTargetType] = useState<"team" | "player">("team");
  const [assignTeamId, setAssignTeamId] = useState("");
  const [assignPlayerIds, setAssignPlayerIds] = useState<Set<string>>(new Set());
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [drillSearch, setDrillSearch] = useState("");
  const [drillCategoryFilter, setDrillCategoryFilter] = useState("all");
  const [playerSearch, setPlayerSearch] = useState("");
  const [assignmentsTeamFilter, setAssignmentsTeamFilter] = useState("all");
  const [deleteAssignmentId, setDeleteAssignmentId] = useState<string | null>(null);

  const { data: teams } = useQuery<CoachTeam[]>({
    queryKey: ["/api/coach/teams"],
  });

  const { data: drills, isLoading: drillsLoading } = useQuery<DrillItem[]>({
    queryKey: ["/api/drills"],
  });

  const { data: coachPlayers } = useQuery<CoachPlayerData[]>({
    queryKey: ["/api/coach-players"],
  });

  const teamIds = useMemo(() => teams?.map(t => t.id).sort().join(",") || "", [teams]);
  const { data: assignmentsByTeam, isLoading: assignmentsLoading } = useQuery<Record<string, Assignment[]>>({
    queryKey: ["/api/coach/all-assignments", teamIds],
    queryFn: async () => {
      if (!teams?.length) return {};
      const results: Record<string, Assignment[]> = {};
      await Promise.all(teams.map(async (team) => {
        const res = await fetch(`/api/coach/teams/${team.id}/assignments`, { credentials: "include" });
        if (!res.ok) throw new Error(`Failed to fetch assignments for team ${team.name}`);
        results[team.id] = await res.json();
      }));
      return results;
    },
    enabled: !!teams?.length,
  });

  const flatAssignments = useMemo(() => {
    if (!assignmentsByTeam) return [];
    const all: { assignment: Assignment; teamName: string }[] = [];
    Object.entries(assignmentsByTeam).forEach(([teamId, assigns]) => {
      const team = teams?.find(t => t.id === teamId);
      assigns.forEach(a => all.push({ assignment: a, teamName: team?.name || "Unknown" }));
    });
    return all;
  }, [assignmentsByTeam, teams]);

  const filteredAssignments = useMemo(() => {
    if (assignmentsTeamFilter === "all") return flatAssignments;
    return flatAssignments.filter(item => item.assignment.teamId === assignmentsTeamFilter);
  }, [flatAssignments, assignmentsTeamFilter]);

  const assignMutation = useMutation({
    mutationFn: (data: { drillId: string; teamId?: string; assignedTo?: string; dueDate?: string; notes?: string }) =>
      apiRequest("POST", "/api/coach/assignments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/all-assignments"] });
      teams?.forEach(t => queryClient.invalidateQueries({ queryKey: ["/api/coach/teams", t.id, "assignments"] }));
      toast({ title: "Drill assigned successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign drill", description: error.message, variant: "destructive" });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/coach/assignments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach/all-assignments"] });
      teams?.forEach(t => queryClient.invalidateQueries({ queryKey: ["/api/coach/teams", t.id, "assignments"] }));
      setDeleteAssignmentId(null);
      toast({ title: "Assignment removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove assignment", description: error.message, variant: "destructive" });
    },
  });

  const dialogDrills = useMemo(() => {
    if (!drills) return [];
    return drills.filter((d) => {
      if (drillSearch && !d.title.toLowerCase().includes(drillSearch.toLowerCase())) return false;
      if (drillCategoryFilter !== "all" && d.category !== drillCategoryFilter) return false;
      return true;
    });
  }, [drills, drillSearch, drillCategoryFilter]);

  const dialogPlayers = useMemo(() => {
    if (!coachPlayers) return [];
    if (!playerSearch) return coachPlayers;
    return coachPlayers.filter(p => {
      const name = `${p.firstName} ${p.lastName || ""}`.toLowerCase();
      return name.includes(playerSearch.toLowerCase());
    });
  }, [coachPlayers, playerSearch]);

  const openAssignDialog = () => {
    setAssignStep("choose");
    setAssignPath(null);
    setSelectedDrill(null);
    setAssignTargetType("team");
    setAssignTeamId("");
    setAssignPlayerIds(new Set());
    setAssignDueDate("");
    setAssignNotes("");
    setDrillSearch("");
    setDrillCategoryFilter("all");
    setPlayerSearch("");
    setAssignOpen(true);
  };

  const handleAssignSubmit = async () => {
    if (!selectedDrill) return;
    if (assignTargetType === "team" && !assignTeamId) return;
    if (assignTargetType === "player" && assignPlayerIds.size === 0) return;

    if (assignTargetType === "team") {
      await assignMutation.mutateAsync({
        drillId: selectedDrill.id,
        teamId: assignTeamId,
        dueDate: assignDueDate || undefined,
        notes: assignNotes || undefined,
      });
    } else {
      for (const playerId of Array.from(assignPlayerIds)) {
        await assignMutation.mutateAsync({
          drillId: selectedDrill.id,
          assignedTo: playerId,
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

  const canProceedToDetails = () => {
    if (assignPath === "drill-first") {
      return !!selectedDrill && (assignTargetType === "team" ? !!assignTeamId : assignPlayerIds.size > 0);
    }
    if (assignPath === "target-first") {
      return !!selectedDrill && (assignTargetType === "team" ? !!assignTeamId : assignPlayerIds.size > 0);
    }
    return false;
  };

  const getStepAfterChoose = (path: "drill-first" | "target-first") => {
    setAssignPath(path);
    setAssignStep(path === "drill-first" ? "drill" : "target");
  };

  const getNextStep = () => {
    if (assignPath === "drill-first" && assignStep === "drill") setAssignStep("target");
    else if (assignPath === "target-first" && assignStep === "target") setAssignStep("drill");
    else if (assignStep === "drill" || assignStep === "target") setAssignStep("details");
  };

  const canGoNext = () => {
    if (assignStep === "drill") return !!selectedDrill;
    if (assignStep === "target") return assignTargetType === "team" ? !!assignTeamId : assignPlayerIds.size > 0;
    return false;
  };

  const getSecondStep = () => {
    if (assignPath === "drill-first") return "target";
    return "drill";
  };

  const isOnSecondStep = () => {
    if (assignPath === "drill-first" && assignStep === "target") return true;
    if (assignPath === "target-first" && assignStep === "drill") return true;
    return false;
  };

  const targetSummary = () => {
    if (assignTargetType === "team") {
      const team = teams?.find(t => t.id === assignTeamId);
      return team ? team.name : "";
    }
    const names = coachPlayers?.filter(p => assignPlayerIds.has(p.id)).map(p => `${p.firstName} ${p.lastName || ""}`.trim());
    return names?.join(", ") || "";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold" data-testid="text-assign-drills-heading">Assign Drills</h2>
        <Button onClick={openAssignDialog} data-testid="button-open-assign">
          <ClipboardList className="w-4 h-4" />
          Assign
        </Button>
      </div>

      <div className="pt-2">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h3 className="text-sm font-semibold" data-testid="text-current-assignments-heading">Current Assignments</h3>
          <Select value={assignmentsTeamFilter} onValueChange={setAssignmentsTeamFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-assignments-team-filter">
              <SelectValue placeholder="All Teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams?.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name} {team.seasonYear ? `(${team.seasonYear})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {assignmentsLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded" />)}
          </div>
        ) : !filteredAssignments.length ? (
          <p className="text-sm text-muted-foreground" data-testid="text-no-assignments">
            {!teams?.length ? "Create a team first to assign drills." : "No assignments yet. Hit Assign to get started."}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredAssignments.map(({ assignment, teamName }) => (
              <div
                key={assignment.id}
                className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                data-testid={`row-assignment-${assignment.id}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{assignment.drillTitle}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="default" className="no-default-hover-elevate text-xs">{teamName}</Badge>
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
                  data-testid={`button-delete-assignment-${assignment.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-assign-drill">
          <DialogHeader>
            <DialogTitle>
              {assignStep === "choose" && "Assign a Drill"}
              {assignStep === "drill" && "Select a Drill"}
              {assignStep === "target" && "Assign To"}
              {assignStep === "details" && "Assignment Details"}
            </DialogTitle>
            <DialogDescription>
              {assignStep === "choose" && "How would you like to start?"}
              {assignStep === "drill" && "Search and pick a drill to assign."}
              {assignStep === "target" && "Choose a team or individual player(s)."}
              {assignStep === "details" && `"${selectedDrill?.title}" → ${targetSummary()}`}
            </DialogDescription>
          </DialogHeader>

          {assignStep === "choose" && (
            <div className="grid grid-cols-2 gap-3 py-2">
              <div
                className="flex flex-col items-center gap-2 p-4 rounded-md border hover-elevate cursor-pointer"
                onClick={() => getStepAfterChoose("drill-first")}
                data-testid="button-path-drill-first"
              >
                <ClipboardList className="w-6 h-6" />
                <span className="text-sm font-medium text-center">Start with Drill</span>
                <span className="text-xs text-muted-foreground text-center">Pick a drill, then choose who to assign it to</span>
              </div>
              <div
                className="flex flex-col items-center gap-2 p-4 rounded-md border hover-elevate cursor-pointer"
                onClick={() => getStepAfterChoose("target-first")}
                data-testid="button-path-target-first"
              >
                <Users className="w-6 h-6" />
                <span className="text-sm font-medium text-center">Start with Player/Team</span>
                <span className="text-xs text-muted-foreground text-center">Pick who to assign to, then choose the drill</span>
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
                    data-testid="input-assign-drill-search"
                  />
                </div>
                <Select value={drillCategoryFilter} onValueChange={setDrillCategoryFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="select-assign-drill-category">
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
                      data-testid={`button-pick-drill-${drill.id}`}
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
                <Button variant="ghost" size="sm" onClick={() => setAssignStep(assignPath === "drill-first" ? "choose" : "target")} data-testid="button-assign-back">
                  <ArrowLeft className="w-3 h-3" /> Back
                </Button>
                <Button size="sm" disabled={!selectedDrill} onClick={() => { isOnSecondStep() ? setAssignStep("details") : getNextStep(); }} data-testid="button-assign-next-drill">
                  Next <ArrowRight className="w-3 h-3" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {assignStep === "target" && (
            <div className="space-y-3">
              <Tabs value={assignTargetType} onValueChange={(v) => { setAssignTargetType(v as "team" | "player"); setAssignTeamId(""); setAssignPlayerIds(new Set()); }}>
                <TabsList className="w-full" data-testid="tabs-assign-target-type">
                  <TabsTrigger value="team" className="flex-1" data-testid="tab-assign-team">Team</TabsTrigger>
                  <TabsTrigger value="player" className="flex-1" data-testid="tab-assign-player">Player(s)</TabsTrigger>
                </TabsList>
                <TabsContent value="team" className="mt-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Team</label>
                    <Select value={assignTeamId} onValueChange={setAssignTeamId}>
                      <SelectTrigger data-testid="select-assign-team">
                        <SelectValue placeholder="Choose a team..." />
                      </SelectTrigger>
                      <SelectContent>
                        {teams?.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name} {team.seasonYear ? `(${team.seasonYear})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                <TabsContent value="player" className="mt-3">
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search players..."
                        value={playerSearch}
                        onChange={(e) => setPlayerSearch(e.target.value)}
                        className="pl-9"
                        data-testid="input-assign-player-search"
                      />
                    </div>
                    {assignPlayerIds.size > 0 && (
                      <p className="text-xs text-muted-foreground">{assignPlayerIds.size} player{assignPlayerIds.size > 1 ? "s" : ""} selected</p>
                    )}
                    <div className="max-h-44 overflow-y-auto space-y-1">
                      {dialogPlayers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-3">No players found. Add players in the Players tab.</p>
                      ) : (
                        dialogPlayers.map((player) => (
                          <div
                            key={player.id}
                            className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer ${assignPlayerIds.has(player.id) ? "border-primary bg-primary/10" : "hover-elevate"}`}
                            onClick={() => togglePlayer(player.id)}
                            data-testid={`button-pick-player-${player.id}`}
                          >
                            <Avatar className="h-6 w-6 shrink-0">
                              <AvatarFallback className="text-[10px]">{player.firstName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{player.firstName} {player.lastName || ""}</p>
                              <div className="flex items-center gap-1">
                                {player.position && <Badge variant="outline" className="no-default-hover-elevate text-[10px]">{player.position}</Badge>}
                                {player.teams.length > 0 && (
                                  <span className="text-[10px] text-muted-foreground truncate">{player.teams[0].teamName}</span>
                                )}
                              </div>
                            </div>
                            {assignPlayerIds.has(player.id) && <Check className="w-4 h-4 text-primary shrink-0" />}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              <DialogFooter className="gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAssignStep(assignPath === "target-first" ? "choose" : "drill")} data-testid="button-assign-back-target">
                  <ArrowLeft className="w-3 h-3" /> Back
                </Button>
                <Button size="sm" disabled={!canGoNext()} onClick={() => { isOnSecondStep() ? setAssignStep("details") : getNextStep(); }} data-testid="button-assign-next-target">
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
                  {assignTargetType === "team" ? <Users className="w-4 h-4 text-muted-foreground shrink-0" /> : <User className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className="text-sm text-muted-foreground">{targetSummary()}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Due Date (optional)</label>
                <Input
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  data-testid="input-due-date"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  placeholder="Any notes for the players..."
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                  data-testid="input-assignment-notes"
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAssignStep(getSecondStep() as "drill" | "target")} data-testid="button-assign-back-details">
                  <ArrowLeft className="w-3 h-3" /> Back
                </Button>
                <Button onClick={handleAssignSubmit} disabled={assignMutation.isPending} data-testid="button-submit-assign-drill">
                  {assignMutation.isPending ? "Assigning..." : "Assign Drill"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAssignmentId} onOpenChange={(open) => !open && setDeleteAssignmentId(null)}>
        <AlertDialogContent data-testid="dialog-delete-assignment-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the drill assignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-assignment">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAssignmentId && deleteAssignmentMutation.mutate(deleteAssignmentId)}
              data-testid="button-confirm-delete-assignment"
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
  const [teamFilter, setTeamFilter] = useState("all");
  const [playerFilter, setPlayerFilter] = useState("all");
  const [drillFilter, setDrillFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [ageFilter, setAgeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const { data: teams } = useQuery<CoachTeam[]>({
    queryKey: ["/api/coach/teams"],
  });

  const { data: logs, isLoading: logsLoading } = useQuery<TrainingLogEntry[]>({
    queryKey: ["/api/coach/all-training-logs"],
  });

  const uniqueTeams = useMemo(() => {
    if (!logs) return [];
    const seen = new Map<string, { id: string; name: string }>();
    logs.forEach(l => {
      if (l.teamId && l.teamName && !seen.has(l.teamId)) {
        seen.set(l.teamId, { id: l.teamId, name: l.teamName });
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
      if (teamFilter !== "all" && l.teamId !== teamFilter) return false;
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
  }, [logs, teamFilter, playerFilter, drillFilter, positionFilter, ageFilter, dateFilter]);

  const activeFilterCount = [teamFilter, playerFilter, drillFilter, positionFilter, ageFilter, dateFilter].filter(f => f !== "all").length;

  const clearFilters = () => {
    setTeamFilter("all");
    setPlayerFilter("all");
    setDrillFilter("all");
    setPositionFilter("all");
    setAgeFilter("all");
    setDateFilter("all");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-semibold" data-testid="text-coach-logs-heading">Player Training Logs</h2>
        {activeFilterCount > 0 && (
          <Button size="sm" variant="ghost" onClick={clearFilters} data-testid="button-clear-log-filters">
            Clear Filters ({activeFilterCount})
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-logs-team-filter">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {uniqueTeams.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={playerFilter} onValueChange={setPlayerFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-logs-player-filter">
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
          <SelectTrigger className="w-[160px]" data-testid="select-logs-drill-filter">
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
            <SelectTrigger className="w-[140px]" data-testid="select-logs-position-filter">
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
            <SelectTrigger className="w-[140px]" data-testid="select-logs-age-filter">
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
          <SelectTrigger className="w-[140px]" data-testid="select-logs-date-filter">
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
          <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-coach-logs">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>{!teams?.length ? "Create a team first to view training logs." : logs?.length ? "No logs match your filters." : "No training logs yet from your players."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground" data-testid="text-logs-count">
            Showing {filteredLogs.length} of {logs?.length || 0} logs
          </p>
          {filteredLogs.map((log) => (
            <Card key={log.id} data-testid={`card-coach-log-${log.id}`}>
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
                      {log.teamName && (
                        <Badge variant="default" className="no-default-hover-elevate text-xs">{log.teamName}</Badge>
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
  const [contactSearch, setContactSearch] = useState("");
  const [contactTeamFilter, setContactTeamFilter] = useState("all");
  const [contactPositionFilter, setContactPositionFilter] = useState("all");
  const [showNewChat, setShowNewChat] = useState(false);

  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [threadMessageText, setThreadMessageText] = useState("");
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupScopeType, setNewGroupScopeType] = useState<"team" | "position" | "custom">("team");
  const [newGroupScopeId, setNewGroupScopeId] = useState("");
  const [newGroupMemberIds, setNewGroupMemberIds] = useState<Set<string>>(new Set());
  const [groupMemberSearch, setGroupMemberSearch] = useState("");
  const [deleteThreadId, setDeleteThreadId] = useState<string | null>(null);

  const { data: conversations, isLoading: convsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/messages/conversations"],
    refetchInterval: 10000,
  });

  const { data: contacts } = useQuery<ChatContact[]>({
    queryKey: ["/api/messages/contacts/coach"],
  });

  const { data: teams } = useQuery<CoachTeam[]>({
    queryKey: ["/api/coach/teams"],
  });

  const { data: chatMessages, isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/messages", selectedContact],
    enabled: !!selectedContact,
    refetchInterval: 5000,
  });

  const { data: chatThreads, isLoading: threadsLoading } = useQuery<ChatThread[]>({
    queryKey: ["/api/chat-threads", "coach"],
    queryFn: async () => {
      const res = await fetch("/api/chat-threads?mode=coach", { credentials: "include" });
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

  const { data: rosterForScope } = useQuery<RosterMember[]>({
    queryKey: ["/api/coach/teams", newGroupScopeId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/coach/teams/${newGroupScopeId}/members`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch roster");
      return res.json();
    },
    enabled: newGroupScopeType === "team" && !!newGroupScopeId,
  });

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter((c) => {
      if (contactSearch && !c.name.toLowerCase().includes(contactSearch.toLowerCase())) return false;
      if (contactTeamFilter !== "all" && c.teamId !== contactTeamFilter) return false;
      if (contactPositionFilter !== "all" && c.position !== contactPositionFilter) return false;
      return true;
    });
  }, [contacts, contactSearch, contactTeamFilter, contactPositionFilter]);

  const positions = useMemo(() => {
    if (!contacts) return [];
    const posSet = new Set(contacts.map(c => c.position).filter(Boolean));
    return Array.from(posSet) as string[];
  }, [contacts]);

  const positionContacts = useMemo(() => {
    if (!contacts || newGroupScopeType !== "position" || !newGroupScopeId) return [];
    return contacts.filter(c => c.position === newGroupScopeId);
  }, [contacts, newGroupScopeType, newGroupScopeId]);

  const groupMemberCandidates = useMemo(() => {
    if (!contacts) return [];
    let candidates = [...contacts];
    if (groupMemberSearch) {
      candidates = candidates.filter(c => c.name.toLowerCase().includes(groupMemberSearch.toLowerCase()));
    }
    return candidates;
  }, [contacts, groupMemberSearch]);

  const autoPopulateMembers = useMemo(() => {
    if (newGroupScopeType === "team" && rosterForScope) {
      return rosterForScope.filter(m => !m.isCoachPlayer).map(m => m.userId);
    }
    if (newGroupScopeType === "position" && positionContacts.length > 0) {
      return positionContacts.map(c => c.id);
    }
    return [];
  }, [newGroupScopeType, rosterForScope, positionContacts]);

  const handleScopeChange = (scopeType: "team" | "position" | "custom") => {
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
      queryClient.invalidateQueries({ queryKey: ["/api/chat-threads", "coach"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/chat-threads", "coach"] });
      setCreateGroupOpen(false);
      setNewGroupName("");
      setNewGroupScopeType("team");
      setNewGroupScopeId("");
      setNewGroupMemberIds(new Set());
      setGroupMemberSearch("");
      toast({ title: "Group chat created!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create group chat", description: error.message, variant: "destructive" });
    },
  });

  const deleteThreadMutation = useMutation({
    mutationFn: (threadId: string) => apiRequest("DELETE", `/api/chat-threads/${threadId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat-threads", "coach"] });
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
      mode: "coach",
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
          <Button size="sm" variant="ghost" onClick={() => setSelectedThread(null)} data-testid="button-back-to-threads">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold truncate" data-testid="text-thread-name">{selectedThread.name}</h2>
            <p className="text-xs text-muted-foreground">
              {selectedThread.memberCount} member{selectedThread.memberCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-3">
            <div className="h-64 overflow-y-auto space-y-2 mb-3" data-testid="thread-messages-container">
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
                    data-testid={`thread-message-${msg.id}`}
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
                data-testid="input-thread-message"
              />
              <Button
                size="icon"
                onClick={handleThreadSend}
                disabled={!threadMessageText.trim() || sendThreadMessageMutation.isPending}
                data-testid="button-send-thread-message"
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
      <Tabs value={chatMode} onValueChange={(v) => setChatMode(v as "direct" | "group")} data-testid="tabs-chat-mode">
        <TabsList className="grid w-full grid-cols-2" data-testid="tabs-chat-mode-list">
          <TabsTrigger value="direct" data-testid="tab-direct-messages">
            <MessageCircle className="w-4 h-4 mr-1" />
            Direct Messages
          </TabsTrigger>
          <TabsTrigger value="group" data-testid="tab-group-chats">
            <Users className="w-4 h-4 mr-1" />
            Group Chats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-lg font-semibold" data-testid="text-coach-chat-heading">Messages</h2>
            <Button size="sm" variant={showNewChat ? "default" : "outline"} onClick={() => setShowNewChat(!showNewChat)} data-testid="button-toggle-new-chat">
              <MessageCircle className="w-4 h-4" />
              {showNewChat ? "Hide Players" : "New Chat"}
            </Button>
          </div>

          {showNewChat && contacts && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Select a Player to Chat With</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-3 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Search by name..."
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      data-testid="input-chat-contact-search"
                    />
                  </div>
                  <Select value={contactTeamFilter} onValueChange={setContactTeamFilter}>
                    <SelectTrigger className="w-full sm:w-40" data-testid="select-chat-team-filter">
                      <SelectValue placeholder="All Teams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Teams</SelectItem>
                      {teams?.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={contactPositionFilter} onValueChange={setContactPositionFilter}>
                    <SelectTrigger className="w-full sm:w-32" data-testid="select-chat-position-filter">
                      <SelectValue placeholder="All Positions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Positions</SelectItem>
                      {positions.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {filteredContacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">No players found matching your filters.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                    {filteredContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-2 p-2 rounded-md border hover-elevate cursor-pointer"
                        onClick={() => {
                          setSelectedContact(contact.id);
                          setSelectedContactName(contact.name);
                          setShowNewChat(false);
                        }}
                        data-testid={`button-start-chat-${contact.id}`}
                      >
                        <Avatar className="h-7 w-7 shrink-0">
                          {contact.image && <AvatarImage src={contact.image} />}
                          <AvatarFallback className="text-xs">{contact.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{contact.name}</p>
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[10px] text-muted-foreground">{contact.teamName}</span>
                            {contact.position && (
                              <Badge variant="outline" className="no-default-hover-elevate text-[10px] px-1 py-0">{contact.position}</Badge>
                            )}
                          </div>
                        </div>
                        <MessageCircle className="w-3 h-3 text-muted-foreground shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
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
                <p>No conversations yet. Click "New Chat" to find a player.</p>
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
            <h2 className="text-lg font-semibold" data-testid="text-group-chats-heading">Group Chats</h2>
            <Button size="sm" onClick={() => setCreateGroupOpen(true)} data-testid="button-new-group-chat">
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
              <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-group-chats">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No group chats yet. Create one to start messaging your team!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {chatThreads.map((thread) => (
                <Card
                  key={thread.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => setSelectedThread(thread)}
                  data-testid={`card-thread-${thread.id}`}
                >
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" data-testid={`text-thread-name-${thread.id}`}>{thread.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {thread.lastMessage || "No messages yet"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="no-default-hover-elevate text-xs" data-testid={`badge-thread-members-${thread.id}`}>
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
                          data-testid={`button-delete-thread-${thread.id}`}
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
        <DialogContent className="max-w-lg" data-testid="dialog-create-group-chat">
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
                placeholder="e.g. Varsity Team Chat"
                data-testid="input-group-name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Scope Type</label>
              <Select value={newGroupScopeType} onValueChange={(v) => handleScopeChange(v as "team" | "position" | "custom")}>
                <SelectTrigger data-testid="select-group-scope-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="team">Team Chat</SelectItem>
                  <SelectItem value="position">Position Chat</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newGroupScopeType === "team" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Team</label>
                <Select value={newGroupScopeId} onValueChange={handleScopeIdChange}>
                  <SelectTrigger data-testid="select-group-team">
                    <SelectValue placeholder="Choose a team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.seasonYear ? `(${t.seasonYear})` : ""}
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
                  <SelectTrigger data-testid="select-group-position">
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

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-sm font-medium">Members ({newGroupMemberIds.size} selected)</label>
              </div>
              {newGroupScopeType === "custom" && (
                <Input
                  placeholder="Search players..."
                  value={groupMemberSearch}
                  onChange={(e) => setGroupMemberSearch(e.target.value)}
                  data-testid="input-group-member-search"
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
                        data-testid={`group-member-option-${contact.id}`}
                      >
                        <Checkbox
                          checked={newGroupMemberIds.has(contact.id)}
                          onCheckedChange={() => toggleGroupMember(contact.id)}
                          data-testid={`checkbox-group-member-${contact.id}`}
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
                ) : newGroupScopeType === "team" && rosterForScope ? (
                  rosterForScope.filter(m => !m.isCoachPlayer).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">No app users on this team roster.</p>
                  ) : (
                    rosterForScope.filter(m => !m.isCoachPlayer).map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center gap-2 p-1.5 rounded-md"
                        data-testid={`group-member-option-${member.userId}`}
                      >
                        <Checkbox
                          checked={newGroupMemberIds.has(member.userId)}
                          onCheckedChange={() => toggleGroupMember(member.userId)}
                          data-testid={`checkbox-group-member-${member.userId}`}
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
                        data-testid={`group-member-option-${contact.id}`}
                      >
                        <Checkbox
                          checked={newGroupMemberIds.has(contact.id)}
                          onCheckedChange={() => toggleGroupMember(contact.id)}
                          data-testid={`checkbox-group-member-${contact.id}`}
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
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">Select a scope to see available members.</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim() || newGroupMemberIds.size === 0 || createThreadMutation.isPending}
                data-testid="button-create-group-submit"
              >
                {createThreadMutation.isPending ? "Creating..." : "Create Group Chat"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteThreadId} onOpenChange={(open) => !open && setDeleteThreadId(null)}>
        <AlertDialogContent data-testid="dialog-delete-thread-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group Chat?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this group chat and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-thread">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteThreadId && deleteThreadMutation.mutate(deleteThreadId)}
              data-testid="button-confirm-delete-thread"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function VideosTab() {
  const [filterTeamId, setFilterTeamId] = useState<string>("all");
  const [filterPlayerName, setFilterPlayerName] = useState<string>("all");
  const [filterPosition, setFilterPosition] = useState<string>("all");
  const [filterAge, setFilterAge] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("all");

  const { data: teams } = useQuery<CoachTeam[]>({
    queryKey: ["/api/coach/teams"],
  });

  const { data: allVideos, isLoading: videosLoading } = useQuery<Array<{
    id: string;
    userId: string;
    playerName: string;
    title: string;
    videoUrl: string;
    description: string | null;
    assignmentId: string | null;
    createdAt: string;
    teamId: string;
    teamName: string;
    position: string | null;
    ageGroup: string | null;
    playerAge: number | null;
  }>>({
    queryKey: ["/api/coach/all-videos"],
  });

  const uniquePlayers = useMemo(() => {
    if (!allVideos) return [];
    const seen = new Set<string>();
    allVideos.forEach(v => { if (v.playerName) seen.add(v.playerName); });
    return Array.from(seen).sort();
  }, [allVideos]);

  const uniquePositions = useMemo(() => {
    if (!allVideos) return [];
    const seen = new Set<string>();
    allVideos.forEach(v => { if (v.position) seen.add(v.position); });
    return Array.from(seen).sort();
  }, [allVideos]);

  const uniqueAges = useMemo(() => {
    if (!allVideos) return [];
    const seen = new Set<number>();
    allVideos.forEach(v => { if (v.playerAge != null) seen.add(v.playerAge); });
    return Array.from(seen).sort((a, b) => a - b);
  }, [allVideos]);

  const filteredVideos = useMemo(() => {
    if (!allVideos) return [];
    const now = new Date();
    return allVideos.filter(v => {
      if (filterTeamId !== "all" && v.teamId !== filterTeamId) return false;
      if (filterPlayerName !== "all" && v.playerName !== filterPlayerName) return false;
      if (filterPosition !== "all" && v.position !== filterPosition) return false;
      if (filterAge !== "all" && String(v.playerAge) !== filterAge) return false;
      if (filterDate !== "all") {
        const created = new Date(v.createdAt);
        const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        if (filterDate === "7" && diffDays > 7) return false;
        if (filterDate === "30" && diffDays > 30) return false;
        if (filterDate === "90" && diffDays > 90) return false;
      }
      return true;
    });
  }, [allVideos, filterTeamId, filterPlayerName, filterPosition, filterAge, filterDate]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold" data-testid="text-coach-videos-heading">Shared Videos</h2>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterTeamId} onValueChange={setFilterTeamId}>
          <SelectTrigger className="w-[200px]" data-testid="select-video-team">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams?.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPlayerName} onValueChange={setFilterPlayerName}>
          <SelectTrigger className="w-[180px]" data-testid="select-video-player-filter">
            <SelectValue placeholder="All Players" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Players</SelectItem>
            {uniquePlayers.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPosition} onValueChange={setFilterPosition}>
          <SelectTrigger className="w-[160px]" data-testid="select-video-position-filter">
            <SelectValue placeholder="All Positions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Positions</SelectItem>
            {uniquePositions.map((pos) => (
              <SelectItem key={pos} value={pos}>{pos}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterAge} onValueChange={setFilterAge}>
          <SelectTrigger className="w-[140px]" data-testid="select-video-age-filter">
            <SelectValue placeholder="All Ages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ages</SelectItem>
            {uniqueAges.map((age) => (
              <SelectItem key={age} value={String(age)}>Age {age}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterDate} onValueChange={setFilterDate}>
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
            <p>{allVideos?.length ? "No videos match your filters." : "No shared videos yet. Players can share video links from their Join tab."}</p>
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
                      <Badge variant="outline" className="no-default-hover-elevate text-xs" data-testid={`badge-video-player-${video.id}`}>{video.playerName}</Badge>
                      <Badge variant="secondary" className="no-default-hover-elevate text-xs" data-testid={`badge-video-team-${video.id}`}>{video.teamName}</Badge>
                      {video.position && (
                        <Badge variant="outline" className="no-default-hover-elevate text-xs" data-testid={`badge-video-position-${video.id}`}>{video.position}</Badge>
                      )}
                    </div>
                    {video.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2" data-testid={`text-video-description-${video.id}`}>{video.description}</p>
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
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [email, setEmail] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);

  const { data: teams } = useQuery<CoachTeam[]>({
    queryKey: ["/api/coach/teams"],
  });

  const { data: coachPlayersList } = useQuery<CoachPlayerData[]>({
    queryKey: ["/api/coach-players"],
  });

  const { data: invitations, isLoading: invitationsLoading } = useQuery<Invitation[]>({
    queryKey: ["/api/invitations", selectedTeamId],
    enabled: !!selectedTeamId,
  });

  const playersWithEmail = useMemo(() => {
    return coachPlayersList?.filter(p => p.email) || [];
  }, [coachPlayersList]);

  const inviteMutation = useMutation({
    mutationFn: (data: { teamId: string; email: string; playerName?: string }) =>
      apiRequest("POST", "/api/invitations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations", selectedTeamId] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/invitations", selectedTeamId] });
      toast({ title: "Invitation removed" });
    },
  });

  const handleInvite = () => {
    if (!selectedTeamId || !email.trim()) return;
    inviteMutation.mutate({ teamId: selectedTeamId, email: email.trim(), playerName: playerName.trim() || undefined });
  };

  const handleBulkInvite = async () => {
    if (!selectedTeamId || selectedPlayerIds.size === 0) return;
    setBulkSending(true);
    let sent = 0;
    const playerIdArray = Array.from(selectedPlayerIds);
    for (const playerId of playerIdArray) {
      const player = coachPlayersList?.find(p => p.id === playerId);
      if (player?.email) {
        try {
          await apiRequest("POST", "/api/invitations", {
            teamId: selectedTeamId,
            email: player.email,
            playerName: `${player.firstName} ${player.lastName || ""}`.trim(),
          });
          sent++;
        } catch (e) {
          // continue with others
        }
      }
    }
    setBulkSending(false);
    setSelectedPlayerIds(new Set());
    queryClient.invalidateQueries({ queryKey: ["/api/invitations", selectedTeamId] });
    toast({ title: `${sent} invitation${sent !== 1 ? "s" : ""} sent!` });
  };

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedPlayerIds.size === playersWithEmail.length) {
      setSelectedPlayerIds(new Set());
    } else {
      setSelectedPlayerIds(new Set(playersWithEmail.map(p => p.id)));
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold" data-testid="text-invite-players-heading">Invite Players</h2>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Select Team</label>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="mt-1" data-testid="select-invite-team">
                <SelectValue placeholder="Choose a team..." />
              </SelectTrigger>
              <SelectContent>
                {teams?.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name} {team.seasonYear ? `(${team.seasonYear})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTeamId && (
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
                  Or share team code: <Badge variant="outline" className="no-default-hover-elevate font-mono">{teams?.find(t => t.id === selectedTeamId)?.teamCode}</Badge>
                </span>
              </div>

              {playersWithEmail.length > 0 && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold">Invite from Your Players</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <Checkbox
                          id="select-all-invite"
                          checked={selectedPlayerIds.size === playersWithEmail.length && playersWithEmail.length > 0}
                          onCheckedChange={toggleAll}
                          data-testid="checkbox-select-all-invite"
                        />
                        <label htmlFor="select-all-invite" className="text-xs text-muted-foreground cursor-pointer">Select All</label>
                      </div>
                      {selectedPlayerIds.size > 0 && (
                        <Button
                          size="sm"
                          onClick={handleBulkInvite}
                          disabled={bulkSending}
                          data-testid="button-bulk-invite"
                        >
                          <Mail className="w-3 h-3" />
                          {bulkSending ? "Sending..." : `Invite ${selectedPlayerIds.size} Player${selectedPlayerIds.size !== 1 ? "s" : ""}`}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {playersWithEmail.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-2 p-2 rounded-md border"
                        data-testid={`invite-player-${player.id}`}
                      >
                        <Checkbox
                          checked={selectedPlayerIds.has(player.id)}
                          onCheckedChange={() => togglePlayer(player.id)}
                          data-testid={`checkbox-invite-player-${player.id}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{player.firstName} {player.lastName || ""}</p>
                          <p className="text-xs text-muted-foreground truncate">{player.email}</p>
                        </div>
                        {player.position && (
                          <Badge variant="outline" className="no-default-hover-elevate text-xs shrink-0">{player.position}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {selectedTeamId && (
        <>
          <h3 className="text-base font-semibold">Pending Invitations</h3>
          {invitationsLoading ? (
            <Skeleton className="h-20 rounded-lg" />
          ) : !invitations?.length ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground" data-testid="text-no-invitations">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending invitations for this team.</p>
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

function JoinTeamTab() {
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
      toast({ title: "Joined team successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to join team", description: error.message, variant: "destructive" });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: (teamId: string) => apiRequest("POST", `/api/teams/${teamId}/leave`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-teams"] });
      setLeaveTeamId(null);
      toast({ title: "Left team" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to leave team", description: error.message, variant: "destructive" });
    },
  });

  const [shareTeamId, setShareTeamId] = useState<string>("");
  const [shareTitle, setShareTitle] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [shareDescription, setShareDescription] = useState("");
  const [shareAssignmentId, setShareAssignmentId] = useState<string>("");

  const { data: shareTeamAssignments } = useQuery<Array<{
    id: string;
    drillId: string;
    notes: string | null;
    dueDate: string | null;
    drill: { id: number; name: string };
  }>>({
    queryKey: ["/api/coach/assignments", shareTeamId],
    enabled: !!shareTeamId,
  });

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
    mutationFn: (data: { teamId: string; title: string; videoUrl: string; description?: string; assignmentId?: string }) =>
      apiRequest("POST", "/api/shared-videos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-shared-videos"] });
      setShareTitle("");
      setShareUrl("");
      setShareDescription("");
      setShareAssignmentId("");
      toast({ title: "Video shared with your team!" });
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
    if (!shareTeamId || !shareTitle.trim() || !shareUrl.trim()) return;
    shareVideoMutation.mutate({
      teamId: shareTeamId,
      title: shareTitle.trim(),
      videoUrl: shareUrl.trim(),
      description: shareDescription.trim() || undefined,
      assignmentId: shareAssignmentId && shareAssignmentId !== "none" ? shareAssignmentId : undefined,
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold" data-testid="text-join-team-heading">Join a Team</h2>

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => joinMutation.mutate(data))} className="flex flex-col sm:flex-row sm:items-end gap-3">
              <FormField
                control={form.control}
                name="teamCode"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Team Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter team code..." {...field} data-testid="input-team-code" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={joinMutation.isPending} className="w-full sm:w-auto" data-testid="button-join-team">
                <UserPlus className="w-4 h-4" />
                {joinMutation.isPending ? "Joining..." : "Join"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <h3 className="text-base font-semibold" data-testid="text-my-joined-teams-heading">My Teams</h3>

      {myTeamsLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : !myTeams?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-joined-teams">
            <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>You haven't joined any teams yet. Enter a team code above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {myTeams.map((team) => (
            <Card key={team.id} data-testid={`card-joined-team-${team.id}`}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate" data-testid={`text-joined-team-name-${team.id}`}>{team.name}</p>
                    {team.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{team.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Coach: {team.coachName}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLeaveTeamId(team.id)}
                    className="self-end sm:self-center shrink-0"
                    data-testid={`button-leave-team-${team.id}`}
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
            <label className="text-sm font-medium">Select Team</label>
            <Select value={shareTeamId} onValueChange={(v) => { setShareTeamId(v); setShareAssignmentId(""); }}>
              <SelectTrigger className="mt-1" data-testid="select-share-video-team">
                <SelectValue placeholder="Choose a team..." />
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

          {shareTeamId && (
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
                <label className="text-sm font-medium">Video Link</label>
                <Input
                  value={shareUrl}
                  onChange={(e) => setShareUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="mt-1"
                  data-testid="input-share-video-url"
                />
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
              {shareTeamAssignments && shareTeamAssignments.length > 0 && (
                <div>
                  <label className="text-sm font-medium">Link to Assignment (optional)</label>
                  <Select value={shareAssignmentId} onValueChange={setShareAssignmentId}>
                    <SelectTrigger className="mt-1" data-testid="select-share-video-assignment">
                      <SelectValue placeholder="No assignment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No assignment</SelectItem>
                      {shareTeamAssignments.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.drill?.name || "Unknown Drill"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
        <AlertDialogContent data-testid="dialog-leave-team-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Team?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this team? You can rejoin later with the team code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-leave-team">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => leaveTeamId && leaveMutation.mutate(leaveTeamId)}
              data-testid="button-confirm-leave-team"
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MyAssignmentsTab() {
  const { toast } = useToast();

  const { data: assignments, isLoading } = useQuery<Assignment[]>({
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
            <p>No assignments yet. Join a team to receive drill assignments from your coach.</p>
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
                      <p className="font-medium" data-testid={`text-assignment-drill-${assignment.id}`}>
                        {assignment.drillTitle}
                      </p>
                      <Badge
                        variant={assignment.status === "completed" ? "default" : "outline"}
                        className="no-default-hover-elevate"
                        data-testid={`badge-assignment-status-${assignment.id}`}
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
                    <span>Team: {assignment.teamName}</span>
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

const coachPlayerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional().default(""),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  position: z.string().optional().default(""),
  jerseyNumber: z.string().optional().default(""),
  ageGroup: z.string().optional().default(""),
  teamType: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

type CoachPlayerForm = z.infer<typeof coachPlayerSchema>;

const PLAYER_POSITIONS = ["PG", "SG", "SF", "PF", "C", "Guard", "Wing", "Forward", "Bigs"];
const PLAYER_AGES = Array.from({ length: 53 }, (_, i) => String(i + 5));
const TEAM_TYPES = ["None", "Rec", "Club/AAU", "High School", "College", "Pro"];
const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced", "Elite"];
const CLASS_OPTIONS = ["3rd Grade", "4th Grade", "5th Grade", "6th Grade", "7th Grade", "8th Grade", "Freshman", "Sophomore", "Junior", "Senior", "Post-Grad"];
const AGE_GROUP_OPTIONS = ["Varsity", "JV", "Freshman", "8th Grade", "7th Grade", "8U", "10U", "12U", "14U", "16U", "17U"];

function PlayersTab() {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<CoachPlayerData | null>(null);
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null);
  const [assignPlayerId, setAssignPlayerId] = useState<string | null>(null);
  const [assignTeamId, setAssignTeamId] = useState("");
  const [assignPosition, setAssignPosition] = useState("");
  const [assignJersey, setAssignJersey] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkTeamId, setBulkTeamId] = useState("");

  const addForm = useForm<CoachPlayerForm>({
    resolver: zodResolver(coachPlayerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", position: "", jerseyNumber: "", ageGroup: "", teamType: "", notes: "" },
  });

  const editForm = useForm<CoachPlayerForm>({
    resolver: zodResolver(coachPlayerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", position: "", jerseyNumber: "", ageGroup: "", teamType: "", notes: "" },
  });

  const { data: players, isLoading: playersLoading } = useQuery<CoachPlayerData[]>({
    queryKey: ["/api/coach-players"],
  });

  const { data: teams } = useQuery<CoachTeam[]>({
    queryKey: ["/api/coach/teams"],
  });

  const createPlayerMutation = useMutation({
    mutationFn: (data: CoachPlayerForm) => apiRequest("POST", "/api/coach-players", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach-players"] });
      setAddOpen(false);
      addForm.reset();
      toast({ title: "Player added successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add player", description: error.message, variant: "destructive" });
    },
  });

  const updatePlayerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CoachPlayerForm }) => apiRequest("PUT", `/api/coach-players/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach-players"] });
      setEditingPlayer(null);
      toast({ title: "Player updated successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update player", description: error.message, variant: "destructive" });
    },
  });

  const deletePlayerMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/coach-players/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach-players"] });
      setDeletePlayerId(null);
      toast({ title: "Player deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete player", description: error.message, variant: "destructive" });
    },
  });

  const assignPlayerMutation = useMutation({
    mutationFn: ({ playerId, teamId, position, jerseyNumber }: { playerId: string; teamId: string; position?: string; jerseyNumber?: string }) =>
      apiRequest("POST", `/api/coach-players/${playerId}/assign`, { teamId, position: position || undefined, jerseyNumber: jerseyNumber || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach-players"] });
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

  const bulkAssignMutation = useMutation({
    mutationFn: ({ playerIds, teamId }: { playerIds: string[]; teamId: string }) =>
      apiRequest("POST", "/api/coach-players/bulk-assign", { playerIds, teamId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach-players"] });
      setBulkAssignOpen(false);
      setBulkTeamId("");
      setSelectedPlayerIds(new Set());
      toast({ title: "Players assigned to team!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign players", description: error.message, variant: "destructive" });
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: (assignmentId: string) => apiRequest("DELETE", `/api/coach-player-assignments/${assignmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach-players"] });
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
      const posMatch = !positionFilter || positionFilter === "all" || p.position === positionFilter;
      const teamMatch = teamFilter === "all" || p.teams.some(t => t.teamId === teamFilter);
      return nameMatch && posMatch && teamMatch;
    });
  }, [players, searchQuery, positionFilter, teamFilter]);

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

  const openEditPlayer = (player: CoachPlayerData) => {
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
      notes: player.notes || "",
    });
  };

  const renderPlayerForm = (form: ReturnType<typeof useForm<CoachPlayerForm>>, onSubmit: (data: CoachPlayerForm) => void, isPending: boolean, submitLabel: string) => (
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
        <div className="grid grid-cols-3 gap-4">
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
        <Button onClick={() => { addForm.reset(); setAddOpen(true); }} data-testid="button-add-player">
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
          <SelectTrigger className="w-[180px]" data-testid="select-filter-team">
            <SelectValue placeholder="All Teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Teams</SelectItem>
            {teams?.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name} {t.seasonYear ? `(${t.seasonYear})` : ""}</SelectItem>
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkAssignOpen(true)}
              data-testid="button-bulk-assign"
            >
              <UserPlus className="w-4 h-4" />
              Assign {selectedPlayerIds.size} to Team
            </Button>
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium" data-testid={`text-player-name-${player.id}`}>
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
                    </div>
                    {player.email && (
                      <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-player-email-${player.id}`}>{player.email}</p>
                    )}
                    {player.teams.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">Teams:</span>
                        {player.teams.map((t) => (
                          <Badge
                            key={t.id}
                            variant="default"
                            className="no-default-hover-elevate text-xs cursor-pointer"
                            data-testid={`badge-player-team-${t.id}`}
                            onClick={() => removeAssignmentMutation.mutate(t.id)}
                            title={`Click to remove from ${t.teamName}`}
                          >
                            {t.teamName}{t.seasonYear ? ` (${t.seasonYear}-${(t.seasonYear + 1).toString().slice(-2)})` : ""}{t.ageGroup ? ` - ${t.ageGroup}` : ""}
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
        <DialogContent data-testid="dialog-add-player">
          <DialogHeader>
            <DialogTitle>Add Player</DialogTitle>
            <DialogDescription>Add a new player to your roster. You can assign them to teams later.</DialogDescription>
          </DialogHeader>
          {renderPlayerForm(addForm, (data) => createPlayerMutation.mutate(data), createPlayerMutation.isPending, "Add Player")}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingPlayer} onOpenChange={(open) => { if (!open) setEditingPlayer(null); }}>
        <DialogContent data-testid="dialog-edit-player">
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
            <DialogDescription>Update player information.</DialogDescription>
          </DialogHeader>
          {editingPlayer && renderPlayerForm(editForm, (data) => updatePlayerMutation.mutate({ id: editingPlayer.id, data }), updatePlayerMutation.isPending, "Save Changes")}
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignPlayerId} onOpenChange={(open) => { if (!open) setAssignPlayerId(null); }}>
        <DialogContent data-testid="dialog-assign-player">
          <DialogHeader>
            <DialogTitle>Assign to Team</DialogTitle>
            <DialogDescription>Select a team and optionally set position and jersey for this assignment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
                onClick={() => assignPlayerId && assignPlayerMutation.mutate({ playerId: assignPlayerId, teamId: assignTeamId, position: assignPosition, jerseyNumber: assignJersey })}
                disabled={!assignTeamId || assignPlayerMutation.isPending}
                data-testid="button-confirm-assign"
              >
                {assignPlayerMutation.isPending ? "Assigning..." : "Assign"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent data-testid="dialog-bulk-assign">
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
                onClick={() => bulkAssignMutation.mutate({ playerIds: Array.from(selectedPlayerIds), teamId: bulkTeamId })}
                disabled={!bulkTeamId || bulkAssignMutation.isPending}
                data-testid="button-confirm-bulk-assign"
              >
                {bulkAssignMutation.isPending ? "Assigning..." : "Assign All"}
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
              This will permanently delete this player and remove them from all teams. This action cannot be undone.
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
    </div>
  );
}

function CoachAdminTab() {
  const { toast } = useToast();
  const [adminSection, setAdminSection] = useState<"teams" | "players">("teams");

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

  const [adminAddPlayerOpen, setAdminAddPlayerOpen] = useState(false);
  const [adminEditPlayer, setAdminEditPlayer] = useState<CoachPlayerData | null>(null);
  const [adminDeletePlayerId, setAdminDeletePlayerId] = useState<string | null>(null);

  const { data: teams, isLoading: teamsLoading } = useQuery<CoachTeam[]>({
    queryKey: ["/api/coach/teams"],
  });

  const { data: adminPlayers, isLoading: adminPlayersLoading } = useQuery<CoachPlayerData[]>({
    queryKey: ["/api/coach-players"],
  });

  const adminAddForm = useForm<CoachPlayerForm>({
    resolver: zodResolver(coachPlayerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", position: "", jerseyNumber: "", ageGroup: "", teamType: "None", notes: "" },
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
      toast({ title: "Team deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete team", description: error.message, variant: "destructive" });
    },
  });

  const adminCreatePlayerMutation = useMutation({
    mutationFn: (data: CoachPlayerForm) => apiRequest("POST", "/api/coach-players", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach-players"] });
      setAdminAddPlayerOpen(false);
      adminAddForm.reset();
      toast({ title: "Player added!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add player", description: error.message, variant: "destructive" });
    },
  });

  const adminUpdatePlayerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CoachPlayerForm }) => apiRequest("PUT", `/api/coach-players/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach-players"] });
      setAdminEditPlayer(null);
      toast({ title: "Player updated!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update player", description: error.message, variant: "destructive" });
    },
  });

  const adminDeletePlayerMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/coach-players/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach-players"] });
      setAdminDeletePlayerId(null);
      toast({ title: "Player deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete player", description: error.message, variant: "destructive" });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold" data-testid="text-coach-admin-heading">Admin</h2>
      </div>

      <Tabs value={adminSection} onValueChange={(v) => setAdminSection(v as "teams" | "players")} data-testid="tabs-coach-admin">
        <TabsList className="grid w-full grid-cols-2" data-testid="tabs-coach-admin-list">
          <TabsTrigger value="teams" data-testid="tab-coach-admin-teams">
            <Users className="w-4 h-4 mr-1" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="players" data-testid="tab-coach-admin-players">
            <UserPlus className="w-4 h-4 mr-1" />
            Players
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

          {teamsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : !teams?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-coach-admin-teams">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No teams yet. Create your first team to organize your roster.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {teams.map((team) => (
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

        <TabsContent value="players" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">Manage all your players from one place.</p>
            <Button onClick={() => { adminAddForm.reset(); setAdminAddPlayerOpen(true); }} data-testid="button-coach-admin-create-player">
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
              <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-coach-admin-players">
                <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No players yet. Add your first player to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {adminPlayers.map((player) => (
                <Card key={player.id} data-testid={`card-coach-admin-player-${player.id}`}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium truncate" data-testid={`text-coach-admin-player-name-${player.id}`}>
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
                          {player.jerseyNumber && (
                            <Badge variant="outline" className="no-default-hover-elevate text-xs">#{player.jerseyNumber}</Badge>
                          )}
                        </div>
                        {player.email && (
                          <p className="text-xs text-muted-foreground mt-1">{player.email}</p>
                        )}
                        {player.teams?.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {player.teams.map((t) => (
                              <Badge key={t.id} variant="outline" className="no-default-hover-elevate text-[10px]">{t.teamName}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => {
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
                            notes: player.notes || "",
                          });
                        }} data-testid={`button-coach-admin-edit-player-${player.id}`}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setAdminDeletePlayerId(player.id)} data-testid={`button-coach-admin-delete-player-${player.id}`}>
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

      <Dialog open={adminAddPlayerOpen || !!adminEditPlayer} onOpenChange={(open) => { if (!open) { setAdminAddPlayerOpen(false); setAdminEditPlayer(null); adminAddForm.reset(); } }}>
        <DialogContent data-testid="dialog-coach-admin-player">
          <DialogHeader>
            <DialogTitle>{adminEditPlayer ? "Edit Player" : "Add Player"}</DialogTitle>
            <DialogDescription>{adminEditPlayer ? "Update player details." : "Add a new player to your roster."}</DialogDescription>
          </DialogHeader>
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
                  <FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="First name" {...field} data-testid="input-coach-admin-player-first-name" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={adminAddForm.control} name="lastName" render={({ field }) => (
                  <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Last name" {...field} data-testid="input-coach-admin-player-last-name" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={adminAddForm.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="email@example.com" type="email" {...field} data-testid="input-coach-admin-player-email" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={adminAddForm.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="Phone number" {...field} data-testid="input-coach-admin-player-phone" /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField control={adminAddForm.control} name="position" render={({ field }) => (
                  <FormItem><FormLabel>Position</FormLabel><FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-coach-admin-player-position"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{PLAYER_POSITIONS.map((pos) => (<SelectItem key={pos} value={pos}>{pos}</SelectItem>))}</SelectContent>
                    </Select>
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={adminAddForm.control} name="jerseyNumber" render={({ field }) => (
                  <FormItem><FormLabel>Jersey #</FormLabel><FormControl><Input placeholder="#" maxLength={3} {...field} data-testid="input-coach-admin-player-jersey" /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={adminAddForm.control} name="ageGroup" render={({ field }) => (
                  <FormItem><FormLabel>Age</FormLabel><FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-coach-admin-player-age"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{PLAYER_AGES.map((age) => (<SelectItem key={age} value={age}>{age}</SelectItem>))}</SelectContent>
                    </Select>
                  </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={adminAddForm.control} name="teamType" render={({ field }) => (
                  <FormItem><FormLabel>Team Type</FormLabel><FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-coach-admin-player-team-type"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{TEAM_TYPES.map((tt) => (<SelectItem key={tt} value={tt}>{tt}</SelectItem>))}</SelectContent>
                    </Select>
                  </FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={adminAddForm.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Optional notes..." {...field} data-testid="input-coach-admin-player-notes" /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="submit" disabled={adminCreatePlayerMutation.isPending || adminUpdatePlayerMutation.isPending} data-testid="button-submit-coach-admin-player">
                  {(adminCreatePlayerMutation.isPending || adminUpdatePlayerMutation.isPending) ? "Saving..." : (adminEditPlayer ? "Update" : "Add Player")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
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

      <AlertDialog open={!!adminDeletePlayerId} onOpenChange={(open) => { if (!open) setAdminDeletePlayerId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Player</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this player? This will remove all their team assignments. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-coach-admin-player">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => adminDeletePlayerId && adminDeletePlayerMutation.mutate(adminDeletePlayerId)} data-testid="button-confirm-delete-coach-admin-player">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function CoachPage() {
  const { user } = useAuth();

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-coach-page-title">Coach Mode</h1>
      </div>

      <Tabs defaultValue="roster">
        <TabsList className="w-full grid grid-cols-5 sm:grid-cols-10 gap-1 h-auto" data-testid="tabs-coach-main">
          <TabsTrigger value="roster" className="text-xs sm:text-sm py-2" data-testid="tab-roster">
            <Users className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">Roster</span>
          </TabsTrigger>
          <TabsTrigger value="players" className="text-xs sm:text-sm py-2" data-testid="tab-players">
            <UserCheck className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">Players</span>
          </TabsTrigger>
          <TabsTrigger value="assign-drills" className="text-xs sm:text-sm py-2" data-testid="tab-assign-drills">
            <ClipboardList className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">Assign</span>
          </TabsTrigger>
          <TabsTrigger value="training-logs" className="text-xs sm:text-sm py-2" data-testid="tab-training-logs">
            <FileText className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">Logs</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-xs sm:text-sm py-2" data-testid="tab-coach-chat">
            <MessageCircle className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="videos" className="text-xs sm:text-sm py-2" data-testid="tab-coach-videos">
            <Video className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">Videos</span>
          </TabsTrigger>
          <TabsTrigger value="invite" className="text-xs sm:text-sm py-2" data-testid="tab-coach-invite">
            <Mail className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">Invite</span>
          </TabsTrigger>
          <TabsTrigger value="join-team" className="text-xs sm:text-sm py-2" data-testid="tab-join-team">
            <UserPlus className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">Join</span>
          </TabsTrigger>
          <TabsTrigger value="my-assignments" className="text-xs sm:text-sm py-2" data-testid="tab-my-assignments">
            <BookOpen className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">Assigned</span>
          </TabsTrigger>
          <TabsTrigger value="admin" className="text-xs sm:text-sm py-2" data-testid="tab-coach-admin">
            <Settings className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">Admin</span>
          </TabsTrigger>
        </TabsList>

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
        <TabsContent value="join-team">
          <JoinTeamTab />
        </TabsContent>
        <TabsContent value="my-assignments">
          <MyAssignmentsTab />
        </TabsContent>
        <TabsContent value="admin">
          <CoachAdminTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
