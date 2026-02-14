import { useState } from "react";
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
}

interface ChatContact {
  id: string;
  name: string;
  image?: string;
  teamName: string;
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

function MyPlayersTab() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<TrainerGroup | null>(null);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [removeMember, setRemoveMember] = useState<{ groupId: string; userId: string; name: string } | null>(null);
  const [filterPosition, setFilterPosition] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const form = useForm<CreateGroupForm>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: "", description: "", ageGroup: "" },
  });

  const { data: groups, isLoading: groupsLoading } = useQuery<TrainerGroup[]>({
    queryKey: ["/api/trainer/groups"],
  });

  const { data: members, isLoading: membersLoading } = useQuery<PlayerMember[]>({
    queryKey: ["/api/trainer/groups", selectedGroup?.id, "members"],
    enabled: !!selectedGroup,
  });

  const createGroupMutation = useMutation({
    mutationFn: (data: CreateGroupForm) => apiRequest("POST", "/api/trainer/groups", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups"] });
      setCreateOpen(false);
      form.reset();
      toast({ title: "Group created successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create group", description: error.message, variant: "destructive" });
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

  const removeMemberMutation = useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      apiRequest("DELETE", `/api/trainer/groups/${groupId}/members/${userId}`),
    onSuccess: () => {
      if (selectedGroup) {
        queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups", selectedGroup.id, "members"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups"] });
      setRemoveMember(null);
      toast({ title: "Player removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove player", description: error.message, variant: "destructive" });
    },
  });

  const copyGroupCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Group code copied!" });
  };

  const filteredMembers = members?.filter((m) => {
    const matchesPosition = filterPosition === "all" || m.position === filterPosition;
    const matchesSearch = searchQuery === "" || 
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPosition && matchesSearch;
  });

  const positions = ["all", ...Array.from(new Set(members?.map(m => m.position).filter(Boolean) || []))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold" data-testid="text-my-players-heading">My Players</h2>
        <Button onClick={() => setCreateOpen(true)} data-testid="button-create-group">
          <Plus className="w-4 h-4" />
          New Group
        </Button>
      </div>

      {groupsLoading ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      ) : !groups?.length ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground" data-testid="text-no-groups">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p>No player groups yet. Create a group and share the code with your players!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card
              key={group.id}
              className={`cursor-pointer transition-colors ${selectedGroup?.id === group.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => setSelectedGroup(selectedGroup?.id === group.id ? null : group)}
              data-testid={`card-group-${group.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate" data-testid={`text-group-name-${group.id}`}>{group.name}</CardTitle>
                    {group.description && (
                      <CardDescription className="line-clamp-1 mt-1">{group.description}</CardDescription>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); setDeleteGroupId(group.id); }}
                    data-testid={`button-delete-group-${group.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {group.ageGroup && (
                    <Badge variant="secondary" className="no-default-hover-elevate text-xs">
                      {group.ageGroup}
                    </Badge>
                  )}
                  <Badge variant="outline" className="no-default-hover-elevate font-mono text-xs" data-testid={`badge-group-code-${group.id}`}>
                    {group.teamCode}
                  </Badge>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); copyGroupCode(group.teamCode); }}
                    data-testid={`button-copy-group-code-${group.id}`}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedGroup && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base" data-testid="text-group-players-heading">
                Players in {selectedGroup.name}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                {positions.length > 1 && (
                  <Select value={filterPosition} onValueChange={setFilterPosition}>
                    <SelectTrigger className="w-[130px]" data-testid="select-filter-position">
                      <Filter className="w-3 h-3 mr-1" />
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map((pos) => (
                        <SelectItem key={pos} value={pos!} data-testid={`option-position-${pos}`}>
                          {pos === "all" ? "All Positions" : pos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-7 w-[150px]"
                    data-testid="input-search-players"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded" />)}
              </div>
            ) : !filteredMembers?.length ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-players">
                {members?.length ? "No players match your filters." : "No players yet. Share the group code for players to join."}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredMembers.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
                    data-testid={`row-player-${member.userId}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.profileImageUrl} />
                        <AvatarFallback className="text-xs">
                          {(member.firstName?.[0] || '') + (member.lastName?.[0] || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" data-testid={`text-player-name-${member.userId}`}>
                          {member.firstName} {member.lastName}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          {member.position && (
                            <Badge variant="outline" className="no-default-hover-elevate text-xs">{member.position}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setRemoveMember({ groupId: selectedGroup.id, userId: member.userId, name: `${member.firstName} ${member.lastName}` })}
                      data-testid={`button-remove-player-${member.userId}`}
                    >
                      <UserMinus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent data-testid="dialog-create-group">
          <DialogHeader>
            <DialogTitle>Create Player Group</DialogTitle>
            <DialogDescription>Create a group and share the code with your players so they can join.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createGroupMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Tuesday Evening Group" {...field} data-testid="input-group-name" />
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
                    <FormLabel>Age Group (optional)</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="select-age-group">
                          <SelectValue placeholder="Select age group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="8U">8U</SelectItem>
                          <SelectItem value="10U">10U</SelectItem>
                          <SelectItem value="12U">12U</SelectItem>
                          <SelectItem value="14U">14U</SelectItem>
                          <SelectItem value="16U">16U</SelectItem>
                          <SelectItem value="17U">17U</SelectItem>
                          <SelectItem value="High School">High School</SelectItem>
                          <SelectItem value="College">College</SelectItem>
                          <SelectItem value="Adult">Adult</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional group description..." {...field} data-testid="input-group-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createGroupMutation.isPending} data-testid="button-submit-create-group">
                  {createGroupMutation.isPending ? "Creating..." : "Create Group"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteGroupId} onOpenChange={(open) => !open && setDeleteGroupId(null)}>
        <AlertDialogContent data-testid="dialog-delete-group-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the group and remove all players. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-group">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteGroupId && deleteGroupMutation.mutate(deleteGroupId)}
              data-testid="button-confirm-delete-group"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!removeMember} onOpenChange={(open) => !open && setRemoveMember(null)}>
        <AlertDialogContent data-testid="dialog-remove-player-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Player?</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {removeMember?.name} from the group?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove-player">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeMember && removeMemberMutation.mutate(removeMember)}
              data-testid="button-confirm-remove-player"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AssignDrillsTab() {
  const { toast } = useToast();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedDrill, setSelectedDrill] = useState<DrillItem | null>(null);
  const [deleteAssignmentId, setDeleteAssignmentId] = useState<string | null>(null);

  const form = useForm<AssignDrillForm>({
    resolver: zodResolver(assignDrillSchema),
    defaultValues: { drillId: "", teamId: "", dueDate: "", notes: "" },
  });

  const { data: groups } = useQuery<TrainerGroup[]>({
    queryKey: ["/api/trainer/groups"],
  });

  const { data: drills, isLoading: drillsLoading } = useQuery<DrillItem[]>({
    queryKey: ["/api/drills"],
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ["/api/trainer/groups", selectedGroupId, "assignments"],
    enabled: !!selectedGroupId,
  });

  const assignMutation = useMutation({
    mutationFn: (data: AssignDrillForm) => apiRequest("POST", "/api/trainer/assignments", data),
    onSuccess: () => {
      if (selectedGroupId) {
        queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups", selectedGroupId, "assignments"] });
      }
      setAssignOpen(false);
      setSelectedDrill(null);
      form.reset();
      toast({ title: "Drill assigned successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign drill", description: error.message, variant: "destructive" });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/trainer/assignments/${id}`),
    onSuccess: () => {
      if (selectedGroupId) {
        queryClient.invalidateQueries({ queryKey: ["/api/trainer/groups", selectedGroupId, "assignments"] });
      }
      setDeleteAssignmentId(null);
      toast({ title: "Assignment removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to remove assignment", description: error.message, variant: "destructive" });
    },
  });

  const filteredDrills = drills?.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openAssignDialog = (drill: DrillItem) => {
    setSelectedDrill(drill);
    form.setValue("drillId", drill.id);
    form.setValue("teamId", selectedGroupId);
    setAssignOpen(true);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold" data-testid="text-trainer-assign-heading">Assign Drills</h2>

      <div className="w-full">
        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
          <SelectTrigger className="w-full sm:w-[240px]" data-testid="select-group-for-assignment">
            <SelectValue placeholder="Select a group" />
          </SelectTrigger>
          <SelectContent>
            {groups?.map((group) => (
              <SelectItem key={group.id} value={group.id} data-testid={`option-group-${group.id}`}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedGroupId && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search drills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-drills-trainer"
            />
          </div>

          {drillsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded" />)}
            </div>
          ) : !filteredDrills?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-drills-found-trainer">
              No drills found
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
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
            <h3 className="text-sm font-semibold mb-3" data-testid="text-trainer-current-assignments-heading">Current Assignments</h3>
            {assignmentsLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded" />)}
              </div>
            ) : !assignments?.length ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-trainer-assignments">
                No assignments for this group yet.
              </p>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                    data-testid={`row-trainer-assignment-${assignment.id}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{assignment.drillTitle}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
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
        </>
      )}

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent data-testid="dialog-trainer-assign-drill">
          <DialogHeader>
            <DialogTitle>Assign Drill</DialogTitle>
            <DialogDescription>
              Assign "{selectedDrill?.title}" to the selected group.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => assignMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-trainer-due-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any notes for the players..." {...field} data-testid="input-trainer-assignment-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={assignMutation.isPending} data-testid="button-submit-trainer-assign">
                  {assignMutation.isPending ? "Assigning..." : "Assign Drill"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
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
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  const { data: groups } = useQuery<TrainerGroup[]>({
    queryKey: ["/api/trainer/groups"],
  });

  const { data: logs, isLoading: logsLoading } = useQuery<TrainingLogEntry[]>({
    queryKey: ["/api/trainer/groups", selectedGroupId, "training-logs"],
    enabled: !!selectedGroupId,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold" data-testid="text-trainer-logs-heading">Player Training Logs</h2>

      <div className="w-full">
        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
          <SelectTrigger className="w-full sm:w-[240px]" data-testid="select-group-for-logs">
            <SelectValue placeholder="Select a group" />
          </SelectTrigger>
          <SelectContent>
            {groups?.map((group) => (
              <SelectItem key={group.id} value={group.id} data-testid={`option-log-group-${group.id}`}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedGroupId && (
        <>
          {logsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : !logs?.length ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-trainer-logs">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No training logs yet from players in this group.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
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
        </>
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
    </div>
  );
}

function VideosTab() {
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  const { data: groups } = useQuery<TrainerGroup[]>({
    queryKey: ["/api/trainer/groups"],
  });

  const { data: sharedVideos, isLoading: videosLoading } = useQuery<Array<{
    id: string;
    userId: string;
    playerName: string;
    title: string;
    videoUrl: string;
    description: string | null;
    createdAt: string;
  }>>({
    queryKey: ["/api/shared-videos", selectedGroupId],
    enabled: !!selectedGroupId,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold" data-testid="text-trainer-videos-heading">Shared Videos</h2>

      <div className="flex items-center gap-3">
        <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
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
