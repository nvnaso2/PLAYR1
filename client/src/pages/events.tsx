import { Link } from "wouter";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, BarChart2, CalendarRange, Clock, Flame, PlayCircle, Sparkles, Target, Trophy, Users, Zap,
} from "lucide-react";
import type { Event, Program, EventStatus, StatChallenge, StreakChallenge } from "@shared/schema";
import { STAT_CHALLENGE_METRIC_LABELS } from "@shared/schema";
import { track } from "@/lib/track";

type EventWithMeta = Event & { status: EventStatus; program: Program | null };

const STATUS_BADGE: Record<EventStatus, { label: string; cls: string }> = {
  draft:     { label: "Draft",       cls: "bg-muted text-muted-foreground" },
  scheduled: { label: "Coming soon", cls: "bg-blue-500/15 text-blue-300 border-blue-500/40" },
  live:      { label: "Live now",    cls: "bg-green-500/20 text-green-300 border-green-500/40 animate-pulse" },
  finished:  { label: "Finished",    cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/40" },
};

const SHOT_LOCATION_LABELS: Record<string, string> = {
  "free-throw":    "Free Throw",
  "corner-left":   "Corner Left (3pt)",
  "corner-right":  "Corner Right (3pt)",
  "top-of-key":    "Top of Key (3pt)",
  "wing-left":     "Wing Left (3pt)",
  "wing-right":    "Wing Right (3pt)",
  "block-left":    "Block Left",
  "block-right":   "Block Right",
  "mid-range-left":"Mid-Range Left",
  "mid-range-right":"Mid-Range Right",
};

function formatRange(s: Date | string, e: Date | string) {
  const sd = new Date(s); const ed = new Date(e);
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

function getChallengeStatus(c: StatChallenge): { label: string; cls: string; key: "live" | "scheduled" | "finished" } {
  const now = Date.now();
  const start = new Date(c.startsAt).getTime();
  const end   = new Date(c.endsAt).getTime();
  if (now < start) return { label: "Coming soon", cls: "bg-blue-500/15 text-blue-300 border-blue-500/40",              key: "scheduled" };
  if (now > end)   return { label: "Finished",    cls: "bg-zinc-500/15 text-zinc-400 border-zinc-500/40",             key: "finished"  };
  return              { label: "Live now",    cls: "bg-green-500/20 text-green-300 border-green-500/40 animate-pulse", key: "live"      };
}

export default function EventsPage() {
  const { data: events,          isLoading: evLoading }  = useQuery<EventWithMeta[]>({ queryKey: ["/api/events"] });
  const { data: challenges,      isLoading: chLoading }  = useQuery<StatChallenge[]>({ queryKey: ["/api/stat-challenges"] });
  const { data: streakChallenges, isLoading: scLoading } = useQuery<StreakChallenge[]>({ queryKey: ["/api/streak-challenges"] });

  useEffect(() => { track("events_browse_view"); }, []);

  const live      = useMemo(() => (events ?? []).filter((e) => e.status === "live"),      [events]);
  const scheduled = useMemo(() => (events ?? []).filter((e) => e.status === "scheduled"), [events]);
  const finished  = useMemo(() => (events ?? []).filter((e) => e.status === "finished"),  [events]);
  const featured  = live[0] ?? scheduled[0] ?? null;

  const liveChallenges      = useMemo(() => (challenges ?? []).filter((c) => getChallengeStatus(c).key === "live"),      [challenges]);
  const scheduledChallenges = useMemo(() => (challenges ?? []).filter((c) => getChallengeStatus(c).key === "scheduled"), [challenges]);
  const finishedChallenges  = useMemo(() => (challenges ?? []).filter((c) => getChallengeStatus(c).key === "finished"),  [challenges]);

  const featuredStreakChallenge = (streakChallenges ?? []).find((c) => c.isActive) ?? null;

  const isLoading = evLoading || chLoading || scLoading;
  const hasContent = (events ?? []).length + (challenges ?? []).length > 0;

  return (
    <div className="min-h-screen pb-12" data-testid="page-events">
      {/* ─── Page Hero ─── */}
      <div className="relative overflow-hidden border-b border-border/40">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12% 18%, hsl(var(--primary) / 0.35) 0%, transparent 55%), radial-gradient(circle at 88% 82%, hsl(24 95% 53% / 0.25) 0%, transparent 55%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="flex items-center gap-2 text-primary text-sm font-medium mb-3">
            <Trophy className="w-4 h-4" />
            <span className="uppercase tracking-widest text-xs">Time-Limited Competitions</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight" data-testid="text-page-title">
            Events & Challenges
          </h1>
          <p className="text-lg text-muted-foreground mt-3 max-w-2xl">
            Show up. Stack the reps. Climb the leaderboard.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-72 rounded-2xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
            </div>
          </div>
        ) : (
          <>
            {/* ─── Featured Streak Challenge (always shown first) ─── */}
            {featuredStreakChallenge && (
              <FeaturedStreakChallenge challenge={featuredStreakChallenge} />
            )}

            {!hasContent && !featuredStreakChallenge ? (
              <Card>
                <CardContent className="py-16 text-center" data-testid="text-events-empty">
                  <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-40" />
                  <p className="text-lg font-semibold">No events or challenges right now</p>
                  <p className="text-sm text-muted-foreground mt-1">Check back soon — fresh competitions drop often.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {featured && <FeaturedEvent ev={featured} />}

            {/* Live section — events + challenges */}
            {(live.filter((e) => e.id !== featured?.id).length > 0 || liveChallenges.length > 0) && (
              <Section title="Live now" icon={<Flame className="w-5 h-5 text-green-400" />} subtitle="Jump in — clocks are ticking." variant="live">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {live.filter((e) => e.id !== featured?.id).map((ev) => <EventCard key={ev.id} ev={ev} />)}
                  {liveChallenges.map((c) => <ChallengeCard key={c.id} c={c} />)}
                </div>
              </Section>
            )}

            {/* Coming soon */}
            {(scheduled.filter((e) => e.id !== featured?.id).length > 0 || scheduledChallenges.length > 0) && (
              <Section title="Coming soon" icon={<Sparkles className="w-5 h-5 text-blue-400" />} subtitle="On deck — get ready." variant="scheduled">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {scheduled.filter((e) => e.id !== featured?.id).map((ev) => <EventCard key={ev.id} ev={ev} />)}
                  {scheduledChallenges.map((c) => <ChallengeCard key={c.id} c={c} />)}
                </div>
              </Section>
            )}

            {/* Past */}
            {(finished.length > 0 || finishedChallenges.length > 0) && (
              <Section title="Past events" icon={<Trophy className="w-5 h-5 text-zinc-400" />} subtitle="Final standings." variant="finished">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {finished.map((ev) => <EventCard key={ev.id} ev={ev} />)}
                  {finishedChallenges.map((c) => <ChallengeCard key={c.id} c={c} />)}
                </div>
              </Section>
            )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, subtitle, icon, variant, children }: {
  title: string; subtitle?: string; icon: React.ReactNode;
  variant: "live" | "scheduled" | "finished"; children: React.ReactNode;
}) {
  return (
    <section data-testid={`text-section-${variant}`}>
      <div className="mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">{icon}{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function FeaturedStreakChallenge({ challenge }: { challenge: StreakChallenge }) {
  const accent = challenge.accentColor || "#f97316";
  return (
    <Link href={`/streak-challenges/${challenge.slug}`}>
      <Card
        className="overflow-hidden border-border/60 hover-elevate active-elevate-2 cursor-pointer group relative"
        data-testid={`card-streak-challenge-${challenge.slug}`}
      >
        {/* Background glow */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${accent}33 0%, ${accent}11 50%, transparent 100%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />
        <div
          className="absolute top-0 right-0 w-96 h-96 opacity-20 blur-3xl pointer-events-none"
          style={{ background: accent }}
        />

        <div className="relative p-6 md:p-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-center min-h-[200px]">
          <div>
            {/* Labels */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge
                className="font-semibold text-white border-0"
                style={{ background: `${accent}cc` }}
                data-testid="badge-streak-challenge"
              >
                <Zap className="w-3 h-3 mr-1" /> Signature Challenge
              </Badge>
              <Badge className="bg-green-500/20 text-green-300 border-green-500/40 animate-pulse">
                <Flame className="w-3 h-3 mr-1" /> Always Live
              </Badge>
            </div>

            <h2 className="text-2xl md:text-4xl font-bold tracking-tight" data-testid="text-streak-challenge-title">
              {challenge.title}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-xl line-clamp-2">
              {challenge.description}
            </p>

            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Goal: make</span>
              <span className="font-bold text-lg" style={{ color: accent }}>{challenge.defaultGoal}</span>
              <span className="text-sm text-muted-foreground">consecutive 3-pointers in a row</span>
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center lg:items-end gap-2 flex-shrink-0">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-black mb-1"
              style={{ background: `${accent}22`, border: `2px solid ${accent}44`, color: accent }}
            >
              {challenge.defaultGoal}
            </div>
            <Button
              className="gap-2 font-semibold"
              style={{ background: accent }}
              data-testid="button-view-streak-challenge"
            >
              Enter Challenge <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function FeaturedEvent({ ev }: { ev: EventWithMeta }) {
  const accent = ev.accentColor || "#f97316";
  const sb = STATUS_BADGE[ev.status];
  const cd = ev.status === "scheduled" ? countdown(ev.startsAt)
    : ev.status === "live" ? countdown(ev.endsAt) : null;
  const cdLabel = ev.status === "scheduled" ? "Starts in" : ev.status === "live" ? "Ends in" : null;

  return (
    <Link href={`/events/${ev.slug}`}>
      <Card
        className="overflow-hidden border-border/60 hover-elevate active-elevate-2 cursor-pointer group relative"
        data-testid={`card-featured-event-${ev.slug}`}
      >
        <div
          className="absolute inset-0"
          style={{
            background: ev.coverImageUrl
              ? `linear-gradient(115deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.15) 100%), url("${ev.coverImageUrl}") center/cover no-repeat`
              : `linear-gradient(135deg, ${accent}cc 0%, ${accent}55 45%, ${accent}11 100%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            opacity: ev.coverImageUrl ? 0.18 : 0.5,
            background: `radial-gradient(circle at 18% 0%, ${accent}aa 0%, transparent 55%), radial-gradient(circle at 88% 100%, ${accent}66 0%, transparent 50%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative p-6 md:p-10 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-end min-h-[280px]">
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge className="bg-white/95 text-black border-0 font-semibold">
                <Sparkles className="w-3 h-3 mr-1" /> Featured event
              </Badge>
              <Badge variant="outline" className={`backdrop-blur ${sb.cls}`}>{sb.label}</Badge>
            </div>
            <h2
              className="text-3xl md:text-5xl font-bold tracking-tight text-white drop-shadow-md"
              data-testid={`text-featured-title-${ev.slug}`}
            >
              {ev.title}
            </h2>
            {ev.tagline && (
              <p className="text-lg text-white/85 mt-3 max-w-2xl">{ev.tagline}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-5 text-sm text-white/85">
              <span className="flex items-center gap-1.5">
                <CalendarRange className="w-4 h-4" /> {formatRange(ev.startsAt, ev.endsAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" /> {ev.participantCount ?? 0} joined
              </span>
              {cd && (
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  <Clock className="w-4 h-4" /> {cdLabel} {cd}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-stretch lg:items-end gap-2">
            <Button
              size="lg"
              className="shadow-xl font-semibold border-0"
              style={{
                background: accent,
                color: "white",
                boxShadow: `0 0 0 2px rgba(255,255,255,0.12), 0 0 0 5px rgba(255,255,255,0.05), 0 6px 20px rgba(0,0,0,0.25)`,
              }}
              data-testid={`button-featured-cta-${ev.slug}`}
            >
              <PlayCircle className="w-5 h-5 mr-2" />
              {ev.status === "live" ? "Join now" : ev.status === "scheduled" ? "View details" : "See results"}
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function EventCard({ ev }: { ev: EventWithMeta }) {
  const sb = STATUS_BADGE[ev.status];
  const accent = ev.accentColor || "#f97316";
  const cd = ev.status === "scheduled" ? countdown(ev.startsAt)
    : ev.status === "live" ? countdown(ev.endsAt) : null;
  const cdLabel = ev.status === "scheduled" ? "Starts in" : ev.status === "live" ? "Ends in" : null;

  return (
    <Link href={`/events/${ev.slug}`}>
      <Card
        className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer h-full border-border/60 group"
        data-testid={`card-event-${ev.slug}`}
      >
        <div
          className="h-36 relative overflow-hidden"
          style={{
            background: ev.coverImageUrl
              ? `linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.75) 100%), url("${ev.coverImageUrl}") center/cover no-repeat`
              : `linear-gradient(135deg, ${accent}dd, ${accent}44)`,
          }}
        >
          <div className={`absolute inset-0 transition-opacity ${ev.coverImageUrl ? "opacity-10 group-hover:opacity-25" : "opacity-30 group-hover:opacity-50"}`}
            style={{ background: `radial-gradient(circle at 80% 100%, ${accent}aa 0%, transparent 60%)` }}
          />
          <div className="absolute top-3 left-3">
            <Badge variant="outline" className={`backdrop-blur-md ${sb.cls}`}>{sb.label}</Badge>
          </div>
          <div className="absolute bottom-3 right-3 text-white/90 text-xs flex items-center gap-1.5 backdrop-blur bg-black/30 rounded-full px-2.5 py-1">
            <Users className="w-3 h-3" /> {ev.participantCount ?? 0}
          </div>
        </div>
        <CardContent className="p-4 space-y-2">
          <h3
            className="font-semibold leading-snug text-base group-hover:text-primary transition-colors"
            data-testid={`text-event-title-${ev.slug}`}
          >
            {ev.title}
          </h3>
          {ev.tagline && <p className="text-sm text-muted-foreground line-clamp-2">{ev.tagline}</p>}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <span className="inline-flex items-center gap-1">
              <CalendarRange className="w-3.5 h-3.5" /> {formatRange(ev.startsAt, ev.endsAt)}
            </span>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {cd && (
            <div className="text-xs flex items-center gap-1 pt-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">{cdLabel}: </span>
              <span className="font-semibold" style={{ color: accent }} data-testid={`text-countdown-${ev.slug}`}>{cd}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function ChallengeCard({ c }: { c: StatChallenge }) {
  const status = getChallengeStatus(c);
  const accent = c.accentColor || "#f97316";
  const metricLabel = STAT_CHALLENGE_METRIC_LABELS[c.metric as keyof typeof STAT_CHALLENGE_METRIC_LABELS] ?? c.metric;
  const locationLabel = c.shotLocationFilter ? (SHOT_LOCATION_LABELS[c.shotLocationFilter] ?? c.shotLocationFilter) : null;
  const cd = status.key === "scheduled" ? countdown(c.startsAt)
    : status.key === "live" ? countdown(c.endsAt) : null;
  const cdLabel = status.key === "scheduled" ? "Starts in" : status.key === "live" ? "Ends in" : null;

  return (
    <Link href={`/compete/challenges/${c.slug}`}>
      <Card
        className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer h-full border-border/60 group"
        data-testid={`card-challenge-${c.slug}`}
      >
        {/* Header band */}
        <div
          className="h-36 relative overflow-hidden flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${accent}ee, ${accent}55)` }}
        >
          <div className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "16px 16px",
            }}
          />
          <BarChart2 className="w-14 h-14 text-white/20 absolute" />
          <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
            <Badge variant="outline" className={`backdrop-blur-md ${status.cls}`}>{status.label}</Badge>
            <Badge variant="outline" className="backdrop-blur-md bg-black/30 text-white/80 border-white/20 text-xs">
              <Target className="w-2.5 h-2.5 mr-1" /> Stat Challenge
            </Badge>
          </div>
        </div>

        <CardContent className="p-4 space-y-2">
          <h3
            className="font-semibold leading-snug text-base group-hover:text-primary transition-colors"
            data-testid={`text-challenge-title-${c.slug}`}
          >
            {c.title}
          </h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Target className="w-3.5 h-3.5 shrink-0" />
            {metricLabel}{locationLabel ? ` @ ${locationLabel}` : ""}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <span className="inline-flex items-center gap-1">
              <CalendarRange className="w-3.5 h-3.5" /> {formatRange(c.startsAt, c.endsAt)}
            </span>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {cd && (
            <div className="text-xs flex items-center gap-1 pt-1">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">{cdLabel}: </span>
              <span className="font-semibold" style={{ color: accent }}>{cd}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
