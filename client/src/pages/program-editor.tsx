import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, ArrowUp, ArrowDown, Plus, Trash2, Pencil, Save, ExternalLink, Eye,
} from "lucide-react";
import type { Program, ProgramItem, Drill } from "@shared/schema";
import {
  PROGRAM_CADENCES, PROGRAM_VISIBILITY, PROGRAM_ITEM_TYPES,
  type ProgramItemType,
} from "@shared/schema";

type DetailResp = { program: Program; items: ProgramItem[] };

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

export default function ProgramEditorPage() {
  const params = useParams<{ id: string }>();
  const programId = params.id;
  const { toast } = useToast();
  const { isAdmin } = useAdmin();
  const [, setLocation] = useLocation();

  // Edit-mode fetch — server allows author or admin and bypasses the public
  // visibility checks so unpublished/private programs can still be edited.
  const { data: editData, isLoading } = useQuery<DetailResp>({
    queryKey: ["/api/programs", programId, "edit"],
    queryFn: async () => {
      const res = await fetch(`/api/programs/${programId}/edit`, { credentials: "include" });
      if (res.status === 403) throw new Error("Not allowed to edit this program");
      if (res.status === 404) throw new Error("Program not found");
      if (!res.ok) throw new Error("Failed to load program");
      return res.json();
    },
    enabled: !!programId,
  });

  const program = editData?.program;
  const items = editData?.items ?? [];

  // Local form state for metadata. Initialised from server, then patched.
  const [meta, setMeta] = useState<Partial<Program> | null>(null);
  useEffect(() => {
    if (program) setMeta(program);
  }, [program]);

  const updateMeta = useMutation({
    mutationFn: async (patch: Partial<Program>) => {
      return await apiRequest("PATCH", `/api/programs/${programId}`, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs", programId, "edit"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: "Saved." });
    },
    onError: (e: any) =>
      toast({ title: "Couldn't save", description: e?.message ?? "", variant: "destructive" }),
  });

  const deleteProgram = useMutation({
    mutationFn: async () => apiRequest("DELETE", `/api/programs/${programId}`),
    onSuccess: () => {
      toast({ title: "Program deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/programs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/programs"] });
      setLocation(isAdmin ? "/admin" : "/trainer/programs");
    },
    onError: (e: any) =>
      toast({ title: "Couldn't delete", description: e?.message ?? "Players may be enrolled.", variant: "destructive" }),
  });

  const handleMetaSave = () => {
    if (!meta) return;
    const patch: Partial<Program> = {
      title: meta.title,
      tagline: meta.tagline,
      description: meta.description,
      lengthDays: meta.lengthDays,
      difficulty: meta.difficulty,
      cadence: meta.cadence,
      visibility: meta.visibility,
      isPublished: meta.isPublished,
      isFeatured: meta.isFeatured,
      accentColor: meta.accentColor,
      estimatedMinutesPerDay: meta.estimatedMinutesPerDay,
      coverImageUrl: meta.coverImageUrl,
      categoryTags: meta.categoryTags,
      slug: meta.slug,
    };
    updateMeta.mutate(patch);
  };

  // Group items by day so we can render day cards with add/edit controls.
  const itemsByDay = useMemo(() => {
    const map = new Map<number, ProgramItem[]>();
    items.forEach((it) => {
      const arr = map.get(it.dayNumber) ?? [];
      arr.push(it);
      map.set(it.dayNumber, arr);
    });
    map.forEach((arr) => arr.sort((a, b) => a.orderInDay - b.orderInDay));
    return map;
  }, [items]);

  const totalDays = meta?.lengthDays ?? program?.lengthDays ?? 0;
  const dayList = Array.from({ length: Math.max(totalDays, 1) }, (_, i) => i + 1);

  if (isLoading || !program || !meta) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href={isAdmin ? "/admin" : "/trainer/programs"}>
            <Button variant="ghost" size="icon" data-testid="button-back-from-editor">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold leading-tight" data-testid="text-editor-title">{meta.title}</h1>
            <p className="text-sm text-muted-foreground">
              {meta.authorType === "system" ? "PLAYR1 system program" : "Trainer-authored"}
              {" · "}/{meta.slug}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/programs/${meta.slug}`}>
            <Button variant="outline" size="sm" data-testid="link-preview-program">
              <Eye className="w-4 h-4 mr-1" /> Preview
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" data-testid="button-delete-program">
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this program?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the program and all its items. If players are
                  enrolled the delete will be blocked — unpublish instead so
                  their progress is preserved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteProgram.mutate()} data-testid="button-confirm-delete">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Metadata form */}
      <Card>
        <CardHeader>
          <CardTitle>Program details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={meta.title ?? ""}
                onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                data-testid="input-program-title" />
            </div>
            <div>
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" value={meta.slug ?? ""}
                onChange={(e) => setMeta({ ...meta, slug: e.target.value })}
                data-testid="input-program-slug" />
            </div>
          </div>
          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" value={meta.tagline ?? ""}
              onChange={(e) => setMeta({ ...meta, tagline: e.target.value })}
              data-testid="input-program-tagline" />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={4} value={meta.description ?? ""}
              onChange={(e) => setMeta({ ...meta, description: e.target.value })}
              data-testid="input-program-description" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="lengthDays">Length (days)</Label>
              <Input id="lengthDays" type="number" min={1} value={meta.lengthDays ?? 7}
                onChange={(e) => setMeta({ ...meta, lengthDays: parseInt(e.target.value || "0", 10) })}
                data-testid="input-program-length" />
            </div>
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={meta.difficulty ?? "beginner"}
                onValueChange={(v) => setMeta({ ...meta, difficulty: v as any })}>
                <SelectTrigger id="difficulty" data-testid="select-program-difficulty"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cadence">Cadence</Label>
              <Select value={meta.cadence ?? "userPaced"}
                onValueChange={(v) => setMeta({ ...meta, cadence: v as any })}>
                <SelectTrigger id="cadence" data-testid="select-program-cadence"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROGRAM_CADENCES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="visibility">Visibility</Label>
              <Select value={meta.visibility ?? "public"}
                onValueChange={(v) => setMeta({ ...meta, visibility: v as any })}>
                <SelectTrigger id="visibility" data-testid="select-program-visibility"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROGRAM_VISIBILITY.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="estMin">Est. minutes / day</Label>
              <Input id="estMin" type="number" min={0} value={meta.estimatedMinutesPerDay ?? 0}
                onChange={(e) => setMeta({ ...meta, estimatedMinutesPerDay: parseInt(e.target.value || "0", 10) })}
                data-testid="input-program-minutes-per-day" />
            </div>
            <div>
              <Label htmlFor="accent">Accent color (hex)</Label>
              <Input id="accent" placeholder="#f97316" value={meta.accentColor ?? ""}
                onChange={(e) => setMeta({ ...meta, accentColor: e.target.value })}
                data-testid="input-program-accent" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cover">Cover image URL</Label>
              <Input id="cover" value={meta.coverImageUrl ?? ""}
                onChange={(e) => setMeta({ ...meta, coverImageUrl: e.target.value })}
                data-testid="input-program-cover" />
            </div>
            <div>
              <Label htmlFor="tags">Category tags (comma-separated)</Label>
              <Input id="tags" value={(meta.categoryTags ?? []).join(", ")}
                onChange={(e) => setMeta({
                  ...meta,
                  categoryTags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                })}
                data-testid="input-program-tags" />
            </div>
          </div>

          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch checked={!!meta.isPublished}
                onCheckedChange={(v) => setMeta({ ...meta, isPublished: v })}
                data-testid="switch-program-published" />
              <span className="text-sm">Published</span>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <Switch checked={!!meta.isFeatured}
                  onCheckedChange={(v) => setMeta({ ...meta, isFeatured: v })}
                  data-testid="switch-program-featured" />
                <span className="text-sm">Featured on browse page</span>
              </div>
            )}
            <Button onClick={handleMetaSave} disabled={updateMeta.isPending} className="ml-auto" data-testid="button-save-program">
              <Save className="w-4 h-4 mr-1" /> Save details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items by day */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {dayList.map((day) => (
            <DayBlock
              key={day}
              programId={programId!}
              day={day}
              items={itemsByDay.get(day) ?? []}
              accentColor={meta.accentColor ?? "#f97316"}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function DayBlock({
  programId, day, items, accentColor,
}: {
  programId: string;
  day: number;
  items: ProgramItem[];
  accentColor: string;
}) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ProgramItem | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/programs", programId, "edit"] });
    queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
  };

  const deleteItem = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/programs/items/${id}`),
    onSuccess: () => { invalidate(); toast({ title: "Item removed" }); },
    onError: () => toast({ title: "Couldn't remove", variant: "destructive" }),
  });

  const reorder = useMutation({
    mutationFn: async (updates: Array<{ id: string; dayNumber: number; orderInDay: number }>) =>
      apiRequest("PATCH", `/api/programs/${programId}/items/reorder`, { items: updates }),
    onSuccess: () => invalidate(),
    onError: () => toast({ title: "Couldn't reorder", variant: "destructive" }),
  });

  const moveItem = (idx: number, dir: -1 | 1) => {
    const next = idx + dir;
    if (next < 0 || next >= items.length) return;
    const a = items[idx], b = items[next];
    reorder.mutate([
      { id: a.id, dayNumber: a.dayNumber, orderInDay: b.orderInDay },
      { id: b.id, dayNumber: b.dayNumber, orderInDay: a.orderInDay },
    ]);
  };

  return (
    <div className="border rounded-lg p-4 bg-card" data-testid={`day-block-${day}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 rounded" style={{ background: accentColor }} />
          <h3 className="font-semibold">Day {day}</h3>
          <Badge variant="secondary">{items.length} item{items.length === 1 ? "" : "s"}</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)} data-testid={`button-add-item-day-${day}`}>
          <Plus className="w-4 h-4 mr-1" /> Add item
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Rest day or empty — add an item to schedule something.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={item.id} className="flex items-center gap-2 p-2 rounded border bg-background" data-testid={`item-row-${item.id}`}>
              <Badge className="capitalize">{item.itemType}</Badge>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.title}</div>
                {item.notes && <div className="text-xs text-muted-foreground truncate">{item.notes}</div>}
              </div>
              <Button size="icon" variant="ghost" onClick={() => moveItem(idx, -1)} disabled={idx === 0}
                data-testid={`button-move-up-${item.id}`}>
                <ArrowUp className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1}
                data-testid={`button-move-down-${item.id}`}>
                <ArrowDown className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setEditing(item)}
                data-testid={`button-edit-item-${item.id}`}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteItem.mutate(item.id)}
                data-testid={`button-delete-item-${item.id}`}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ItemEditorDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        programId={programId}
        day={day}
        nextOrder={items.length}
        onSaved={() => { setAddOpen(false); invalidate(); }}
      />
      <ItemEditorDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        programId={programId}
        day={day}
        nextOrder={editing?.orderInDay ?? 0}
        existingItem={editing ?? undefined}
        onSaved={() => { setEditing(null); invalidate(); }}
      />
    </div>
  );
}

function ItemEditorDialog({
  open, onClose, programId, day, nextOrder, existingItem, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  programId: string;
  day: number;
  nextOrder: number;
  existingItem?: ProgramItem;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [itemType, setItemType] = useState<ProgramItemType>(existingItem?.itemType ?? "drill");
  const [title, setTitle] = useState(existingItem?.title ?? "");
  const [notes, setNotes] = useState(existingItem?.notes ?? "");
  const [drillId, setDrillId] = useState<string | null>(existingItem?.drillId ?? null);
  const [estMin, setEstMin] = useState<number>(existingItem?.estimatedMinutes ?? 15);
  const [watchUrl, setWatchUrl] = useState(existingItem?.watchUrl ?? "");
  const [watchProvider, setWatchProvider] = useState(existingItem?.watchProvider ?? "youtube");
  const [challengeMetric, setChallengeMetric] = useState(existingItem?.challengeSpec?.scoringMetric ?? "points");
  const [challengeTarget, setChallengeTarget] = useState<number | "">(existingItem?.challengeSpec?.target ?? "");
  const [challengeDesc, setChallengeDesc] = useState(existingItem?.challengeSpec?.description ?? "");

  // Reset when existingItem flips (editing different items)
  useEffect(() => {
    if (open) {
      setItemType(existingItem?.itemType ?? "drill");
      setTitle(existingItem?.title ?? "");
      setNotes(existingItem?.notes ?? "");
      setDrillId(existingItem?.drillId ?? null);
      setEstMin(existingItem?.estimatedMinutes ?? 15);
      setWatchUrl(existingItem?.watchUrl ?? "");
      setWatchProvider(existingItem?.watchProvider ?? "youtube");
      setChallengeMetric(existingItem?.challengeSpec?.scoringMetric ?? "points");
      setChallengeTarget(existingItem?.challengeSpec?.target ?? "");
      setChallengeDesc(existingItem?.challengeSpec?.description ?? "");
    }
  }, [open, existingItem]);

  const { data: drills = [] } = useQuery<Drill[]>({
    queryKey: ["/api/drills"],
    enabled: open && (itemType === "drill" || itemType === "workout"),
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload: any = {
        dayNumber: day,
        orderInDay: existingItem ? existingItem.orderInDay : nextOrder,
        itemType,
        title: title.trim() || (itemType === "rest" ? "Rest day" : "Untitled"),
        notes: notes || null,
        estimatedMinutes: estMin || null,
      };
      if (itemType === "drill" || itemType === "workout") payload.drillId = drillId;
      if (itemType === "watch") {
        payload.watchUrl = watchUrl;
        payload.watchProvider = watchProvider;
      }
      if (itemType === "challenge") {
        payload.challengeSpec = {
          scoringMetric: challengeMetric,
          target: challengeTarget === "" ? undefined : Number(challengeTarget),
          description: challengeDesc || undefined,
        };
      }

      if (existingItem) {
        return apiRequest("PATCH", `/api/programs/items/${existingItem.id}`, payload);
      }
      return apiRequest("POST", `/api/programs/${programId}/items`, payload);
    },
    onSuccess: () => {
      toast({ title: existingItem ? "Item updated" : "Item added" });
      onSaved();
    },
    onError: (e: any) =>
      toast({ title: "Couldn't save item", description: e?.message ?? "", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg" data-testid="dialog-item-editor">
        <DialogHeader>
          <DialogTitle>{existingItem ? "Edit item" : `Add item to Day ${day}`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label>Type</Label>
            <Select value={itemType} onValueChange={(v) => setItemType(v as ProgramItemType)}>
              <SelectTrigger data-testid="select-item-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROGRAM_ITEM_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={itemType === "rest" ? "Rest day" : "Item title"}
              data-testid="input-item-title" />
          </div>

          <div>
            <Label>Notes / coaching cues</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              data-testid="input-item-notes" />
          </div>

          {(itemType === "drill" || itemType === "workout") && (
            <div>
              <Label>Linked drill</Label>
              <Select value={drillId ?? ""} onValueChange={(v) => setDrillId(v || null)}>
                <SelectTrigger data-testid="select-item-drill"><SelectValue placeholder="Pick a drill" /></SelectTrigger>
                <SelectContent>
                  {drills.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {itemType === "watch" && (
            <>
              <div>
                <Label>Video URL</Label>
                <Input value={watchUrl} onChange={(e) => setWatchUrl(e.target.value)}
                  placeholder="https://youtube.com/..."
                  data-testid="input-item-watch-url" />
              </div>
              <div>
                <Label>Provider</Label>
                <Select value={watchProvider} onValueChange={(v) => setWatchProvider(v)}>
                  <SelectTrigger data-testid="select-item-watch-provider"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="vimeo">Vimeo</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {itemType === "challenge" && (
            <div className="space-y-3 border rounded p-3 bg-muted/30">
              <div>
                <Label>Scoring metric</Label>
                <Select value={challengeMetric} onValueChange={setChallengeMetric}>
                  <SelectTrigger data-testid="select-challenge-metric"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="points">Points</SelectItem>
                    <SelectItem value="madeShots">Made shots</SelectItem>
                    <SelectItem value="timeSeconds">Time (seconds)</SelectItem>
                    <SelectItem value="streak">Streak</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target (optional)</Label>
                <Input type="number" value={challengeTarget}
                  onChange={(e) => setChallengeTarget(e.target.value === "" ? "" : Number(e.target.value))}
                  data-testid="input-challenge-target" />
              </div>
              <div>
                <Label>Challenge description</Label>
                <Textarea rows={2} value={challengeDesc} onChange={(e) => setChallengeDesc(e.target.value)}
                  data-testid="input-challenge-desc" />
              </div>
            </div>
          )}

          {itemType !== "rest" && (
            <div>
              <Label>Estimated minutes</Label>
              <Input type="number" min={0} value={estMin}
                onChange={(e) => setEstMin(parseInt(e.target.value || "0", 10))}
                data-testid="input-item-minutes" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} data-testid="button-cancel-item">Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending} data-testid="button-save-item">
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
