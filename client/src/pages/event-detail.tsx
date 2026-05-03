import { useEffect, useMemo, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, CalendarRange, Trophy, Users, Play, Award, ListChecks, Flame, Sparkles, Clock, Calendar as CalendarIcon, Lock, CheckCircle2 } from "lucide-react";
import type { Event, Program, ProgramItem, EventParticipant, EventStatus, Drill } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { track } from "@/lib/track";
import { DayPlanGrid, ProgramStatRibbon } from "@/components/program-day-plan";

type EventDetailResponse = {
  event: Event & { status: EventStatus; program: Program | null };
  items: ProgramItem[];
  participant: EventParticipant | null;
};

type LeaderboardRow = {
  userId: string;
  user: { id: string; firstName: string | null; lastName: string | null; profileImageUrl: string | null };
  joinedAt: string | null;
  completedItemCount: number;
  lastCompletedAt: string | null;
  finalScore: string | null;
  finalSubmittedAt: string | null;
  attemptsTaken: number | null;
  currentDay: number | null;
  shootingPct: number | null;
  compositeScore: number;
  rank: number;
};

/** Convert any YouTube watch/share URL to an embed URL. Returns null if not YouTube. */
function toYouTubeEmbed(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    let videoId: string | null = null;
    if (u.hostname === "youtu.be") {
      videoId = u.pathname.replace(/^\//, "");
    } else if (u.hostname.includes("youtube.com")) {
      videoId = u.searchParams.get("v");
      if (!videoId) {
        const m = u.pathname.match(/\/(?:embed|v|shorts)\/([^/?]+)/);
        if (m) videoId = m[1];
      }
    }
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
  } catch {
    return null;
  }
}

function formatRange(s: Date | string, e: Date | string) {
  const sd = new Date(s); const ed = new Date(e);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${sd.toLocaleDateString(undefined, opts)} → ${ed.toLocaleDateString(undefined, opts)}`;
}

function timeRemaining(target: Date | string) {
  const t = new Date(target).getTime() - Date.now();
  if (t <= 0) return "0s";
  const days = Math.floor(t / 86_400_000);
  const hours = Math.floor((t % 86_400_000) / 3_600_000);
  const mins = Math.floor((t % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function EventDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");

  const { data, isLoading } = useQuery<EventDetailResponse>({ queryKey: [`/api/events/${slug}`] });
  const event = data?.event;
  const items = data?.items ?? [];
  const participant = data?.participant ?? null;

  useEffect(() => {
    if (event) track("event_view", { eventId: event.id });
  }, [event?.id]);

  const { data: allDrills } = useQuery<Drill[]>({ queryKey: ["/api/drills"], enabled: !!event });
  const drillsById = useMemo(() => {
    const m = new Map<string, Drill>();
    (allDrills ?? []).forEach((d) => m.set(d.id, d));
    return m;
  }, [allDrills]);

  const { data: leaderboard, isLoading: lbLoading } = useQuery<LeaderboardRow[]>({
    queryKey: [`/api/events/${event?.id}/leaderboard`],
    enabled: !!event?.id,
    refetchInterval: 15_000,
  });

  const joinMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${event!.id}/join`);
      return res.json();
    },
    onSuccess: () => {
      track("event_join", { eventId: event!.id });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${slug}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event!.id}/leaderboard`] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs/discover/active"] });
      toast({ title: "You're in!", description: "Heading to today's workout…" });
      if (event?.program) navigate(`/programs/${event.program.slug}/today`);
    },
    onError: (err: any) => {
      toast({ title: "Couldn't join", description: err?.message || "Try again", variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="mx-auto max-w-4xl py-6 px-4 sm:px-6 lg:px-8 space-y-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-48" /></div>;
  }
  if (!event) {
    return (
      <div className="mx-auto max-w-3xl py-12 px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-muted-foreground mb-4">Event not found.</p>
        <Link href="/events"><Button>Back to events</Button></Link>
      </div>
    );
  }

  const accent = event.accentColor || "#f97316";
  const statusLabel = event.status === "live" ? "Live now"
    : event.status === "scheduled" ? "Coming soon"
    : event.status === "finished" ? "Finished" : "Draft";
  const isLive = event.status === "live";
  const isFinished = event.status === "finished";
  const isJoined = !!participant;

  return (
    <div className="pb-12" data-testid="page-event-detail">
      {/* ─── Cinematic Hero ─── */}
      <div className="relative overflow-hidden border-b border-border/40">
        <div
          className="absolute inset-0"
          style={{
            background: event.coverImageUrl
              ? `linear-gradient(115deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.2) 100%), url("${event.coverImageUrl}") center/cover no-repeat`
              : `linear-gradient(135deg, ${accent}cc 0%, ${accent}55 40%, hsl(var(--background)) 100%)`,
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            opacity: event.coverImageUrl ? 0.18 : 0.5,
            background: `radial-gradient(circle at 15% 0%, ${accent}aa 0%, transparent 55%), radial-gradient(circle at 85% 100%, ${accent}66 0%, transparent 50%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative mx-auto max-w-5xl py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
          <Link href="/events">
            <Button variant="ghost" size="sm" className="text-white/90 hover:text-white hover:bg-white/10 mb-5" data-testid="button-back-events">
              <ArrowLeft className="w-4 h-4 mr-1" /> All events
            </Button>
          </Link>
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className={`backdrop-blur border ${
                  event.status === "live" ? "bg-green-500/20 text-green-300 border-green-500/40 animate-pulse"
                  : event.status === "scheduled" ? "bg-blue-500/20 text-blue-200 border-blue-400/40"
                  : event.status === "finished" ? "bg-zinc-500/20 text-zinc-300 border-zinc-500/40"
                  : "bg-white/10 text-white border-white/30"
                }`}
              >
                {event.status === "live" && <Flame className="w-3.5 h-3.5 mr-1" />}
                {event.status === "scheduled" && <Sparkles className="w-3.5 h-3.5 mr-1" />}
                {statusLabel}
              </Badge>
              {event.program && (
                <Badge variant="outline" className="bg-white/10 text-white/90 border-white/30 backdrop-blur">
                  {event.program.lengthDays}-day · {event.program.difficulty}
                </Badge>
              )}
            </div>
            <h1
              className="text-4xl sm:text-6xl font-bold tracking-tight text-white drop-shadow-md"
              data-testid="text-event-hero-title"
            >
              {event.title}
            </h1>
            {event.tagline && <p className="text-white/85 text-lg sm:text-xl max-w-2xl">{event.tagline}</p>}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-white/85 text-sm pt-1">
              <span className="inline-flex items-center gap-1.5"><CalendarRange className="w-4 h-4" /> {formatRange(event.startsAt, event.endsAt)}</span>
              <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" /> {event.participantCount ?? 0} players joined</span>
              {event.status === "scheduled" && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span className="text-white/70">Starts in</span>
                  <span className="font-semibold" style={{ color: accent === "#f97316" ? "#fff" : accent }} data-testid="text-event-countdown">{timeRemaining(event.startsAt)}</span>
                </span>
              )}
              {event.status === "live" && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span className="text-white/70">Ends in</span>
                  <span className="font-semibold" style={{ color: accent === "#f97316" ? "#fff" : accent }} data-testid="text-event-countdown">{timeRemaining(event.endsAt)}</span>
                </span>
              )}
            </div>
            <div className="pt-5 flex items-center gap-3 flex-wrap">
              {!user ? (
                <Link href="/auth"><Button size="lg" className="font-semibold border-0" style={{ backgroundColor: accent, color: "white", boxShadow: "0 0 0 2px rgba(255,255,255,0.12), 0 0 0 5px rgba(255,255,255,0.05), 0 6px 20px rgba(0,0,0,0.25)" }} data-testid="button-event-signin">Sign in to join</Button></Link>
              ) : isJoined ? (
                <>
                  <Badge className="bg-green-500/25 text-green-200 border-green-500/40 text-sm py-1.5 px-3">
                    <Award className="w-4 h-4 mr-1" /> You're in
                  </Badge>
                  {event.program && (
                    <Link href={`/programs/${event.program.slug}/today`}>
                      <Button size="lg" className="font-semibold border-0" style={{ backgroundColor: accent, color: "white", boxShadow: "0 0 0 2px rgba(255,255,255,0.12), 0 0 0 5px rgba(255,255,255,0.05), 0 6px 20px rgba(0,0,0,0.25)" }} data-testid="button-event-go-today">
                        <Play className="w-5 h-5 mr-2" /> Go to today's workout
                      </Button>
                    </Link>
                  )}
                </>
              ) : isLive ? (
                <Button size="lg" className="font-semibold border-0" style={{ backgroundColor: accent, color: "white", boxShadow: "0 0 0 2px rgba(255,255,255,0.12), 0 0 0 5px rgba(255,255,255,0.05), 0 6px 20px rgba(0,0,0,0.25)" }} onClick={() => joinMut.mutate()}
                  disabled={joinMut.isPending} data-testid="button-event-join">
                  <Flame className="w-5 h-5 mr-2" /> {joinMut.isPending ? "Joining…" : "Join event"}
                </Button>
              ) : isFinished ? (
                <Badge variant="outline" className="bg-white/10 text-white border-white/30">Joining closed</Badge>
              ) : (
                <Badge variant="outline" className="bg-white/10 text-white border-white/30">
                  <Clock className="w-3.5 h-3.5 mr-1" /> Joining opens at start time
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl mt-6 px-4 sm:px-6 lg:px-8">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-event-overview"><ListChecks className="w-4 h-4 mr-1" /> Overview</TabsTrigger>
            <TabsTrigger value="leaderboard" data-testid="tab-event-leaderboard"><Trophy className="w-4 h-4 mr-1" /> Leaderboard</TabsTrigger>
            {event.finalChallengeItemId && (
              <TabsTrigger value="final" data-testid="tab-event-final"><Award className="w-4 h-4 mr-1" /> Final Challenge</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {event.description && (
              <Card><CardContent className="p-5" data-testid="text-event-description">
                <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: accent }} />
                  About this event
                </h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{event.description}</p>
              </CardContent></Card>
            )}

            {event.program && (
              <ProgramStatRibbon
                accent={accent}
                lengthDays={event.program.lengthDays}
                totalItems={items.length}
                estimatedMinutesPerDay={event.program.estimatedMinutesPerDay ?? null}
                difficulty={event.program.difficulty}
                enrollmentCount={event.participantCount ?? null}
              />
            )}

            {event.program && (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" style={{ color: accent }} />
                  Day-by-day plan
                </h2>
                <DayPlanGrid
                  items={items}
                  totalDays={event.program.lengthDays}
                  drillsById={drillsById}
                  accent={accent}
                  layout="rows"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="leaderboard">
            <LeaderboardPanel rows={leaderboard ?? []} isLoading={lbLoading} myUserId={user?.id ?? null} accent={accent} />
          </TabsContent>

          {event.finalChallengeItemId && (
            <TabsContent value="final">
              <FinalChallengePanel
                event={event}
                items={items}
                participant={participant}
                isJoined={isJoined}
                myCompletedCount={leaderboard?.find(r => r.userId === user?.id)?.completedItemCount ?? 0}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

function LeaderboardPanel({ rows, isLoading, myUserId, accent }: {
  rows: LeaderboardRow[]; isLoading: boolean; myUserId: string | null; accent: string;
}) {
  if (isLoading) return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
    </div>
  );
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center" data-testid="text-leaderboard-empty">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-semibold">No one's logged a workout yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Be the first on the board.</p>
        </CardContent>
      </Card>
    );
  }

  const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

  return (
    <div className="space-y-2" data-testid="leaderboard-list">
      {/* Legend */}
      <div className="grid grid-cols-3 text-[10px] uppercase tracking-widest text-muted-foreground px-3 pb-1">
        <span>Player · Day</span>
        <span className="text-center">Shooting %</span>
        <span className="text-right">Score</span>
      </div>

      {rows.map((row) => {
        const isMe = myUserId != null && row.userId === myUserId;
        const name = `${row.user.firstName ?? ""} ${row.user.lastName ?? ""}`.trim() || "Player";
        const medalColor = row.rank <= 3 ? medalColors[row.rank - 1] : undefined;

        return (
          <div
            key={row.userId}
            className={`flex items-center gap-3 rounded-xl p-3 border transition-all ${
              isMe
                ? "border-primary/40 bg-primary/5"
                : "border-border/60 bg-card/50"
            }`}
            style={isMe ? { boxShadow: `inset 3px 0 0 0 ${accent}` } : undefined}
            data-testid={`row-leaderboard-${row.rank}`}
          >
            {/* Rank */}
            <div className="w-8 shrink-0 text-center" data-testid={`text-rank-${row.rank}`}>
              {row.rank <= 3 ? (
                <Trophy className="w-5 h-5 mx-auto" style={{ color: medalColor }} />
              ) : (
                <span className="text-sm font-bold text-muted-foreground">{row.rank}</span>
              )}
            </div>

            {/* Avatar */}
            <Avatar className="w-9 h-9 shrink-0">
              {row.user.profileImageUrl && <AvatarImage src={row.user.profileImageUrl} />}
              <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>

            {/* Name + day */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" data-testid={`text-name-${row.rank}`}>
                {name}
                {isMe && <span className="text-xs text-muted-foreground font-normal"> (you)</span>}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{row.completedItemCount} completed</span>
                {row.currentDay != null && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Flame className="w-3 h-3" style={{ color: accent }} />
                      Day {row.currentDay}
                    </span>
                  </>
                )}
                {row.attemptsTaken != null && (
                  <>
                    <span>·</span>
                    <span>{row.attemptsTaken} attempt{row.attemptsTaken === 1 ? "" : "s"}</span>
                  </>
                )}
              </div>
            </div>

            {/* Shooting % */}
            <div className="w-14 text-center shrink-0">
              {row.shootingPct != null ? (
                <div>
                  <p className="text-sm font-bold" style={{ color: accent }}>{row.shootingPct}%</p>
                  <p className="text-[10px] text-muted-foreground">shoot</p>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>

            {/* Composite score */}
            <div className="w-14 text-right shrink-0" data-testid={`text-score-${row.rank}`}>
              <p
                className="text-lg font-black"
                style={{ color: row.rank === 1 ? accent : undefined }}
              >
                {row.compositeScore.toFixed(1)}
              </p>
              <p className="text-[10px] text-muted-foreground">score</p>
            </div>
          </div>
        );
      })}

      {/* Scoring key */}
      <div className="mt-4 rounded-xl border border-border/40 bg-muted/20 p-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">How scores are calculated</p>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="text-center">
            <p className="font-bold text-base">50%</p>
            <p className="text-muted-foreground">Completion</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-base">30%</p>
            <p className="text-muted-foreground">Fewer attempts</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-base">20%</p>
            <p className="text-muted-foreground">Shooting %</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinalChallengePanel({ event, items, participant, isJoined, myCompletedCount }: {
  event: EventDetailResponse["event"];
  items: ProgramItem[];
  participant: EventParticipant | null;
  isJoined: boolean;
  myCompletedCount: number;
}) {
  const accent = event.accentColor || "#f97316";
  const { toast } = useToast();
  const finalItem = items.find((it) => it.id === event.finalChallengeItemId) || null;
  const embedUrl = toYouTubeEmbed(finalItem?.watchUrl);
  const totalItems = items.length;
  const allDaysComplete = isJoined && totalItems > 0 && myCompletedCount >= totalItems;
  const isLive = event.status === "live";
  const isFinished = event.status === "finished";

  const [score, setScore] = useState<string>(participant?.finalScore ?? "");
  const [attempts, setAttempts] = useState<string>(
    participant?.attemptsTaken != null ? String(participant.attemptsTaken) : ""
  );
  const [notes, setNotes] = useState<string>(participant?.finalNotes ?? "");

  useEffect(() => {
    setScore(participant?.finalScore ?? "");
    setAttempts(participant?.attemptsTaken != null ? String(participant.attemptsTaken) : "");
    setNotes(participant?.finalNotes ?? "");
  }, [participant?.finalScore, participant?.finalNotes, participant?.attemptsTaken]);

  const submitMut = useMutation({
    mutationFn: async () => {
      const parsedAttempts = parseInt(attempts, 10);
      const res = await apiRequest("POST", `/api/events/${event.id}/submit-final`, {
        score: parseFloat(score),
        notes: notes.trim() || undefined,
        attemptsTaken: !isNaN(parsedAttempts) && parsedAttempts >= 1 ? parsedAttempts : undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Score submitted!", description: "Leaderboard is updating…" });
      track("event_final_submit", { eventId: event.id });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.slug}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${event.id}/leaderboard`] });
    },
    onError: (err: any) => {
      toast({ title: "Couldn't submit", description: err?.message || "Try again", variant: "destructive" });
    },
  });

  const scoreVal = parseFloat(score);
  const canSubmit = isLive && allDaysComplete && !!score && !isNaN(scoreVal) && scoreVal >= 0;

  if (!finalItem) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Award className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-semibold">No final challenge configured</p>
          <p className="text-sm mt-1">The event admin hasn't set a final challenge yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5" data-testid="final-challenge-panel">
      {/* ── Challenge showcase card ── */}
      <div
        className="rounded-2xl overflow-hidden border border-border/60"
        style={{ boxShadow: `0 0 0 1px ${accent}33, 0 8px 32px -12px ${accent}55` }}
      >
        {/* Header stripe */}
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ background: `linear-gradient(90deg, ${accent}44 0%, ${accent}11 100%)` }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: accent }}
          >
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Final Challenge · Day {finalItem.dayNumber}</p>
            <h2 className="text-lg font-bold leading-tight" data-testid="text-final-item-title">
              {finalItem.title}
            </h2>
          </div>
          <Badge
            className="ml-auto"
            style={{ background: `${accent}33`, color: accent, borderColor: `${accent}55` }}
            variant="outline"
          >
            {isLive ? "Open" : isFinished ? "Closed" : "Not yet open"}
          </Badge>
        </div>

        {/* YouTube embed */}
        {embedUrl && (
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }} data-testid="youtube-embed">
            <iframe
              src={embedUrl}
              title={finalItem.title}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {/* Description */}
        {(finalItem.notes || finalItem.challengeSpec?.description) && (
          <div className="px-6 py-4 border-t border-border/40">
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {finalItem.challengeSpec?.description || finalItem.notes}
            </p>
          </div>
        )}

        {/* Challenge spec pills */}
        {finalItem.challengeSpec && (
          <div className="px-6 pb-4 flex flex-wrap gap-2">
            {finalItem.challengeSpec.scoringMetric && (
              <Badge variant="outline" className="text-xs">
                Metric: {finalItem.challengeSpec.scoringMetric}
              </Badge>
            )}
            {finalItem.challengeSpec.target != null && (
              <Badge variant="outline" className="text-xs">
                Target: {finalItem.challengeSpec.target}
              </Badge>
            )}
            {finalItem.challengeSpec.timeLimitSec != null && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {Math.floor(finalItem.challengeSpec.timeLimitSec / 60)}:{String(finalItem.challengeSpec.timeLimitSec % 60).padStart(2, "0")} limit
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* ── State: not joined — preview gate ── */}
      {!isJoined && (
        <Card className="border-border/60">
          <CardContent className="py-10 flex flex-col items-center text-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: `${accent}22` }}
            >
              <Lock className="w-6 h-6" style={{ color: accent }} />
            </div>
            <p className="font-semibold text-base">Join to participate</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Join this event and complete all {totalItems} workout items to unlock the final challenge submission.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── State: joined but not all days complete ── */}
      {isJoined && !allDaysComplete && !isFinished && (
        <Card className="border-border/60">
          <CardContent className="py-8 flex flex-col items-center text-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: `${accent}22` }}
            >
              <Lock className="w-6 h-6" style={{ color: accent }} />
            </div>
            <div>
              <p className="font-semibold text-base mb-1">Complete all workouts to unlock</p>
              <p className="text-sm text-muted-foreground">
                {myCompletedCount} of {totalItems} items complete
              </p>
            </div>
            {/* progress bar */}
            <div className="w-full max-w-xs rounded-full bg-muted h-2 overflow-hidden">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${totalItems > 0 ? (myCompletedCount / totalItems) * 100 : 0}%`, background: accent }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {totalItems - myCompletedCount} item{totalItems - myCompletedCount === 1 ? "" : "s"} remaining
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── State: all done (or event finished) — submission form ── */}
      {(allDaysComplete || isFinished) && (
        <>
          {/* Prior submission banner */}
          {participant?.finalSubmittedAt && (
            <div
              className="flex items-center gap-3 rounded-xl px-4 py-3 border"
              style={{ background: `${accent}11`, borderColor: `${accent}33` }}
              data-testid="text-final-submitted-at"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: accent }} />
              <div className="text-sm">
                <span className="font-semibold">Last submission: </span>
                {parseFloat(participant.finalScore || "0").toLocaleString()} score
                {participant.attemptsTaken != null && ` · ${participant.attemptsTaken} attempt${participant.attemptsTaken === 1 ? "" : "s"}`}
                <span className="text-muted-foreground ml-2">
                  {new Date(participant.finalSubmittedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          )}

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-4 h-4" style={{ color: accent }} />
                {participant?.finalSubmittedAt ? "Update your result" : "Submit your result"}
              </CardTitle>
              {!isLive && isFinished && (
                <p className="text-xs text-muted-foreground">This event has ended — submissions are closed.</p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="final-score" className="flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" style={{ color: accent }} />
                    Your score
                  </Label>
                  <Input
                    id="final-score"
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min="0"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    disabled={!isLive}
                    placeholder="e.g. 47"
                    data-testid="input-final-score"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="final-attempts" className="flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5" style={{ color: accent }} />
                    Attempts to complete
                  </Label>
                  <Input
                    id="final-attempts"
                    type="number"
                    inputMode="numeric"
                    step="1"
                    min="1"
                    value={attempts}
                    onChange={(e) => setAttempts(e.target.value)}
                    disabled={!isLive}
                    placeholder="How many tries?"
                    data-testid="input-final-attempts"
                  />
                  <p className="text-[11px] text-muted-foreground">Fewer attempts = higher leaderboard rank (30% weight)</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="final-notes">Notes (optional)</Label>
                <Textarea
                  id="final-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!isLive}
                  placeholder="How it went, conditions, any context…"
                  data-testid="input-final-notes"
                />
              </div>
              <Button
                onClick={() => submitMut.mutate()}
                disabled={!canSubmit || submitMut.isPending}
                className="w-full sm:w-auto border-0"
                style={canSubmit ? { background: accent, color: "white", boxShadow: "0 0 0 2px rgba(255,255,255,0.12), 0 0 0 5px rgba(255,255,255,0.05), 0 6px 20px rgba(0,0,0,0.25)" } : undefined}
                data-testid="button-submit-final"
              >
                {submitMut.isPending
                  ? "Submitting…"
                  : participant?.finalSubmittedAt
                    ? "Update score"
                    : "Submit final score"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
