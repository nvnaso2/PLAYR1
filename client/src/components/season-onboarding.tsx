import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Dumbbell,
  Plus,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SetupComplete = (competitive: boolean) => void;

type SeasonOnboardingProps = {
  onComplete: SetupComplete;
};

const seasonTypes = [
  { value: "intramural", label: "Intramural league" },
  { value: "school", label: "School team" },
  { value: "travel-club", label: "Travel / club team" },
  { value: "recreational", label: "Rec team" },
  { value: "training", label: "Training to make a team" },
];

const eventTypes = [
  { value: "game", label: "Game" },
  { value: "tournament", label: "Tournament" },
  { value: "showcase", label: "Showcase" },
  { value: "scrimmage", label: "Scrimmage" },
  { value: "tryout", label: "Tryout" },
  { value: "other", label: "Other" },
];

function fieldClassName() {
  return "border-zinc-700 bg-zinc-950 text-white placeholder:text-zinc-600 focus-visible:ring-orange-400";
}

export function SeasonOnboarding({ onComplete }: SeasonOnboardingProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"interest" | "team" | "events" | "team-complete" | "fun">("interest");
  const [seasonId, setSeasonId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [seasonType, setSeasonType] = useState("school");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [teamGoal, setTeamGoal] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [tipoffTime, setTipoffTime] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("game");
  const [eventCount, setEventCount] = useState(0);

  const saveCompetitiveMutation = useMutation({
    mutationFn: async (competitive: boolean) =>
      apiRequest("PUT", "/api/career/competitive-basketball", { competitiveBasketball: competitive }),
    onSuccess: (_response, competitive) => {
      queryClient.invalidateQueries({ queryKey: ["/api/career"] });
      if (competitive) {
        setStep("team");
      } else {
        setStep("fun");
      }
    },
    onError: (error: Error) => toast({
      title: "Could not save your answer",
      description: error.message,
      variant: "destructive",
    }),
  });

  const createSeasonMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/seasons", {
        name: `${teamName || "My team"} season`,
        teamName: teamName || null,
        seasonType,
        year: new Date(startDate).getFullYear().toString(),
        startDate,
        endDate,
        teamGoal: teamGoal || null,
      });
      return response.json();
    },
    onSuccess: (season) => {
      setSeasonId(season.id);
      setStep("events");
      queryClient.invalidateQueries({ queryKey: ["/api/seasons"] });
    },
    onError: (error: Error) => toast({
      title: "Could not save this team",
      description: error.message,
      variant: "destructive",
    }),
  });

  const createEventMutation = useMutation({
    mutationFn: async () => {
      if (!seasonId) throw new Error("Save a team before adding events");
      return apiRequest("POST", `/api/seasons/${seasonId}/games`, {
        gameDate: eventDate,
        tipoffTime: tipoffTime || null,
        opponent: eventName || null,
        eventType,
        isHome: true,
      });
    },
    onSuccess: () => {
      setEventCount((count) => count + 1);
      setEventDate("");
      setTipoffTime("");
      setEventName("");
      toast({ title: "Event added", description: "PLAYR1 will use it to prepare your Game Day." });
    },
    onError: (error: Error) => toast({
      title: "Could not add this event",
      description: error.message,
      variant: "destructive",
    }),
  });

  const resetTeam = () => {
    setSeasonId(null);
    setTeamName("");
    setSeasonType("school");
    setStartDate("");
    setEndDate("");
    setTeamGoal("");
    setEventDate("");
    setTipoffTime("");
    setEventName("");
    setEventCount(0);
    setStep("team");
  };

  const stepLabel = step === "interest" || step === "fun" ? "1 of 3" : step === "team" ? "2 of 3" : "3 of 3";

  if (step === "fun") {
    return (
      <div className="min-h-full bg-background px-4 pb-8 pt-6 sm:px-5">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">
            <Dumbbell className="h-4 w-4 text-orange-400" />
            My Season setup
          </div>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-7" data-testid="card-season-fun-only">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 text-orange-400">
              <Check className="h-6 w-6" />
            </div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">You’re all set</p>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Play your way.</h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-400">
              My Season is for players preparing around teams, leagues, and competitive events. Since you play for fun, you can skip it and keep using PLAYR1 to train on your terms.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link href="/log">
                <Button className="w-full bg-orange-500 font-black text-black hover:bg-orange-400 sm:w-auto">Back to Train <ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
              <Button variant="outline" className="border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-800 hover:text-white" onClick={() => setStep("interest")}>
                Change my answer
              </Button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (step === "team-complete") {
    return (
      <div className="min-h-full bg-background px-4 pb-8 pt-6 sm:px-5">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">MY SEASON SETUP · TEAMS</p>
            <span className="text-xs text-zinc-600">{eventCount} event{eventCount === 1 ? "" : "s"} added</span>
          </div>
          <section className="rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/15 via-zinc-900 to-zinc-950 p-5 sm:p-7" data-testid="card-season-team-complete">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/15 text-orange-400">
              <Check className="h-6 w-6" />
            </div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">Team saved</p>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">{teamName || "Your team"} is ready.</h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">Add another team if you play for more than one, or finish setup and let PLAYR1 keep your season context up to date.</p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Button className="bg-orange-500 font-black text-black hover:bg-orange-400" onClick={() => resetTeam()}>
                <Plus className="mr-2 h-4 w-4" /> Add another team
              </Button>
              <Button variant="outline" className="border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-800 hover:text-white" onClick={() => onComplete(true)}>
                Finish setup <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background px-4 pb-8 pt-6 sm:px-5">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">
            <Dumbbell className="h-4 w-4 text-orange-400" />
            My Season setup
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">Step {stepLabel}</span>
        </div>

        {step === "interest" && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-7" data-testid="card-season-competitive-question">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 text-orange-400">
              <Trophy className="h-6 w-6" />
            </div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">Before we set this up</p>
            <h1 className="mt-2 text-2xl font-black leading-tight text-white sm:text-4xl">Do you play basketball competitively?</h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400">
              This includes an intramural league, school team, travel or club team, rec team, or training to make one.
            </p>
            <div className="mt-7 space-y-2">
              <button type="button" className="group flex w-full items-center gap-3 rounded-xl border border-orange-500/40 bg-orange-500/10 p-4 text-left transition hover:border-orange-400 hover:bg-orange-500/15" onClick={() => saveCompetitiveMutation.mutate(true)} disabled={saveCompetitiveMutation.isPending} data-testid="button-season-competitive-yes">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-black"><Trophy className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block font-black text-white">Yes, I play or prepare to play competitively</span><span className="mt-1 block text-xs text-zinc-400">Set up teams, seasons, events, and goals.</span></span>
                <ChevronRight className="h-5 w-5 text-orange-400 transition group-hover:translate-x-1" />
              </button>
              <button type="button" className="group flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 text-left transition hover:border-zinc-600 hover:bg-zinc-900" onClick={() => saveCompetitiveMutation.mutate(false)} disabled={saveCompetitiveMutation.isPending} data-testid="button-season-competitive-no">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400"><Dumbbell className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1"><span className="block font-black text-white">No, I play for fun</span><span className="mt-1 block text-xs text-zinc-500">Skip My Season and keep training your way.</span></span>
                <ChevronRight className="h-5 w-5 text-zinc-600 transition group-hover:translate-x-1" />
              </button>
            </div>
          </section>
        )}

        {step === "team" && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-7" data-testid="card-season-team-question">
            <button type="button" className="mb-5 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-zinc-500 hover:text-white" onClick={() => setStep("interest")}><ArrowLeft className="h-3.5 w-3.5" /> Back</button>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">Add your first team</p>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">What are you preparing for?</h1>
            <p className="mt-3 text-sm text-zinc-400">We’ll use these dates to keep your In Season and Off Season modes accurate.</p>
            <div className="mt-6 space-y-4">
              <div className="space-y-2"><Label className="text-zinc-300">Team name</Label><Input className={fieldClassName()} placeholder="e.g. Eagles Varsity" value={teamName} onChange={(event) => setTeamName(event.target.value)} data-testid="input-season-onboarding-team" /></div>
              <div className="space-y-2"><Label className="text-zinc-300">Team type</Label><select className={`flex h-10 w-full rounded-md border px-3 text-sm ${fieldClassName()}`} value={seasonType} onChange={(event) => setSeasonType(event.target.value)} data-testid="select-season-onboarding-type">{seasonTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label className="text-zinc-300">Season starts</Label><Input className={fieldClassName()} type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} data-testid="input-season-onboarding-start" /></div>
                <div className="space-y-2"><Label className="text-zinc-300">Season ends</Label><Input className={fieldClassName()} type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} data-testid="input-season-onboarding-end" /></div>
              </div>
              <div className="space-y-2"><Label className="text-zinc-300">What does success look like?</Label><Textarea className={fieldClassName()} placeholder="e.g. Earn a starting role, win the league, or become more confident in games" value={teamGoal} onChange={(event) => setTeamGoal(event.target.value)} data-testid="input-season-onboarding-goal" /></div>
              <Button className="w-full bg-orange-500 font-black text-black hover:bg-orange-400" disabled={createSeasonMutation.isPending || !teamName || !startDate || !endDate} onClick={() => createSeasonMutation.mutate()} data-testid="button-season-onboarding-save-team">
                {createSeasonMutation.isPending ? "Saving team…" : "Continue to game days"} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </section>
        )}

        {step === "events" && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 sm:p-7" data-testid="card-season-event-question">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-400">Add game days and events</p><h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">What do you want to prepare for?</h1></div>
              <CalendarDays className="h-6 w-6 shrink-0 text-orange-400" />
            </div>
            <p className="mt-3 text-sm text-zinc-400">Add a game, tournament, showcase, scrimmage, or tryout. You can add more later.</p>
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label className="text-zinc-300">Date</Label><Input className={fieldClassName()} type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} data-testid="input-season-onboarding-event-date" /></div>
                <div className="space-y-2"><Label className="text-zinc-300">Tipoff / start (optional)</Label><Input className={fieldClassName()} type="time" value={tipoffTime} onChange={(event) => setTipoffTime(event.target.value)} data-testid="input-season-onboarding-event-time" /></div>
              </div>
              <div className="space-y-2"><Label className="text-zinc-300">Opponent or event name (optional)</Label><Input className={fieldClassName()} placeholder="e.g. Eagles, summer showcase" value={eventName} onChange={(event) => setEventName(event.target.value)} data-testid="input-season-onboarding-event-name" /></div>
              <div className="space-y-2"><Label className="text-zinc-300">Event type</Label><select className={`flex h-10 w-full rounded-md border px-3 text-sm ${fieldClassName()}`} value={eventType} onChange={(event) => setEventType(event.target.value)} data-testid="select-season-onboarding-event-type">{eventTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
              <Button className="w-full bg-orange-500 font-black text-black hover:bg-orange-400" disabled={createEventMutation.isPending || !eventDate} onClick={() => createEventMutation.mutate()} data-testid="button-season-onboarding-add-event">
                {createEventMutation.isPending ? "Adding event…" : "Add this event"} <Plus className="ml-2 h-4 w-4" />
              </Button>
              <div className="flex items-center justify-between gap-3 border-t border-zinc-800 pt-4">
                <span className="text-xs text-zinc-500">{eventCount ? `${eventCount} event${eventCount === 1 ? "" : "s"} added` : "No events added yet"}</span>
                <Button variant="outline" className="border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-800 hover:text-white" onClick={() => setStep("team-complete")} data-testid="button-season-onboarding-finish-team">
                  {eventCount ? "Finish this team" : "I’ll add events later"} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}