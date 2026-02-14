import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
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
} from "lucide-react";
import { insertTrainerTeamSchema, insertDrillAssignmentSchema } from "@shared/schema";

interface TrainerGroup {
  id: string;
  name: string;
  description: string;
  teamCode: string;
  ageGroup?: string;
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
  notes: string | null;
  linkedUserId: string | null;
  createdAt: string;
  updatedAt: string;
  groups: Array<{ id: string; trainerPlayerId: string; groupId: string; groupName: string; ageGroup?: string | null; position: string | null; jerseyNumber: string | null; assignedAt: string }>;
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

type CreateGroupForm = z.infer<typeof createGroupSchema>;
type AssignDrillForm = z.infer<typeof assignDrillSchema>;

const PLAYER_POSITIONS = ["PG", "SG", "SF", "PF", "C"];
const PLAYER_AGE_GROUPS = ["8U", "9U", "10U", "11U", "12U", "13U", "14U", "15U", "16U", "17U", "18U", "High School"];

const trainerPlayerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional().default(""),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  position: z.string().optional().default(""),
  jerseyNumber: z.string().optional().default(""),
  ageGroup: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

type TrainerPlayerForm = z.infer<typeof trainerPlayerSchema>;

function MyPlayersTab() {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<TrainerPlayerData | null>(null);
  const [deletePlayerId, setDeletePlayerId] = useState<string | null>(null);
  const [assignPlayerId, setAssignPlayerId] = useState<string | null>(null);
  const [assignGroupId, setAssignGroupId] = useState("");
  const [assignPosition, setAssignPosition] = useState("");
  const [assignJersey, setAssignJersey] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkGroupId, setBulkGroupId] = useState("");

  const addForm = useForm<TrainerPlayerForm>({
    resolver: zodResolver(trainerPlayerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", position: "", jerseyNumber: "", ageGroup: "", notes: "" },
  });

  const editForm = useForm<TrainerPlayerForm>({
    resolver: zodResolver(trainerPlayerSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", position: "", jerseyNumber: "", ageGroup: "", notes: "" },
  });

  const { data: players, isLoading: playersLoading } = useQuery<TrainerPlayerData[]>({
    queryKey: ["/api/trainer-players"],
  });

  const { data: groups } = useQuery<TrainerGroup[]>({
    queryKey: ["/api/trainer/groups"],
  });

  const createPlayerMutation = useMutation({
    mutationFn: (data: TrainerPlayerForm) => apiRequest("POST", "/api/trainer-players", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-players"] });
      setAddOpen(false);
      addForm.reset();
      toast({ title: "Player added successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add player", description: error.message, variant: "destructive" });
    },
  });

  const updatePlayerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: TrainerPlayerForm }) => apiRequest("PUT", `/api/trainer-players/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-players"] });
      setEditingPlayer(null);
      toast({ title: "Player updated successfully!" });
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

  const assignPlayerMutation = useMutation({
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

  const bulkAssignMutation = useMutation({
    mutationFn: ({ playerIds, groupId }: { playerIds: string[]; groupId: string }) =>
      apiRequest("POST", "/api/trainer-players/bulk-assign", { playerIds, groupId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-players"] });
      setBulkAssignOpen(false);
      setBulkGroupId("");
      setSelectedPlayerIds(new Set());
      toast({ title: "Players assigned to group!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign players", description: error.message, variant: "destructive" });
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: (assignmentId: string) => apiRequest("DELETE", `/api/trainer-player-assignments/${assignmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer-players"] });
      toast({ title: "Player removed from group" });
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
      const groupMatch = groupFilter === "all" || p.groups.some(g => g.groupId === groupFilter);
      return nameMatch && posMatch && groupMatch;
    });
  }, [players, searchQuery, positionFilter, groupFilter]);

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
      notes: player.notes || "",
    });
  };

  const renderPlayerForm = (form: ReturnType<typeof useForm<TrainerPlayerForm>>, onSubmit: (data: TrainerPlayerForm) => void, isPending: boolean, submitLabel: string) => (
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
                  <Input placeholder="First name" {...field} data-testid="input-trainer-player-first-name" />
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
                  <Input placeholder="Last name" {...field} data-testid="input-trainer-player-last-name" />
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
                  <Input placeholder="email@example.com" type="email" {...field} data-testid="input-trainer-player-email" />
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
                  <Input placeholder="Phone number" {...field} data-testid="input-trainer-player-phone" />
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
                    <SelectTrigger data-testid="select-trainer-player-position">
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
                  <Input placeholder="#" maxLength={3} {...field} data-testid="input-trainer-player-jersey" />
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-trainer-player-age-group">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAYER_AGE_GROUPS.map((ag) => (
                        <SelectItem key={ag} value={ag}>{ag}</SelectItem>
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
                <Textarea placeholder="Optional notes..." {...field} data-testid="input-trainer-player-notes" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="submit" disabled={isPending} data-testid="button-submit-trainer-player">
            {isPending ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold" data-testid="text-trainer-players-heading">Players</h2>
        <Button onClick={() => { addForm.reset(); setAddOpen(true); }} data-testid="button-add-trainer-player">
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
            data-testid="input-search-trainer-players"
          />
        </div>
        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-filter-trainer-group">
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
          <SelectTrigger className="w-[140px]" data-testid="select-filter-trainer-position">
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
              data-testid="checkbox-select-all-trainer-players"
            />
            <span className="text-sm text-muted-foreground">Select All</span>
          </div>
          {selectedPlayerIds.size > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBulkAssignOpen(true)}
              data-testid="button-bulk-assign-trainer"
            >
              <UserPlus className="w-4 h-4" />
              Assign {selectedPlayerIds.size} to Group
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
          <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-trainer-players">
            <UserCheck className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No players yet. Add your first player to get started!</p>
          </CardContent>
        </Card>
      ) : !filteredPlayers.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-matching-trainer-players">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No players match your search criteria.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredPlayers.map((player) => (
            <Card key={player.id} data-testid={`card-trainer-player-${player.id}`}>
              <CardContent className="py-3">
                <div className="flex items-start gap-3">
                  <div className="pt-1">
                    <Checkbox
                      checked={selectedPlayerIds.has(player.id)}
                      onCheckedChange={() => togglePlayer(player.id)}
                      data-testid={`checkbox-trainer-player-${player.id}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium" data-testid={`text-trainer-player-name-${player.id}`}>
                        {player.firstName} {player.lastName || ""}
                      </p>
                      {player.position && (
                        <Badge variant="outline" className="no-default-hover-elevate text-xs" data-testid={`badge-trainer-player-position-${player.id}`}>
                          {player.position}
                        </Badge>
                      )}
                      {player.jerseyNumber && (
                        <span className="text-xs font-mono text-muted-foreground" data-testid={`text-trainer-player-jersey-${player.id}`}>
                          #{player.jerseyNumber}
                        </span>
                      )}
                      {player.ageGroup && (
                        <Badge variant="secondary" className="no-default-hover-elevate text-xs" data-testid={`badge-trainer-player-age-${player.id}`}>
                          {player.ageGroup}
                        </Badge>
                      )}
                    </div>
                    {player.email && (
                      <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-trainer-player-email-${player.id}`}>{player.email}</p>
                    )}
                    {player.groups.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">Groups:</span>
                        {player.groups.map((g) => (
                          <Badge
                            key={g.id}
                            variant="default"
                            className="no-default-hover-elevate text-xs cursor-pointer"
                            data-testid={`badge-trainer-player-group-${g.id}`}
                            onClick={() => removeAssignmentMutation.mutate(g.id)}
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
                        setAssignGroupId("");
                        setAssignPosition("");
                        setAssignJersey("");
                      }}
                      data-testid={`button-assign-trainer-player-${player.id}`}
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditPlayer(player)}
                      data-testid={`button-edit-trainer-player-${player.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setDeletePlayerId(player.id)}
                      data-testid={`button-delete-trainer-player-${player.id}`}
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
        <DialogContent data-testid="dialog-add-trainer-player">
          <DialogHeader>
            <DialogTitle>Add Player</DialogTitle>
            <DialogDescription>Add a new player to your roster. You can assign them to groups later.</DialogDescription>
          </DialogHeader>
          {renderPlayerForm(addForm, (data) => createPlayerMutation.mutate(data), createPlayerMutation.isPending, "Add Player")}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingPlayer} onOpenChange={(open) => { if (!open) setEditingPlayer(null); }}>
        <DialogContent data-testid="dialog-edit-trainer-player">
          <DialogHeader>
            <DialogTitle>Edit Player</DialogTitle>
            <DialogDescription>Update player information.</DialogDescription>
          </DialogHeader>
          {editingPlayer && renderPlayerForm(editForm, (data) => updatePlayerMutation.mutate({ id: editingPlayer.id, data }), updatePlayerMutation.isPending, "Save Changes")}
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignPlayerId} onOpenChange={(open) => { if (!open) setAssignPlayerId(null); }}>
        <DialogContent data-testid="dialog-assign-trainer-player">
          <DialogHeader>
            <DialogTitle>Assign to Group</DialogTitle>
            <DialogDescription>Select a group and optionally set position and jersey for this assignment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Group</label>
              <Select value={assignGroupId} onValueChange={setAssignGroupId}>
                <SelectTrigger data-testid="select-assign-trainer-group">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Position (optional)</label>
                <Select value={assignPosition} onValueChange={setAssignPosition}>
                  <SelectTrigger data-testid="select-assign-trainer-position">
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
                  data-testid="input-assign-trainer-jersey"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => assignPlayerId && assignPlayerMutation.mutate({ playerId: assignPlayerId, groupId: assignGroupId, position: assignPosition, jerseyNumber: assignJersey })}
                disabled={!assignGroupId || assignPlayerMutation.isPending}
                data-testid="button-confirm-assign-trainer"
              >
                {assignPlayerMutation.isPending ? "Assigning..." : "Assign"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent data-testid="dialog-bulk-assign-trainer">
          <DialogHeader>
            <DialogTitle>Bulk Assign to Group</DialogTitle>
            <DialogDescription>Assign {selectedPlayerIds.size} selected player(s) to a group.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Group</label>
              <Select value={bulkGroupId} onValueChange={setBulkGroupId}>
                <SelectTrigger data-testid="select-bulk-trainer-group">
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
                onClick={() => bulkAssignMutation.mutate({ playerIds: Array.from(selectedPlayerIds), groupId: bulkGroupId })}
                disabled={!bulkGroupId || bulkAssignMutation.isPending}
                data-testid="button-confirm-bulk-assign-trainer"
              >
                {bulkAssignMutation.isPending ? "Assigning..." : "Assign All"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletePlayerId} onOpenChange={(open) => !open && setDeletePlayerId(null)}>
        <AlertDialogContent data-testid="dialog-delete-trainer-player-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Player?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this player and remove them from all groups. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-trainer-player">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePlayerId && deletePlayerMutation.mutate(deletePlayerId)}
              data-testid="button-confirm-delete-trainer-player"
            >
              Delete
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
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedDrill, setSelectedDrill] = useState<DrillItem | null>(null);
  const [assignGroupId, setAssignGroupId] = useState("");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [assignmentsGroupFilter, setAssignmentsGroupFilter] = useState("all");
  const [deleteAssignmentId, setDeleteAssignmentId] = useState<string | null>(null);

  const { data: groups } = useQuery<TrainerGroup[]>({
    queryKey: ["/api/trainer/groups"],
  });

  const { data: drills, isLoading: drillsLoading } = useQuery<DrillItem[]>({
    queryKey: ["/api/drills"],
  });

  const groupIds = useMemo(() => groups?.map(g => g.id).sort().join(",") || "", [groups]);
  const { data: assignmentsByGroup, isLoading: assignmentsLoading } = useQuery<Record<string, Assignment[]>>({
    queryKey: ["/api/trainer/all-assignments", groupIds],
    queryFn: async () => {
      if (!groups?.length) return {};
      const results: Record<string, Assignment[]> = {};
      await Promise.all(groups.map(async (group) => {
        const res = await fetch(`/api/trainer/groups/${group.id}/assignments`, { credentials: "include" });
        if (!res.ok) throw new Error(`Failed to fetch assignments for group ${group.name}`);
        results[group.id] = await res.json();
      }));
      return results;
    },
    enabled: !!groups?.length,
  });

  const flatAssignments = useMemo(() => {
    if (!assignmentsByGroup) return [];
    const all: { assignment: Assignment; groupName: string }[] = [];
    Object.entries(assignmentsByGroup).forEach(([groupId, assigns]) => {
      const group = groups?.find(g => g.id === groupId);
      assigns.forEach(a => all.push({ assignment: a, groupName: group?.name || "Unknown" }));
    });
    return all;
  }, [assignmentsByGroup, groups]);

  const filteredAssignments = useMemo(() => {
    if (assignmentsGroupFilter === "all") return flatAssignments;
    return flatAssignments.filter(item => item.assignment.teamId === assignmentsGroupFilter);
  }, [flatAssignments, assignmentsGroupFilter]);

  const assignMutation = useMutation({
    mutationFn: (data: { drillId: string; teamId: string; dueDate?: string; notes?: string }) =>
      apiRequest("POST", "/api/trainer/assignments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/all-assignments"] });
      groups?.forEach(g => queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups", g.id, "assignments"] }));
      setAssignOpen(false);
      setSelectedDrill(null);
      setAssignGroupId("");
      setAssignDueDate("");
      setAssignNotes("");
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

  const filteredDrills = useMemo(() => {
    if (!drills) return [];
    return drills.filter((d) => {
      const matchesSearch = !searchQuery || d.title.toLowerCase().includes(searchQuery.toLowerCase()) || d.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || d.category === categoryFilter;
      const matchesDifficulty = difficultyFilter === "all" || d.difficulty === difficultyFilter;
      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [drills, searchQuery, categoryFilter, difficultyFilter]);

  const openAssignDialog = (drill: DrillItem) => {
    setSelectedDrill(drill);
    setAssignGroupId("");
    setAssignDueDate("");
    setAssignNotes("");
    setAssignOpen(true);
  };

  const handleAssignSubmit = () => {
    if (!selectedDrill || !assignGroupId) return;
    assignMutation.mutate({
      drillId: selectedDrill.id,
      teamId: assignGroupId,
      dueDate: assignDueDate || undefined,
      notes: assignNotes || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold" data-testid="text-trainer-assign-heading">Assign Drills</h2>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search drills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-drills-trainer"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-trainer-assign-category-filter">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {DRILL_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-trainer-assign-difficulty-filter">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {DRILL_DIFFICULTIES.map((d) => (
              <SelectItem key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {drillsLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded" />)}
        </div>
      ) : !filteredDrills.length ? (
        <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-drills-found-trainer">
          No drills found
        </p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {filteredDrills.map((drill) => (
            <div
              key={drill.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
              data-testid={`row-drill-trainer-${drill.id}`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{drill.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="no-default-hover-elevate text-xs">{drill.category}</Badge>
                  <Badge variant="secondary" className="no-default-hover-elevate text-xs">{drill.difficulty}</Badge>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => openAssignDialog(drill)}
                className="self-end sm:self-center shrink-0"
                data-testid={`button-assign-drill-trainer-${drill.id}`}
              >
                <ClipboardList className="w-3 h-3" />
                Assign
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="pt-4 border-t">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h3 className="text-sm font-semibold" data-testid="text-trainer-current-assignments-heading">Current Assignments</h3>
          <Select value={assignmentsGroupFilter} onValueChange={setAssignmentsGroupFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-trainer-assignments-group-filter">
              <SelectValue placeholder="All Groups" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {groups?.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}{group.ageGroup ? ` (${group.ageGroup})` : ""}
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
          <p className="text-sm text-muted-foreground" data-testid="text-no-trainer-assignments">
            {!groups?.length ? "Create a group first to assign drills." : "No assignments yet."}
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
        <DialogContent data-testid="dialog-trainer-assign-drill">
          <DialogHeader>
            <DialogTitle>Assign Drill</DialogTitle>
            <DialogDescription>
              Assign "{selectedDrill?.title}" to a group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Group</label>
              <Select value={assignGroupId} onValueChange={setAssignGroupId}>
                <SelectTrigger data-testid="select-assign-trainer-group">
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
            <DialogFooter>
              <Button
                onClick={handleAssignSubmit}
                disabled={!assignGroupId || assignMutation.isPending}
                data-testid="button-submit-trainer-assign"
              >
                {assignMutation.isPending ? "Assigning..." : "Assign Drill"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAssignmentId} onOpenChange={(open) => !open && setDeleteAssignmentId(null)}>
        <AlertDialogContent data-testid="dialog-delete-trainer-assignment-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the drill assignment from the group.
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
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [selectedContactName, setSelectedContactName] = useState("");
  const [messageText, setMessageText] = useState("");

  const { data: conversations, isLoading: convsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/messages/conversations"],
    refetchInterval: 10000,
  });

  const { data: contacts } = useQuery<ChatContact[]>({
    queryKey: ["/api/messages/contacts/trainer"],
  });

  const { data: chatMessages, isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/messages", selectedContact],
    enabled: !!selectedContact,
    refetchInterval: 5000,
  });

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

  const handleSend = () => {
    if (!messageText.trim() || !selectedContact) return;
    sendMutation.mutate({ receiverId: selectedContact, content: messageText.trim() });
  };

  if (selectedContact) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => setSelectedContact(null)} data-testid="button-back-to-conversations">
            <Users className="w-4 h-4" />
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
                  variant={contact.isAppUser === false ? "secondary" : "outline"}
                  onClick={() => {
                    if (contact.isAppUser === false) {
                      toast({ title: "Not on app yet", description: `${contact.name} hasn't joined the app. Send them an invite!`, variant: "destructive" });
                      return;
                    }
                    setSelectedContact(contact.id);
                    setSelectedContactName(contact.name);
                  }}
                  data-testid={`button-start-chat-${contact.id}`}
                >
                  {contact.isAppUser !== false ? (
                    <MessageCircle className="w-3 h-3" />
                  ) : (
                    <Mail className="w-3 h-3" />
                  )}
                  {contact.name}
                  {contact.isAppUser === false && (
                    <Badge variant="secondary" className="no-default-hover-elevate text-[10px] ml-1">Not on app</Badge>
                  )}
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
    </div>
  );
}

function VideosTab() {
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [filterAssignmentId, setFilterAssignmentId] = useState<string>("all");

  const { data: groups } = useQuery<TrainerGroup[]>({
    queryKey: ["/api/trainer/groups"],
  });

  const { data: groupAssignments } = useQuery<Array<{
    id: string;
    drillId: string;
    notes: string | null;
    dueDate: string | null;
    drill: { id: number; name: string };
  }>>({
    queryKey: ["/api/coach/assignments", selectedGroupId],
    enabled: !!selectedGroupId,
  });

  const videoQueryUrl = filterAssignmentId && filterAssignmentId !== "all"
    ? `/api/shared-videos/${selectedGroupId}?assignmentId=${filterAssignmentId}`
    : `/api/shared-videos/${selectedGroupId}`;

  const { data: sharedVideos, isLoading: videosLoading } = useQuery<Array<{
    id: string;
    userId: string;
    playerName: string;
    title: string;
    videoUrl: string;
    description: string | null;
    assignmentId: string | null;
    createdAt: string;
  }>>({
    queryKey: ["/api/shared-videos", selectedGroupId, filterAssignmentId],
    queryFn: async () => {
      const res = await fetch(videoQueryUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch videos");
      return res.json();
    },
    enabled: !!selectedGroupId,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold" data-testid="text-trainer-videos-heading">Shared Videos</h2>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedGroupId} onValueChange={(v) => { setSelectedGroupId(v); setFilterAssignmentId("all"); }}>
          <SelectTrigger className="w-[220px]" data-testid="select-video-group">
            <SelectValue placeholder="Select a group" />
          </SelectTrigger>
          <SelectContent>
            {groups?.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedGroupId && groupAssignments && groupAssignments.length > 0 && (
          <Select value={filterAssignmentId} onValueChange={setFilterAssignmentId}>
            <SelectTrigger className="w-[220px]" data-testid="select-video-assignment-filter">
              <SelectValue placeholder="Filter by assignment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Videos</SelectItem>
              {groupAssignments.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.drill?.name || "Unknown Drill"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selectedGroupId && (
        <>
          {videosLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : !sharedVideos?.length ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-player-videos">
                <Video className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No shared videos yet. Players can share video links from their Join tab.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sharedVideos.map((video) => (
                <Card key={video.id} data-testid={`card-shared-video-${video.id}`}>
                  <CardContent className="py-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{video.title}</p>
                          <Badge variant="outline" className="no-default-hover-elevate text-xs">{video.playerName}</Badge>
                          {video.assignmentId && groupAssignments && (() => {
                            const assignment = groupAssignments.find(a => a.id === video.assignmentId);
                            return assignment ? (
                              <Badge variant="secondary" className="no-default-hover-elevate text-xs">{assignment.drill?.name}</Badge>
                            ) : null;
                          })()}
                        </div>
                        {video.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{video.description}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
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
        </>
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

export default function TrainerPage() {
  const { user } = useAuth();

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-trainer-page-title">Trainer Mode</h1>
      </div>

      <Tabs defaultValue="my-players">
        <TabsList className="w-full grid grid-cols-4 sm:grid-cols-8 gap-1 h-auto" data-testid="tabs-trainer-main">
          <TabsTrigger value="my-players" className="text-xs sm:text-sm py-2" data-testid="tab-my-players">
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

        <TabsContent value="my-players">
          <MyPlayersTab />
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
