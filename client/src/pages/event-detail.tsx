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
import { ArrowLeft, CalendarRange, Trophy, Users, Play, Award, ListChecks, Flame, Sparkles, Clock } from "lucide-react";
import type { Event, Program, ProgramItem, EventParticipant, EventStatus } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { track } from "@/lib/track";

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
  rank: number;
};

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
    return <div className="container max-w-4xl py-6 space-y-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-48" /></div>;
  }
  if (!event) {
    return (
      <div className="container max-w-3xl py-12 text-center">
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

  // Group items by day for the outline
  const byDay = items.reduce<Record<number, ProgramItem[]>>((acc, it) => {
    (acc[it.dayNumber] ||= []).push(it);
    return acc;
  }, {});
  const days = Object.keys(byDay).map(Number).sort((a, b) => a - b);

  return (
    <div className="pb-12" data-testid="page-event-detail">
      {/* ─── Cinematic Hero ─── */}
      <div className="relative overflow-hidden border-b border-border/40">
        <div
          className="absolute inset-0"
          style={{
            background: event.coverImageUrl
              ? `linear-gradient(115deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.2) 100%), url(${event.coverImageUrl}) center/cover no-repeat`
              : `linear-gradient(135deg, ${accent}cc 0%, ${accent}55 40%, hsl(var(--background)) 100%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-50"
          style={{
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
        <div className="relative container max-w-5xl py-10 sm:py-16">
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
                <Link href="/auth"><Button size="lg" className="shadow-xl font-semibold" style={{ backgroundColor: accent, color: "white" }} data-testid="button-event-signin">Sign in to join</Button></Link>
              ) : isJoined ? (
                <>
                  <Badge className="bg-green-500/25 text-green-200 border-green-500/40 text-sm py-1.5 px-3">
                    <Award className="w-4 h-4 mr-1" /> You're in
                  </Badge>
                  {event.program && (
                    <Link href={`/programs/${event.program.slug}/today`}>
                      <Button size="lg" className="shadow-xl font-semibold" style={{ backgroundColor: accent, color: "white" }} data-testid="button-event-go-today">
                        <Play className="w-5 h-5 mr-2" /> Go to today's workout
                      </Button>
                    </Link>
                  )}
                </>
              ) : isLive ? (
                <Button size="lg" className="shadow-xl font-semibold" style={{ backgroundColor: accent, color: "white" }} onClick={() => joinMut.mutate()}
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

      <div className="container max-w-5xl mt-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-event-overview"><ListChecks className="w-4 h-4 mr-1" /> Overview</TabsTrigger>
            <TabsTrigger value="leaderboard" data-testid="tab-event-leaderboard"><Trophy className="w-4 h-4 mr-1" /> Leaderboard</TabsTrigger>
            {(isJoined || isFinished) && (
              <TabsTrigger value="final" data-testid="tab-event-final"><Award className="w-4 h-4 mr-1" /> Final Challenge</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {event.description && (
              <Card><CardContent className="p-5 prose prose-invert max-w-none" data-testid="text-event-description">
                <p className="whitespace-pre-line text-sm">{event.description}</p>
              </CardContent></Card>
            )}
            {event.program && (
              <Card className="overflow-hidden border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkle accent={accent} /> {event.program.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {event.program.lengthDays}-day program · {event.program.difficulty}
                    {event.program.estimatedMinutesPerDay ? ` · ~${event.program.estimatedMinutesPerDay} min/day` : ""}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {days.map((d) => (
                      <div
                        key={d}
                        className="rounded-lg border border-border/60 overflow-hidden bg-card-overlay/30"
                        data-testid={`block-day-${d}`}
                      >
                        <div className="flex items-stretch">
                          <div className="w-1 shrink-0" style={{ background: accent }} />
                          <div className="flex-1 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-bold">Day {d}</p>
                              <Badge variant="secondary" className="text-[10px]">{byDay[d].length} item{byDay[d].length === 1 ? "" : "s"}</Badge>
                            </div>
                            <ul className="space-y-1.5">
                              {byDay[d].map((it) => (
                                <li key={it.id} className="flex items-center justify-between gap-2 text-sm">
                                  <span className="truncate text-foreground/90">{it.title}</span>
                                  <Badge variant="outline" className="text-[10px] capitalize shrink-0">{it.itemType}</Badge>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="leaderboard">
            <LeaderboardPanel rows={leaderboard ?? []} isLoading={lbLoading} myUserId={user?.id ?? null} accent={accent} metric={event.leaderboardMetric as any} />
          </TabsContent>

          {(isJoined || isFinished) && (
            <TabsContent value="final">
              <FinalChallengePanel event={event} items={items} participant={participant} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}

function Sparkle({ accent }: { accent: string }) {
  return <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />;
}

function LeaderboardPanel({ rows, isLoading, myUserId, accent, metric }: {
  rows: LeaderboardRow[]; isLoading: boolean; myUserId: string | null; accent: string;
  metric: "completions" | "finalScore" | "composite";
}) {
  if (isLoading) return <div className="space-y-2">{[0,1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>;
  if (rows.length === 0) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground" data-testid="text-leaderboard-empty">
      No one's logged a workout yet. Be the first.
    </CardContent></Card>;
  }
  const showFinal = metric !== "completions";
  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {rows.map((row) => {
            const isMe = myUserId && row.userId === myUserId;
            const name = `${row.user.firstName ?? ""} ${row.user.lastName ?? ""}`.trim() || "Player";
            return (
              <div key={row.userId}
                className={`flex items-center gap-3 p-3 ${isMe ? "bg-primary/5" : ""}`}
                style={isMe ? { boxShadow: `inset 4px 0 0 0 ${accent}` } : undefined}
                data-testid={`row-leaderboard-${row.rank}`}>
                <div className="w-7 text-center font-bold text-sm" data-testid={`text-rank-${row.rank}`}>
                  {row.rank === 1 ? <Trophy className="w-5 h-5 mx-auto" style={{ color: accent }} /> : row.rank}
                </div>
                <Avatar className="w-9 h-9">
                  {row.user.profileImageUrl && <AvatarImage src={row.user.profileImageUrl} />}
                  <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" data-testid={`text-name-${row.rank}`}>{name}{isMe && <span className="text-xs text-muted-foreground"> (you)</span>}</p>
                  <p className="text-xs text-muted-foreground">{row.completedItemCount} items completed</p>
                </div>
                {showFinal && row.finalScore != null && (
                  <Badge variant="outline" className="font-mono" data-testid={`badge-final-${row.rank}`}>
                    Final {parseFloat(row.finalScore).toLocaleString()}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function FinalChallengePanel({ event, items, participant }: {
  event: EventDetailResponse["event"];
  items: ProgramItem[];
  participant: EventParticipant | null;
}) {
  const { toast } = useToast();
  const finalItem = items.find((it) => it.id === event.finalChallengeItemId) || null;
  const [score, setScore] = useState<string>(participant?.finalScore ?? "");
  const [notes, setNotes] = useState<string>(participant?.finalNotes ?? "");

  useEffect(() => {
    setScore(participant?.finalScore ?? "");
    setNotes(participant?.finalNotes ?? "");
  }, [participant?.finalScore, participant?.finalNotes]);

  const submitMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/events/${event.id}/submit-final`, {
        score: parseFloat(score),
        notes: notes.trim() || undefined,
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

  const isLive = event.status === "live";
  const canSubmit = isLive && !!score && !isNaN(parseFloat(score)) && parseFloat(score) >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" /> Final Challenge
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {finalItem ? (
          <div className="rounded-md border p-3 bg-muted/30">
            <p className="text-sm font-medium" data-testid="text-final-item-title">Day {finalItem.dayNumber}: {finalItem.title}</p>
            {finalItem.notes && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{finalItem.notes}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No final-challenge item set. Use the leaderboard for completions ranking.</p>
        )}
        {participant?.finalSubmittedAt && (
          <div className="text-xs text-muted-foreground" data-testid="text-final-submitted-at">
            You submitted {parseFloat(participant.finalScore || "0").toLocaleString()} on {new Date(participant.finalSubmittedAt).toLocaleString()}.
          </div>
        )}
        {finalItem && (
          <>
            <div>
              <Label htmlFor="final-score">Your score</Label>
              <Input id="final-score" type="number" inputMode="decimal" step="any" min="0"
                value={score} onChange={(e) => setScore(e.target.value)}
                disabled={!isLive}
                placeholder="e.g. 47" data-testid="input-final-score" />
            </div>
            <div>
              <Label htmlFor="final-notes">Notes (optional)</Label>
              <Textarea id="final-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                disabled={!isLive} placeholder="How it went, conditions, etc." data-testid="input-final-notes" />
            </div>
            <Button onClick={() => submitMut.mutate()} disabled={!canSubmit || submitMut.isPending}
              data-testid="button-submit-final">
              {submitMut.isPending ? "Submitting…" : participant?.finalSubmittedAt ? "Update score" : "Submit final score"}
            </Button>
            {!isLive && <p className="text-xs text-muted-foreground">Submissions are open only while the event is live.</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
