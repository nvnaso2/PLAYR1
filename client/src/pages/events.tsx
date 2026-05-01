import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarRange, Trophy, Users } from "lucide-react";
import type { Event, Program, EventStatus } from "@shared/schema";
import { useEffect } from "react";
import { track } from "@/lib/track";

type EventWithMeta = Event & { status: EventStatus; program: Program | null };

const STATUS_BADGE: Record<EventStatus, { label: string; cls: string }> = {
  draft:     { label: "Draft",     cls: "bg-muted text-muted-foreground" },
  scheduled: { label: "Coming soon", cls: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  live:      { label: "Live now",   cls: "bg-green-500/15 text-green-500 border-green-500/30" },
  finished:  { label: "Finished",   cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
};

function formatRange(s: Date | string, e: Date | string) {
  const sd = new Date(s);
  const ed = new Date(e);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${sd.toLocaleDateString(undefined, opts)} → ${ed.toLocaleDateString(undefined, opts)}`;
}

function countdown(target: Date | string) {
  const t = new Date(target).getTime() - Date.now();
  if (t <= 0) return null;
  const days = Math.floor(t / 86_400_000);
  const hours = Math.floor((t % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((t % 3_600_000) / 60_000);
  return `${hours}h ${mins}m`;
}

export default function EventsPage() {
  const { data: events, isLoading } = useQuery<EventWithMeta[]>({ queryKey: ["/api/events"] });

  useEffect(() => {
    track("events_browse_view");
  }, []);

  const live      = (events ?? []).filter((e) => e.status === "live");
  const scheduled = (events ?? []).filter((e) => e.status === "scheduled");
  const finished  = (events ?? []).filter((e) => e.status === "finished");

  return (
    <div className="container max-w-6xl py-6 space-y-8" data-testid="page-events">
      <header>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Trophy className="w-7 h-7 text-primary" /> Events & Challenges</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Time-limited training challenges built around a Program. Join, complete the daily workouts, log your final score, and climb the leaderboard.
        </p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : (events ?? []).length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground" data-testid="text-events-empty">
          No events live or scheduled right now. Check back soon.
        </CardContent></Card>
      ) : (
        <>
          {live.length > 0 && <Section title="Live now" items={live} variant="live" />}
          {scheduled.length > 0 && <Section title="Coming soon" items={scheduled} variant="scheduled" />}
          {finished.length > 0 && <Section title="Past events" items={finished} variant="finished" />}
        </>
      )}
    </div>
  );
}

function Section({ title, items, variant }: { title: string; items: EventWithMeta[]; variant: "live" | "scheduled" | "finished" }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold" data-testid={`text-section-${variant}`}>{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((ev) => (
          <EventCard key={ev.id} ev={ev} />
        ))}
      </div>
    </section>
  );
}

function EventCard({ ev }: { ev: EventWithMeta }) {
  const sb = STATUS_BADGE[ev.status];
  const cd = ev.status === "scheduled" ? countdown(ev.startsAt) : ev.status === "live" ? countdown(ev.endsAt) : null;
  const cdLabel = ev.status === "scheduled" ? "Starts in" : ev.status === "live" ? "Ends in" : null;
  const accent = ev.accentColor || "#f97316";
  return (
    <Link href={`/events/${ev.slug}`}>
      <Card className="overflow-hidden hover-elevate cursor-pointer group" data-testid={`card-event-${ev.slug}`}>
        <div className="h-32 relative" style={{
          background: ev.coverImageUrl
            ? `linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.7)), url(${ev.coverImageUrl}) center/cover no-repeat`
            : `linear-gradient(135deg, ${accent}, ${accent}33)`,
        }}>
          <div className="absolute top-2 left-2">
            <Badge variant="outline" className={sb.cls}>{sb.label}</Badge>
          </div>
        </div>
        <CardContent className="p-4 space-y-2">
          <h3 className="font-semibold leading-snug" data-testid={`text-event-title-${ev.slug}`}>{ev.title}</h3>
          {ev.tagline && <p className="text-xs text-muted-foreground line-clamp-2">{ev.tagline}</p>}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span className="inline-flex items-center gap-1"><CalendarRange className="w-3.5 h-3.5" /> {formatRange(ev.startsAt, ev.endsAt)}</span>
            <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {ev.participantCount ?? 0}</span>
          </div>
          {cd && (
            <div className="text-xs">
              <span className="text-muted-foreground">{cdLabel}: </span>
              <span className="font-semibold" style={{ color: accent }} data-testid={`text-countdown-${ev.slug}`}>{cd}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
