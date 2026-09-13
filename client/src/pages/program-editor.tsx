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
  ArrowLeft, ArrowUp, ArrowDown, Plus, Trash2, Pencil, Save, ExternalLink, Eye, Upload, X,
} from "lucide-react";
import { AssignProgramDialog } from "@/components/assign-program-dialog";
import { useUpload } from "@/hooks/use-upload";
import { nativeFetch } from "@/lib/queryClient";
import type { Program, ProgramItem, Drill, DrillMetric, MetricTemplate } from "@shared/schema";
type DrillMetricWithTemplate = DrillMetric & { template: MetricTemplate };
import {
  PROGRAM_CADENCES, PROGRAM_VISIBILITY,
} from "@shared/schema";

const VISIBILITY_LABELS: Record<string, string> = {
  public: "Public — anyone on PLAYR1",
  connections: "My players — only my connected roster",
  unlisted: "Unlisted — only people with the link",
  private: "Private — only me",
};

type DetailResp = { program: Program; items: ProgramItem[] };

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

export default function ProgramEditorPage() {
  const params = useParams<{ id: string }>();
  const programId = params.id;
  const { toast } = useToast();
  const { isAdmin } = useAdmin();
  const [, setLocation] = useLocation();
  const fromEventId = useMemo(
    () => (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("eventId")
      : null),
    [],
  );

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
      trailerVideoUrl: meta.trailerVideoUrl,
      categoryTags: meta.categoryTags,
      slug: meta.slug,
      contentType: meta.contentType,
      isPro: meta.isPro,
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
  const [selectedDay, setSelectedDay] = useState<number>(1);

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
          <Link href={fromEventId ? `/admin/events/${fromEventId}/edit` : (isAdmin ? "/admin" : "/trainer/programs")}>
            <Button variant="ghost" size={fromEventId ? "sm" : "icon"} data-testid="button-back-from-editor">
              <ArrowLeft className="w-4 h-4" />
              {fromEventId && <span className="ml-1">Back to event</span>}
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-heading tracking-wide uppercase leading-tight" data-testid="text-editor-title">Program Studio</h1>
            <p className="text-sm text-muted-foreground">
              {meta.title || "Untitled"}{" · "}{meta.authorType === "system" ? "PLAYR1 system" : "Trainer-authored"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/programs/${meta.slug}`}>
            <Button variant="outline" size="sm" data-testid="link-preview-program">
              <Eye className="w-4 h-4 mr-1" /> Preview
            </Button>
          </Link>
          {meta.id ? (
            <AssignProgramDialog programId={meta.id} programTitle={meta.title ?? "this program"} />
          ) : null}
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
      {/* Program Studio — metadata */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Title</label>
          <Input
            value={meta.title ?? ""}
            onChange={(e) => setMeta({ ...meta, title: e.target.value })}
            className="bg-background border-border text-base font-semibold h-12"
            placeholder="Program title…"
            data-testid="input-program-title"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Tagline</label>
          <Input
            value={meta.tagline ?? ""}
            onChange={(e) => setMeta({ ...meta, tagline: e.target.value })}
            className="bg-background border-border h-12"
            placeholder="One-sentence hook…"
            data-testid="input-program-tagline"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Cover Image URL</label>
          <Input
            value={meta.coverImageUrl ?? ""}
            onChange={(e) => setMeta({ ...meta, coverImageUrl: e.target.value })}
            className="bg-background border-border h-12"
            placeholder="https://…"
            data-testid="input-program-cover-url"
          />
          {meta.coverImageUrl && (
            <div className="mt-2 rounded-lg overflow-hidden border border-border h-28">
              <img src={meta.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Content type</label>
            <Select value={meta.contentType ?? "program"} onValueChange={(v) => setMeta({ ...meta, contentType: v as any })}>
              <SelectTrigger data-testid="select-program-content-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="program">Program</SelectItem>
                <SelectItem value="course">Course</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Trailer video URL</label>
            <Input
              value={meta.trailerVideoUrl ?? ""}
              onChange={(e) => setMeta({ ...meta, trailerVideoUrl: e.target.value })}
              className="bg-background border-border"
              placeholder="Paste an uploaded video or hosted URL…"
              data-testid="input-program-trailer-url"
            />
          </div>
        </div>

        {/* Tier toggle */}
        <div className="space-y-2">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Tier</label>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setMeta({ ...meta, isPro: false })}
              className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide transition-colors ${!meta.isPro ? "bg-background text-foreground" : "bg-transparent text-muted-foreground"}`}
              data-testid="button-tier-free"
            >
              Free
            </button>
            <button
              type="button"
              onClick={() => setMeta({ ...meta, isPro: true })}
              className={`flex-1 py-3 text-sm font-bold uppercase tracking-wide transition-colors ${meta.isPro ? "bg-primary text-white" : "bg-transparent text-muted-foreground"}`}
              data-testid="button-tier-pro"
            >
              Pro
            </button>
          </div>
        </div>

        {/* Visibility + Published row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Visibility</label>
            <Select value={meta.visibility ?? "public"} onValueChange={(v) => setMeta({ ...meta, visibility: v as any })}>
              <SelectTrigger data-testid="select-program-visibility"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROGRAM_VISIBILITY.map((v) => (
                  <SelectItem key={v} value={v}>{VISIBILITY_LABELS[v] ?? v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Length (days)</label>
            <Input
              type="number" min={1}
              value={meta.lengthDays ?? 7}
              onChange={(e) => setMeta({ ...meta, lengthDays: parseInt(e.target.value || "0", 10) })}
              className="bg-background border-border"
              data-testid="input-program-length"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Description</label>
          <Textarea
            rows={3}
            value={meta.description ?? ""}
            onChange={(e) => setMeta({ ...meta, description: e.target.value })}
            className="bg-background border-border resize-none"
            placeholder="What will players learn?"
            data-testid="input-program-description"
          />
        </div>

        <div className="flex items-center gap-4 pt-1 flex-wrap">
          <div className="flex items-center gap-2">
            <Switch checked={!!meta.isPublished} onCheckedChange={(v) => setMeta({ ...meta, isPublished: v })} data-testid="switch-program-published" />
            <span className="text-sm text-muted-foreground">Published</span>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Switch checked={!!meta.isFeatured} onCheckedChange={(v) => setMeta({ ...meta, isFeatured: v })} data-testid="switch-program-featured" />
              <span className="text-sm text-muted-foreground">Featured</span>
            </div>
          )}
          <Button onClick={handleMetaSave} disabled={updateMeta.isPending} className="ml-auto" data-testid="button-save-program">
            <Save className="w-4 h-4 mr-1" /> Save details
          </Button>
        </div>
      </div>

      {/* Day selector + per-day editor */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Select Day</h2>
          <div className="flex gap-2 flex-wrap">
            {dayList.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`w-10 h-10 rounded-lg text-sm font-bold transition-colors ${selectedDay === day ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground hover:border-primary/50"}`}
                data-testid={`button-day-${day}`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {selectedDay !== null && (
          <DayBlock
            key={selectedDay}
            programId={programId!}
            day={selectedDay}
            items={itemsByDay.get(selectedDay) ?? []}
            accentColor={meta.accentColor ?? "#f97316"}
          />
        )}
      </div>
    </div>
  );
}

function ProgramCoverPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { toast } = useToast();
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (resp) => {
      onChange(resp.objectPath);
      toast({ title: "Cover uploaded — click Save details to apply" });
    },
    onError: (err) => toast({ title: "Upload failed", description: err.message, variant: "destructive" }),
  });

  const pickFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast({ title: "Please choose an image file", variant: "destructive" });
        return;
      }
      await uploadFile(file);
    };
    input.click();
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative rounded-md overflow-hidden border h-24 bg-muted" data-testid="preview-program-cover">
          <img src={value} alt="Cover" className="w-full h-full object-cover" />
          <Button type="button" size="icon" variant="secondary" className="absolute top-1 right-1 h-7 w-7"
            onClick={() => onChange("")} data-testid="button-clear-program-cover">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      ) : (
        <div className="rounded-md border border-dashed h-24 flex items-center justify-center text-xs text-muted-foreground">
          No cover yet
        </div>
      )}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={pickFile} disabled={isUploading}
          data-testid="button-upload-program-cover">
          <Upload className="w-3.5 h-3.5 mr-1" />
          {isUploading ? `Uploading ${progress}%` : "Upload image"}
        </Button>
        <Input id="cover" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder="…or paste URL" className="flex-1" data-testid="input-program-cover" />
      </div>
    </div>
  );
}

function WatchVideoPicker({ value, onChange }: { value: string; onChange: (v: string, provider?: string) => void }) {
  const { toast } = useToast();
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (resp) => {
      onChange(resp.objectPath, "internal");
      toast({ title: "Video uploaded — click Save to apply" });
    },
    onError: (err) => toast({ title: "Upload failed", description: err.message, variant: "destructive" }),
  });

  const pickFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (!file.type.startsWith("video/")) {
        toast({ title: "Please choose a video file", variant: "destructive" });
        return;
      }
      await uploadFile(file);
    };
    input.click();
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={pickFile} disabled={isUploading}
          data-testid="button-upload-watch-video">
          <Upload className="w-3.5 h-3.5 mr-1" />
          {isUploading ? `Uploading ${progress}%` : "Upload video"}
        </Button>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="…or paste YouTube/Vimeo URL"
          className="flex-1"
          data-testid="input-item-watch-url"
        />
      </div>
      {value && (
        <p className="text-xs text-muted-foreground truncate" data-testid="text-watch-current">
          Current: <span className="font-mono">{value}</span>
        </p>
      )}
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
          <Plus className="w-4 h-4 mr-1" /> {items.length === 0 ? "Build workout" : "Add workout"}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Rest day or empty — build a workout to schedule something.</p>
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

type WorkoutDrillRow = { drillId: string; sets?: number; reps?: number; durationSec?: number; metricTargets?: Record<string, number> };

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
  const [title, setTitle] = useState(existingItem?.title ?? "");
  const [notes, setNotes] = useState(existingItem?.notes ?? "");
  const [keyTakeaways, setKeyTakeaways] = useState((existingItem?.keyTakeaways ?? []).join("\n"));
  const [estMin, setEstMin] = useState<number>(existingItem?.estimatedMinutes ?? 15);
  const [watchUrl, setWatchUrl] = useState(existingItem?.watchUrl ?? "");
  const isNonWorkout = !!existingItem && existingItem.itemType !== "workout";
  const [drillMetricsCache, setDrillMetricsCache] = useState<Record<string, DrillMetricWithTemplate[]>>({});

  const fetchAndCacheDrillMetrics = async (drillId: string) => {
    if (drillMetricsCache[drillId]) return;
    try {
      const res = await nativeFetch(`/api/drills/${drillId}/metrics`);
      if (res.ok) {
        const metrics: DrillMetricWithTemplate[] = await res.json();
        setDrillMetricsCache(prev => ({ ...prev, [drillId]: metrics }));
      }
    } catch {}
  };
  const initialRows = (): WorkoutDrillRow[] => {
    if (existingItem?.workoutSpec && existingItem.workoutSpec.length > 0) {
      return existingItem.workoutSpec.map((w) => ({
        drillId: w.drillId,
        sets: w.sets,
        reps: w.reps,
        durationSec: w.durationSec,
      }));
    }
    if (existingItem?.drillId) {
      return [{ drillId: existingItem.drillId, sets: undefined, reps: undefined }];
    }
    return [];
  };
  const [rows, setRows] = useState<WorkoutDrillRow[]>(initialRows);
  const [drillSearch, setDrillSearch] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(existingItem?.title ?? "");
      setNotes(existingItem?.notes ?? "");
      setKeyTakeaways((existingItem?.keyTakeaways ?? []).join("\n"));
      setEstMin(existingItem?.estimatedMinutes ?? 15);
      setWatchUrl(existingItem?.watchUrl ?? "");
      const initialRowsVal = initialRows();
      setRows(initialRowsVal);
      setDrillSearch("");
      // Pre-fetch metrics for all existing drills
      initialRowsVal.forEach(r => fetchAndCacheDrillMetrics(r.drillId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existingItem]);

  const { data: drills = [] } = useQuery<Drill[]>({
    queryKey: ["/api/drills"],
    enabled: open,
  });

  const drillById = useMemo(() => {
    const map = new Map<string, Drill>();
    drills.forEach((d) => map.set(d.id, d));
    return map;
  }, [drills]);

  const filteredDrills = useMemo(() => {
    const q = drillSearch.trim().toLowerCase();
    if (!q) return drills.slice(0, 50);
    return drills.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      (d.category ?? "").toLowerCase().includes(q)
    ).slice(0, 50);
  }, [drillSearch, drills]);

  const addDrill = (id: string) => {
    if (!id) return;
    setRows((prev) => [...prev, { drillId: id }]);
    setDrillSearch("");
    fetchAndCacheDrillMetrics(id);
  };
  const removeRow = (idx: number) => setRows((p) => p.filter((_, i) => i !== idx));
  const moveRow = (idx: number, dir: -1 | 1) => {
    setRows((p) => {
      const next = idx + dir;
      if (next < 0 || next >= p.length) return p;
      const cp = [...p];
      [cp[idx], cp[next]] = [cp[next], cp[idx]];
      return cp;
    });
  };
  const updateRow = (idx: number, patch: Partial<WorkoutDrillRow>) =>
    setRows((p) => p.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const save = useMutation({
    mutationFn: async () => {
      const cleanRows: WorkoutDrillRow[] = rows
        .filter((r) => !!r.drillId)
        .map((r) => ({
          drillId: r.drillId,
          sets: r.sets || undefined,
          reps: r.reps || undefined,
          durationSec: r.durationSec || undefined,
        }));

      // For non-workout items (challenge, watch, rest) — just update title/notes/watchUrl
      if (isNonWorkout && existingItem) {
        const payload: any = {
          title: title.trim() || existingItem.title,
          notes: notes || null,
          keyTakeaways: keyTakeaways.split("\n").map((line) => line.trim()).filter(Boolean),
          estimatedMinutes: estMin || null,
          watchUrl: watchUrl.trim() || null,
        };
        return apiRequest("PATCH", `/api/programs/items/${existingItem.id}`, payload);
      }

      if (cleanRows.length === 0) {
        throw new Error("Add at least one drill to the workout.");
      }
      const payload: any = {
        dayNumber: day,
        orderInDay: existingItem ? existingItem.orderInDay : nextOrder,
        itemType: "workout",
        title: title.trim() || `Day ${day} workout`,
        notes: notes || null,
        keyTakeaways: keyTakeaways.split("\n").map((line) => line.trim()).filter(Boolean),
        estimatedMinutes: estMin || null,
        drillId: cleanRows[0].drillId,
        workoutSpec: cleanRows,
        watchUrl: watchUrl.trim() || null,
        watchProvider: null,
        challengeSpec: null,
      };
      if (existingItem) {
        return apiRequest("PATCH", `/api/programs/items/${existingItem.id}`, payload);
      }
      return apiRequest("POST", `/api/programs/${programId}/items`, payload);
    },
    onSuccess: () => {
      toast({ title: existingItem ? "Workout updated" : "Workout added" });
      onSaved();
    },
    onError: (e: any) =>
      toast({ title: "Couldn't save workout", description: e?.message ?? "", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-item-editor">
        <DialogHeader>
          <DialogTitle>{existingItem ? "Edit workout" : `Build Day ${day} workout`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Workout title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Day ${day} workout`}
              data-testid="input-item-title"
            />
          </div>

          <div>
            <Label>Notes / coaching cues (optional)</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              data-testid="input-item-notes" />
          </div>

          <div>
            <Label>Key takeaways (one per line, optional)</Label>
            <Textarea
              rows={4}
              value={keyTakeaways}
              onChange={(e) => setKeyTakeaways(e.target.value)}
              placeholder={"Stay stacked through the finish.\nKeep the pickup compact."}
              data-testid="input-item-key-takeaways"
            />
            <p className="text-xs text-muted-foreground mt-1">Course lessons show these as the player’s recap points.</p>
          </div>

          <div>
            <Label>YouTube / Watch URL (optional)</Label>
            <Input
              value={watchUrl}
              onChange={(e) => setWatchUrl(e.target.value)}
              placeholder="Paste a YouTube or video URL…"
              data-testid="input-item-watch-url"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Embeds a video on the Final Challenge tab when this item is the event's challenge.
            </p>
          </div>

          <div>
            <Label>Estimated minutes</Label>
            <Input type="number" min={0} value={estMin}
              onChange={(e) => setEstMin(parseInt(e.target.value || "0", 10))}
              data-testid="input-item-minutes" />
          </div>

          {!isNonWorkout && <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Drills in this workout</Label>
              <Badge variant="secondary">{rows.length}</Badge>
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No drills yet — pick one below.</p>
            ) : (
              <ul className="space-y-2">
                {rows.map((row, idx) => {
                  const d = drillById.get(row.drillId);
                  return (
                    <li
                      key={`${row.drillId}-${idx}`}
                      className="rounded border bg-background p-2 space-y-2"
                      data-testid={`row-workout-drill-${idx}`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs shrink-0">{idx + 1}</Badge>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-sm" data-testid={`text-workout-drill-title-${idx}`}>
                            {d?.title ?? "(drill removed)"}
                          </div>
                          {d?.category && (
                            <div className="text-[11px] text-muted-foreground capitalize">{d.category}</div>
                          )}
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => moveRow(idx, -1)} disabled={idx === 0}
                          data-testid={`button-row-up-${idx}`}>
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => moveRow(idx, 1)} disabled={idx === rows.length - 1}
                          data-testid={`button-row-down-${idx}`}>
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeRow(idx)}
                          data-testid={`button-row-remove-${idx}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      {(() => {
                        const metrics = (drillMetricsCache[row.drillId] ?? []).filter(m => m.template.type !== 'calculated');
                        if (metrics.length === 0) return (
                          <p className="text-[11px] text-muted-foreground italic pl-1">
                            Metrics will load when you open the training log for this drill.
                          </p>
                        );
                        return (
                          <div className="flex flex-wrap gap-2 pl-1">
                            {metrics.map(dm => (
                              <div key={dm.metricTemplateId} className="flex flex-col gap-0.5">
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{dm.template.label} (target)</span>
                                <Input
                                  type="number" min={0}
                                  value={row.metricTargets?.[dm.metricTemplateId] ?? ""}
                                  placeholder="—"
                                  className="w-20 h-8 text-xs"
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? undefined : Number(e.target.value);
                                    updateRow(idx, {
                                      metricTargets: {
                                        ...(row.metricTargets ?? {}),
                                        [dm.metricTemplateId]: val as number,
                                      },
                                    });
                                  }}
                                  data-testid={`input-row-metric-${idx}-${dm.metricTemplateId}`}
                                />
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Add drill from library</Label>
              <Input
                value={drillSearch}
                onChange={(e) => setDrillSearch(e.target.value)}
                placeholder="Search drill library by name or category…"
                data-testid="input-drill-search"
              />
              {drillSearch && filteredDrills.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No drills match.</p>
              )}
              {(drillSearch || rows.length === 0) && (
                <div className="max-h-48 overflow-y-auto space-y-1 border rounded bg-background">
                  {filteredDrills.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => addDrill(d.id)}
                      className="w-full flex items-center justify-between text-left px-2 py-1.5 hover:bg-muted text-sm"
                      data-testid={`button-add-drill-${d.id}`}
                    >
                      <span className="truncate">{d.title}</span>
                      <span className="text-[11px] text-muted-foreground capitalize ml-2">{d.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} data-testid="button-cancel-item">Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || (!isNonWorkout && rows.length === 0)} data-testid="button-save-item">
            <Save className="w-4 h-4 mr-1" /> {isNonWorkout ? "Save item" : "Save workout"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
