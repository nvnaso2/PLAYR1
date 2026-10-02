import { Link } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  CalendarRange,
  Clock,
  Trophy,
  Users,
} from "lucide-react";
import type { Event, Program, EventStatus } from "@shared/schema";
import { track } from "@/lib/track";

type EventWithMeta = Event & { status: EventStatus; program: Program | null };

const STATUS_BADGE: Record<EventStatus, { label: string; cls: string }> = {
  draft:     { label: "Draft",       cls: "bg-muted text-muted-foreground" },
  scheduled: { label: "Coming soon", cls: "bg-blue-500/15 text-blue-300 border-blue-500/40" },
  live:      { label: "Live now",    cls: "bg-green-500/20 text-green-300 border-green-500/40 animate-pulse" },
  finished:  { label: "Finished",    cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/40" },
};

function formatRange(s: Date | string, e: Date | string) {
  const sd = new Date(s);
  const ed = new Date(e);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${sd.toLocaleDateString(undefined, opts)} → ${ed.toLocaleDateString(undefined, opts)}`;
}

function countdown(target: Date | string) {
  const remaining = new Date(target).getTime() - Date.now();
  if (remaining <= 0) return null;
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h`;
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m`;
}

export default function EventsPage() {
  const { data: events, isLoading: eventsLoading } = useQuery<EventWithMeta[]>({
    queryKey: ["/api/events"],
  });

  useEffect(() => {
    track("events_browse_view");
  }, []);

  const activeEvents = (events ?? []).filter(
    (event) => event.status === "live" || event.status === "scheduled",
  );
  const isLoading = eventsLoading;
  const hasContent = activeEvents.length > 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background" data-testid="page-events">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70"
        style={{ background: "radial-gradient(circle at 80% 0%, rgba(249,115,22,0.10), transparent 42%)" }}
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-6xl space-y-6 p-4 pb-24 sm:p-6">
        <div className="flex items-end justify-between border-b border-zinc-800/80 pb-4">
          <div>
            <h1 className="text-3xl font-heading uppercase tracking-wide sm:text-4xl" data-testid="text-page-title">
              Events
            </h1>
            <p className="text-sm text-muted-foreground">See what’s live and coming soon from PLAYR1.</p>
          </div>
          <div className="hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" aria-hidden="true" />
            Live community
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6" data-testid="events-loading" aria-label="Loading events">
            <Skeleton className="h-28 rounded-xl bg-zinc-900" />
            <Skeleton className="h-8 w-52 bg-zinc-900" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-56 rounded-xl bg-zinc-900" />
              <Skeleton className="h-56 rounded-xl bg-zinc-900" />
            </div>
          </div>
        ) : !hasContent ? (
          <section
            className="rounded-2xl border border-white/10 bg-black/20 px-5 py-16 text-center"
            data-testid="text-events-empty"
            aria-labelledby="events-empty-title"
          >
            <Trophy className="w-10 h-10 mx-auto text-zinc-600 mb-3" aria-hidden="true" />
            <h2 id="events-empty-title" className="text-xl font-heading uppercase tracking-wide">
              No active events right now
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Check back soon for the next PLAYR1 event.
            </p>
          </section>
        ) : (
          <>
            {activeEvents.length > 0 && (
              <section data-testid="event-area" aria-labelledby="time-limited-events-title">
                <div className="flex items-end justify-between gap-4 mb-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      More ways to play
                    </p>
                    <h2
                      id="time-limited-events-title"
                      className="mt-1 text-2xl font-heading uppercase tracking-wide"
                      data-testid="section-events"
                    >
                      Time-limited events
                    </h2>
                  </div>
                  <span className="hidden sm:block text-xs text-muted-foreground">
                    Live and coming soon
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeEvents.map((event) => (
                    <EventCard key={event.id} ev={event} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EventCard({ ev }: { ev: EventWithMeta }) {
  const status = STATUS_BADGE[ev.status];
  const accent = ev.accentColor || "#f97316";
  const remaining = ev.status === "scheduled" ? countdown(ev.startsAt) : countdown(ev.endsAt);
  const remainingLabel = ev.status === "scheduled" ? "Starts in" : "Ends in";

  return (
    <Link
      href={`/events/${ev.slug}`}
      className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`View event: ${ev.title}`}
    >
      <Card
        className="h-full overflow-hidden border-white/[0.09] bg-black/20 transition-colors group-hover:border-orange-500/30 group-hover:bg-black/35"
        data-testid={`card-event-${ev.slug}`}
      >
        <div
          className="relative h-32 overflow-hidden"
          style={{
            background: ev.coverImageUrl
              ? `linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.8)), url("${ev.coverImageUrl}") center/cover no-repeat`
              : `linear-gradient(135deg, ${accent}dd, ${accent}44)`,
          }}
        >
          <div
            className="absolute inset-0 opacity-25"
            style={{ background: `radial-gradient(circle at 80% 100%, ${accent}aa 0%, transparent 60%)` }}
            aria-hidden="true"
          />
          <div className="absolute top-3 left-3">
            <Badge variant="outline" className={`backdrop-blur-md ${status.cls}`}>
              {status.label}
            </Badge>
          </div>
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-xs text-white/90 backdrop-blur">
            <Users className="w-3 h-3" aria-hidden="true" />
            {ev.participantCount ?? 0}
          </div>
        </div>
        <CardContent className="space-y-2 p-4">
          <h3
            className="font-heading text-xl uppercase tracking-wide leading-tight text-zinc-100 transition-colors group-hover:text-orange-300"
            data-testid={`text-event-title-${ev.slug}`}
          >
            {ev.title}
          </h3>
          {ev.tagline && <p className="text-sm text-muted-foreground line-clamp-2">{ev.tagline}</p>}
          <div className="flex items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarRange className="w-3.5 h-3.5" aria-hidden="true" />
              {formatRange(ev.startsAt, ev.endsAt)}
            </span>
            <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1 group-hover:text-orange-400" aria-hidden="true" />
          </div>
          {remaining && (
            <div className="flex items-center gap-1 pt-1 text-xs">
              <Clock className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
              <span className="text-muted-foreground">{remainingLabel}:</span>
              <span className="font-semibold" style={{ color: accent }} data-testid={`text-countdown-${ev.slug}`}>
                {remaining}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}