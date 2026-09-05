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
  Flame,
  Trophy,
  Users,
} from "lucide-react";
import type { Event, Program, EventStatus, StreakChallenge } from "@shared/schema";
import { track } from "@/lib/track";

const SIGNATURE_CHALLENGE_SLUG = "fifty-in-a-row";

type EventWithMeta = Event & { status: EventStatus; program: Program | null };

type StreakChallengeDetail = {
  challenge: StreakChallenge;
  participantCount: number;
};

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
  const { data: signatureDetail, isLoading: signatureLoading } = useQuery<StreakChallengeDetail>({
    queryKey: ["/api/streak-challenges", SIGNATURE_CHALLENGE_SLUG],
    queryFn: async () => {
      const response = await fetch(`/api/streak-challenges/${SIGNATURE_CHALLENGE_SLUG}`);
      if (!response.ok) throw new Error("Signature challenge unavailable");
      return response.json();
    },
  });

  useEffect(() => {
    track("events_browse_view");
  }, []);

  const signatureChallenge = signatureDetail?.challenge?.isActive
    ? signatureDetail.challenge
    : null;
  const activeEvents = (events ?? []).filter(
    (event) => event.status === "live" || event.status === "scheduled",
  );
  const isLoading = eventsLoading || signatureLoading;
  const hasContent = Boolean(signatureChallenge) || activeEvents.length > 0;

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
              Compete
            </h1>
            <p className="text-sm text-muted-foreground">Interact with the PLAYR1 community</p>
          </div>
          <div className="hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" aria-hidden="true" />
            Live community
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-6" data-testid="compete-loading" aria-label="Loading competitions">
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
            aria-labelledby="compete-empty-title"
          >
            <Trophy className="w-10 h-10 mx-auto text-zinc-600 mb-3" aria-hidden="true" />
            <h2 id="compete-empty-title" className="text-xl font-heading uppercase tracking-wide">
              Nothing live right now
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Check back soon for the next way to compete.
            </p>
          </section>
        ) : (
          <>
            {signatureChallenge && (
              <SignatureChallenge challenge={signatureChallenge} participantCount={signatureDetail?.participantCount ?? 0} />
            )}

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

function SignatureChallenge({
  challenge,
  participantCount,
}: {
  challenge: StreakChallenge;
  participantCount: number;
}) {
  const playerLabel = `${participantCount} ${participantCount === 1 ? "player" : "players"} competing`;

  return (
    <section aria-labelledby="signature-challenge-title" data-testid="signature-challenge">
      <Link
        href={`/streak-challenges/${challenge.slug}`}
        aria-label={`Enter ${challenge.title}`}
        className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div
          className="relative overflow-hidden rounded-xl border border-orange-400/70 bg-gradient-to-br from-orange-500 to-orange-700 p-4 text-white shadow-lg shadow-orange-950/25 transition hover:from-orange-400 hover:to-orange-600 sm:p-5"
          data-testid={`card-streak-challenge-${challenge.slug}`}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-white via-zinc-300 to-white p-[2px]">
                <span className="flex h-full w-full items-center justify-center rounded-[6px] bg-black">
                  <Flame className="h-5 w-5 text-orange-400" aria-hidden="true" />
                </span>
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                  <span className="text-orange-50 animate-pulse" data-testid="badge-streak-challenge-status">
                    Live now
                  </span>
                  <span className="text-orange-100/60" aria-hidden="true">•</span>
                  <span className="text-orange-100/70">{playerLabel}</span>
                </div>
                <h2
                  id="signature-challenge-title"
                  className="mt-1 truncate text-xl font-heading uppercase tracking-wide leading-none text-white sm:text-2xl"
                  data-testid="text-streak-challenge-title"
                >
                  {challenge.title}
                </h2>
              </div>
            </div>

            <div
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-lg bg-black/85 px-3.5 py-2 text-sm font-semibold text-white transition group-hover:bg-black sm:self-auto"
              data-testid="button-view-streak-challenge"
            >
              Enter challenge
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </div>
          </div>
        </div>
      </Link>
    </section>
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