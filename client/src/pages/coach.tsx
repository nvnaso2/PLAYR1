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
  Shield,
  LogOut,
  FileText,
  Edit2,
} from "lucide-react";
import { insertTrainerTeamSchema, insertDrillAssignmentSchema } from "@shared/schema";

interface CoachTeam {
  id: string;
  name: string;
  description: string;
  teamCode: string;
  seasonYear?: number;
  ageGroup?: string;
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
    defaultValues: { name: "", description: "", seasonYear: currentYear, ageGroup: "" },
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

  const positionOptions = ["PG", "SG", "SF", "PF", "C", "G", "F", "G/F"];

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
                No players on the roster yet. Share the team code for players to join.
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
                      <p className="text-sm font-medium truncate" data-testid={`text-roster-name-${member.userId}`}>
                        {member.firstName} {member.lastName}
                      </p>
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
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditMember(member)}
                        data-testid={`button-edit-member-${member.userId}`}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setRemoveMember({ teamId: selectedTeam.id, userId: member.userId, name: `${member.firstName} ${member.lastName}` })}
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
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger data-testid="select-age-group">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Varsity">Varsity</SelectItem>
                            <SelectItem value="JV">JV</SelectItem>
                            <SelectItem value="Freshman">Freshman</SelectItem>
                            <SelectItem value="8th Grade">8th Grade</SelectItem>
                            <SelectItem value="7th Grade">7th Grade</SelectItem>
                            <SelectItem value="8U">8U</SelectItem>
                            <SelectItem value="10U">10U</SelectItem>
                            <SelectItem value="12U">12U</SelectItem>
                            <SelectItem value="14U">14U</SelectItem>
                            <SelectItem value="16U">16U</SelectItem>
                            <SelectItem value="17U">17U</SelectItem>
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

function AssignDrillsTab() {
  const { toast } = useToast();
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedDrill, setSelectedDrill] = useState<DrillItem | null>(null);
  const [deleteAssignmentId, setDeleteAssignmentId] = useState<string | null>(null);

  const form = useForm<AssignDrillForm>({
    resolver: zodResolver(assignDrillSchema),
    defaultValues: { drillId: "", teamId: "", dueDate: "", notes: "" },
  });

  const { data: teams } = useQuery<CoachTeam[]>({
    queryKey: ["/api/coach/teams"],
  });

  const { data: drills, isLoading: drillsLoading } = useQuery<DrillItem[]>({
    queryKey: ["/api/drills"],
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ["/api/coach/teams", selectedTeamId, "assignments"],
    enabled: !!selectedTeamId,
  });

  const assignMutation = useMutation({
    mutationFn: (data: AssignDrillForm) => apiRequest("POST", "/api/coach/assignments", data),
    onSuccess: () => {
      if (selectedTeamId) {
        queryClient.invalidateQueries({ queryKey: ["/api/coach/teams", selectedTeamId, "assignments"] });
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
    mutationFn: (id: string) => apiRequest("DELETE", `/api/coach/assignments/${id}`),
    onSuccess: () => {
      if (selectedTeamId) {
        queryClient.invalidateQueries({ queryKey: ["/api/coach/teams", selectedTeamId, "assignments"] });
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
    form.setValue("teamId", selectedTeamId);
    setAssignOpen(true);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold" data-testid="text-assign-drills-heading">Assign Drills</h2>

      <div className="w-full">
        <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
          <SelectTrigger className="w-full sm:w-[240px]" data-testid="select-team-for-assignment">
            <SelectValue placeholder="Select a team" />
          </SelectTrigger>
          <SelectContent>
            {teams?.map((team) => (
              <SelectItem key={team.id} value={team.id} data-testid={`option-team-${team.id}`}>
                {team.name} {team.seasonYear ? `(${team.seasonYear})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTeamId && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search drills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-drills"
            />
          </div>

          {drillsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded" />)}
            </div>
          ) : !filteredDrills?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-drills-found">
              No drills found
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {filteredDrills.map((drill) => (
                <div
                  key={drill.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                  data-testid={`row-drill-${drill.id}`}
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
                    data-testid={`button-assign-drill-${drill.id}`}
                  >
                    <ClipboardList className="w-3 h-3" />
                    Assign
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-3" data-testid="text-current-assignments-heading">Current Assignments</h3>
            {assignmentsLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-16 rounded" />)}
              </div>
            ) : !assignments?.length ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-assignments">
                No assignments for this team yet.
              </p>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
                    data-testid={`row-assignment-${assignment.id}`}
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
                      data-testid={`button-delete-assignment-${assignment.id}`}
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
        <DialogContent data-testid="dialog-assign-drill">
          <DialogHeader>
            <DialogTitle>Assign Drill</DialogTitle>
            <DialogDescription>
              Assign "{selectedDrill?.title}" to the selected team.
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
                      <Input type="date" {...field} data-testid="input-due-date" />
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
                      <Textarea placeholder="Any notes for the players..." {...field} data-testid="input-assignment-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={assignMutation.isPending} data-testid="button-submit-assign-drill">
                  {assignMutation.isPending ? "Assigning..." : "Assign Drill"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAssignmentId} onOpenChange={(open) => !open && setDeleteAssignmentId(null)}>
        <AlertDialogContent data-testid="dialog-delete-assignment-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the drill assignment from the team.
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
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  const { data: teams } = useQuery<CoachTeam[]>({
    queryKey: ["/api/coach/teams"],
  });

  const { data: logs, isLoading: logsLoading } = useQuery<TrainingLogEntry[]>({
    queryKey: ["/api/coach/teams", selectedTeamId, "training-logs"],
    enabled: !!selectedTeamId,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold" data-testid="text-coach-logs-heading">Player Training Logs</h2>

      <div className="w-full">
        <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
          <SelectTrigger className="w-full sm:w-[240px]" data-testid="select-team-for-logs">
            <SelectValue placeholder="Select a team" />
          </SelectTrigger>
          <SelectContent>
            {teams?.map((team) => (
              <SelectItem key={team.id} value={team.id} data-testid={`option-log-team-${team.id}`}>
                {team.name} {team.seasonYear ? `(${team.seasonYear})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTeamId && (
        <>
          {logsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
            </div>
          ) : !logs?.length ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground" data-testid="text-no-coach-logs">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No training logs yet from players on this team.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
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

export default function CoachPage() {
  const { user } = useAuth();

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-coach-page-title">Coach Mode</h1>
      </div>

      <Tabs defaultValue="roster">
        <TabsList className="w-full grid grid-cols-3 sm:grid-cols-5 gap-1 h-auto" data-testid="tabs-coach-main">
          <TabsTrigger value="roster" className="text-xs sm:text-sm py-2" data-testid="tab-roster">
            <Users className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">Roster</span>
          </TabsTrigger>
          <TabsTrigger value="assign-drills" className="text-xs sm:text-sm py-2" data-testid="tab-assign-drills">
            <ClipboardList className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">Assign</span>
          </TabsTrigger>
          <TabsTrigger value="training-logs" className="text-xs sm:text-sm py-2" data-testid="tab-training-logs">
            <FileText className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">Logs</span>
          </TabsTrigger>
          <TabsTrigger value="join-team" className="text-xs sm:text-sm py-2" data-testid="tab-join-team">
            <UserPlus className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">Join</span>
          </TabsTrigger>
          <TabsTrigger value="my-assignments" className="text-xs sm:text-sm py-2" data-testid="tab-my-assignments">
            <BookOpen className="w-4 h-4 mr-1 shrink-0" />
            <span className="truncate">Assigned</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roster">
          <RosterTab />
        </TabsContent>
        <TabsContent value="assign-drills">
          <AssignDrillsTab />
        </TabsContent>
        <TabsContent value="training-logs">
          <TrainingLogsTab />
        </TabsContent>
        <TabsContent value="join-team">
          <JoinTeamTab />
        </TabsContent>
        <TabsContent value="my-assignments">
          <MyAssignmentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
