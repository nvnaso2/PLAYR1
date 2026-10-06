import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  CircleHelp,
  Clock3,
  Flame,
  MapPin,
  Minus,
  Play,
  Plus,
  Save,
  Search,
  Target,
  Timer,
  Trophy,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import "./_group.css";

type Metric = { id: string; label: string; unit?: string };
type Drill = {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  duration: number;
  description: string;
  coachingNotes: string;
  trackShots: boolean;
  metrics: Metric[];
};
type Round = {
  id: string;
  drillId: string;
  location: string;
  metrics: Record<string, number>;
  notes: string;
  challengeId: string;
};

const places = [
  { value: "left-wing-3", label: "Left wing", type: "3PT" },
  { value: "top-key-3", label: "Top of key", type: "3PT" },
  { value: "right-wing-3", label: "Right wing", type: "3PT" },
  { value: "free-throw", label: "Free throw line", type: "FT" },
  { value: "paint-2", label: "Paint", type: "2PT" },
];
const challenges = [
  { id: "threes", name: "100 made threes", count: 42, target: 100, category: "shooting" },
  { id: "handle", name: "Handle 500", count: 215, target: 500, category: "ball-handling" },
];
const seedDrills: Drill[] = [
  {
    id: "catch-shoot",
    title: "Catch & Shoot",
    category: "Shooting",
    difficulty: "Intermediate",
    duration: 600,
    description: "Five spots. One clean catch, a balanced base, and a quick release every time.",
    coachingNotes: "Build a repeatable footwork rhythm. Get your shot off before the closeout arrives.",
    trackShots: true,
    metrics: [{ id: "makes", label: "Makes" }, { id: "attempts", label: "Attempts" }],
  },
  {
    id: "free-throws",
    title: "Free Throw Routine",
    category: "Shooting",
    difficulty: "Beginner",
    duration: 300,
    description: "Reset your breath and routine at the line. Make the last one feel like the first.",
    coachingNotes: "Same breath, same bounce, same finish. Stay tall through the release.",
    trackShots: true,
    metrics: [{ id: "makes", label: "Makes" }, { id: "attempts", label: "Attempts" }],
  },
  {
    id: "handle-combo",
    title: "Two-Ball Handle Combos",
    category: "Ball handling",
    difficulty: "Advanced",
    duration: 480,
    description: "Alternate high-low pounds, crossovers, and retreat dribbles without losing posture.",
    coachingNotes: "Keep your eyes up and stay low through every change of direction.",
    trackShots: false,
    metrics: [{ id: "reps", label: "Reps" }, { id: "seconds", label: "Seconds" }],
  },
];
const extraDrills: Drill[] = [
  {
    id: "closeout",
    title: "Closeout Shooting",
    category: "Shooting",
    difficulty: "Intermediate",
    duration: 420,
    description: "Attack the closeout with a shot, a one-dribble pull-up, or a drive finish.",
    coachingNotes: "Read the defender's hips before you decide.",
    trackShots: true,
    metrics: [{ id: "makes", label: "Makes" }, { id: "attempts", label: "Attempts" }],
  },
  {
    id: "weak-hand",
    title: "Weak-Hand Finishes",
    category: "Finishing",
    difficulty: "Intermediate",
    duration: 360,
    description: "Finish through contact with your off hand from both sides of the rim.",
    coachingNotes: "Protect the ball with your body and meet the glass softly.",
    trackShots: false,
    metrics: [{ id: "makes", label: "Makes" }, { id: "reps", label: "Reps" }],
  },
];

const seedRounds: Round[] = [
  { id: "r1", drillId: "catch-shoot", location: "left-wing-3", metrics: { makes: 7, attempts: 10 }, notes: "Good rhythm", challengeId: "threes" },
  { id: "r2", drillId: "catch-shoot", location: "top-key-3", metrics: { makes: 6, attempts: 10 }, notes: "", challengeId: "threes" },
  { id: "r3", drillId: "free-throws", location: "free-throw", metrics: { makes: 8, attempts: 10 }, notes: "Stay tall", challengeId: "threes" },
  { id: "r4", drillId: "handle-combo", location: "", metrics: { reps: 12, seconds: 45 }, notes: "Eyes up", challengeId: "handle" },
];

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function TrackStatsRedesign() {
  const [drills, setDrills] = useState(seedDrills);
  const [rounds, setRounds] = useState(seedRounds);
  const [elapsed, setElapsed] = useState(24 * 60 + 18);
  const [timerRunning, setTimerRunning] = useState(true);
  const [manualDuration, setManualDuration] = useState("");
  const [notice, setNotice] = useState("");
  const [detailDrill, setDetailDrill] = useState<Drill | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [globalChallenge, setGlobalChallenge] = useState("none");

  useEffect(() => {
    if (!timerRunning) return;
    const interval = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [timerRunning]);

  const grouped = useMemo(
    () => drills.map((drill) => ({ drill, rounds: rounds.filter((round) => round.drillId === drill.id) }))
      .filter((group) => group.rounds.length > 0),
    [drills, rounds],
  );
  const nextDrill = grouped.find((group) => group.drill.id === "catch-shoot")?.drill ?? grouped[0]?.drill;
  const totalMakes = rounds.reduce((sum, round) => sum + (round.metrics.makes ?? 0), 0);
  const totalAttempts = rounds.reduce((sum, round) => sum + (round.metrics.attempts ?? 0), 0);
  const availableDrills = extraDrills.filter((drill) => !drills.some((item) => item.id === drill.id));
  const filteredDrills = availableDrills.filter((drill) =>
    `${drill.title} ${drill.category} ${drill.difficulty}`.toLowerCase().includes(search.toLowerCase().trim()),
  );

  const updateRound = (roundId: string, updates: Partial<Round>) =>
    setRounds((current) => current.map((round) => round.id === roundId ? { ...round, ...updates } : round));
  const updateMetric = (roundId: string, metricId: string, value: number) =>
    setRounds((current) => current.map((round) => round.id === roundId
      ? { ...round, metrics: { ...round.metrics, [metricId]: value } }
      : round));
  const addRound = (drill: Drill) => {
    const prior = [...rounds].reverse().find((round) => round.drillId === drill.id);
    setRounds((current) => [...current, {
      id: `round-${Date.now()}`,
      drillId: drill.id,
      location: drill.trackShots ? prior?.location || "top-key-3" : "",
      metrics: Object.fromEntries(drill.metrics.map((metric) => [metric.id, 0])),
      notes: "",
      challengeId: prior?.challengeId || "",
    }]);
  };
  const addDrill = (drill: Drill) => {
    setDrills((current) => [...current, drill]);
    setRounds((current) => [...current, {
      id: `round-${Date.now()}`,
      drillId: drill.id,
      location: drill.trackShots ? "top-key-3" : "",
      metrics: Object.fromEntries(drill.metrics.map((metric) => [metric.id, 0])),
      notes: "",
      challengeId: "",
    }]);
    setAddOpen(false);
    setSearch("");
    setNotice(`${drill.title} added to this session.`);
  };
  const applyChallenge = (challengeId: string) => {
    setGlobalChallenge(challengeId);
    setRounds((current) => current.map((round) => {
      const drill = drills.find((item) => item.id === round.drillId);
      const challenge = challenges.find((item) => item.id === challengeId);
      return challengeId === "none" || (drill && challenge && drill.category.toLowerCase().replace(" ", "-") !== challenge.category)
        ? { ...round, challengeId: "" }
        : { ...round, challengeId };
    }));
  };

  return (
    <main className="workout-tracker-current dark min-h-[100dvh] overflow-hidden bg-[#11110f] text-zinc-100 [background-image:radial-gradient(ellipse_at_72%_0%,rgba(245,110,24,0.13),transparent_33%),linear-gradient(115deg,rgba(255,255,255,0.015)_1px,transparent_1px)] [background-size:auto,36px_36px]">
      <div className="mx-auto max-w-[1440px] px-4 pb-28 pt-4 sm:px-7 sm:pb-10 sm:pt-7 lg:px-10">
        <header className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-500 text-black shadow-[0_8px_24px_rgba(245,110,24,0.22)]">
              <span className="font-heading text-xl leading-none">P1</span>
            </div>
            <div>
              <p className="font-heading text-lg tracking-[0.12em] text-white">PLAYR1 <span className="text-orange-500">/ TRAINING</span></p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Session in progress</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/[0.08] px-3 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-400" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.17em] text-orange-200">Tracking stats</span>
          </div>
        </header>

        <section className="mb-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px] lg:items-end">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
              <span className="h-px w-6 bg-orange-500" /> Tuesday · Open gym · 6:42 PM
            </p>
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <h1 className="font-heading text-[clamp(3.4rem,8vw,6.7rem)] leading-[0.82] tracking-[0.01em] text-white">
                  MIDWEEK <span className="text-orange-500">SHOT WORK</span>
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400">
                  Log each round while it’s fresh. Your next rep is ready when you are.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="rounded-lg border border-white/10 bg-[#1a1a18] px-3 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-zinc-500">Rounds logged</p>
                  <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-white">{rounds.length}<span className="ml-1 text-xs font-normal text-zinc-500">rounds</span></p>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#1a1a18] px-3 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-[0.17em] text-zinc-500">Shot accuracy</p>
                  <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-white">{totalAttempts ? Math.round((totalMakes / totalAttempts) * 100) : 0}<span className="ml-0.5 text-xs font-normal text-zinc-500">%</span></p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-white/10 bg-[#191917] p-4 lg:mb-1">
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.17em] text-zinc-500"><Timer className="h-3.5 w-3.5 text-orange-400" /> Session clock</p>
              <p className="mt-1 font-mono text-[2rem] font-bold leading-none tabular-nums text-white">{formatTime(elapsed)}</p>
              <label className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                Manual duration
                <Input
                  type="number"
                  min="1"
                  inputMode="numeric"
                  aria-label="Manual workout duration in minutes"
                  placeholder="—"
                  value={manualDuration}
                  onChange={(event) => setManualDuration(event.target.value)}
                  className="h-8 w-[68px] border-white/10 bg-black/30 px-2 text-center font-mono text-sm text-white placeholder:text-zinc-600"
                />
                min
              </label>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={timerRunning ? "Pause session timer" : "Resume session timer"}
              onClick={() => setTimerRunning((running) => !running)}
              className="h-11 w-11 border-white/10 bg-white/[0.03] text-orange-300 hover:bg-white/[0.08] hover:text-orange-200"
            >
              {timerRunning ? <span className="flex gap-1"><span className="h-4 w-1 rounded-sm bg-current" /><span className="h-4 w-1 rounded-sm bg-current" /></span> : <Play className="h-4 w-4 fill-current" />}
            </Button>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_290px] lg:items-start">
          <section className="min-w-0 space-y-4" aria-label="Workout drills">
            {nextDrill && (
              <div className="relative overflow-hidden rounded-xl border border-orange-400/35 bg-[linear-gradient(110deg,rgba(236,103,25,0.17),rgba(25,24,22,0.98)_48%)] p-4 sm:p-5">
                <div className="absolute -right-5 -top-7 h-32 w-32 rounded-full border border-orange-400/10" />
                <div className="absolute -right-2 -top-4 h-24 w-24 rounded-full border border-orange-400/10" />
                <div className="relative flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Badge className="rounded-sm bg-orange-500 px-2 text-[9px] font-extrabold uppercase tracking-[0.13em] text-black hover:bg-orange-500">NEXT UP</Badge>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-orange-100/65">{nextDrill.category} · {Math.round(nextDrill.duration / 60)} min target</span>
                    </div>
                    <h2 className="font-heading text-3xl leading-none text-white sm:text-4xl">{nextDrill.title}</h2>
                    <p className="mt-2 max-w-xl text-xs leading-5 text-zinc-300">Add the next round, then tap into the result. Quick Complete stays a separate workout path.</p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => addRound(nextDrill)}
                    className="h-12 w-full gap-2 rounded-lg bg-orange-500 px-5 font-bold uppercase tracking-[0.08em] text-black hover:bg-orange-400 sm:w-auto"
                  >
                    <Plus className="h-4 w-4" /> Log next round
                  </Button>
                </div>
              </div>
            )}

            {grouped.map(({ drill, rounds: drillRounds }) => {
              const activeChallenge = challenges.find((challenge) => challenge.category === drill.category.toLowerCase().replace(" ", "-"));
              const isShooting = drill.trackShots;
              return (
                <article key={drill.id} className="overflow-hidden rounded-xl border border-white/10 bg-[#191917] shadow-[0_12px_35px_rgba(0,0,0,0.18)]">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-orange-400/15 bg-orange-500/10 text-orange-300">
                        {isShooting ? <Target className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-heading text-2xl leading-none text-white sm:text-[1.7rem]">{drill.title}</h3>
                          <Badge variant="outline" className="rounded-sm border-white/10 px-1.5 py-0 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">{drill.difficulty}</Badge>
                        </div>
                        <p className="mt-1 text-[11px] text-zinc-500">{drill.category} <span className="px-1 text-zinc-700">/</span> {drillRounds.length} round{drillRounds.length === 1 ? "" : "s"} <span className="px-1 text-zinc-700">/</span> ~{Math.round(drill.duration / 60)} min</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setDetailDrill(drill)} className="h-9 gap-1.5 px-2 text-xs text-zinc-400 hover:bg-white/5 hover:text-white">
                        <CircleHelp className="h-4 w-4" /><span className="hidden sm:inline">Drill details</span>
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => addRound(drill)} className="h-9 gap-1.5 border-white/10 bg-white/[0.025] px-3 text-xs text-white hover:bg-white/[0.08]">
                        <Plus className="h-3.5 w-3.5 text-orange-400" /> Round
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 p-3 sm:p-4">
                    {drillRounds.map((round, roundIndex) => {
                      const isNextRound = drill.id === nextDrill?.id && roundIndex === drillRounds.length - 1 && !(round.metrics.makes || round.metrics.reps);
                      return (
                        <div key={round.id} className={`rounded-lg border p-3 sm:p-4 ${isNextRound ? "border-orange-400/25 bg-orange-500/[0.045]" : "border-white/[0.07] bg-[#141412]"}`}>
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`grid h-7 w-7 place-items-center rounded-md font-mono text-xs font-bold ${isNextRound ? "bg-orange-500 text-black" : "bg-white/[0.06] text-zinc-300"}`}>{String(roundIndex + 1).padStart(2, "0")}</span>
                              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{isNextRound ? "Ready to log" : `Round ${roundIndex + 1}`}</span>
                              {isNextRound && <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove round ${roundIndex + 1} from ${drill.title}`}
                              onClick={() => setRounds((current) => current.filter((item) => item.id !== round.id))}
                              className="h-8 w-8 text-zinc-600 hover:bg-red-500/10 hover:text-red-300"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className={`grid gap-3 ${isShooting ? "grid-cols-2 sm:grid-cols-[minmax(150px,1.2fr)_repeat(2,minmax(95px,0.7fr))]" : "grid-cols-2 sm:grid-cols-[repeat(2,minmax(100px,0.7fr))]"}`}>
                            {isShooting && (
                              <label className="col-span-2 block sm:col-span-1">
                                <span className="mb-1.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500"><MapPin className="h-3 w-3 text-orange-400" /> Spot</span>
                                <Select value={round.location || "top-key-3"} onValueChange={(value) => updateRound(round.id, { location: value })}>
                                  <SelectTrigger className="h-12 w-full border-white/10 bg-[#20201d] text-sm text-white focus:ring-orange-500/50">
                                    <SelectValue placeholder="Select spot" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {places.map((place) => <SelectItem key={place.value} value={place.value}>{place.label} · {place.type}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </label>
                            )}
                            {drill.metrics.map((metric) => {
                              const value = round.metrics[metric.id] ?? 0;
                              return (
                                <label key={metric.id} className="block">
                                  <span className="mb-1.5 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                                    {metric.label}
                                    {metric.id === "attempts" && <span className="font-normal tracking-normal text-zinc-600">shots</span>}
                                  </span>
                                  <div className="flex h-12 items-center rounded-lg border border-white/10 bg-[#20201d] focus-within:border-orange-400/55">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      aria-label={`Decrease ${metric.label}`}
                                      onClick={() => updateMetric(round.id, metric.id, Math.max(0, value - 1))}
                                      className="h-11 w-10 shrink-0 text-zinc-500 hover:bg-white/5 hover:text-white"
                                    >
                                      <Minus className="h-3.5 w-3.5" />
                                    </Button>
                                    <Input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      aria-label={`${metric.label} for round ${roundIndex + 1}`}
                                      value={value || ""}
                                      placeholder="0"
                                      onChange={(event) => updateMetric(round.id, metric.id, Math.max(0, Number.parseInt(event.target.value, 10) || 0))}
                                      className="h-11 min-w-0 border-0 bg-transparent p-0 text-center font-mono text-xl font-bold tabular-nums text-white focus-visible:ring-0"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      aria-label={`Increase ${metric.label}`}
                                      onClick={() => updateMetric(round.id, metric.id, value + 1)}
                                      className="h-11 w-10 shrink-0 text-zinc-500 hover:bg-white/5 hover:text-orange-300"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </label>
                              );
                            })}
                          </div>

                          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.65fr)]">
                            <label className="block">
                              <span className="mb-1.5 block text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">Round notes</span>
                              <Textarea
                                value={round.notes}
                                onChange={(event) => updateRound(round.id, { notes: event.target.value })}
                                placeholder="One thing to remember next rep…"
                                rows={1}
                                className="min-h-11 resize-y border-white/10 bg-[#20201d] py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-orange-500/50"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-1.5 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500"><Trophy className="h-3 w-3 text-orange-400" /> Challenge</span>
                              <Select value={round.challengeId || "none"} onValueChange={(value) => updateRound(round.id, { challengeId: value === "none" ? "" : value })}>
                                <SelectTrigger className="h-11 w-full border-white/10 bg-[#20201d] text-xs text-zinc-200 focus:ring-orange-500/50">
                                  <SelectValue placeholder="No challenge" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No challenge</SelectItem>
                                  {activeChallenge && <SelectItem value={activeChallenge.id}>{activeChallenge.name} · {activeChallenge.count}/{activeChallenge.target}</SelectItem>}
                                </SelectContent>
                              </Select>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between px-1 pt-0.5">
                      <p className="text-[10px] text-zinc-600">Enter makes + attempts as soon as the round ends.</p>
                      <Button type="button" variant="ghost" size="sm" onClick={() => addRound(drill)} className="h-8 gap-1.5 px-2 text-[10px] font-bold uppercase tracking-[0.1em] text-orange-300 hover:bg-orange-400/10 hover:text-orange-200">
                        <Plus className="h-3 w-3" /> Add round
                      </Button>
                    </div>
                  </div>
                </article>
              );
            })}

            <Button
              type="button"
              variant="outline"
              onClick={() => setAddOpen(true)}
              className="h-14 w-full gap-2 border-dashed border-white/15 bg-white/[0.015] text-xs font-bold uppercase tracking-[0.13em] text-zinc-400 hover:border-orange-400/40 hover:bg-orange-500/[0.04] hover:text-orange-200"
            >
              <Plus className="h-4 w-4 text-orange-400" /> Add drill to session
            </Button>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-5">
            <section className="rounded-xl border border-white/10 bg-[#191917] p-4 sm:p-5">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Session focus</p>
                  <h2 className="mt-1 font-heading text-2xl text-white">STACK THE REPS</h2>
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-orange-500 text-black"><Flame className="h-4 w-4 fill-current" /></div>
              </div>
              <div className="mb-4 space-y-3">
                {grouped.map(({ drill, rounds: drillRounds }, index) => (
                  <div key={drill.id} className="flex items-center gap-3">
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md font-mono text-[10px] font-bold ${index === 0 ? "bg-orange-500 text-black" : "bg-white/[0.06] text-zinc-500"}`}>{String(index + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-300">{drill.title}</span>
                    <span className="font-mono text-[10px] text-zinc-600">{drillRounds.length}R</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/[0.07] pt-4">
                <label className="mb-2 block text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">Focus a challenge across this workout</label>
                <Select value={globalChallenge} onValueChange={applyChallenge}>
                  <SelectTrigger className="h-11 w-full border-white/10 bg-[#20201d] text-xs text-zinc-200 focus:ring-orange-500/50">
                    <SelectValue placeholder="Choose a challenge" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No session-wide challenge</SelectItem>
                    {challenges.map((challenge) => <SelectItem key={challenge.id} value={challenge.id}>{challenge.name} · {challenge.count}/{challenge.target}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </section>

            <section className="rounded-xl border border-orange-400/15 bg-[linear-gradient(140deg,rgba(245,110,24,0.11),rgba(25,25,23,0.96)_65%)] p-4 sm:p-5">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.17em] text-orange-200/75"><Trophy className="h-3.5 w-3.5" /> In your corner</p>
              <p className="mt-3 font-heading text-[1.7rem] leading-none text-white">100 MADE THREES</p>
              <p className="mt-2 text-xs text-zinc-400">You’re at <span className="font-mono font-bold text-white">42</span> of 100. Keep stacking clean reps.</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/40">
                <div className="h-full rounded-full bg-orange-500" style={{ width: "42%" }} />
              </div>
              <div className="mt-2 flex justify-between text-[9px] font-bold uppercase tracking-[0.13em] text-zinc-600"><span>Progress</span><span>42%</span></div>
            </section>

            <div className="flex items-start gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] p-3 text-[10px] leading-4 text-zinc-500">
              <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-600" />
              <p>Session timer runs while you work. Add a manual duration if you need to correct the clock before saving.</p>
            </div>
          </aside>
        </div>

        {notice && (
          <div role="status" className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-orange-400/30 bg-[#24211d] px-4 py-3 text-sm text-orange-100 shadow-2xl sm:bottom-5">
            <BadgeCheck className="h-4 w-4 shrink-0 text-orange-400" /> {notice}
            <button type="button" aria-label="Dismiss notice" onClick={() => setNotice("")} className="ml-2 text-zinc-500 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#121210]/95 px-4 py-3 backdrop-blur-xl sm:static sm:border-0 sm:bg-transparent sm:px-7 sm:pb-8 sm:pt-1 lg:px-10">
        <div className="mx-auto flex max-w-[1440px] items-center gap-2 sm:justify-end sm:gap-3">
          <p className="mr-auto hidden text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 sm:block"><span className="text-orange-400">{rounds.length}</span> rounds captured · save when you’re done</p>
          <Button type="button" variant="outline" onClick={() => setNotice("Session saved to your workout library.")} className="h-12 flex-1 gap-2 border-white/10 bg-white/[0.04] text-[10px] font-bold uppercase tracking-[0.08em] text-zinc-200 hover:bg-white/[0.08] sm:flex-none sm:px-5 sm:text-xs">
            <Save className="h-4 w-4" /><span className="sm:hidden">Save</span><span className="hidden sm:inline">Save as workout</span>
          </Button>
          <Button type="button" onClick={() => setNotice(`Workout saved to Training History · ${manualDuration ? `${manualDuration} min` : formatTime(elapsed)} logged.`)} className="h-12 flex-[1.35] gap-2 bg-orange-500 text-[10px] font-extrabold uppercase tracking-[0.08em] text-black hover:bg-orange-400 sm:flex-none sm:px-6 sm:text-xs">
            <span>Finish workout</span><ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={Boolean(detailDrill)} onOpenChange={(open) => !open && setDetailDrill(null)}>
        <DialogContent className="max-w-lg border-white/10 bg-[#191917] text-zinc-100">
          {detailDrill && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-3xl uppercase text-white">{detailDrill.title}</DialogTitle>
                <DialogDescription className="text-zinc-500">{detailDrill.category} · {detailDrill.difficulty} · ~{Math.round(detailDrill.duration / 60)} min</DialogDescription>
              </DialogHeader>
              <p className="text-sm leading-6 text-zinc-300">{detailDrill.description}</p>
              <div className="rounded-lg border border-orange-400/15 bg-orange-500/[0.06] p-3">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-orange-300">Coach’s cue</p>
                <p className="text-sm leading-5 text-zinc-300">{detailDrill.coachingNotes}</p>
              </div>
              <Button type="button" onClick={() => setDetailDrill(null)} className="bg-orange-500 font-bold text-black hover:bg-orange-400">Back to workout</Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto border-white/10 bg-[#191917] text-zinc-100">
          <DialogHeader>
            <DialogTitle className="font-heading text-3xl uppercase text-white">Add a drill</DialogTitle>
            <DialogDescription className="text-zinc-500">Bring another piece into this session. A first round will be ready to log.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search drills…" className="h-11 border-white/10 bg-[#20201d] pl-9 text-white placeholder:text-zinc-600" />
          </div>
          <div className="space-y-2">
            {filteredDrills.length ? filteredDrills.map((drill) => (
              <button key={drill.id} type="button" onClick={() => addDrill(drill)} className="flex w-full items-center justify-between gap-4 rounded-lg border border-white/[0.08] bg-[#141412] p-4 text-left transition-colors hover:border-orange-400/35 hover:bg-orange-500/[0.045]">
                <span>
                  <span className="block font-heading text-xl uppercase text-white">{drill.title}</span>
                  <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-zinc-500">{drill.category} · {drill.difficulty} · {Math.round(drill.duration / 60)} min</span>
                </span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-orange-500 text-black"><Plus className="h-4 w-4" /></span>
              </button>
            )) : (
              <div className="rounded-lg border border-dashed border-white/10 p-6 text-center">
                <p className="font-heading text-xl uppercase text-zinc-400">No drills found</p>
                <p className="mt-1 text-xs text-zinc-600">Try a different search.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
