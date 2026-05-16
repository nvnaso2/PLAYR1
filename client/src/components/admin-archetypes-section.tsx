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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronUp, Wand2, Loader2,
  Dumbbell, Zap, Swords, Eye, Coffee, Flame
} from "lucide-react";
import type { Archetype, ArchetypeRoadmapItem } from "@shared/schema";
import { ARCHETYPE_TIERS, ARCHETYPE_ROADMAP_ITEM_TYPES } from "@shared/schema";
import { cn } from "@/lib/utils";

const TIER_LABELS: Record<string, string> = {
  prospect: "Prospect", rising: "Rising", starter: "Starter",
  star: "Star", elite: "Elite", playr1: "PLAYR1",
};

const ITEM_TYPE_ICONS: Record<string, React.ReactNode> = {
  workout: <Dumbbell className="w-3.5 h-3.5" />,
  drill: <Zap className="w-3.5 h-3.5" />,
  challenge: <Swords className="w-3.5 h-3.5" />,
  watch: <Eye className="w-3.5 h-3.5" />,
  rest: <Coffee className="w-3.5 h-3.5" />,
};

// ─── Archetype form ─────────────────────────────────────────────────────────
const archetypeFormSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  tagline: z.string().min(1),
  description: z.string().min(1),
  traits: z.string(), // comma-separated
  colorTheme: z.string().min(1),
  primaryHex: z.string().min(1),
  drillCategories: z.string(),
  displayOrder: z.coerce.number(),
});

function ArchetypeFormDialog({
  existing,
  onClose,
}: {
  existing?: Archetype;
  onClose: () => void;
}) {
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
      if (existing) {
        return apiRequest("PUT", `/api/admin/archetypes/${existing.id}`, payload).then(r => r.json());
      }
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
            <FormItem>
              <FormLabel>ID (slug)</FormLabel>
              <FormControl>
                <Input placeholder="sharpshooter" disabled={!!existing} {...field} data-testid="input-archetype-id" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="displayOrder" render={({ field }) => (
            <FormItem>
              <FormLabel>Display Order</FormLabel>
              <FormControl><Input type="number" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl><Input placeholder="Sharpshooter" {...field} data-testid="input-archetype-name" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="tagline" render={({ field }) => (
          <FormItem>
            <FormLabel>Tagline</FormLabel>
            <FormControl><Input placeholder="Built to break ankles from range" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl><Textarea rows={3} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="primaryHex" render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Color (hex)</FormLabel>
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
            <FormItem>
              <FormLabel>Color Theme</FormLabel>
              <FormControl><Input placeholder="orange" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="traits" render={({ field }) => (
          <FormItem>
            <FormLabel>Traits (comma-separated)</FormLabel>
            <FormControl><Input placeholder="Three-Point Specialist, Catch and Shoot, ..." {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="drillCategories" render={({ field }) => (
          <FormItem>
            <FormLabel>Drill Categories (comma-separated)</FormLabel>
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

// ─── Roadmap item form ───────────────────────────────────────────────────────
const roadmapItemSchema = z.object({
  tier: z.enum(ARCHETYPE_TIERS),
  itemType: z.enum(ARCHETYPE_ROADMAP_ITEM_TYPES),
  title: z.string().min(1),
  description: z.string().optional(),
  durationMins: z.coerce.number().optional(),
  repsOrSets: z.string().optional(),
  sortOrder: z.coerce.number(),
  isGateChallenge: z.boolean().default(false),
});

function RoadmapItemFormDialog({
  archetypeId,
  existing,
  defaultTier,
  onClose,
}: {
  archetypeId: string;
  existing?: ArchetypeRoadmapItem;
  defaultTier?: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const form = useForm({
    resolver: zodResolver(roadmapItemSchema),
    defaultValues: {
      tier: (existing?.tier ?? defaultTier ?? "prospect") as typeof ARCHETYPE_TIERS[number],
      itemType: (existing?.itemType ?? "workout") as typeof ARCHETYPE_ROADMAP_ITEM_TYPES[number],
      title: existing?.title ?? "",
      description: existing?.description ?? "",
      durationMins: existing?.durationMins ?? undefined,
      repsOrSets: existing?.repsOrSets ?? "",
      sortOrder: existing?.sortOrder ?? 0,
      isGateChallenge: existing?.isGateChallenge ?? false,
    },
  });

  const saveMutation = useMutation({
    mutationFn: (values: z.infer<typeof roadmapItemSchema>) => {
      if (existing) {
        return apiRequest("PUT", `/api/admin/roadmap-items/${existing.id}`, { ...values, archetypeId }).then(r => r.json());
      }
      return apiRequest("POST", `/api/admin/archetypes/${archetypeId}/roadmap`, values).then(r => r.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/archetypes", archetypeId, "roadmap"] });
      queryClient.invalidateQueries({ queryKey: ["/api/archetypes", archetypeId, "roadmap"] });
      toast({ title: existing ? "Item updated" : "Item added" });
      onClose();
    },
    onError: () => toast({ title: "Error saving item", variant: "destructive" }),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(d => saveMutation.mutate(d))} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="tier" render={({ field }) => (
            <FormItem>
              <FormLabel>Tier</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-tier">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ARCHETYPE_TIERS.map(t => (
                    <SelectItem key={t} value={t}>{TIER_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="itemType" render={({ field }) => (
            <FormItem>
              <FormLabel>Item Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ARCHETYPE_ROADMAP_ITEM_TYPES.map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input placeholder="3-Point Form Fundamentals" {...field} data-testid="input-roadmap-title" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl><Textarea rows={2} placeholder="Focus on..." {...field} value={field.value ?? ""} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-3 gap-3">
          <FormField control={form.control} name="durationMins" render={({ field }) => (
            <FormItem>
              <FormLabel>Duration (min)</FormLabel>
              <FormControl><Input type="number" placeholder="30" {...field} value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="repsOrSets" render={({ field }) => (
            <FormItem>
              <FormLabel>Reps/Sets</FormLabel>
              <FormControl><Input placeholder="3x20" {...field} value={field.value ?? ""} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="sortOrder" render={({ field }) => (
            <FormItem>
              <FormLabel>Sort Order</FormLabel>
              <FormControl><Input type="number" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="isGateChallenge" render={({ field }) => (
          <FormItem className="flex items-center justify-between rounded-lg border border-zinc-700 p-3">
            <div>
              <FormLabel className="flex items-center gap-1.5 text-amber-400">
                <Flame className="w-4 h-4" /> Gate Challenge
              </FormLabel>
              <p className="text-xs text-zinc-500 mt-0.5">This is the final unlock challenge for the tier</p>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {existing ? "Save" : "Add Item"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Per-archetype roadmap editor ───────────────────────────────────────────
function ArchetypeRoadmapEditor({ archetype }: { archetype: Archetype }) {
  const { toast } = useToast();
  const [expandedTiers, setExpandedTiers] = useState<Set<string>>(new Set(["prospect"]));
  const [addingItemTier, setAddingItemTier] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ArchetypeRoadmapItem | null>(null);
  const [seeding, setSeeding] = useState(false);

  const { data: roadmap = [], isLoading } = useQuery<ArchetypeRoadmapItem[]>({
    queryKey: ["/api/admin/archetypes", archetype.id, "roadmap"],
    queryFn: () => apiRequest("GET", `/api/admin/archetypes/${archetype.id}/roadmap`).then(r => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/roadmap-items/${id}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/archetypes", archetype.id, "roadmap"] });
      queryClient.invalidateQueries({ queryKey: ["/api/archetypes", archetype.id, "roadmap"] });
      toast({ title: "Item deleted" });
    },
  });

  const handleSeedAI = async (replace: boolean) => {
    setSeeding(true);
    try {
      const r = await apiRequest("POST", `/api/admin/archetypes/${archetype.id}/seed-roadmap`, { replace });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/archetypes", archetype.id, "roadmap"] });
      queryClient.invalidateQueries({ queryKey: ["/api/archetypes", archetype.id, "roadmap"] });
      toast({ title: `AI seeded ${data.seeded} roadmap items!` });
    } catch (e: any) {
      toast({ title: "Seed failed", description: e.message, variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  const toggleTier = (tier: string) => {
    setExpandedTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier); else next.add(tier);
      return next;
    });
  };

  if (isLoading) return <div className="text-sm text-zinc-500 py-4">Loading roadmap...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleSeedAI(false)}
          disabled={seeding}
          data-testid="btn-seed-ai-append"
        >
          {seeding ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 mr-1.5" />}
          AI Seed (Append)
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-red-900 text-red-400 hover:bg-red-950/30"
          onClick={() => handleSeedAI(true)}
          disabled={seeding}
          data-testid="btn-seed-ai-replace"
        >
          {seeding ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 mr-1.5" />}
          AI Seed (Replace All)
        </Button>
        <span className="text-xs text-zinc-500">{roadmap.length} total items</span>
      </div>

      {ARCHETYPE_TIERS.map(tier => {
        const items = roadmap.filter(i => i.tier === tier);
        const gateItems = items.filter(i => i.isGateChallenge);
        const regularItems = items.filter(i => !i.isGateChallenge);
        const expanded = expandedTiers.has(tier);

        return (
          <div key={tier} className="border border-zinc-800 rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-900/50 hover:bg-zinc-800/50 text-left"
              onClick={() => toggleTier(tier)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{TIER_LABELS[tier]}</span>
                <Badge variant="outline" className="text-xs">{items.length} items</Badge>
                {gateItems.length > 0 && <Badge className="text-xs bg-amber-950/50 text-amber-400 border-amber-800">Gate set</Badge>}
              </div>
              {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
            </button>

            {expanded && (
              <div className="divide-y divide-zinc-800/50">
                {[...regularItems, ...gateItems].map(item => (
                  <div key={item.id} className={cn("flex items-start gap-3 px-4 py-2.5", item.isGateChallenge && "bg-amber-950/10")}>
                    <span className="mt-0.5 text-zinc-500">{ITEM_TYPE_ICONS[item.itemType]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-white font-medium">{item.title}</span>
                        {item.isGateChallenge && <Badge className="bg-amber-950/50 text-amber-400 border-amber-800 text-[10px]"><Flame className="w-2.5 h-2.5 mr-0.5" />Gate</Badge>}
                        <span className="text-xs text-zinc-600 capitalize">{item.itemType}</span>
                        {item.durationMins && <span className="text-xs text-zinc-600">{item.durationMins}m</span>}
                        {item.repsOrSets && <span className="text-xs text-zinc-600">{item.repsOrSets}</span>}
                      </div>
                      {item.description && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{item.description}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-zinc-500 hover:text-white"
                        onClick={() => setEditingItem(item)}
                        data-testid={`btn-edit-item-${item.id}`}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-zinc-500 hover:text-red-400"
                        onClick={() => deleteMutation.mutate(item.id)}
                        data-testid={`btn-delete-item-${item.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="px-4 py-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-zinc-500 h-7"
                    onClick={() => setAddingItemTier(tier)}
                    data-testid={`btn-add-item-${tier}`}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Item
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add item dialog */}
      <Dialog open={!!addingItemTier} onOpenChange={open => !open && setAddingItemTier(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Roadmap Item — {addingItemTier && TIER_LABELS[addingItemTier]}</DialogTitle>
          </DialogHeader>
          {addingItemTier && (
            <RoadmapItemFormDialog
              archetypeId={archetype.id}
              defaultTier={addingItemTier}
              onClose={() => setAddingItemTier(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit item dialog */}
      <Dialog open={!!editingItem} onOpenChange={open => !open && setEditingItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Roadmap Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <RoadmapItemFormDialog
              archetypeId={archetype.id}
              existing={editingItem}
              onClose={() => setEditingItem(null)}
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
          <p className="text-sm text-zinc-500">Manage player archetypes and their training roadmaps</p>
        </div>
        <Button onClick={() => setCreatingArchetype(true)} data-testid="btn-create-archetype">
          <Plus className="w-4 h-4 mr-2" /> New Archetype
        </Button>
      </div>

      {isLoading && <div className="text-sm text-zinc-500">Loading archetypes...</div>}

      <div className="space-y-3">
        {archetypes.map(arch => {
          const isExpanded = expandedArchetype === arch.id;
          return (
            <Card key={arch.id} className="border-zinc-800 bg-zinc-900/50 overflow-hidden">
              <CardHeader className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: arch.primaryHex }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base text-white">{arch.name}</CardTitle>
                      <span className="text-xs text-zinc-500 font-mono">{arch.id}</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{arch.tagline}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-zinc-500 hover:text-white"
                      onClick={() => setEditingArchetype(arch)}
                      data-testid={`btn-edit-archetype-${arch.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-zinc-500 hover:text-red-400"
                      onClick={() => {
                        if (confirm(`Delete "${arch.name}" and all its roadmap items?`)) {
                          deleteMutation.mutate(arch.id);
                        }
                      }}
                      data-testid={`btn-delete-archetype-${arch.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-zinc-500"
                      onClick={() => setExpandedArchetype(isExpanded ? null : arch.id)}
                      data-testid={`btn-expand-archetype-${arch.id}`}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="pt-0 px-4 pb-4 border-t border-zinc-800">
                  <div className="flex flex-wrap gap-1.5 mb-4 pt-3">
                    {arch.traits.map(t => (
                      <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                  <Separator className="mb-4 bg-zinc-800" />
                  <ArchetypeRoadmapEditor archetype={arch} />
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Create archetype dialog */}
      <Dialog open={creatingArchetype} onOpenChange={open => !open && setCreatingArchetype(false)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Archetype</DialogTitle>
          </DialogHeader>
          <ArchetypeFormDialog onClose={() => setCreatingArchetype(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit archetype dialog */}
      <Dialog open={!!editingArchetype} onOpenChange={open => !open && setEditingArchetype(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Archetype</DialogTitle>
          </DialogHeader>
          {editingArchetype && (
            <ArchetypeFormDialog
              existing={editingArchetype}
              onClose={() => setEditingArchetype(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
