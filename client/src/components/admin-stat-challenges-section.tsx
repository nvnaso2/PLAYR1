import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, BarChart2, Target, CalendarRange, Globe, Lock } from "lucide-react";
import type { StatChallenge } from "@shared/schema";
import { STAT_CHALLENGE_METRICS, STAT_CHALLENGE_METRIC_LABELS, SHOT_LOCATIONS } from "@shared/schema";

const SHOT_LOCATION_LABELS: Record<string, string> = {
  "free-throw":    "Free Throw Line",
  "corner-left":   "Corner Left (3pt)",
  "corner-right":  "Corner Right (3pt)",
  "top-of-key":    "Top of the Key (3pt)",
  "wing-left":     "Wing Left (3pt)",
  "wing-right":    "Wing Right (3pt)",
  "1st-hash-left": "1st Hash Left",
  "1st-hash-right":"1st Hash Right",
  "2nd-hash-left": "2nd Hash Left",
  "2nd-hash-right":"2nd Hash Right",
  "3rd-hash-left": "3rd Hash Left",
  "3rd-hash-right":"3rd Hash Right",
  "block-left":    "Block Left",
  "block-right":   "Block Right",
  "mid-range-left":"Mid-Range Left",
  "mid-range-right":"Mid-Range Right",
};

function formatRange(s: string | Date, e: string | Date) {
  const fmt = (d: string | Date) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(s)} → ${fmt(e)}`;
}

function getStatus(c: StatChallenge): { label: string; cls: string } {
  if (!c.isPublished) return { label: "Draft", cls: "bg-muted text-muted-foreground" };
  const now = Date.now();
  const start = new Date(c.startsAt).getTime();
  const end   = new Date(c.endsAt).getTime();
  if (now < start) return { label: "Scheduled", cls: "bg-blue-500/15 text-blue-400 border-blue-500/30" };
  if (now > end)   return { label: "Finished",  cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" };
  return { label: "Live", cls: "bg-green-500/20 text-green-400 border-green-500/30" };
}

interface FormState {
  title: string;
  description: string;
  metric: string;
  shotLocationFilter: string;
  startsAt: string;
  endsAt: string;
  isPublished: boolean;
}

const blankForm = (): FormState => ({
  title: "",
  description: "",
  metric: "shots_made",
  shotLocationFilter: "",
  startsAt: "",
  endsAt: "",
  isPublished: false,
});

export function AdminStatChallengesSection() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blankForm());

  const { data: challenges, isLoading } = useQuery<StatChallenge[]>({
    queryKey: ["/api/admin/stat-challenges"],
  });

  const createMut = useMutation({
    mutationFn: async (data: FormState) => {
      const res = await apiRequest("POST", "/api/admin/stat-challenges", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stat-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stat-challenges"] });
      toast({ title: "Challenge created!" });
      setOpen(false);
      setForm(blankForm());
    },
    onError: (err: any) => {
      toast({ title: "Failed to create", description: err?.message || "Try again", variant: "destructive" });
    },
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/stat-challenges/${id}`, { isPublished });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stat-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stat-challenges"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/stat-challenges/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stat-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stat-challenges"] });
      toast({ title: "Challenge deleted" });
    },
  });

  const needsLocation = form.metric === "shots_made" || form.metric === "shots_attempted";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold" data-testid="text-challenges-section-title">Stat Challenges</h2>
          <p className="text-sm text-muted-foreground">
            Leaderboard competitions that auto-track training stats (shots made, sessions, etc.) over a time window.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-challenge">
              <Plus className="w-4 h-4 mr-1" /> New Challenge
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Stat Challenge</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Most Free Throws in 7 Days"
                  data-testid="input-challenge-title"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What are players competing for? Any tips?"
                  rows={3}
                  data-testid="input-challenge-description"
                />
              </div>
              <div>
                <Label>Metric to Track</Label>
                <Select value={form.metric} onValueChange={(v) => setForm({ ...form, metric: v, shotLocationFilter: "" })}>
                  <SelectTrigger data-testid="select-challenge-metric">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAT_CHALLENGE_METRICS.map((m) => (
                      <SelectItem key={m} value={m}>{STAT_CHALLENGE_METRIC_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {needsLocation && (
                <div>
                  <Label>Shot Location Filter <span className="text-muted-foreground text-xs">(optional — leave blank for all locations)</span></Label>
                  <Select
                    value={form.shotLocationFilter || "all"}
                    onValueChange={(v) => setForm({ ...form, shotLocationFilter: v === "all" ? "" : v })}
                  >
                    <SelectTrigger data-testid="select-challenge-location">
                      <SelectValue placeholder="All locations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All locations</SelectItem>
                      {SHOT_LOCATIONS.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {SHOT_LOCATION_LABELS[loc] ?? loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    data-testid="input-challenge-starts"
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                    data-testid="input-challenge-ends"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.isPublished}
                  onCheckedChange={(v) => setForm({ ...form, isPublished: v })}
                  data-testid="switch-challenge-published"
                />
                <Label className="cursor-pointer">Publish immediately</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setOpen(false); setForm(blankForm()); }}>
                Cancel
              </Button>
              <Button
                onClick={() => createMut.mutate(form)}
                disabled={createMut.isPending || !form.title || !form.startsAt || !form.endsAt}
                data-testid="button-create-challenge-submit"
              >
                {createMut.isPending ? "Creating…" : "Create Challenge"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : (challenges ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No stat challenges yet. Click "New Challenge" to create one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(challenges ?? []).map((c) => {
            const { label, cls } = getStatus(c);
            return (
              <Card key={c.id} className="overflow-hidden hover-elevate" data-testid={`card-stat-challenge-${c.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={cls}>{label}</Badge>
                      </div>
                      <h3 className="font-semibold leading-snug" data-testid={`text-challenge-title-${c.id}`}>{c.title}</h3>
                    </div>
                    <BarChart2 className="w-5 h-5 text-primary shrink-0" />
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" />
                      <span>{STAT_CHALLENGE_METRIC_LABELS[c.metric as keyof typeof STAT_CHALLENGE_METRIC_LABELS] ?? c.metric}</span>
                      {c.shotLocationFilter && (
                        <span className="text-primary">@ {SHOT_LOCATION_LABELS[c.shotLocationFilter] ?? c.shotLocationFilter}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CalendarRange className="w-3.5 h-3.5" />
                      <span>{formatRange(c.startsAt, c.endsAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={c.isPublished ?? false}
                        onCheckedChange={(v) => toggleMut.mutate({ id: c.id, isPublished: v })}
                        data-testid={`switch-published-${c.id}`}
                      />
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {c.isPublished ? <><Globe className="w-3 h-3" />Published</> : <><Lock className="w-3 h-3" />Draft</>}
                      </span>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" data-testid={`button-delete-challenge-${c.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete challenge?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently delete "{c.title}". This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMut.mutate(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
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
    </div>
  );
}
