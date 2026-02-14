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

export default function TrainerPage() {
  const { user } = useAuth();

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-trainer-page-title">Trainer Mode</h1>
      </div>

      <Tabs defaultValue="my-players">
        <TabsList className="w-full grid grid-cols-3 gap-1 h-auto" data-testid="tabs-trainer-main">
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
      </Tabs>
    </div>
  );
}
