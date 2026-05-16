import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link } from "wouter";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp, Loader2,
  ExternalLink, Flame, Trophy, Target, Lock
} from "lucide-react";
import type { Archetype } from "@shared/schema";
import { ARCHETYPE_TIERS, ARCHETYPE_CHALLENGE_METRICS, ARCHETYPE_CHALLENGE_METRIC_LABELS } from "@shared/schema";
import { cn } from "@/lib/utils";

const TIER_LABELS: Record<string, string> = {
  prospect: "Prospect", rising: "Rising", starter: "Starter",
  star: "Star", elite: "Elite", playr1: "PLAYR1",
};

// ─── Archetype form ──────────────────────────────────────────────────────────
const archetypeFormSchema = z.object({
  id: z.string().min(1), name: z.string().min(1), tagline: z.string().min(1),
  description: z.string().min(1), traits: z.string(), colorTheme: z.string().min(1),
  primaryHex: z.string().min(1), drillCategories: z.string(), displayOrder: z.coerce.number(),
});

function ArchetypeFormDialog({ existing, onClose }: { existing?: Archetype; onClose: () => void }) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(archetypeFormSchema),
    defaultValues: {
      id: existing?.id ?? "", name: existing?.name ?? "", tagline: existing?.tagline ?? "",
      description: existing?.description ?? "", traits: existing?.traits?.join(", ") ?? "",
      colorTheme: existing?.colorTheme ?? "orange", primaryHex: existing?.primaryHex ?? "#f97316",
      drillCategories: existing?.drillCategories?.join(", ") ?? "", displayOrder: existing?.displayOrder ?? 0,
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: z.infer<typeof archetypeFormSchema>) => {
      const payload = {
        ...values,
        traits: values.traits.split(",").map(s => s.trim()).filter(Boolean),
        drillCategories: values.drillCategories.split(",").map(s => s.trim()).filter(Boolean),
      };
      if (existing) return apiRequest("PUT", `/api/admin/archetypes/${existing.id}`, payload).then(r => r.json());
      return apiRequest("POST", "/api/admin/archetypes", payload).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/archetypes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/archetypes"] });
      toast({ title: existing ? "Archetype updated" : "Archetype created" });
      onClose();
    },
    onError: () => toast({ title: "Error saving archetype", variant: "destructive" }),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(d => saveMutation.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="id" render={({ field }) => (
            <FormItem><FormLabel>ID (slug)</FormLabel>
              <FormControl><Input placeholder="sharpshooter" disabled={!!existing} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="displayOrder" render={({ field }) => (
            <FormItem><FormLabel>Display Order</FormLabel>
              <FormControl><Input type="number" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Name</FormLabel>
            <FormControl><Input placeholder="Sharpshooter" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="tagline" render={({ field }) => (
          <FormItem><FormLabel>Tagline</FormLabel>
            <FormControl><Input placeholder="Built to break ankles from range" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Description</FormLabel>
            <FormControl><Textarea rows={3} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="primaryHex" render={({ field }) => (
            <FormItem><FormLabel>Primary Color</FormLabel>
              <FormControl>
                <div className="flex gap-2 items-center">
                  <input type="color" value={field.value} onChange={e => field.onChange(e.target.value)} className="w-10 h-9 rounded border border-zinc-700 bg-transparent cursor-pointer" />
                  <Input {...field} className="flex-1" />
                </div>
              </FormControl><FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="colorTheme" render={({ field }) => (
            <FormItem><FormLabel>Theme Name</FormLabel>
              <FormControl><Input placeholder="orange" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="traits" render={({ field }) => (
          <FormItem><FormLabel>Traits (comma-separated)</FormLabel>
            <FormControl><Input placeholder="Three-Point Specialist, Catch and Shoot" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="drillCategories" render={({ field }) => (
          <FormItem><FormLabel>Drill Categories (comma-separated)</FormLabel>
            <FormControl><Input placeholder="shooting, footwork, off-ball-movement" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {existing ? "Save Changes" : "Create Archetype"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Link-program dialog ─────────────────────────────────────────────────────
type ProgramOption = { id: string; title: string; slug: string; isPublished: boolean | null };

function LinkProgramDialog({ archetypeId, defaultTier, onClose }: { archetypeId: string; defaultTier: string; onClose: () => void }) {
  const { toast } = useToast();
  const [tier, setTier] = useState(defaultTier);
  const [programId, setProgramId] = useState("");
  const [isGate, setIsGate] = useState(false);

  const { data: allPrograms = [] } = useQuery<ProgramOption[]>({
    queryKey: ["/api/admin/programs"],
    queryFn: () => apiRequest("GET", "/api/admin/programs").then(r => r.json()),
  });

  const linkMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/archetypes/${archetypeId}/tier-programs`, { tier, programId, isGateChallenge: isGate, sortOrder: 0 }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/archetypes", archetypeId, "tier-programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/archetypes", archetypeId, "tier-programs"] });
      toast({ title: "Program linked to tier" });
      onClose();
    },
    onError: () => toast({ title: "Failed to link program", variant: "destructive" }),
  });

  return (
    <div className="space-y-4 pt-2">
      <div>
        <label className="text-sm font-medium text-zinc-300 block mb-1.5">Tier</label>
        <Select value={tier} onValueChange={setTier}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{ARCHETYPE_TIERS.map(t => <SelectItem key={t} value={t}>{TIER_LABELS[t]}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium text-zinc-300 block mb-1.5">Select Program</label>
        <Select value={programId} onValueChange={setProgramId}>
          <SelectTrigger><SelectValue placeholder="Choose a program..." /></SelectTrigger>
          <SelectContent>
            {allPrograms.map(p => <SelectItem key={p.id} value={p.id}>{p.title} {p.isPublished ? "✓" : "(draft)"}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-zinc-500 mt-1.5">Don't see it? <button onClick={() => { window.location.href = `/programs/new`; }} className="text-orange-400 underline">Create a new program</button></p>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-zinc-700 p-3">
        <div>
          <label className="text-sm font-medium text-amber-400 flex items-center gap-1.5"><Flame className="w-4 h-4" /> Gate Challenge</label>
          <p className="text-xs text-zinc-500 mt-0.5">Must complete to unlock next tier</p>
        </div>
        <Switch checked={isGate} onCheckedChange={setIsGate} />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => linkMutation.mutate()} disabled={!programId || linkMutation.isPending}>
          {linkMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Link Program
        </Button>
      </div>
    </div>
  );
}

// ─── Add-challenge dialog ────────────────────────────────────────────────────
const challengeFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  metric: z.enum(ARCHETYPE_CHALLENGE_METRICS),
  target: z.coerce.number().int().min(1, "Target must be at least 1"),
  shotLocationFilter: z.string().optional(),
  isGateChallenge: z.boolean().default(false),
});

type ChallengeRow = {
  id: string; archetypeId: string; tier: string; title: string; description: string | null;
  metric: string; target: number; shotLocationFilter: string | null; isGateChallenge: boolean | null; sortOrder: number;
};

function ChallengeFormDialog({
  archetypeId, defaultTier, existing, onClose,
}: { archetypeId: string; defaultTier: string; existing?: ChallengeRow; onClose: () => void }) {
  const { toast } = useToast();
  const [tier, setTier] = useState(defaultTier);

  const form = useForm<z.infer<typeof challengeFormSchema>>({
    resolver: zodResolver(challengeFormSchema),
    defaultValues: {
      title: existing?.title ?? "",
      description: existing?.description ?? "",
      metric: (existing?.metric as any) ?? "shots_made",
      target: existing?.target ?? 50,
      shotLocationFilter: existing?.shotLocationFilter ?? "",
      isGateChallenge: existing?.isGateChallenge ?? false,
    },
  });

  const metric = form.watch("metric");

  const saveMutation = useMutation({
    mutationFn: (values: z.infer<typeof challengeFormSchema>) => {
      const payload = { ...values, tier, shotLocationFilter: values.shotLocationFilter || undefined };
      if (existing) return apiRequest("PUT", `/api/admin/tier-challenges/${existing.id}`, payload).then(r => r.json());
      return apiRequest("POST", `/api/admin/archetypes/${archetypeId}/tier-challenges`, payload).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/archetypes", archetypeId, "tier-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/archetypes", archetypeId, "tier-challenges"] });
      toast({ title: existing ? "Challenge updated" : "Challenge created" });
      onClose();
    },
    onError: () => toast({ title: "Failed to save challenge", variant: "destructive" }),
  });

  const showShotFilter = metric === "shots_made" || metric === "shots_attempted";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(d => saveMutation.mutate(d))} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-zinc-300 block mb-1.5">Tier</label>
          <Select value={tier} onValueChange={setTier} disabled={!!existing}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ARCHETYPE_TIERS.map(t => <SelectItem key={t} value={t}>{TIER_LABELS[t]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem><FormLabel>Title</FormLabel>
            <FormControl><Input placeholder="Make 50 3-pointers in a session" {...field} data-testid="input-challenge-title" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Description (optional)</FormLabel>
            <FormControl><Textarea rows={2} placeholder="In a single training session, make 50 three-point shots." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="metric" render={({ field }) => (
            <FormItem><FormLabel>Metric</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger data-testid="select-metric"><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>
                  {ARCHETYPE_CHALLENGE_METRICS.map(m => (
                    <SelectItem key={m} value={m}>{ARCHETYPE_CHALLENGE_METRIC_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="target" render={({ field }) => (
            <FormItem><FormLabel>Target</FormLabel>
              <FormControl><Input type="number" min={1} placeholder="50" {...field} data-testid="input-challenge-target" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        {showShotFilter && (
          <FormField control={form.control} name="shotLocationFilter" render={({ field }) => (
            <FormItem>
              <FormLabel>Shot Location Filter <span className="text-zinc-500 font-normal">(optional)</span></FormLabel>
              <FormControl><Input placeholder="e.g. three-point, mid-range, paint" {...field} /></FormControl>
              <p className="text-xs text-zinc-500">Only count shots from this location. Leave blank for any location.</p>
              <FormMessage />
            </FormItem>
          )} />
        )}
        <FormField control={form.control} name="isGateChallenge" render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between rounded-lg border border-zinc-700 p-3">
              <div>
                <FormLabel className="text-amber-400 flex items-center gap-1.5"><Flame className="w-4 h-4" /> Gate Challenge</FormLabel>
                <p className="text-xs text-zinc-500 mt-0.5">Must complete this to unlock the next tier</p>
              </div>
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </div>
          </FormItem>
        )} />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saveMutation.isPending} data-testid="btn-save-challenge">
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {existing ? "Save Changes" : "Create Challenge"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Per-archetype tier editor (programs + challenges) ───────────────────────
type TierProgram = {
  id: string; archetypeId: string; tier: string; programId: string;
  sortOrder: number; isGateChallenge: boolean | null;
  program: ProgramOption & { tagline: string | null; lengthDays: number; difficulty: string; accentColor: string | null };
};

function ArchetypeTierEditor({ archetype }: { archetype: Archetype }) {
  const { toast } = useToast();
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set(["prospect"]));
  const [linkingProgram, setLinkingProgram] = useState<string | null>(null);
  const [addingChallenge, setAddingChallenge] = useState<string | null>(null);
  const [editingChallenge, setEditingChallenge] = useState<ChallengeRow | null>(null);

  const { data: tierPrograms = [], isLoading: progLoading } = useQuery<TierProgram[]>({
    queryKey: ["/api/admin/archetypes", archetype.id, "tier-programs"],
    queryFn: () => apiRequest("GET", `/api/archetypes/${archetype.id}/tier-programs`).then(r => r.json()),
  });

  const { data: tierChallenges = [], isLoading: challLoading } = useQuery<ChallengeRow[]>({
    queryKey: ["/api/admin/archetypes", archetype.id, "tier-challenges"],
    queryFn: () => apiRequest("GET", `/api/archetypes/${archetype.id}/tier-challenges`).then(r => r.json()),
  });

  const unlinkProgram = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/tier-programs/${id}`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/archetypes", archetype.id, "tier-programs"] }),
  });

  const toggleProgramGate = useMutation({
    mutationFn: ({ id, isGate, sortOrder }: { id: string; isGate: boolean; sortOrder: number }) =>
      apiRequest("PUT", `/api/admin/tier-programs/${id}`, { sortOrder, isGateChallenge: isGate }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/archetypes", archetype.id, "tier-programs"] }),
  });

  const deleteChallenge = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/tier-challenges/${id}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/archetypes", archetype.id, "tier-challenges"] });
      toast({ title: "Challenge deleted" });
    },
  });

  const toggleChallengeGate = useMutation({
    mutationFn: ({ id, isGate }: { id: string; isGate: boolean }) =>
      apiRequest("PUT", `/api/admin/tier-challenges/${id}`, { isGateChallenge: isGate }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/archetypes", archetype.id, "tier-challenges"] }),
  });

  if (progLoading || challLoading) return <p className="text-sm text-zinc-500 py-3">Loading...</p>;

  const totalItems = tierPrograms.length + tierChallenges.length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">{totalItems} items across all tiers ({tierPrograms.length} programs, {tierChallenges.length} challenges).</p>
      {ARCHETYPE_TIERS.map(tier => {
        const programs = tierPrograms.filter(p => p.tier === tier);
        const challenges = tierChallenges.filter(c => c.tier === tier);
        const total = programs.length + challenges.length;
        const gateSet = programs.some(p => p.isGateChallenge) || challenges.some(c => c.isGateChallenge);
        const expanded = expandedTiers.has(tier);

        return (
          <div key={tier} className="border border-zinc-800 rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-900/50 hover:bg-zinc-800/50 text-left"
              onClick={() => setExpandedTiers(prev => { const n = new Set(prev); n.has(tier) ? n.delete(tier) : n.add(tier); return n; })}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{TIER_LABELS[tier]}</span>
                <Badge variant="outline" className="text-xs">{total} items</Badge>
                {gateSet && <Badge className="text-xs bg-amber-950/50 text-amber-400 border-amber-800">Gate set</Badge>}
                {total === 0 && <Badge variant="outline" className="text-xs text-zinc-600">Empty</Badge>}
              </div>
              {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
            </button>

            {expanded && (
              <div className="divide-y divide-zinc-800/50">
                {/* Programs */}
                {programs.map(tp => (
                  <div key={tp.id} className={cn("flex items-center gap-3 px-4 py-3", tp.isGateChallenge && "bg-amber-950/10")}>
                    <div className="w-6 h-6 rounded bg-blue-950/50 border border-blue-800 flex items-center justify-center shrink-0">
                      <Target className="w-3 h-3 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{tp.program.title}</span>
                        <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-800">Program</Badge>
                        {tp.isGateChallenge && <Badge className="bg-amber-950/50 text-amber-400 border-amber-800 text-[10px]"><Flame className="w-2.5 h-2.5 mr-0.5" />Gate</Badge>}
                        {!tp.program.isPublished && <Badge variant="outline" className="text-[10px] text-zinc-500">Draft</Badge>}
                      </div>
                      {tp.program.tagline && <p className="text-xs text-zinc-500 truncate mt-0.5">{tp.program.tagline}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className={cn("h-7 text-xs", tp.isGateChallenge ? "text-amber-400" : "text-zinc-500")}
                        onClick={() => toggleProgramGate.mutate({ id: tp.id, isGate: !tp.isGateChallenge, sortOrder: tp.sortOrder })} title="Toggle gate">
                        <Flame className="w-3.5 h-3.5" />
                      </Button>
                      <Link href={`/programs/${tp.program.id}/edit`}>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-500"><ExternalLink className="w-3 h-3" /></Button>
                      </Link>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-500 hover:text-red-400"
                        onClick={() => unlinkProgram.mutate(tp.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}

                {/* Challenges */}
                {challenges.map(ch => (
                  <div key={ch.id} className={cn("flex items-center gap-3 px-4 py-3", ch.isGateChallenge && "bg-amber-950/10")}>
                    <div className="w-6 h-6 rounded bg-orange-950/50 border border-orange-800 flex items-center justify-center shrink-0">
                      <Trophy className="w-3 h-3 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{ch.title}</span>
                        <Badge variant="outline" className="text-[10px] text-orange-400 border-orange-800">Challenge</Badge>
                        {ch.isGateChallenge && <Badge className="bg-amber-950/50 text-amber-400 border-amber-800 text-[10px]"><Flame className="w-2.5 h-2.5 mr-0.5" />Gate</Badge>}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {ARCHETYPE_CHALLENGE_METRIC_LABELS[ch.metric as keyof typeof ARCHETYPE_CHALLENGE_METRIC_LABELS] ?? ch.metric}: <strong className="text-zinc-300">{ch.target.toLocaleString()}</strong>
                        {ch.shotLocationFilter && <span className="ml-1 text-zinc-600">· {ch.shotLocationFilter}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" className={cn("h-7 text-xs", ch.isGateChallenge ? "text-amber-400" : "text-zinc-500")}
                        onClick={() => toggleChallengeGate.mutate({ id: ch.id, isGate: !ch.isGateChallenge })} title="Toggle gate">
                        <Flame className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-500 hover:text-white"
                        onClick={() => setEditingChallenge(ch)}><Pencil className="w-3 h-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-500 hover:text-red-400"
                        onClick={() => deleteChallenge.mutate(ch.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}

                {/* Add buttons */}
                <div className="px-4 py-2 flex items-center gap-3">
                  <Button size="sm" variant="ghost" className="text-xs text-zinc-500 h-7"
                    onClick={() => setLinkingProgram(tier)} data-testid={`btn-link-program-${tier}`}>
                    <Plus className="w-3 h-3 mr-1" /><Target className="w-3 h-3 mr-1" /> Link Program
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs text-zinc-500 h-7"
                    onClick={() => setAddingChallenge(tier)} data-testid={`btn-add-challenge-${tier}`}>
                    <Plus className="w-3 h-3 mr-1" /><Trophy className="w-3 h-3 mr-1" /> Add Challenge
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Link program dialog */}
      <Dialog open={!!linkingProgram} onOpenChange={open => !open && setLinkingProgram(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Link Program — {linkingProgram && TIER_LABELS[linkingProgram]} Tier</DialogTitle></DialogHeader>
          {linkingProgram && <LinkProgramDialog archetypeId={archetype.id} defaultTier={linkingProgram} onClose={() => setLinkingProgram(null)} />}
        </DialogContent>
      </Dialog>

      {/* Add challenge dialog */}
      <Dialog open={!!addingChallenge} onOpenChange={open => !open && setAddingChallenge(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Challenge — {addingChallenge && TIER_LABELS[addingChallenge]} Tier</DialogTitle></DialogHeader>
          {addingChallenge && <ChallengeFormDialog archetypeId={archetype.id} defaultTier={addingChallenge} onClose={() => setAddingChallenge(null)} />}
        </DialogContent>
      </Dialog>

      {/* Edit challenge dialog */}
      <Dialog open={!!editingChallenge} onOpenChange={open => !open && setEditingChallenge(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Challenge</DialogTitle></DialogHeader>
          {editingChallenge && <ChallengeFormDialog archetypeId={archetype.id} defaultTier={editingChallenge.tier} existing={editingChallenge} onClose={() => setEditingChallenge(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main admin section ──────────────────────────────────────────────────────
export function AdminArchetypesSection() {
  const { toast } = useToast();
  const [expandedArchetype, setExpandedArchetype] = useState<string | null>(null);
  const [editingArchetype, setEditingArchetype] = useState<Archetype | null>(null);
  const [creatingArchetype, setCreatingArchetype] = useState(false);

  const { data: archetypes = [], isLoading } = useQuery<Archetype[]>({
    queryKey: ["/api/admin/archetypes"],
    queryFn: () => apiRequest("GET", "/api/admin/archetypes").then(r => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/archetypes/${id}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/archetypes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/archetypes"] });
      toast({ title: "Archetype deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Archetypes</h2>
          <p className="text-sm text-zinc-500">
            Each archetype contains <strong>Programs</strong> and <strong>Challenges</strong> organized by tier. Build programs in the Programs tab, then link them here. Challenges are built directly in this editor.
          </p>
        </div>
        <Button onClick={() => setCreatingArchetype(true)} data-testid="btn-create-archetype">
          <Plus className="w-4 h-4 mr-2" /> New Archetype
        </Button>
      </div>

      {isLoading && <p className="text-sm text-zinc-500">Loading...</p>}

      <div className="space-y-3">
        {archetypes.map(arch => {
          const isExpanded = expandedArchetype === arch.id;
          return (
            <Card key={arch.id} className="border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <CardHeader className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: arch.primaryHex }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base text-white">{arch.name}</CardTitle>
                      <span className="text-xs text-zinc-500 font-mono">{arch.id}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{arch.tagline}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-white"
                      onClick={() => setEditingArchetype(arch)} data-testid={`btn-edit-archetype-${arch.id}`}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500 hover:text-red-400"
                      onClick={() => { if (confirm(`Delete "${arch.name}"?`)) deleteMutation.mutate(arch.id); }}
                      data-testid={`btn-delete-archetype-${arch.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-500"
                      onClick={() => setExpandedArchetype(isExpanded ? null : arch.id)}
                      data-testid={`btn-expand-archetype-${arch.id}`}>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="pt-0 px-4 pb-4 border-t border-zinc-800">
                  <div className="flex flex-wrap gap-1.5 mb-4 pt-3">
                    {arch.traits.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                  </div>
                  <Separator className="mb-4 bg-zinc-800" />
                  <ArchetypeTierEditor archetype={arch} />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={creatingArchetype} onOpenChange={open => !open && setCreatingArchetype(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Archetype</DialogTitle></DialogHeader>
          <ArchetypeFormDialog onClose={() => setCreatingArchetype(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingArchetype} onOpenChange={open => !open && setEditingArchetype(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Archetype</DialogTitle></DialogHeader>
          {editingArchetype && <ArchetypeFormDialog existing={editingArchetype} onClose={() => setEditingArchetype(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
