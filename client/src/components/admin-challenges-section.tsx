import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Trophy, Users } from "lucide-react";
import type { LeaderboardChallenge, LCStatus, ShotLocationDB } from "@shared/schema";
import { LC_METRICS } from "@shared/schema";

type LCWithMeta = LeaderboardChallenge & { status: LCStatus; participantCount: number };

const STATUS_BADGE: Record<LCStatus, { label: string; cls: string }> = {
  draft:     { label: "Draft",     cls: "bg-muted text-muted-foreground" },
  scheduled: { label: "Scheduled", cls: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  live:      { label: "Live",      cls: "bg-green-500/15 text-green-500 border-green-500/30" },
  finished:  { label: "Finished",  cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
};

const METRIC_LABELS: Record<string, string> = {
  shots_made: "Shots Made",
  shots_attempted: "Shots Attempted",
  sessions: "Sessions (days active)",
  duration_minutes: "Total Practice Minutes",
};

function toLocalDt(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function formatRange(s: Date | string, e: Date | string) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${new Date(s).toLocaleDateString(undefined, opts)} → ${new Date(e).toLocaleDateString(undefined, opts)}`;
}

type FormState = {
  title: string;
  tagline: string;
  description: string;
  accentColor: string;
  startsAt: string;
  endsAt: string;
  isPublished: boolean;
  metric: string;
  shotLocation: string;
};

const defaultForm = (): FormState => {
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
  const eightDays = new Date(Date.now() + 8 * 24 * 3600 * 1000);
  return {
    title: "", tagline: "", description: "", accentColor: "#f97316",
    startsAt: toLocalDt(tomorrow), endsAt: toLocalDt(eightDays),
    isPublished: false, metric: "shots_made", shotLocation: "",
  };
};

function ChallengeFormDialog({
  open,
  onClose,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  existing?: LCWithMeta;
}) {
  const { toast } = useToast();
  const { data: shotLocations } = useQuery<ShotLocationDB[]>({ queryKey: ["/api/shot-locations"] });

  const [form, setForm] = useState<FormState>(() =>
    existing
      ? {
          title: existing.title,
          tagline: existing.tagline || "",
          description: existing.description || "",
          accentColor: existing.accentColor || "#f97316",
          startsAt: toLocalDt(new Date(existing.startsAt)),
          endsAt: toLocalDt(new Date(existing.endsAt)),
          isPublished: existing.isPublished || false,
          metric: existing.metric,
          shotLocation: existing.shotLocation || "",
        }
      : defaultForm()
  );

  const set = (k: keyof FormState, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        shotLocation: form.shotLocation || null,
      };
      if (existing) {
        return (await apiRequest("PATCH", `/api/admin/leaderboard-challenges/${existing.id}`, payload)).json();
      }
      return (await apiRequest("POST", "/api/admin/leaderboard-challenges", payload)).json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leaderboard-challenges"] });
      toast({ title: existing ? "Challenge updated" : "Challenge created" });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err?.message || "Try again", variant: "destructive" });
    },
  });

  const canSubmit = form.title.trim().length > 0 && new Date(form.endsAt) > new Date(form.startsAt);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Challenge" : "New Challenge"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => set("title", e.target.value)}
              placeholder="Free Throw Challenge" data-testid="input-lc-title" />
          </div>
          <div>
            <Label>Tagline</Label>
            <Input value={form.tagline} onChange={e => set("tagline", e.target.value)}
              placeholder="Who can sink the most in 7 days?" data-testid="input-lc-tagline" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Describe the challenge…" rows={3} data-testid="input-lc-description" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Starts</Label>
              <Input type="datetime-local" value={form.startsAt}
                onChange={e => set("startsAt", e.target.value)} data-testid="input-lc-starts" />
            </div>
            <div>
              <Label>Ends</Label>
              <Input type="datetime-local" value={form.endsAt}
                onChange={e => set("endsAt", e.target.value)} data-testid="input-lc-ends" />
            </div>
          </div>

          <div>
            <Label>Leaderboard Metric *</Label>
            <Select value={form.metric} onValueChange={v => set("metric", v)}>
              <SelectTrigger data-testid="select-lc-metric">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LC_METRICS.map(m => (
                  <SelectItem key={m} value={m}>{METRIC_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(form.metric === "shots_made" || form.metric === "shots_attempted") && (
            <div>
              <Label>Shot Location Filter <span className="text-muted-foreground font-normal">(optional — leave blank for any)</span></Label>
              <Select value={form.shotLocation || "__any__"} onValueChange={v => set("shotLocation", v === "__any__" ? "" : v)}>
                <SelectTrigger data-testid="select-lc-location">
                  <SelectValue placeholder="Any location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">Any location</SelectItem>
                  {(shotLocations || []).map(loc => (
                    <SelectItem key={loc.slug} value={loc.slug}>{loc.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Accent Color</Label>
            <div className="flex items-center gap-2">
              <input type="color" value={form.accentColor}
                onChange={e => set("accentColor", e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-border bg-transparent"
                data-testid="input-lc-color" />
              <span className="text-sm text-muted-foreground">{form.accentColor}</span>
            </div>
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <Label>Published</Label>
              <p className="text-xs text-muted-foreground">Visible to all players</p>
            </div>
            <Switch checked={form.isPublished} onCheckedChange={v => set("isPublished", v)}
              data-testid="switch-lc-published" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={!canSubmit || mut.isPending} data-testid="button-save-lc">
            {mut.isPending ? "Saving…" : existing ? "Save Changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AdminChallengesSection() {
  const { toast } = useToast();
  const { data: challenges, isLoading } = useQuery<LCWithMeta[]>({
    queryKey: ["/api/admin/leaderboard-challenges"],
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<LCWithMeta | null>(null);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => (await apiRequest("DELETE", `/api/admin/leaderboard-challenges/${id}`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/leaderboard-challenges"] });
      toast({ title: "Challenge deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Couldn't delete", description: err?.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold" data-testid="text-lc-section-title">Leaderboard Challenges</h2>
          <p className="text-sm text-muted-foreground">
            Standalone metric challenges with a live leaderboard. No program required.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="button-new-challenge">
          <Plus className="w-4 h-4 mr-1" /> New Challenge
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : (challenges ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No challenges yet. Click "New Challenge" to create your first one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(challenges ?? []).map(ch => {
            const sb = STATUS_BADGE[ch.status];
            return (
              <Card key={ch.id} className="overflow-hidden hover-elevate" data-testid={`card-lc-${ch.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={sb.cls}>{sb.label}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                          <Users className="w-3 h-3" /> {ch.participantCount ?? 0}
                        </span>
                      </div>
                      <h3 className="font-semibold leading-snug" data-testid={`text-lc-title-${ch.id}`}>{ch.title}</h3>
                      {ch.tagline && <p className="text-xs text-muted-foreground">{ch.tagline}</p>}
                    </div>
                    <div className="w-4 h-4 rounded-full shrink-0 mt-0.5" style={{ background: ch.accentColor || "#f97316" }} />
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>{formatRange(ch.startsAt, ch.endsAt)}</div>
                    <div className="flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      {METRIC_LABELS[ch.metric]}
                      {ch.shotLocation && <span className="ml-1 text-foreground/70">· {ch.shotLocation}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => setEditing(ch)} data-testid={`button-edit-lc-${ch.id}`}>
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <div className="flex-1" />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive" data-testid={`button-delete-lc-${ch.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this challenge?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMut.mutate(ch.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ChallengeFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {editing && <ChallengeFormDialog open={!!editing} onClose={() => setEditing(null)} existing={editing} />}
    </div>
  );
}
