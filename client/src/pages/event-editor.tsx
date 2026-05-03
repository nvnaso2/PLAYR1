import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, Save, Pencil, Calendar } from "lucide-react";
import type { Event, Program, ProgramItem, EventLeaderboardMetric, EventStatus } from "@shared/schema";
import { EVENT_LEADERBOARD_METRICS } from "@shared/schema";

type EventWithMeta = Event & { status: EventStatus; program: Program | null };

const toLocalDt = (d: Date | string) => {
  const dt = new Date(d);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

export default function EventEditorPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: events, isLoading } = useQuery<EventWithMeta[]>({ queryKey: ["/api/admin/events"] });
  const event = useMemo(() => (events ?? []).find((e) => e.id === eventId), [events, eventId]);

  const { data: programItems } = useQuery<ProgramItem[]>({
    queryKey: ["/api/programs", event?.programId, "edit-items"],
    queryFn: async () => {
      if (!event?.programId) return [];
      const res = await apiRequest("GET", `/api/programs/${event.programId}/edit`);
      const json = await res.json();
      return json.items as ProgramItem[];
    },
    enabled: !!event?.programId,
  });

  const [form, setForm] = useState({
    title: "",
    tagline: "",
    description: "",
    coverImageUrl: "",
    accentColor: "#f97316",
    startsAt: "",
    endsAt: "",
    isPublished: false,
    leaderboardMetric: "composite" as EventLeaderboardMetric,
    finalChallengeItemId: "" as string | "",
  });

  useEffect(() => {
    if (!event) return;
    setForm({
      title: event.title,
      tagline: event.tagline ?? "",
      description: event.description ?? "",
      coverImageUrl: event.coverImageUrl ?? "",
      accentColor: event.accentColor ?? "#f97316",
      startsAt: toLocalDt(event.startsAt),
      endsAt: toLocalDt(event.endsAt),
      isPublished: !!event.isPublished,
      leaderboardMetric: (event.leaderboardMetric as EventLeaderboardMetric) ?? "composite",
      finalChallengeItemId: event.finalChallengeItemId ?? "",
    });
  }, [event?.id]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const body: any = {
        title: form.title.trim(),
        tagline: form.tagline.trim() || null,
        description: form.description.trim() || null,
        coverImageUrl: form.coverImageUrl.trim() || null,
        accentColor: form.accentColor,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        isPublished: form.isPublished,
        leaderboardMetric: form.leaderboardMetric,
        finalChallengeItemId: form.finalChallengeItemId || null,
      };
      const res = await apiRequest("PATCH", `/api/admin/events/${eventId}`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Saved" });
    },
    onError: (err: any) => {
      toast({ title: "Couldn't save", description: err?.message || "Try again", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="container max-w-3xl py-6 space-y-4"><Skeleton className="h-10 w-1/2" /><Skeleton className="h-64" /></div>;
  }
  if (!event) {
    return (
      <div className="container max-w-3xl py-12 text-center">
        <p className="text-muted-foreground mb-4">Event not found.</p>
        <Button onClick={() => navigate("/admin")}>Back to admin</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-6 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/admin"><Button variant="ghost" size="sm" data-testid="button-back-admin"><ArrowLeft className="w-4 h-4 mr-1" /> Admin</Button></Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-event-editor-title">{event.title}</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{event.status}</Badge>
              <span>{event.program?.title ?? "No program"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {event.isPublished && (
            <Link href={`/events/${event.slug}`}>
              <Button variant="outline" size="sm" data-testid="button-view-public-event"><ExternalLink className="w-4 h-4 mr-1" /> View public</Button>
            </Link>
          )}
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} data-testid="button-save-event">
            <Save className="w-4 h-4 mr-1" /> {saveMut.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Hero</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="input-edit-title" />
          </div>
          <div>
            <Label>Tagline</Label>
            <Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} data-testid="input-edit-tagline" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="input-edit-description" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Cover image URL</Label>
              <Input value={form.coverImageUrl} onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })} placeholder="https://…" data-testid="input-edit-cover" />
            </div>
            <div>
              <Label>Accent color</Label>
              <div className="flex items-center gap-2">
                <Input type="color" value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })}
                  className="w-14 p-1 h-10" data-testid="input-edit-accent" />
                <Input value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Window & Visibility</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Starts at</Label>
              <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} data-testid="input-edit-starts" />
            </div>
            <div>
              <Label>Ends at</Label>
              <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} data-testid="input-edit-ends" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="font-medium">Published</p>
              <p className="text-xs text-muted-foreground">When on, the event appears on /events and players can join during its window.</p>
            </div>
            <Switch checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} data-testid="switch-edit-published" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Program structure</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Build out the daily workouts, drills, and rest days for this event in the program builder.
            </p>
          </div>
          {event.programId && (
            <Link href={`/programs/${event.programId}/edit?eventId=${event.id}`}>
              <Button variant="default" size="sm" data-testid="button-open-program-builder">
                <Pencil className="w-4 h-4 mr-1" /> Open program builder
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {!event.program ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-program">No program linked to this event.</p>
          ) : (programItems ?? []).length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center" data-testid="block-program-empty">
              <p className="text-sm text-muted-foreground mb-3">
                <span className="font-medium text-foreground">{event.program.title}</span> has no items yet.
              </p>
              <Link href={`/programs/${event.programId}/edit?eventId=${event.id}`}>
                <Button data-testid="button-build-program-empty">
                  <Pencil className="w-4 h-4 mr-1" /> Build it out
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{event.program.title}</span> · {event.program.lengthDays}-day program · {(programItems ?? []).length} items
              </p>
              <ProgramOutline items={programItems ?? []} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Leaderboard & Final Challenge</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Leaderboard metric</Label>
            <Select value={form.leaderboardMetric} onValueChange={(v) => setForm({ ...form, leaderboardMetric: v as EventLeaderboardMetric })}>
              <SelectTrigger data-testid="select-edit-leaderboard"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_LEADERBOARD_METRICS.map((m) => (
                  <SelectItem key={m} value={m}>{m === "completions" ? "Completions only" : m === "finalScore" ? "Final score only" : "Composite (final score wins, then completions)"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Final challenge item</Label>
            <Select value={form.finalChallengeItemId || "__none__"} onValueChange={(v) => setForm({ ...form, finalChallengeItemId: v === "__none__" ? "" : v })}>
              <SelectTrigger data-testid="select-edit-final-item"><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {(programItems ?? []).map((it) => (
                  <SelectItem key={it.id} value={it.id} data-testid={`option-final-item-${it.id}`}>
                    Day {it.dayNumber} · {it.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Pick the program item players submit a score for. Their submission is mirrored as a completion on this item.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProgramOutline({ items }: { items: ProgramItem[] }) {
  const byDay = items.reduce<Record<number, ProgramItem[]>>((acc, it) => {
    (acc[it.dayNumber] ||= []).push(it);
    return acc;
  }, {});
  const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);
  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {days.map((d) => (
        <div key={d} className="border rounded-md p-2" data-testid={`outline-day-${d}`}>
          <p className="text-xs font-medium mb-1">Day {d}</p>
          <ul className="space-y-1">
            {byDay[d].map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{it.title}</span>
                <Badge variant="outline" className="text-[10px] capitalize">{it.itemType}</Badge>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
