import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Dumbbell,
  Flame,
  Gamepad2,
  Goal,
  Plus,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";

type SeasonOverview = {
  id: string;
  name: string;
  teamName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  teamGoal?: string | null;
};

type SeasonEvent = {
  id: string;
  seasonId: string;
  seasonName?: string;
  teamName?: string | null;
  gameDate: string;
  tipoffTime?: string | null;
  eventType?: string | null;
  opponent?: string | null;
  isHome?: boolean | null;
};

type MySeasonOverview = {
  mode: "game-day" | "in-season" | "off-season";
  today: string;
  activeTeams: SeasonOverview[];
  todayEvents: SeasonEvent[];
  nextEvent: SeasonEvent | null;
  upcomingEvents: SeasonEvent[];
  goal: {
    id: string;
    projectTitle?: string | null;
    goalText?: string | null;
    nextAction?: string | null;
    status?: string | null;
  } | null;
  nextAction: { label: string; href: string };
};

const modeCopy = {
  "game-day": {
    eyebrow: "It’s game day",
    title: "Everything is ready. Now go execute.",
    description: "Your preparation is here. Lock in, trust your work, and take the game one possession at a time.",
    icon: Gamepad2,
    className: "from-orange-500/25 via-orange-500/10 to-background",
    accent: "text-orange-300",
  },
  "in-season": {
    eyebrow: "In season",
    title: "Stay sharp for what’s next.",
    description: "Keep your body ready, your role clear, and your preparation connected to the next game.",
    icon: Trophy,
    className: "from-blue-500/20 via-blue-500/5 to-background",
    accent: "text-blue-300",
  },
  "off-season": {
    eyebrow: "Off season",
    title: "Build the player your next season needs.",
    description: "Turn your bigger goal into focused work you can execute today.",
    icon: Dumbbell,
    className: "from-emerald-500/20 via-emerald-500/5 to-background",
    accent: "text-emerald-300",
  },
} as const;

function dateLabel(value: string | null | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "Date to be added";
  return new Date(value).toLocaleDateString(undefined, options || { month: "short", day: "numeric", year: "numeric" });
}

function eventLabel(event: SeasonEvent) {
  const type = event.eventType && event.eventType !== "game" ? event.eventType : "Game";
  return event.opponent ? `${type} vs ${event.opponent}` : type;
}

export default function MySeasonPage() {
  const { toast } = useToast();
  const [showEventForm, setShowEventForm] = useState(false);
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [seasonForm, setSeasonForm] = useState({
    teamName: "",
    seasonType: "high-school",
    startDate: "",
    endDate: "",
    teamGoal: "",
  });
  const [eventForm, setEventForm] = useState({
    seasonId: "",
    gameDate: new Date().toISOString().split("T")[0],
    tipoffTime: "",
    opponent: "",
    eventType: "game",
  });

  const { data: overview, isLoading } = useQuery<MySeasonOverview>({
    queryKey: ["/api/my-season"],
  });
  const { data: seasons = [] } = useQuery<any[]>({
    queryKey: ["/api/seasons"],
  });

  const createEventMutation = useMutation({
    mutationFn: async () => {
      if (!eventForm.seasonId) throw new Error("Choose a team first");
      return apiRequest("POST", `/api/seasons/${eventForm.seasonId}/games`, {
        gameDate: eventForm.gameDate,
        tipoffTime: eventForm.tipoffTime || null,
        opponent: eventForm.opponent || null,
        eventType: eventForm.eventType,
        isHome: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-season"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
      setShowEventForm(false);
      setEventForm((current) => ({ ...current, opponent: "", tipoffTime: "" }));
      toast({ title: "Event added", description: "PLAYR1 will use it to prepare your Game Day." });
    },
    onError: (error: Error) => toast({ title: "Could not add event", description: error.message, variant: "destructive" }),
  });

  const createSeasonMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/seasons", {
        name: `${seasonForm.teamName || "My team"} season`,
        teamName: seasonForm.teamName || null,
        seasonType: seasonForm.seasonType,
        year: new Date(seasonForm.startDate || Date.now()).getFullYear().toString(),
        startDate: seasonForm.startDate || null,
        endDate: seasonForm.endDate || null,
        teamGoal: seasonForm.teamGoal || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-season"] });
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
      setShowSeasonForm(false);
      setSeasonForm({ teamName: "", seasonType: "high-school", startDate: "", endDate: "", teamGoal: "" });
      toast({ title: "Season set up", description: "PLAYR1 can now keep your mode up to date." });
    },
    onError: (error: Error) => toast({ title: "Could not set up season", description: error.message, variant: "destructive" }),
  });

  const mode = overview?.mode || "off-season";
  const copy = modeCopy[mode];
  const ModeIcon = copy.icon;
  const seasonOptions = useMemo(() => seasons.filter((season) => season.isActive !== false), [seasons]);

  if (isLoading) {
    return <div className="mx-auto max-w-4xl space-y-5 px-4 py-8"><div className="h-64 animate-pulse rounded-3xl bg-muted/40" /><div className="h-32 animate-pulse rounded-2xl bg-muted/30" /></div>;
  }

  return (
    <div className="min-h-screen pb-12">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">My Season</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Your next move starts here.</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="hidden gap-1.5 sm:flex" onClick={() => setShowSeasonForm(true)}>
              <Plus className="h-4 w-4" />
              Add team season
            </Button>
            <Link href="/career" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Manage profile
            </Link>
          </div>
        </div>

        <section className={`relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br ${copy.className}`} data-testid="card-current-season-mode">
          <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative space-y-6 p-6 sm:p-9">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className={`gap-2 border-current/30 ${copy.accent}`}>
                <ModeIcon className="h-4 w-4" />
                {copy.eyebrow}
              </Badge>
              {overview?.activeTeams?.length ? (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {overview.activeTeams.length} active team{overview.activeTeams.length === 1 ? "" : "s"}
                </span>
              ) : null}
            </div>
            <div className="max-w-2xl">
              <h2 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">{copy.title}</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">{copy.description}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={overview?.nextAction.href || "/my-goal"}>
                <Button className="gap-2" data-testid="button-my-season-next-action">
                  {overview?.nextAction.label || "Choose your next action"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              {mode === "game-day" && (
                <Link href="/game-day">
                  <Button variant="outline" className="gap-2 border-border/70 bg-background/30">
                    <Sparkles className="h-4 w-4" />
                    Open Game Day
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <Card data-testid="card-my-season-goal">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Goal className="h-4 w-4 text-primary" />
                The goal you’re chasing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overview?.goal ? (
                <div>
                  <p className="text-xl font-semibold">{overview.goal.projectTitle || "My PLAYR1 Project"}</p>
                  {overview.goal.goalText && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{overview.goal.goalText}</p>}
                  {overview.goal.nextAction && (
                    <p className="mt-4 flex items-start gap-2 text-sm text-foreground/80">
                      <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {overview.goal.nextAction}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-semibold">No active Project yet</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Start with a useful off-season plan today, then build the bigger goal PLAYR1 can help you chase.</p>
                  <Link href="/my-goal">
                    <Button variant="outline" size="sm" className="mt-4">Build my Project <ArrowRight className="ml-2 h-4 w-4" /></Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-my-season-teams">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" />
                Current teams
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {overview?.activeTeams?.length ? overview.activeTeams.map((team) => (
                <div key={team.id} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="font-medium">{team.teamName || team.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{dateLabel(team.startDate)} – {dateLabel(team.endDate)}</p>
                  {team.teamGoal && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{team.teamGoal}</p>}
                </div>
              )) : (
                <div>
                  <p className="text-sm leading-relaxed text-muted-foreground">No active team season. PLAYR1 is keeping you in Off Season mode.</p>
                  <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => setShowSeasonForm(true)}>
                    <Plus className="h-4 w-4" />
                    Set up a team season
                  </Button>
                </div>
              )}
              <Link href="/career" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                Update teams and seasons <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
        </div>

        {overview?.todayEvents?.length ? (
          <Card className="border-orange-500/30 bg-orange-500/[0.06]" data-testid="card-today-events">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="h-4 w-4 text-orange-400" />
                Today’s Game Day
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {overview.todayEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-3 rounded-xl border border-orange-500/20 bg-background/30 p-3">
                  <div>
                    <p className="font-medium">{eventLabel(event)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{event.teamName || event.seasonName || "Your team"}{event.tipoffTime ? ` · ${event.tipoffTime}` : ""}</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-orange-400" />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card data-testid="card-upcoming-events">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              Next up
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-1.5" disabled={seasonOptions.length === 0} onClick={() => {
              setEventForm((current) => ({ ...current, seasonId: current.seasonId || seasonOptions[0]?.id || "" }));
              setShowEventForm(true);
            }}>
              <Plus className="h-4 w-4" />
              Add event
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {overview?.upcomingEvents?.length ? overview.upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center gap-4 rounded-xl border border-border/60 p-3">
                <div className="min-w-14 text-center">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{dateLabel(event.gameDate, { weekday: "short" })}</p>
                  <p className="text-lg font-bold">{dateLabel(event.gameDate, { month: "short", day: "numeric" }).split(" ")[1]}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{eventLabel(event)}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{event.teamName || event.seasonName || "Team"}{event.tipoffTime ? ` · ${event.tipoffTime}` : ""}</p>
                </div>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed border-border/70 p-6 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 font-medium">No upcoming events yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Add your next game, showcase, scrimmage, or any event you want to prepare for.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {showEventForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
            <Card className="w-full max-w-md">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>Add an upcoming event</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">A few quick details help PLAYR1 prepare you.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowEventForm(false)} aria-label="Close"><X className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Team or season</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={eventForm.seasonId} onChange={(event) => setEventForm((current) => ({ ...current, seasonId: event.target.value }))}>
                    <option value="">Choose a team season</option>
                    {seasonOptions.map((season) => <option key={season.id} value={season.id}>{season.teamName || season.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label htmlFor="event-date">Date</Label><Input id="event-date" type="date" value={eventForm.gameDate} onChange={(event) => setEventForm((current) => ({ ...current, gameDate: event.target.value }))} /></div>
                  <div className="space-y-2"><Label htmlFor="event-time">Tipoff / start</Label><Input id="event-time" type="time" value={eventForm.tipoffTime} onChange={(event) => setEventForm((current) => ({ ...current, tipoffTime: event.target.value }))} /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="event-opponent">Opponent or event name</Label><Input id="event-opponent" placeholder="e.g. Eagles, showcase, scrimmage" value={eventForm.opponent} onChange={(event) => setEventForm((current) => ({ ...current, opponent: event.target.value }))} /></div>
                <div className="space-y-2"><Label htmlFor="event-type">Event type</Label><select id="event-type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={eventForm.eventType} onChange={(event) => setEventForm((current) => ({ ...current, eventType: event.target.value }))}><option value="game">Game</option><option value="tournament">Tournament</option><option value="showcase">Showcase</option><option value="scrimmage">Scrimmage</option><option value="tryout">Tryout</option><option value="other">Other</option></select></div>
                <Button className="w-full" disabled={createEventMutation.isPending || !eventForm.seasonId || !eventForm.gameDate} onClick={() => createEventMutation.mutate()}>
                  {createEventMutation.isPending ? "Adding…" : "Add to My Season"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {showSeasonForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
            <Card className="w-full max-w-md">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle>Set up your team season</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">A few answers are enough for PLAYR1 to know when to switch modes.</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowSeasonForm(false)} aria-label="Close"><X className="h-4 w-4" /></Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label htmlFor="season-team-name">Team name</Label><Input id="season-team-name" placeholder="e.g. Eagles Varsity" value={seasonForm.teamName} onChange={(event) => setSeasonForm((current) => ({ ...current, teamName: event.target.value }))} /></div>
                <div className="space-y-2"><Label htmlFor="season-type">What kind of season is this?</Label><select id="season-type" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={seasonForm.seasonType} onChange={(event) => setSeasonForm((current) => ({ ...current, seasonType: event.target.value }))}><option value="middle-school">Middle school</option><option value="high-school">High school</option><option value="aau-travel-club">AAU / travel / club</option><option value="recreational">Recreational</option></select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label htmlFor="setup-season-start">Season starts</Label><Input id="setup-season-start" type="date" value={seasonForm.startDate} onChange={(event) => setSeasonForm((current) => ({ ...current, startDate: event.target.value }))} /></div>
                  <div className="space-y-2"><Label htmlFor="setup-season-end">Season ends</Label><Input id="setup-season-end" type="date" value={seasonForm.endDate} onChange={(event) => setSeasonForm((current) => ({ ...current, endDate: event.target.value }))} /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="setup-season-goal">What are you chasing with this team?</Label><Textarea id="setup-season-goal" placeholder="e.g. Win a championship, earn a starting role, or become more confident under pressure" value={seasonForm.teamGoal} onChange={(event) => setSeasonForm((current) => ({ ...current, teamGoal: event.target.value }))} /></div>
                <Button className="w-full" disabled={createSeasonMutation.isPending || !seasonForm.startDate || !seasonForm.endDate} onClick={() => createSeasonMutation.mutate()}>
                  {createSeasonMutation.isPending ? "Saving…" : "Save my season"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}