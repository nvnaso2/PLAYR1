import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Search,
  Plus,
  Trash2,
  ClipboardList,
  Calendar,
  Check,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Dumbbell,
  Users,
  User,
  Shield,
  Play,
  Clock,
  Edit2,
  BookOpen,
  Info,
} from "lucide-react";
import { DRILL_CATEGORIES, DIFFICULTY_LEVELS } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";

const PLAYER_POSITIONS = ["PG", "SG", "SF", "PF", "C", "Guard", "Wing", "Forward", "Bigs"];
const PLAYER_AGES = ["8U", "9U", "10U", "11U", "12U", "13U", "14U", "15U", "16U", "17U", "18U"];
const LEVEL_OPTIONS = ["Recreational", "Travel/Club", "AAU", "Middle School", "JV", "Varsity", "Prep/Post-Grad", "College", "Pro/Semi-Pro"];
const CLASS_OPTIONS = ["2025", "2026", "2027", "2028", "2029", "2030", "2031", "2032", "2033", "2034"];

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

interface DrillItem {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  description?: string | null;
  duration?: number | null;
  userId?: string | null;
  isShared?: boolean | null;
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
  userId: string | null;
  createdAt: string;
}

interface Assignment {
  id: string;
  drillId: string;
  drillTitle: string;
  teamId: string | null;
  assignedBy: string;
  dueDate: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
}

interface WorkoutData {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  estimatedDuration: number | null;
  userId: string | null;
  createdAt: string;
}

interface WorkoutWithDrills {
  workout: WorkoutData;
  drills: Array<{
    id: string;
    workoutId: string;
    drillId: string;
    sortOrder: number;
    defaultDuration: number | null;
    defaultSets: number | null;
    defaultReps: number | null;
    drill: DrillItem;
  }>;
}

interface TrainerPlayerData {
  id: string;
  trainerId: string;
  firstName: string;
  lastName: string | null;
  position: string | null;
  ageGroup: string | null;
  gradYear: number | null;
  linkedUserId: string | null;
  groups: Array<{ groupId: string; groupName: string }>;
  teams: Array<{ teamId: string; teamName: string }>;
}

export default function TrainerDrillsPage() {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" data-testid="text-drills-workouts-heading">Drills & Workouts</h1>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-drills-workouts">
          <TabsTrigger value="all" data-testid="tab-all-drills">All Drills</TabsTrigger>
          <TabsTrigger value="mine" data-testid="tab-my-drills">My Drills</TabsTrigger>
          <TabsTrigger value="workouts" data-testid="tab-workouts">Workouts</TabsTrigger>
          <TabsTrigger value="assignments" data-testid="tab-assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <AllDrillsSection />
        </TabsContent>
        <TabsContent value="mine">
          <MyDrillsSection />
        </TabsContent>
        <TabsContent value="workouts">
          <WorkoutsSection />
        </TabsContent>
        <TabsContent value="assignments">
          <AssignmentsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AllDrillsSection() {
  const { toast } = useToast();
  const adminUserId = useAuth().user?.id;
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [detailDrill, setDetailDrill] = useState<DrillItem | null>(null);
  const [quickAssignDrillId, setQuickAssignDrillId] = useState<string | null>(null);
  const [quickAssignGroupId, setQuickAssignGroupId] = useState("");
  const [quickAssignTarget, setQuickAssignTarget] = useState<"group" | "player">("group");
  const [quickAssignPlayerId, setQuickAssignPlayerId] = useState("");
  const [quickAssignDueDate, setQuickAssignDueDate] = useState("");
  const [quickAssignNotes, setQuickAssignNotes] = useState("");

  const { data: trainerDrills, isLoading: trainerDrillsLoading } = useQuery<TrainerDrill[]>({
    queryKey: ["/api/trainer/drills"],
  });

  const { data: allSystemDrills, isLoading: systemDrillsLoading } = useQuery<DrillItem[]>({
    queryKey: ["/api/drills"],
  });

  const { data: groups } = useQuery<TrainerGroup[]>({
    queryKey: ["/api/trainer/groups"],
  });

  const { data: coachTeams } = useQuery<CoachTeam[]>({
    queryKey: ["/api/coach/teams"],
  });

  const { data: trainerPlayers } = useQuery<{ id: string; firstName: string | null; lastName: string | null; linkedUserId: string | null; email: string | null }[]>({
    queryKey: ["/api/trainer-players"],
  });

  const allTeamsAndGroups = useMemo(() => [...(groups || []), ...(coachTeams || [])], [groups, coachTeams]);

  const linkedPlayers = useMemo(() => (trainerPlayers || []).filter(p => p.linkedUserId), [trainerPlayers]);

  const allDrillsCombined = useMemo(() => {
    const system = allSystemDrills || [];
    const custom = trainerDrills || [];
    const systemIds = new Set(system.map(d => d.id));
    return [
      ...system,
      ...custom.filter(d => !systemIds.has(d.id)).map(d => ({
        ...d,
        userId: d.userId as string | null,
        isShared: null as boolean | null,
      })),
    ];
  }, [allSystemDrills, trainerDrills]);

  const drillsLoading = trainerDrillsLoading || systemDrillsLoading;

  const filteredDrills = useMemo(() => {
    return allDrillsCombined.filter(drill => {
      if (drill.userId && drill.userId !== adminUserId && !drill.isShared) return false;
      if (searchQuery && !drill.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (categoryFilter !== "all" && drill.category !== categoryFilter) return false;
      if (sourceFilter === "handlz" && drill.userId !== null) return false;
      if (sourceFilter === "community" && !(drill.userId && drill.isShared && drill.userId !== adminUserId)) return false;
      if (sourceFilter === "mine" && drill.userId !== adminUserId) return false;
      return true;
    });
  }, [allDrillsCombined, searchQuery, categoryFilter, sourceFilter, adminUserId]);

  const quickAssignMutation = useMutation({
    mutationFn: (data: { drillId: string; teamId?: string; assignedTo?: string; dueDate?: string; notes?: string }) =>
      apiRequest("POST", "/api/trainer/assignments", data),
    onSuccess: () => {
      setQuickAssignDrillId(null);
      setQuickAssignGroupId("");
      setQuickAssignPlayerId("");
      setQuickAssignTarget("group");
      setQuickAssignDueDate("");
      setQuickAssignNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/all-assignments"] });
      toast({ title: "Drill assigned!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign drill", description: error.message, variant: "destructive" });
    },
  });

  const getSourceBadge = (drill: any) => {
    if (!drill.userId) return <Badge variant="default" className="no-default-hover-elevate text-[10px]">Handlz</Badge>;
    if (drill.userId === adminUserId) return <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">My Drill</Badge>;
    if (drill.isShared) return <Badge variant="outline" className="no-default-hover-elevate text-[10px]">Community</Badge>;
    return null;
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search drills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-all-drills-search"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-all-drills-category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {DRILL_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-all-drills-source">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="handlz">Handlz</SelectItem>
            <SelectItem value="community">Community</SelectItem>
            <SelectItem value="mine">My Drills</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {drillsLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded" />)}</div>
      ) : filteredDrills.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No drills found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDrills.map((drill) => (
            <div
              key={drill.id}
              className="flex items-center justify-between gap-2 p-3 rounded-md border bg-card cursor-pointer hover-elevate"
              onClick={() => setDetailDrill(drill)}
              data-testid={`row-all-drill-${drill.id}`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{drill.title}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <Badge variant="outline" className="no-default-hover-elevate text-[10px]">
                    {drill.category.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </Badge>
                  <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">{drill.difficulty}</Badge>
                  {getSourceBadge(drill)}
                  {drill.duration && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />{drill.duration}s
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); setQuickAssignDrillId(drill.id); }}
                data-testid={`button-quick-assign-${drill.id}`}
              >
                <ClipboardList className="w-3 h-3 mr-1" /> Assign
              </Button>
            </div>
          ))}
        </div>
      )}

      <Sheet open={!!detailDrill} onOpenChange={(o) => !o && setDetailDrill(null)}>
        <SheetContent data-testid="sheet-drill-detail">
          <SheetHeader>
            <SheetTitle data-testid="text-drill-detail-title">{detailDrill?.title}</SheetTitle>
            <SheetDescription>Drill details</SheetDescription>
          </SheetHeader>
          {detailDrill && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="no-default-hover-elevate">
                  {detailDrill.category.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                </Badge>
                <Badge variant="secondary" className="no-default-hover-elevate">
                  {detailDrill.difficulty.charAt(0).toUpperCase() + detailDrill.difficulty.slice(1)}
                </Badge>
                {getSourceBadge(detailDrill)}
              </div>
              {detailDrill.description && (
                <div>
                  <p className="text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-drill-detail-description">{detailDrill.description}</p>
                </div>
              )}
              {detailDrill.duration && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span data-testid="text-drill-detail-duration">{detailDrill.duration} seconds</span>
                </div>
              )}
              <div className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuickAssignDrillId(detailDrill.id);
                    setDetailDrill(null);
                  }}
                  data-testid="button-detail-assign"
                >
                  <ClipboardList className="w-4 h-4 mr-2" /> Assign This Drill
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!quickAssignDrillId} onOpenChange={(o) => { if (!o) { setQuickAssignDrillId(null); setQuickAssignTarget("group"); setQuickAssignGroupId(""); setQuickAssignPlayerId(""); } }}>
        <DialogContent data-testid="dialog-quick-assign">
          <DialogHeader>
            <DialogTitle>Quick Assign</DialogTitle>
            <DialogDescription>
              Assign "{filteredDrills.find(d => d.id === quickAssignDrillId)?.title}" to a team, group, or player.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Tabs value={quickAssignTarget} onValueChange={(v) => { setQuickAssignTarget(v as "group" | "player"); setQuickAssignGroupId(""); setQuickAssignPlayerId(""); }}>
              <TabsList className="w-full">
                <TabsTrigger value="group" className="flex-1" data-testid="tab-assign-group">
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  Team / Group
                </TabsTrigger>
                <TabsTrigger value="player" className="flex-1" data-testid="tab-assign-player">
                  <User className="w-3.5 h-3.5 mr-1.5" />
                  Player
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {quickAssignTarget === "group" ? (
              <Select value={quickAssignGroupId} onValueChange={setQuickAssignGroupId}>
                <SelectTrigger data-testid="select-quick-assign-group">
                  <SelectValue placeholder="Select team/group" />
                </SelectTrigger>
                <SelectContent>
                  {allTeamsAndGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={quickAssignPlayerId} onValueChange={setQuickAssignPlayerId}>
                <SelectTrigger data-testid="select-quick-assign-player">
                  <SelectValue placeholder="Select player" />
                </SelectTrigger>
                <SelectContent>
                  {linkedPlayers.map((p) => (
                    <SelectItem key={p.id} value={p.linkedUserId!}>
                      {`${p.firstName || ''} ${p.lastName || ''}`.trim() || p.email || 'Unknown'}
                    </SelectItem>
                  ))}
                  {linkedPlayers.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No linked players</div>
                  )}
                </SelectContent>
              </Select>
            )}
            <Input
              type="date"
              value={quickAssignDueDate}
              onChange={(e) => setQuickAssignDueDate(e.target.value)}
              data-testid="input-quick-assign-due"
            />
            <Input
              placeholder="Notes (optional)"
              value={quickAssignNotes}
              onChange={(e) => setQuickAssignNotes(e.target.value)}
              data-testid="input-quick-assign-notes"
            />
          </div>
          <DialogFooter>
            <Button
              disabled={(quickAssignTarget === "group" ? !quickAssignGroupId : !quickAssignPlayerId) || quickAssignMutation.isPending}
              onClick={() => {
                if (!quickAssignDrillId) return;
                if (quickAssignTarget === "group" && quickAssignGroupId) {
                  quickAssignMutation.mutate({
                    drillId: quickAssignDrillId,
                    teamId: quickAssignGroupId,
                    dueDate: quickAssignDueDate || undefined,
                    notes: quickAssignNotes || undefined,
                  });
                } else if (quickAssignTarget === "player" && quickAssignPlayerId) {
                  quickAssignMutation.mutate({
                    drillId: quickAssignDrillId,
                    assignedTo: quickAssignPlayerId,
                    dueDate: quickAssignDueDate || undefined,
                    notes: quickAssignNotes || undefined,
                  });
                }
              }}
              data-testid="button-quick-assign-submit"
            >
              {quickAssignMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MyDrillsSection() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editDrillId, setEditDrillId] = useState<string | null>(null);
  const [deleteDrillId, setDeleteDrillId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("beginner");
  const [duration, setDuration] = useState("");
  const [trackShots, setTrackShots] = useState(false);

  const { data: myDrills, isLoading } = useQuery<TrainerDrill[]>({
    queryKey: ["/api/trainer/drills"],
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setDifficulty("beginner");
    setDuration("");
    setTrackShots(false);
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/trainer/drills", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/drills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drills"] });
      setCreateOpen(false);
      resetForm();
      toast({ title: "Drill created!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create drill", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/trainer/drills/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/drills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drills"] });
      setEditDrillId(null);
      resetForm();
      toast({ title: "Drill updated!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update drill", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/trainer/drills/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/drills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/drills"] });
      setDeleteDrillId(null);
      toast({ title: "Drill deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete drill", description: error.message, variant: "destructive" });
    },
  });

  const openEdit = (drill: TrainerDrill) => {
    setTitle(drill.title);
    setDescription(drill.description || "");
    setCategory(drill.category);
    setDifficulty(drill.difficulty);
    setDuration(drill.duration ? String(drill.duration) : "");
    setTrackShots(drill.trackShots || false);
    setEditDrillId(drill.id);
  };

  const handleSubmit = () => {
    const data = {
      title,
      description: description || undefined,
      category,
      difficulty,
      duration: duration ? parseInt(duration) : undefined,
      trackShots,
    };
    if (editDrillId) {
      updateMutation.mutate({ id: editDrillId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Your custom drills</p>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }} data-testid="button-create-drill">
          <Plus className="w-4 h-4 mr-1" /> Create Drill
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded" />)}</div>
      ) : !myDrills?.length ? (
        <div className="py-8 text-center text-muted-foreground">
          <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No custom drills yet. Create your first drill!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myDrills.map((drill) => (
            <div
              key={drill.id}
              className="flex items-center justify-between gap-2 p-3 rounded-md border bg-card"
              data-testid={`row-my-drill-${drill.id}`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{drill.title}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <Badge variant="outline" className="no-default-hover-elevate text-[10px]">
                    {drill.category.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </Badge>
                  <Badge variant="secondary" className="no-default-hover-elevate text-[10px]">{drill.difficulty}</Badge>
                  {drill.duration && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />{drill.duration}s
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => openEdit(drill)} data-testid={`button-edit-drill-${drill.id}`}>
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeleteDrillId(drill.id)} data-testid={`button-delete-drill-${drill.id}`}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={createOpen || !!editDrillId} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditDrillId(null); resetForm(); } }}>
        <DialogContent data-testid="dialog-drill-form">
          <DialogHeader>
            <DialogTitle>{editDrillId ? "Edit Drill" : "Create Drill"}</DialogTitle>
            <DialogDescription>{editDrillId ? "Update your custom drill." : "Create a new custom drill."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Drill title" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="input-drill-title" />
            <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-drill-description" />
            <div className="grid grid-cols-2 gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="select-drill-category"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  {DRILL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger data-testid="select-drill-difficulty"><SelectValue placeholder="Difficulty" /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_LEVELS.map((lvl) => (
                    <SelectItem key={lvl} value={lvl}>{lvl.charAt(0).toUpperCase() + lvl.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input type="number" placeholder="Duration (seconds)" value={duration} onChange={(e) => setDuration(e.target.value)} data-testid="input-drill-duration" />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={trackShots} onCheckedChange={(c) => setTrackShots(!!c)} data-testid="checkbox-drill-track-shots" />
              Track shot locations
            </label>
          </div>
          <DialogFooter>
            <Button
              disabled={!title || !category || createMutation.isPending || updateMutation.isPending}
              onClick={handleSubmit}
              data-testid="button-drill-submit"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editDrillId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteDrillId} onOpenChange={(o) => !o && setDeleteDrillId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Drill</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDrillId && deleteMutation.mutate(deleteDrillId)} data-testid="button-confirm-delete-drill">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function WorkoutsSection() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<WorkoutWithDrills | null>(null);
  const [deleteWorkoutId, setDeleteWorkoutId] = useState<string | null>(null);
  const [assignWorkoutId, setAssignWorkoutId] = useState<string | null>(null);
  const [assignGroupId, setAssignGroupId] = useState("");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assignNotes, setAssignNotes] = useState("");

  const [workoutName, setWorkoutName] = useState("");
  const [workoutDescription, setWorkoutDescription] = useState("");
  const [workoutCategory, setWorkoutCategory] = useState("");
  const [workoutDrillIds, setWorkoutDrillIds] = useState<string[]>([]);
  const [drillSearch, setDrillSearch] = useState("");

  const { data: personalWorkouts, isLoading } = useQuery<WorkoutData[]>({
    queryKey: ["/api/workouts/personal"],
  });

  const { data: allDrills } = useQuery<DrillItem[]>({
    queryKey: ["/api/drills"],
  });

  const { data: groups } = useQuery<TrainerGroup[]>({
    queryKey: ["/api/trainer/groups"],
  });

  const { data: coachTeams } = useQuery<CoachTeam[]>({
    queryKey: ["/api/coach/teams"],
  });

  const allTeamsAndGroups = useMemo(() => [...(groups || []), ...(coachTeams || [])], [groups, coachTeams]);

  const searchedDrills = useMemo(() => {
    if (!allDrills) return [];
    const selected = new Set(workoutDrillIds);
    return allDrills.filter(d => {
      if (selected.has(d.id)) return false;
      if (drillSearch && !d.title.toLowerCase().includes(drillSearch.toLowerCase())) return false;
      return true;
    });
  }, [allDrills, workoutDrillIds, drillSearch]);

  const selectedDrillItems = useMemo(() => {
    if (!allDrills) return [];
    return workoutDrillIds.map(id => allDrills.find(d => d.id === id)).filter(Boolean) as DrillItem[];
  }, [allDrills, workoutDrillIds]);

  const resetForm = () => {
    setWorkoutName("");
    setWorkoutDescription("");
    setWorkoutCategory("");
    setWorkoutDrillIds([]);
    setDrillSearch("");
  };

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; category?: string; drillIds: string[] }) =>
      apiRequest("POST", "/api/workouts", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workouts/personal"] });
      setCreateOpen(false);
      resetForm();
      toast({ title: "Workout created!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create workout", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; description?: string; category?: string; drillIds: string[] } }) =>
      apiRequest("PUT", `/api/workouts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workouts/personal"] });
      setEditingWorkout(null);
      resetForm();
      toast({ title: "Workout updated!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update workout", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/workouts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workouts/personal"] });
      setDeleteWorkoutId(null);
      toast({ title: "Workout deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete workout", description: error.message, variant: "destructive" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: (data: { workoutId: string; teamId: string; dueDate?: string; notes?: string }) =>
      apiRequest("POST", `/api/workouts/${data.workoutId}/assign`, { teamId: data.teamId, dueDate: data.dueDate, notes: data.notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/all-assignments"] });
      setAssignWorkoutId(null);
      setAssignGroupId("");
      setAssignDueDate("");
      setAssignNotes("");
      toast({ title: "Workout assigned to team!" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign workout", description: error.message, variant: "destructive" });
    },
  });

  const openEdit = async (workout: WorkoutData) => {
    try {
      const res = await fetch(`/api/workouts/${workout.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load workout");
      const data: WorkoutWithDrills = await res.json();
      setWorkoutName(data.workout.name);
      setWorkoutDescription(data.workout.description || "");
      setWorkoutCategory(data.workout.category || "");
      setWorkoutDrillIds(data.drills.map(d => d.drillId));
      setEditingWorkout(data);
    } catch {
      toast({ title: "Failed to load workout", variant: "destructive" });
    }
  };

  const moveDrill = (index: number, direction: "up" | "down") => {
    const newIds = [...workoutDrillIds];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newIds.length) return;
    [newIds[index], newIds[swapIndex]] = [newIds[swapIndex], newIds[index]];
    setWorkoutDrillIds(newIds);
  };

  const removeDrill = (index: number) => {
    setWorkoutDrillIds(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const data = {
      name: workoutName,
      description: workoutDescription || undefined,
      category: workoutCategory || undefined,
      drillIds: workoutDrillIds,
    };
    if (editingWorkout) {
      updateMutation.mutate({ id: editingWorkout.workout.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const estimatedDuration = selectedDrillItems.reduce((sum, d) => sum + (d.duration || 60), 0);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Bundle drills into structured workouts</p>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }} data-testid="button-create-workout">
          <Plus className="w-4 h-4 mr-1" /> Create Workout
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded" />)}</div>
      ) : !personalWorkouts?.length ? (
        <div className="py-8 text-center text-muted-foreground">
          <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No workouts yet. Create your first workout!</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {personalWorkouts.map((workout) => (
            <Card key={workout.id} data-testid={`card-workout-${workout.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-primary shrink-0" />
                  {workout.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                {workout.description && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{workout.description}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {workout.category && (
                    <Badge variant="outline" className="no-default-hover-elevate text-[10px]">
                      {workout.category.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </Badge>
                  )}
                  {workout.estimatedDuration && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />{Math.round(workout.estimatedDuration / 60)} min
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(workout)} data-testid={`button-edit-workout-${workout.id}`}>
                    <Edit2 className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAssignWorkoutId(workout.id)} data-testid={`button-assign-workout-${workout.id}`}>
                    <ClipboardList className="w-3 h-3 mr-1" /> Assign
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteWorkoutId(workout.id)} data-testid={`button-delete-workout-${workout.id}`}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen || !!editingWorkout} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditingWorkout(null); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="dialog-workout-form">
          <DialogHeader>
            <DialogTitle>{editingWorkout ? "Edit Workout" : "Create Workout"}</DialogTitle>
            <DialogDescription>
              {editingWorkout ? "Update your workout." : "Bundle multiple drills into a workout."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Workout name" value={workoutName} onChange={(e) => setWorkoutName(e.target.value)} data-testid="input-workout-name" />
            <Textarea placeholder="Description (optional)" value={workoutDescription} onChange={(e) => setWorkoutDescription(e.target.value)} data-testid="input-workout-description" />
            <Select value={workoutCategory} onValueChange={setWorkoutCategory}>
              <SelectTrigger data-testid="select-workout-category"><SelectValue placeholder="Category (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                {DRILL_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">
                  Drills ({workoutDrillIds.length})
                  {workoutDrillIds.length > 0 && (
                    <span className="text-muted-foreground font-normal ml-2">~{Math.round(estimatedDuration / 60)} min</span>
                  )}
                </label>
              </div>

              {selectedDrillItems.length > 0 && (
                <div className="space-y-1 mb-3">
                  {selectedDrillItems.map((drill, index) => (
                    <div key={drill.id} className="flex items-center gap-1 p-2 rounded-md bg-muted/50 text-sm">
                      <span className="text-xs text-muted-foreground w-5 text-center">{index + 1}</span>
                      <span className="flex-1 truncate">{drill.title}</span>
                      <Badge variant="outline" className="no-default-hover-elevate text-[10px] shrink-0">{drill.category}</Badge>
                      <Button size="icon" variant="ghost" className="h-6 w-6" disabled={index === 0} onClick={() => moveDrill(index, "up")} data-testid={`button-move-up-${drill.id}`}>
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" disabled={index === selectedDrillItems.length - 1} onClick={() => moveDrill(index, "down")} data-testid={`button-move-down-${drill.id}`}>
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeDrill(index)} data-testid={`button-remove-drill-${drill.id}`}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search drills to add..."
                    value={drillSearch}
                    onChange={(e) => setDrillSearch(e.target.value)}
                    className="pl-9"
                    data-testid="input-workout-drill-search"
                  />
                </div>
                {drillSearch && (
                  <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-1">
                    {searchedDrills.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">No drills found</p>
                    ) : (
                      searchedDrills.slice(0, 20).map((drill) => (
                        <div
                          key={drill.id}
                          className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setWorkoutDrillIds(prev => [...prev, drill.id]);
                            setDrillSearch("");
                          }}
                          data-testid={`button-add-workout-drill-${drill.id}`}
                        >
                          <Plus className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate flex-1">{drill.title}</span>
                          <Badge variant="outline" className="no-default-hover-elevate text-[10px]">{drill.category}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!workoutName || workoutDrillIds.length < 2 || createMutation.isPending || updateMutation.isPending}
              onClick={handleSubmit}
              data-testid="button-workout-submit"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editingWorkout ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!assignWorkoutId} onOpenChange={(o) => !o && setAssignWorkoutId(null)}>
        <DialogContent data-testid="dialog-assign-workout">
          <DialogHeader>
            <DialogTitle>Assign Workout</DialogTitle>
            <DialogDescription>Assign all drills in this workout to a team or group.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={assignGroupId} onValueChange={setAssignGroupId}>
              <SelectTrigger data-testid="select-assign-workout-group">
                <SelectValue placeholder="Select team/group" />
              </SelectTrigger>
              <SelectContent>
                {allTeamsAndGroups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={assignDueDate} onChange={(e) => setAssignDueDate(e.target.value)} data-testid="input-assign-workout-due" />
            <Input placeholder="Notes (optional)" value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} data-testid="input-assign-workout-notes" />
          </div>
          <DialogFooter>
            <Button
              disabled={!assignGroupId || !assignWorkoutId || assignMutation.isPending}
              onClick={() => {
                if (assignWorkoutId && assignGroupId) {
                  assignMutation.mutate({
                    workoutId: assignWorkoutId,
                    teamId: assignGroupId,
                    dueDate: assignDueDate || undefined,
                    notes: assignNotes || undefined,
                  });
                }
              }}
              data-testid="button-assign-workout-submit"
            >
              {assignMutation.isPending ? "Assigning..." : "Assign Workout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteWorkoutId} onOpenChange={(o) => !o && setDeleteWorkoutId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteWorkoutId && deleteMutation.mutate(deleteWorkoutId)} data-testid="button-confirm-delete-workout">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AssignmentsSection() {
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
      id: d.id, title: d.title, category: d.category, difficulty: d.difficulty,
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

  const assignMutation = useMutation({
    mutationFn: (data: { drillId: string; teamId?: string; assignedTo?: string; dueDate?: string; notes?: string }) =>
      apiRequest("POST", "/api/trainer/assignments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/all-assignments"] });
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

  const hasAnyAttrFilter = assignPosFilter !== "all" || assignAgeFilter !== "all" || assignLevelFilter !== "all" || assignClassFilter !== "all";
  const hasAnyFilter = assignGroupId !== "" || assignTeamId !== "" || hasAnyAttrFilter;

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
      const levelMatch = assignLevelFilter === "all" || true;
      const classMatch = assignClassFilter === "all" || (p.gradYear && String(p.gradYear) === assignClassFilter);
      return posMatch && ageMatch && groupMatch && teamMatch && levelMatch && classMatch;
    });
  }, [trainerPlayers, assignGroupId, assignTeamId, assignPosFilter, assignAgeFilter, assignLevelFilter, assignClassFilter]);

  const visibleCohortPlayers = useMemo(() => {
    if (!playerSearch) return cohortPlayers;
    return cohortPlayers.filter(p => {
      const name = `${p.firstName} ${p.lastName || ""}`.toLowerCase();
      return name.includes(playerSearch.toLowerCase());
    });
  }, [cohortPlayers, playerSearch]);

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
        await assignMutation.mutateAsync({ drillId: selectedDrill.id, assignedTo: playerId, dueDate: assignDueDate || undefined, notes: assignNotes || undefined });
      }
    } else if (assignGroupId && !assignTeamId && !hasAnyAttrFilter) {
      await assignMutation.mutateAsync({ drillId: selectedDrill.id, teamId: assignGroupId, dueDate: assignDueDate || undefined, notes: assignNotes || undefined });
    } else if (assignTeamId && !assignGroupId && !hasAnyAttrFilter) {
      await assignMutation.mutateAsync({ drillId: selectedDrill.id, teamId: assignTeamId, dueDate: assignDueDate || undefined, notes: assignNotes || undefined });
    } else {
      for (const player of cohortPlayers) {
        await assignMutation.mutateAsync({ drillId: selectedDrill.id, assignedTo: player.id, dueDate: assignDueDate || undefined, notes: assignNotes || undefined });
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

  const canGoNext = () => {
    if (assignStep === "drill") return !!selectedDrill;
    if (assignStep === "cohort") {
      if (assignPlayerIds.size > 0) return true;
      if ((assignGroupId || assignTeamId) && !hasAnyAttrFilter) return true;
      if (hasAnyFilter && cohortPlayers.length > 0) return true;
      return false;
    }
    return false;
  };

  const cohortSummary = () => {
    if (assignPlayerIds.size > 0) {
      return `${assignPlayerIds.size} player(s) selected`;
    }
    if (assignGroupId && !hasAnyAttrFilter) {
      const group = groups?.find(g => g.id === assignGroupId);
      return group ? `Group: ${group.name}` : "";
    }
    if (assignTeamId && !hasAnyAttrFilter) {
      const team = coachTeams?.find(t => t.id === assignTeamId);
      return team ? `Team: ${team.name}` : "";
    }
    return `${cohortPlayers.length} player(s) matching`;
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Current drill assignments</p>
        <Button onClick={openAssignDialog} data-testid="button-open-assign">
          <ClipboardList className="w-4 h-4 mr-1" /> Assign Drill
        </Button>
      </div>

      {assignmentsLoading ? (
        <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-16 rounded" />)}</div>
      ) : !flatAssignments.length ? (
        <div className="py-8 text-center text-muted-foreground">
          <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            {!groups?.length && !coachTeams?.length ? "Create a group or team first to assign drills." : "No assignments yet. Hit Assign Drill to get started."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {flatAssignments.map(({ assignment, groupName }) => (
            <div
              key={assignment.id}
              className="flex items-center justify-between gap-2 p-3 rounded-md bg-muted/50"
              data-testid={`row-assignment-${assignment.id}`}
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
                data-testid={`button-delete-assignment-${assignment.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-assign-drill">
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
              {assignStep === "details" && `"${selectedDrill?.title}" -> ${cohortSummary()}`}
            </DialogDescription>
          </DialogHeader>

          {assignStep === "choose" && (
            <div className="grid grid-cols-2 gap-3 py-2">
              <div
                className="flex flex-col items-center gap-2 p-4 rounded-md border hover:bg-muted/50 cursor-pointer"
                onClick={() => { setAssignPath("drill-first"); setAssignStep("drill"); }}
                data-testid="button-path-drill-first"
              >
                <ClipboardList className="w-6 h-6" />
                <span className="text-sm font-medium text-center">Start with Drill</span>
                <span className="text-xs text-muted-foreground text-center">Pick a drill, then choose who to assign</span>
              </div>
              <div
                className="flex flex-col items-center gap-2 p-4 rounded-md border hover:bg-muted/50 cursor-pointer"
                onClick={() => { setAssignPath("cohort-first"); setAssignStep("cohort"); }}
                data-testid="button-path-cohort-first"
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
                  <Input placeholder="Search drills..." value={drillSearch} onChange={(e) => setDrillSearch(e.target.value)} className="pl-9" data-testid="input-assign-drill-search" />
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
                      className={`flex items-center justify-between gap-2 p-2 rounded-md border cursor-pointer ${selectedDrill?.id === drill.id ? "border-primary bg-primary/10" : "hover:bg-muted/50"}`}
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
                <Button variant="ghost" size="sm" onClick={() => setAssignStep(assignPath === "drill-first" ? "choose" : "cohort")} data-testid="button-assign-back-drill">
                  <ArrowLeft className="w-3 h-3 mr-1" /> Back
                </Button>
                <Button size="sm" disabled={!selectedDrill} onClick={() => { setAssignStep(assignPath === "drill-first" ? "cohort" : "details"); }} data-testid="button-assign-next-drill">
                  Next <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {assignStep === "cohort" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant={activeCohortAttr === "player" ? "default" : (assignPlayerIds.size > 0 ? "secondary" : "outline")} onClick={() => setActiveCohortAttr(prev => prev === "player" ? null : "player")} data-testid="button-cohort-player">
                  <User className="w-3 h-3 mr-1" /> Player {assignPlayerIds.size > 0 && `(${assignPlayerIds.size})`}
                </Button>
                <Button size="sm" variant={activeCohortAttr === "team" ? "default" : (assignTeamId ? "secondary" : "outline")} onClick={() => setActiveCohortAttr(prev => prev === "team" ? null : "team")} data-testid="button-cohort-team">
                  <Shield className="w-3 h-3 mr-1" /> Team
                </Button>
                <Button size="sm" variant={activeCohortAttr === "group" ? "default" : (assignGroupId ? "secondary" : "outline")} onClick={() => setActiveCohortAttr(prev => prev === "group" ? null : "group")} data-testid="button-cohort-group">
                  <Users className="w-3 h-3 mr-1" /> Group
                </Button>
                <Button size="sm" variant={activeCohortAttr === "position" ? "default" : (assignPosFilter !== "all" ? "secondary" : "outline")} onClick={() => setActiveCohortAttr(prev => prev === "position" ? null : "position")} data-testid="button-cohort-position">
                  Position
                </Button>
                <Button size="sm" variant={activeCohortAttr === "age" ? "default" : (assignAgeFilter !== "all" ? "secondary" : "outline")} onClick={() => setActiveCohortAttr(prev => prev === "age" ? null : "age")} data-testid="button-cohort-age">
                  Age
                </Button>
              </div>

              {activeCohortAttr === "group" && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {groups?.map((group) => (
                    <div key={group.id} className={`flex items-center justify-between gap-2 p-2 rounded-md border cursor-pointer ${assignGroupId === group.id ? "border-primary bg-primary/10" : "hover:bg-muted/50"}`} onClick={() => setAssignGroupId(prev => prev === group.id ? "" : group.id)} data-testid={`button-pick-group-${group.id}`}>
                      <span className="text-sm font-medium truncate">{group.name}</span>
                      {assignGroupId === group.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </div>
                  ))}
                </div>
              )}

              {activeCohortAttr === "team" && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {coachTeams?.map((team) => (
                    <div key={team.id} className={`flex items-center justify-between gap-2 p-2 rounded-md border cursor-pointer ${assignTeamId === team.id ? "border-primary bg-primary/10" : "hover:bg-muted/50"}`} onClick={() => setAssignTeamId(prev => prev === team.id ? "" : team.id)} data-testid={`button-pick-team-${team.id}`}>
                      <span className="text-sm font-medium truncate">{team.name}</span>
                      {assignTeamId === team.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </div>
                  ))}
                </div>
              )}

              {activeCohortAttr === "position" && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PLAYER_POSITIONS.map((pos) => (
                    <Button key={pos} size="sm" variant={assignPosFilter === pos ? "default" : "outline"} onClick={() => setAssignPosFilter(prev => prev === pos ? "all" : pos)} data-testid={`button-cohort-pos-${pos}`}>
                      {pos}
                    </Button>
                  ))}
                </div>
              )}

              {activeCohortAttr === "age" && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PLAYER_AGES.map((age) => (
                    <Button key={age} size="sm" variant={assignAgeFilter === age ? "default" : "outline"} onClick={() => setAssignAgeFilter(prev => prev === age ? "all" : age)} data-testid={`button-cohort-age-${age}`}>
                      {age}
                    </Button>
                  ))}
                </div>
              )}

              {activeCohortAttr === "player" && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Search players..." value={playerSearch} onChange={(e) => setPlayerSearch(e.target.value)} className="pl-9" data-testid="input-assign-player-search" />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {visibleCohortPlayers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-3">No players found.</p>
                    ) : (
                      visibleCohortPlayers.map((player) => (
                        <div
                          key={player.id}
                          className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer ${assignPlayerIds.has(player.id) ? "border-primary bg-primary/10" : "hover:bg-muted/50"}`}
                          onClick={() => togglePlayer(player.id)}
                          data-testid={`button-pick-player-${player.id}`}
                        >
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarFallback className="text-[10px]">{player.firstName.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{player.firstName} {player.lastName || ""}</p>
                          </div>
                          {assignPlayerIds.has(player.id) && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-1">
                {cohortSummary() || "Select at least one attribute to build your cohort"}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAssignStep(assignPath === "cohort-first" ? "choose" : "drill")} data-testid="button-assign-back-cohort">
                  <ArrowLeft className="w-3 h-3 mr-1" /> Back
                </Button>
                <Button size="sm" disabled={!canGoNext()} onClick={() => setAssignStep(assignPath === "cohort-first" ? "drill" : "details")} data-testid="button-assign-next-cohort">
                  Next <ArrowRight className="w-3 h-3 ml-1" />
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
                <Input type="date" value={assignDueDate} onChange={(e) => setAssignDueDate(e.target.value)} data-testid="input-assign-due-date" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} placeholder="Any notes for the assignment..." data-testid="input-assign-notes" />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="ghost" size="sm" onClick={() => setAssignStep(assignPath === "drill-first" ? "cohort" : "drill")} data-testid="button-assign-back-details">
                  <ArrowLeft className="w-3 h-3 mr-1" /> Back
                </Button>
                <Button size="sm" disabled={assignMutation.isPending} onClick={handleAssignSubmit} data-testid="button-assign-submit">
                  {assignMutation.isPending ? "Assigning..." : "Assign"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAssignmentId} onOpenChange={(o) => !o && setDeleteAssignmentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assignment</AlertDialogTitle>
            <AlertDialogDescription>This will remove the drill assignment.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteAssignmentId && deleteAssignmentMutation.mutate(deleteAssignmentId)} data-testid="button-confirm-delete-assignment">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
