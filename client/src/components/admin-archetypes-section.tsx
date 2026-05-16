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
import { Link } from "wouter";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp, Loader2,
  ExternalLink, Flame, Lock
} from "lucide-react";
import type { Archetype } from "@shared/schema";
import { ARCHETYPE_TIERS } from "@shared/schema";
import { cn } from "@/lib/utils";

const TIER_LABELS: Record<string, string> = {
  prospect: "Prospect", rising: "Rising", starter: "Starter",
  star: "Star", elite: "Elite", playr1: "PLAYR1",
};

// ─── Archetype form ─────────────────────────────────────────────────────────
const archetypeFormSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tagline: z.string().min(1),
  description: z.string().min(1),
  traits: z.string(),
  colorTheme: z.string().min(1),
  primaryHex: z.string().min(1),
  drillCategories: z.string(),
  displayOrder: z.coerce.number(),
});

function ArchetypeFormDialog({ existing, onClose }: { existing?: Archetype; onClose: () => void }) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(archetypeFormSchema),
    defaultValues: {
      id: existing?.id ?? "",
      name: existing?.name ?? "",
      tagline: existing?.tagline ?? "",
      description: existing?.description ?? "",
      traits: existing?.traits?.join(", ") ?? "",
      colorTheme: existing?.colorTheme ?? "orange",
      primaryHex: existing?.primaryHex ?? "#f97316",
      drillCategories: existing?.drillCategories?.join(", ") ?? "",
      displayOrder: existing?.displayOrder ?? 0,
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
              <FormControl><Input placeholder="sharpshooter" disabled={!!existing} {...field} data-testid="input-archetype-id" /></FormControl>
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
            <FormControl><Input placeholder="Sharpshooter" {...field} data-testid="input-archetype-name" /></FormControl>
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
            <FormItem><FormLabel>Primary Color (hex)</FormLabel>
              <FormControl>
                <div className="flex gap-2 items-center">
                  <input type="color" value={field.value} onChange={e => field.onChange(e.target.value)} className="w-10 h-9 rounded border border-zinc-700 bg-transparent cursor-pointer" />
                  <Input {...field} placeholder="#f97316" className="flex-1" />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="colorTheme" render={({ field }) => (
            <FormItem><FormLabel>Color Theme</FormLabel>
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
          <Button type="submit" disabled={saveMutation.isPending} data-testid="btn-save-archetype">
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {existing ? "Save Changes" : "Create Archetype"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Link-program-to-tier dialog ─────────────────────────────────────────────
type ProgramOption = { id: string; title: string; slug: string; isPublished: boolean | null };

function LinkProgramDialog({
  archetypeId,
  defaultTier,
  onClose,
}: {
  archetypeId: string;
  defaultTier: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [tier, setTier] = useState(defaultTier);
  const [programId, setProgramId] = useState("");
  const [isGate, setIsGate] = useState(false);

  const { data: allPrograms = [] } = useQuery<ProgramOption[]>({
    queryKey: ["/api/admin/programs"],
    queryFn: () => apiRequest("GET", "/api/admin/programs").then(r => r.json()),
  });

  const linkMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/archetypes/${archetypeId}/tier-programs`, {
      tier, programId, isGateChallenge: isGate, sortOrder: 0,
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/archetypes", archetypeId, "tier-programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/archetypes", archetypeId, "tier-programs"] });
      toast({ title: "Program linked to tier" });
      onClose();
    },
    onError: (e: any) => toast({ title: "Failed to link", description: e?.message, variant: "destructive" }),
  });

  const createAndLink = () => {
    // Redirect to program creation, then user can link after
    window.location.href = `/programs/new?archetypeId=${archetypeId}&tier=${tier}`;
  };

  return (
    <div className="space-y-4 pt-2">
      <div>
        <label className="text-sm font-medium text-zinc-300 block mb-1.5">Tier</label>
        <Select value={tier} onValueChange={setTier}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ARCHETYPE_TIERS.map(t => (
              <SelectItem key={t} value={t}>{TIER_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium text-zinc-300 block mb-1.5">Select Program</label>
        <Select value={programId} onValueChange={setProgramId}>
          <SelectTrigger data-testid="select-program-to-link">
            <SelectValue placeholder="Choose a program..." />
          </SelectTrigger>
          <SelectContent>
            {allPrograms.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.title} {p.isPublished ? "✓" : "(draft)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-zinc-500 mt-1.5">
          Don't see the program? <button onClick={createAndLink} className="text-orange-400 underline">Create a new program</button> first, then come back to link it.
        </p>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-zinc-700 p-3">
        <div>
          <label className="text-sm font-medium text-amber-400 flex items-center gap-1.5">
            <Flame className="w-4 h-4" /> Gate Challenge
          </label>
          <p className="text-xs text-zinc-500 mt-0.5">Must complete this program to unlock the next tier</p>
        </div>
        <Switch checked={isGate} onCheckedChange={setIsGate} />
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => linkMutation.mutate()} disabled={!programId || linkMutation.isPending} data-testid="btn-link-program">
          {linkMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          Link Program
        </Button>
      </div>
    </div>
  );
}

// ─── Per-archetype tier program editor ───────────────────────────────────────
type TierProgram = {
  id: string;
  archetypeId: string;
  tier: string;
  programId: string;
  sortOrder: number;
  isGateChallenge: boolean | null;
  program: ProgramOption & { tagline: string | null; lengthDays: number; difficulty: string; accentColor: string | null };
};

function ArchetypeTierProgramEditor({ archetype }: { archetype: Archetype }) {
  const { toast } = useToast();
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set(["prospect"]));
  const [linkingTier, setLinkingTier] = useState<string | null>(null);

  const { data: tierPrograms = [], isLoading } = useQuery<TierProgram[]>({
    queryKey: ["/api/admin/archetypes", archetype.id, "tier-programs"],
    queryFn: () => apiRequest("GET", `/api/archetypes/${archetype.id}/tier-programs`).then(r => r.json()),
  });

  const unlinkMutation = useMutation({
    mutationFn: (linkId: string) => apiRequest("DELETE", `/api/admin/tier-programs/${linkId}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/archetypes", archetype.id, "tier-programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/archetypes", archetype.id, "tier-programs"] });
      toast({ title: "Program unlinked" });
    },
  });

  const toggleGateMutation = useMutation({
    mutationFn: ({ id, isGate, sortOrder }: { id: string; isGate: boolean; sortOrder: number }) =>
      apiRequest("PUT", `/api/admin/tier-programs/${id}`, { sortOrder, isGateChallenge: isGate }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/archetypes", archetype.id, "tier-programs"] }),
  });

  const toggleTier = (tier: string) => {
    setExpandedTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier); else next.add(tier);
      return next;
    });
  };

  if (isLoading) return <p className="text-sm text-zinc-500 py-3">Loading programs...</p>;

  const totalLinked = tierPrograms.length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">{totalLinked} programs linked across all tiers. Use the admin Programs tab to build program content, then link them here.</p>

      {ARCHETYPE_TIERS.map(tier => {
        const programs = tierPrograms.filter(p => p.tier === tier);
        const gate = programs.find(p => p.isGateChallenge);
        const regular = programs.filter(p => !p.isGateChallenge);
        const expanded = expandedTiers.has(tier);

        return (
          <div key={tier} className="border border-zinc-800 rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-900/50 hover:bg-zinc-800/50 text-left"
              onClick={() => toggleTier(tier)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{TIER_LABELS[tier]}</span>
                <Badge variant="outline" className="text-xs">{programs.length} programs</Badge>
                {gate && <Badge className="text-xs bg-amber-950/50 text-amber-400 border-amber-800">Gate set</Badge>}
                {programs.length === 0 && <Badge variant="outline" className="text-xs text-zinc-600">Empty</Badge>}
              </div>
              {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
            </button>

            {expanded && (
              <div className="divide-y divide-zinc-800/50">
                {[...regular, ...(gate ? [gate] : [])].map(tp => (
                  <div key={tp.id} className={cn("flex items-center gap-3 px-4 py-3", tp.isGateChallenge && "bg-amber-950/10")}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">{tp.program.title}</span>
                        {tp.isGateChallenge && (
                          <Badge className="bg-amber-950/50 text-amber-400 border-amber-800 text-[10px]">
                            <Flame className="w-2.5 h-2.5 mr-0.5" />Gate
                          </Badge>
                        )}
                        {!tp.program.isPublished && <Badge variant="outline" className="text-[10px] text-zinc-500">Draft</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
                        <span className="capitalize">{tp.program.difficulty}</span>
                        {tp.program.tagline && <><span>·</span><span className="truncate max-w-[200px]">{tp.program.tagline}</span></>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className={cn("h-7 text-xs", tp.isGateChallenge ? "text-amber-400" : "text-zinc-500")}
                        onClick={() => toggleGateMutation.mutate({ id: tp.id, isGate: !tp.isGateChallenge, sortOrder: tp.sortOrder })}
                        title={tp.isGateChallenge ? "Remove gate status" : "Mark as gate challenge"}
                      >
                        <Flame className="w-3.5 h-3.5" />
                      </Button>
                      <Link href={`/programs/${tp.program.id}/edit`}>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-500 hover:text-white">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </Link>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-zinc-500 hover:text-red-400"
                        onClick={() => unlinkMutation.mutate(tp.id)}
                        data-testid={`btn-unlink-program-${tp.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="px-4 py-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-zinc-500 h-7"
                    onClick={() => setLinkingTier(tier)}
                    data-testid={`btn-link-program-${tier}`}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Link Program
                  </Button>
                  <Link href={`/programs/${archetype.id}-${tier}/edit`}>
                  </Link>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Link program dialog */}
      <Dialog open={!!linkingTier} onOpenChange={open => !open && setLinkingTier(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Program — {linkingTier && TIER_LABELS[linkingTier]} Tier</DialogTitle>
          </DialogHeader>
          {linkingTier && (
            <LinkProgramDialog
              archetypeId={archetype.id}
              defaultTier={linkingTier}
              onClose={() => setLinkingTier(null)}
            />
          )}
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
            Each archetype is a group of programs organized by tier. Build programs in the <strong>Programs</strong> tab, then link them here.
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
                      onClick={() => {
                        if (confirm(`Delete "${arch.name}" and all its program links?`)) deleteMutation.mutate(arch.id);
                      }} data-testid={`btn-delete-archetype-${arch.id}`}>
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
                  <ArchetypeTierProgramEditor archetype={arch} />
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
          {editingArchetype && (
            <ArchetypeFormDialog existing={editingArchetype} onClose={() => setEditingArchetype(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
