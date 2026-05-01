import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Plus, Pencil, ExternalLink, Trash2, Trophy } from "lucide-react";
import type { Event, Program, EventStatus } from "@shared/schema";

type EventWithMeta = Event & { status: EventStatus; program: Program | null };

const STATUS_BADGE: Record<EventStatus, { label: string; cls: string }> = {
  draft:     { label: "Draft",     cls: "bg-muted text-muted-foreground" },
  scheduled: { label: "Scheduled", cls: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  live:      { label: "Live",      cls: "bg-green-500/15 text-green-500 border-green-500/30" },
  finished:  { label: "Finished",  cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
};

function formatRange(s: Date | string, e: Date | string) {
  const sd = new Date(s);
  const ed = new Date(e);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${sd.toLocaleDateString(undefined, opts)} → ${ed.toLocaleDateString(undefined, opts)}`;
}

export function AdminEventsSection() {
  const { data: events, isLoading } = useQuery<EventWithMeta[]>({ queryKey: ["/api/admin/events"] });
  const [createOpen, setCreateOpen] = useState(false);
  const { toast } = useToast();

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/events/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      toast({ title: "Event deleted" });
    },
    onError: (err: any) => {
      toast({ title: "Couldn't delete", description: err?.message || "Try again", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold" data-testid="text-events-section-title">Events</h2>
          <p className="text-sm text-muted-foreground">
            Time-windowed challenges built on top of an existing Program. Each event has a leaderboard and an optional final challenge.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-event">
              <Plus className="w-4 h-4 mr-1" /> New Event
            </Button>
          </DialogTrigger>
          <NewEventDialog onClose={() => setCreateOpen(false)} />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : (events ?? []).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No events yet. Click "New Event" to launch your first one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(events ?? []).map((ev) => {
            const sb = STATUS_BADGE[ev.status];
            return (
              <Card key={ev.id} className="overflow-hidden hover-elevate" data-testid={`card-event-${ev.id}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={sb.cls} data-testid={`badge-status-${ev.id}`}>{sb.label}</Badge>
                        <span className="text-xs text-muted-foreground">{ev.participantCount ?? 0} joined</span>
                      </div>
                      <h3 className="font-semibold leading-snug truncate" data-testid={`text-event-title-${ev.id}`}>{ev.title}</h3>
                      {ev.tagline && <p className="text-xs text-muted-foreground truncate">{ev.tagline}</p>}
                    </div>
                    <Trophy className="w-5 h-5 text-primary shrink-0" />
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>{formatRange(ev.startsAt, ev.endsAt)}</div>
                    {ev.program && (
                      <div className="truncate">Program: <span className="text-foreground">{ev.program.title}</span></div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Link href={`/admin/events/${ev.id}/edit`}>
                      <Button size="sm" variant="outline" data-testid={`button-edit-event-${ev.id}`}>
                        <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                      </Button>
                    </Link>
                    {ev.isPublished && (
                      <Link href={`/events/${ev.slug}`}>
                        <Button size="sm" variant="ghost" data-testid={`button-view-event-${ev.id}`}>
                          <ExternalLink className="w-3.5 h-3.5 mr-1" /> View
                        </Button>
                      </Link>
                    )}
                    <div className="flex-1" />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive" data-testid={`button-delete-event-${ev.id}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this event?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This cannot be undone. If anyone has already joined, you'll need to unpublish instead.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMut.mutate(ev.id)} data-testid={`button-confirm-delete-${ev.id}`}>
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

function NewEventDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const { data: programs } = useQuery<Program[]>({ queryKey: ["/api/admin/programs"] });

  const [title, setTitle] = useState("");
  const [programId, setProgramId] = useState("");
  // Default window: tomorrow → tomorrow+7 days
  const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
  const eightDays = new Date(Date.now() + 8 * 24 * 3600 * 1000);
  const toLocalDt = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [startsAt, setStartsAt] = useState(toLocalDt(tomorrow));
  const [endsAt, setEndsAt] = useState(toLocalDt(eightDays));

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/events", {
        title,
        programId,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      });
      return res.json();
    },
    onSuccess: (created: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      onClose();
      toast({ title: "Event created", description: "Now configure dates, hero, and final challenge." });
      // Soft navigate via wouter is overkill here; let the link in the toast guide.
      window.location.href = `/admin/events/${created.id}/edit`;
    },
    onError: (err: any) => {
      toast({ title: "Couldn't create", description: err?.message || "Check your inputs", variant: "destructive" });
    },
  });

  const canSubmit = title.trim().length > 0 && !!programId && new Date(endsAt) > new Date(startsAt);

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>New Event</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div>
          <Label htmlFor="event-title">Title</Label>
          <Input id="event-title" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Train Like Steph" data-testid="input-event-title" />
        </div>
        <div>
          <Label>Program</Label>
          <Select value={programId} onValueChange={setProgramId}>
            <SelectTrigger data-testid="select-event-program"><SelectValue placeholder="Pick a program…" /></SelectTrigger>
            <SelectContent>
              {(programs ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id} data-testid={`option-program-${p.id}`}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="event-starts">Starts</Label>
            <Input id="event-starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)}
              data-testid="input-event-starts" />
          </div>
          <div>
            <Label htmlFor="event-ends">Ends</Label>
            <Input id="event-ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)}
              data-testid="input-event-ends" />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => createMut.mutate()} disabled={!canSubmit || createMut.isPending} data-testid="button-create-event">
          {createMut.isPending ? "Creating…" : "Create"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
