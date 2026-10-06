import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SHOOTING_COHORT_NOTIFICATION_COUNTS_QUERY_KEY } from "@/lib/shooting-cohort-api";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock3,
  GripVertical,
  Plus,
  UserRound,
  XCircle,
} from "lucide-react";
import type { Drill } from "@shared/schema";

type Request = {
  id: string;
  status: "submitted" | "in_progress" | "assigned" | "completed" | "declined";
  improvementFocus: string;
  desiredOutcome: string;
  availableTime: number;
  equipmentConstraints: string;
  additionalNotes?: string | null;
  createdAt: string;
  player?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    profile?: { age?: number | null };
    career?: { gradeLevel?: string | null };
  } | null;
  assignment?: { id?: string; workoutId?: string; notes?: string | null; status: string } | null;
  workout?: {
    workout?: { name?: string | null; description?: string | null; estimatedDuration?: number | null };
    drills?: Array<{
      drillId: string;
      defaultDuration?: number | null;
      defaultSets?: number | null;
      defaultReps?: number | null;
      coachingNotes?: string | null;
    }>;
  } | null;
};

type Entry = {
  drillId: string;
  defaultDuration: string;
  defaultSets: string;
  defaultReps: string;
  coachingNotes: string;
};

type AdminPlayer = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  profile?: { age?: number | null };
  career?: { gradeLevel?: string | null };
};

type DirectAssignment = {
  id: string;
  playerId: string;
  workoutId: string;
  status: string;
  notes?: string | null;
  createdAt: string;
  player?: AdminPlayer | null;
  workout?: Request["workout"];
};

type QueueTab = "needs_review" | "assigned" | "completed";

const statusLabel: Record<Request["status"], string> = {
  submitted: "New",
  in_progress: "In progress",
  assigned: "Assigned",
  completed: "Completed",
  declined: "Declined",
};

const statusStyles: Record<Request["status"], string> = {
  submitted: "border-sky-400/25 bg-sky-400/10 text-sky-200",
  in_progress: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  assigned: "border-orange-400/25 bg-orange-400/10 text-orange-200",
  completed: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  declined: "border-red-400/25 bg-red-400/10 text-red-200",
};

const formatCategory = (category: string) => category.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function AdminCustomWorkoutRequests() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<QueueTab>("needs_review");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [directBuildOpen, setDirectBuildOpen] = useState(false);
  const [directPlayerId, setDirectPlayerId] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const { data: requests = [], isLoading } = useQuery<Request[]>({ queryKey: ["/api/admin/custom-workout-requests"] });
  const { data: directAssignments = [] } = useQuery<DirectAssignment[]>({ queryKey: ["/api/admin/custom-workout-assignments"] });
  const { data: drills = [] } = useQuery<Drill[]>({ queryKey: ["/api/drills"] });
  const { data: players = [] } = useQuery<AdminPlayer[]>({ queryKey: ["/api/admin/users"] });
  const directPlayer = players.find((player) => player.id === directPlayerId);
  const selectedRequest = requests.find((request) => request.id === selectedId) || null;
  const selected = selectedRequest || (directBuildOpen ? {
    id: "direct-workout",
    status: "submitted" as const,
    improvementFocus: "",
    desiredOutcome: "",
    availableTime: 45,
    equipmentConstraints: "PLAYR1 catalog",
    additionalNotes: null,
    createdAt: new Date().toISOString(),
    player: directPlayer || null,
    assignment: null,
    workout: null,
  } : null);
  const catalog = useMemo(() => drills.filter((drill) => drill.userId === null && !drill.isAiGenerated), [drills]);
  const catalogByCategory = useMemo(() => {
    return catalog.reduce<Record<string, Drill[]>>((groups, drill) => {
      const category = drill.category || "other";
      (groups[category] ||= []).push(drill);
      return groups;
    }, {});
  }, [catalog]);
  const directQueueItems: Request[] = directAssignments.map((assignment) => ({
    id: `direct-${assignment.id}`,
    status: assignment.status === "completed" ? "completed" : "assigned",
    improvementFocus: "Direct PLAYR1 assignment",
    desiredOutcome: assignment.workout?.workout?.name || "Custom workout",
    availableTime: assignment.workout?.workout?.estimatedDuration || 0,
    equipmentConstraints: "PLAYR1 catalog",
    createdAt: assignment.createdAt,
    player: assignment.player || null,
    assignment,
    workout: assignment.workout || null,
  }));
  const needsReview = requests.filter((request) => request.status === "submitted" || request.status === "in_progress");
  const assigned = [...requests.filter((request) => request.status === "assigned"), ...directQueueItems.filter((request) => request.status === "assigned")];
  const completed = [...requests.filter((request) => request.status === "completed"), ...directQueueItems.filter((request) => request.status === "completed")];

  const setRequest = (request: Request) => {
    setSelectedId(request.id);
    setEntries(request.workout?.drills?.map((item) => ({
      drillId: item.drillId,
      defaultDuration: String(item.defaultDuration || ""),
      defaultSets: String(item.defaultSets || ""),
      defaultReps: String(item.defaultReps || ""),
      coachingNotes: item.coachingNotes || "",
    })) || []);
    setName(request.workout?.workout?.name || `${request.player?.firstName || "Player"} custom workout`);
    setDescription(request.workout?.workout?.description || "");
    setDuration(request.workout?.workout?.estimatedDuration ? String(request.workout.workout.estimatedDuration) : "");
    setNotes(request.assignment?.notes || "");
    setExpandedCategories(new Set());
  };

  const closeDialog = () => {
    setSelectedId(null);
    setDirectBuildOpen(false);
  };

  const openDirectBuilder = () => {
    setSelectedId(null);
    setDirectBuildOpen(true);
    setDirectPlayerId("");
    setEntries([]);
    setName("");
    setDescription("");
    setDuration("45");
    setNotes("");
    setExpandedCategories(new Set());
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status, declineReason }: { id: string; status: string; declineReason?: string }) =>
      apiRequest("PATCH", `/api/admin/custom-workout-requests/${id}/status`, { status, declineReason }),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/custom-workout-requests"] });
      queryClient.invalidateQueries({ queryKey: SHOOTING_COHORT_NOTIFICATION_COUNTS_QUERY_KEY });
      if (variables.status === "declined") closeDialog();
      toast({ title: "Request updated" });
    },
    onError: (error: Error) => toast({ title: "Could not update request", description: error.message, variant: "destructive" }),
  });

  const assignmentMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        description,
        estimatedDuration: duration ? Number(duration) : null,
        notes,
        drills: entries.map((entry, index) => ({
          drillId: entry.drillId,
          sortOrder: index,
          defaultDuration: entry.defaultDuration ? Number(entry.defaultDuration) : null,
          defaultSets: entry.defaultSets ? Number(entry.defaultSets) : null,
          defaultReps: entry.defaultReps ? Number(entry.defaultReps) : null,
          coachingNotes: entry.coachingNotes || null,
        })),
      };
      return directBuildOpen
        ? apiRequest("POST", "/api/admin/custom-workout-assignments", { ...payload, playerId: directPlayerId })
        : apiRequest("POST", `/api/admin/custom-workout-requests/${selected?.id}/assignment`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/custom-workout-requests"] });
      queryClient.invalidateQueries({ queryKey: SHOOTING_COHORT_NOTIFICATION_COUNTS_QUERY_KEY });
      closeDialog();
      setActiveTab("assigned");
      toast({ title: "Workout assigned", description: "The player can start it from Assigned Workouts." });
    },
    onError: (error: Error) => toast({ title: "Could not assign workout", description: error.message, variant: "destructive" }),
  });

  const addDrill = (drillId: string) => {
    if (entries.some((entry) => entry.drillId === drillId)) return;
    setEntries((current) => [...current, { drillId, defaultDuration: "", defaultSets: "", defaultReps: "", coachingNotes: "" }]);
  };
  const updateEntry = (index: number, key: keyof Entry, value: string) =>
    setEntries((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, [key]: value } : entry));
  const moveEntry = (index: number, direction: -1 | 1) => setEntries((current) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= current.length) return current;
    const next = [...current];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    return next;
  });
  const toggleCategory = (category: string) => setExpandedCategories((current) => {
    const next = new Set(current);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    return next;
  });

  const renderQueue = (items: Request[], emptyMessage: string) => {
    if (isLoading) return <div className="p-8 text-center text-sm text-zinc-500">Loading queue...</div>;
    if (items.length === 0) return <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><ClipboardList className="mb-3 h-8 w-8 text-zinc-700" /><p className="font-semibold text-zinc-300">{emptyMessage}</p><p className="mt-1 text-sm text-zinc-500">Requests will appear here as players move through the flow.</p></div>;
    return <div className="grid gap-3 p-3 sm:grid-cols-2">{items.map((request) => <button key={request.id} onClick={() => setRequest(request)} className="group rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-orange-400/40 hover:bg-orange-400/[0.06]"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-300"><UserRound className="h-4 w-4" /></span><span className="truncate font-semibold text-white">{request.player?.firstName || "Unknown"} {request.player?.lastName || "player"}</span></div><span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${statusStyles[request.status]}`}>{statusLabel[request.status]}</span></div><p className="mt-4 line-clamp-2 text-sm leading-5 text-zinc-300">{request.improvementFocus}</p><p className="mt-3 text-[10px] uppercase tracking-wide text-zinc-600">{new Date(request.createdAt).toLocaleDateString()} · {request.availableTime} min</p><span className="mt-3 inline-flex text-xs font-semibold text-orange-300 opacity-0 transition group-hover:opacity-100">Open request <span className="ml-1">→</span></span></button>)}</div>;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><div className="mb-2 flex items-center gap-2 text-orange-300"><ClipboardList className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-[0.2em]">Coach workspace</span></div><h2 className="text-2xl font-bold text-white">Custom requests</h2><p className="mt-1 text-sm text-zinc-400">Review the ask, choose the drills, and assign one focused session.</p></div>
        <div className="flex items-center gap-3"><Button onClick={openDirectBuilder} className="bg-orange-500 font-bold text-black hover:bg-orange-400"><Plus className="mr-2 h-4 w-4" />Build workout</Button><div className="rounded-2xl border border-orange-400/20 bg-orange-400/[0.06] px-4 py-3 text-right"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-300">Needs attention</p><p className="mt-1 text-2xl font-bold text-white">{needsReview.length}</p></div></div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as QueueTab)} className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl border border-white/10 bg-white/[0.04] p-1">
          <TabsTrigger value="needs_review" className="gap-2 rounded-xl py-3 text-xs text-zinc-400 data-[state=active]:bg-orange-500 data-[state=active]:text-black sm:text-sm"><Clock3 className="h-4 w-4" />Needs review <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px]">{needsReview.length}</span></TabsTrigger>
          <TabsTrigger value="assigned" className="gap-2 rounded-xl py-3 text-xs text-zinc-400 data-[state=active]:bg-orange-500 data-[state=active]:text-black sm:text-sm"><CheckCircle2 className="h-4 w-4" />Assigned <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px]">{assigned.length}</span></TabsTrigger>
          <TabsTrigger value="completed" className="gap-2 rounded-xl py-3 text-xs text-zinc-400 data-[state=active]:bg-orange-500 data-[state=active]:text-black sm:text-sm"><Check className="h-4 w-4" />Completed <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px]">{completed.length}</span></TabsTrigger>
        </TabsList>
        <Card className="overflow-hidden border-white/10 bg-white/[0.03]">
          <TabsContent value="needs_review" className="m-0">{renderQueue(needsReview, "No requests need review")}</TabsContent>
          <TabsContent value="assigned" className="m-0">{renderQueue(assigned, "No workouts assigned yet")}</TabsContent>
          <TabsContent value="completed" className="m-0">{renderQueue(completed, "No workouts completed yet")}</TabsContent>
        </Card>
      </Tabs>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-h-[92vh] w-[96vw] max-w-4xl overflow-y-auto border-white/10 bg-[#101010] p-0 text-white">
          {selected && <form onSubmit={(event) => { event.preventDefault(); if (!selected.assignment && ["submitted", "in_progress"].includes(selected.status)) assignmentMutation.mutate(); }}>
            <DialogHeader className="border-b border-white/10 bg-[radial-gradient(circle_at_85%_0%,rgba(249,115,22,0.2),transparent_35%),#151515] p-5 text-left sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4 pr-6"><div><div className="mb-2 flex items-center gap-2 text-orange-300"><ClipboardList className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-[0.2em]">Request review</span></div><DialogTitle className="text-2xl text-white">{selected.player?.firstName || "Unknown"} {selected.player?.lastName || "player"}</DialogTitle><DialogDescription className="mt-1 text-zinc-400">{selected.player?.email || "No email"}{selected.player?.profile?.age ? ` · ${selected.player.profile.age} years old` : ""}{selected.player?.career?.gradeLevel ? ` · ${selected.player.career.gradeLevel}` : ""}</DialogDescription></div><Badge className={`border ${statusStyles[selected.status]}`}>{statusLabel[selected.status]}</Badge></div>
            </DialogHeader>
            <div className="space-y-6 p-5 sm:p-7">
              {directBuildOpen ? <div className="rounded-2xl border border-orange-400/20 bg-orange-400/[0.07] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-300">Direct assignment</p><p className="mt-2 text-sm text-zinc-300">Build a workout for a player without waiting for a request.</p></div> : <div className="grid gap-3 sm:grid-cols-2"><InfoBlock label="Improvement focus" value={selected.improvementFocus} accent /><InfoBlock label="Desired outcome" value={selected.desiredOutcome} /><InfoBlock label="Equipment / access" value={selected.equipmentConstraints} /><InfoBlock label="Additional notes" value={selected.additionalNotes || "None"} /></div>}
              {!selected.assignment && ["submitted", "in_progress"].includes(selected.status) ? <div className="space-y-6">
                <div className="flex flex-wrap gap-2 border-b border-white/10 pb-5"><Button type="button" size="sm" variant="outline" disabled={selected.status !== "submitted" || statusMutation.isPending} onClick={() => statusMutation.mutate({ id: selected.id, status: "in_progress" })}><Clock3 className="mr-2 h-4 w-4" />Start review</Button><Button type="button" size="sm" variant="outline" className="border-red-400/20 text-red-200 hover:bg-red-400/10" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ id: selected.id, status: "declined", declineReason: "This request needs more information before a safe workout can be built." })}><XCircle className="mr-2 h-4 w-4" />Decline</Button></div>
                <div className="grid gap-4 sm:grid-cols-2">{directBuildOpen && <div className="space-y-2 sm:col-span-2"><Label className="text-xs font-semibold uppercase tracking-wide text-zinc-300">Send to player</Label><select value={directPlayerId} onChange={(event) => setDirectPlayerId(event.target.value)} className="h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white"><option value="">Choose a player...</option>{players.map((player) => <option key={player.id} value={player.id}>{player.firstName || player.lastName ? `${player.firstName || ""} ${player.lastName || ""}`.trim() : player.email || player.id}</option>)}</select></div>}<div className="space-y-2 sm:col-span-2"><Label className="text-xs font-semibold uppercase tracking-wide text-zinc-300">Session name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="border-white/10 bg-black/30 text-white" /></div><div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wide text-zinc-300">Estimated minutes</Label><Input type="number" min={1} max={240} value={duration} onChange={(e) => setDuration(e.target.value)} className="border-white/10 bg-black/30 text-white" /></div><div className="space-y-2 sm:col-span-2"><Label className="text-xs font-semibold uppercase tracking-wide text-zinc-300">Coach guidance</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-20 resize-none border-white/10 bg-black/30 text-white" placeholder="What should the player feel, notice, or focus on?" /></div><div className="space-y-2 sm:col-span-2"><Label className="text-xs font-semibold uppercase tracking-wide text-zinc-300">Player notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-16 resize-none border-white/10 bg-black/30 text-white" placeholder="Optional context to send with the assignment" /></div></div>
                <div className="space-y-3"><div><Label className="text-xs font-semibold uppercase tracking-wide text-zinc-300">PLAYR1 drill library</Label><p className="mt-1 text-xs text-zinc-500">Open a category, then select drills just like the workout builder.</p></div><div className="space-y-2">{Object.entries(catalogByCategory).map(([category, categoryDrills]) => { const open = expandedCategories.has(category); const selectedCount = categoryDrills.filter((drill) => entries.some((entry) => entry.drillId === drill.id)).length; return <Collapsible key={category} open={open} onOpenChange={() => toggleCategory(category)}><div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"><CollapsibleTrigger asChild><button type="button" className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-white/[0.04]"><span className="flex items-center gap-2">{open ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}<span className="text-sm font-semibold text-white">{formatCategory(category)}</span><Badge variant="outline" className="border-white/10 text-[10px]">{categoryDrills.length}</Badge></span>{selectedCount > 0 && <Badge className="bg-orange-500 text-[10px] text-black">{selectedCount} selected</Badge>}</button></CollapsibleTrigger><CollapsibleContent className="border-t border-white/10 p-3"><div className="grid gap-2 sm:grid-cols-2">{categoryDrills.map((drill) => { const isSelected = entries.some((entry) => entry.drillId === drill.id); return <label key={drill.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${isSelected ? "border-orange-400/40 bg-orange-400/10" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}><Checkbox checked={isSelected} onCheckedChange={(checked) => checked ? addDrill(drill.id) : setEntries((current) => current.filter((entry) => entry.drillId !== drill.id))} className="mt-0.5" /><span className="min-w-0"><span className="block text-sm font-medium text-white">{drill.title}</span>{drill.description && <span className="mt-1 block line-clamp-2 text-xs leading-5 text-zinc-500">{drill.description}</span>}<span className="mt-2 block text-[10px] uppercase tracking-wide text-zinc-600">{drill.difficulty}</span></span></label>; })}</div></CollapsibleContent></div></Collapsible>; })}</div></div>
                <div className="space-y-3"><div className="flex items-center justify-between"><Label className="text-xs font-semibold uppercase tracking-wide text-zinc-300">Selected session</Label><span className="text-xs text-zinc-500">{entries.length} drill{entries.length === 1 ? "" : "s"}</span></div>{entries.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-zinc-500">Select at least one drill above.</p> : entries.map((entry, index) => { const drill = catalog.find((item) => item.id === entry.drillId); return <div key={entry.drillId} className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="flex items-center gap-2"><GripVertical className="h-4 w-4 text-zinc-600" /><span className="flex-1 text-sm font-semibold text-white"><span className="mr-2 text-orange-300">{String(index + 1).padStart(2, "0")}</span>{drill?.title || entry.drillId}</span><Button type="button" size="icon" variant="ghost" disabled={index === 0} onClick={() => moveEntry(index, -1)} className="h-7 w-7 text-zinc-400" aria-label="Move drill up"><ArrowUp className="h-3.5 w-3.5" /></Button><Button type="button" size="icon" variant="ghost" disabled={index === entries.length - 1} onClick={() => moveEntry(index, 1)} className="h-7 w-7 text-zinc-400" aria-label="Move drill down"><ArrowDown className="h-3.5 w-3.5" /></Button><Button type="button" size="sm" variant="ghost" onClick={() => setEntries((current) => current.filter((item) => item.drillId !== entry.drillId))} className="text-xs text-zinc-500 hover:text-red-300">Remove</Button></div><div className="mt-3 grid gap-2 sm:grid-cols-3"><Input placeholder="Minutes" value={entry.defaultDuration} onChange={(e) => updateEntry(index, "defaultDuration", e.target.value)} className="border-white/10 bg-black/30 text-white" /><Input placeholder="Sets" value={entry.defaultSets} onChange={(e) => updateEntry(index, "defaultSets", e.target.value)} className="border-white/10 bg-black/30 text-white" /><Input placeholder="Reps" value={entry.defaultReps} onChange={(e) => updateEntry(index, "defaultReps", e.target.value)} className="border-white/10 bg-black/30 text-white" /></div><Input placeholder="Coaching note for this drill" value={entry.coachingNotes} onChange={(e) => updateEntry(index, "coachingNotes", e.target.value)} className="mt-2 border-white/10 bg-black/30 text-white" /></div>; })}</div>
              </div> : <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] p-4 text-sm text-emerald-100"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /><div><p className="font-semibold">Session {selected.assignment ? (selected.assignment.status === "completed" ? "completed" : "assigned") : "closed"}</p><p className="mt-1 text-emerald-100/70">{selected.workout?.workout?.name || "This request has already been handled."}</p></div></div>}
            </div>
            {selected && !selected.assignment && ["submitted", "in_progress"].includes(selected.status) && <DialogFooter className="border-t border-white/10 bg-white/[0.02] p-5 sm:p-7"><Button type="button" variant="outline" onClick={closeDialog} className="border-white/10 text-zinc-300">Cancel</Button><Button type="submit" disabled={!name.trim() || entries.length === 0 || (directBuildOpen && !directPlayerId) || assignmentMutation.isPending} className="bg-orange-500 font-bold text-black hover:bg-orange-400">{assignmentMutation.isPending ? "Assigning..." : directBuildOpen ? "Build & send workout" : "Save & assign workout"}<CheckCircle2 className="ml-2 h-4 w-4" /></Button></DialogFooter>}
          </form>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoBlock({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div className={`rounded-2xl border p-4 ${accent ? "border-orange-400/20 bg-orange-400/[0.07]" : "border-white/10 bg-black/20"}`}><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</p><p className="mt-2 text-sm leading-6 text-zinc-200">{value}</p></div>;
}