import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck, Check, Clock, Info, Play, Plus, Save, Search,
  Target, Timer, X, Bookmark,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import "./_group.css";

type Metric = {
  id: string;
  name: string;
  label: string;
  type: "number" | "timer";
  required?: boolean;
};

type Drill = {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  duration: number;
  trackShots: boolean;
  coachingNotes?: string;
  metrics: Metric[];
};

type WorkoutEntry = {
  drillId: string;
  location: string;
  metrics: Record<string, number>;
  notes: string;
  challengeId: string;
};

const locationOptions = [
  { slug: "left-wing-3", label: "Left Wing", classification: "3-pointer" },
  { slug: "top-key-3", label: "Top of Key", classification: "3-pointer" },
  { slug: "right-wing-3", label: "Right Wing", classification: "3-pointer" },
  { slug: "free-throw", label: "Free Throw", classification: "free-throw" },
  { slug: "paint-2", label: "Paint", classification: "2-pointer" },
];

const challenges = [
  { id: "challenge-1", name: "Make 100 threes", currentValue: 42, targetValue: 100, category: "shooting" },
  { id: "challenge-2", name: "Handle 500", currentValue: 215, targetValue: 500, category: "ball-handling" },
];

const initialDrills: Drill[] = [
  {
    id: "catch-shoot",
    title: "Catch & Shoot — 5 Spots",
    category: "shooting",
    difficulty: "intermediate",
    duration: 600,
    trackShots: true,
    coachingNotes: "Build a repeatable footwork rhythm and get your shot off quickly.",
    metrics: [
      { id: "makes", name: "Makes", label: "Makes", type: "number" },
      { id: "attempts", name: "Attempts", label: "Attempts", type: "number", required: true },
    ],
  },
  {
    id: "free-throws",
    title: "Free Throw Routine",
    category: "shooting",
    difficulty: "beginner",
    duration: 300,
    trackShots: true,
    metrics: [
      { id: "makes", name: "Makes", label: "Makes", type: "number" },
      { id: "attempts", name: "Attempts", label: "Attempts", type: "number", required: true },
    ],
  },
  {
    id: "handle-combo",
    title: "Two-Ball Handle Combos",
    category: "ball-handling",
    difficulty: "advanced",
    duration: 480,
    trackShots: false,
    coachingNotes: "Keep your eyes up and stay low through each change of direction.",
    metrics: [
      { id: "time", name: "Time", label: "Time", type: "timer" },
      { id: "reps", name: "Reps", label: "Reps", type: "number" },
    ],
  },
];

const initialEntries: WorkoutEntry[] = [
  { drillId: "catch-shoot", location: "left-wing-3", metrics: { makes: 7, attempts: 10 }, notes: "Good rhythm", challengeId: "challenge-1" },
  { drillId: "catch-shoot", location: "top-key-3", metrics: { makes: 6, attempts: 10 }, notes: "", challengeId: "challenge-1" },
  { drillId: "free-throws", location: "free-throw", metrics: { makes: 8, attempts: 10 }, notes: "Stay tall", challengeId: "challenge-1" },
  { drillId: "handle-combo", location: "", metrics: { time: 45, reps: 12 }, notes: "Eyes up", challengeId: "challenge-2" },
];

function categoryLabel(category: string) {
  return category.replaceAll("-", " ");
}

function formatTimer(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function TimerMetric({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [targetSeconds, setTargetSeconds] = useState(value || 30);
  const [remaining, setRemaining] = useState(value || 30);
  const [hasStarted, setHasStarted] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          setRunning(false);
          setDone(true);
          onChange(targetSeconds);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [running, targetSeconds, onChange]);

  if (hasStarted) {
    const circumference = 2 * Math.PI * 26;
    const progress = targetSeconds > 0 ? ((targetSeconds - remaining) / targetSeconds) * 100 : 0;
    return (
      <div className="flex flex-col items-center gap-1 py-0.5">
        <div className="relative h-14 w-14">
          <svg className="-rotate-90" viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="26" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted" />
            <circle cx="30" cy="30" r="26" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className={done ? "text-green-500" : "text-primary"} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress / 100)} style={{ transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {done ? <span className="text-xl font-bold leading-none text-green-500">✓</span> : <span className={`font-mono text-xs font-bold leading-none ${remaining <= 5 ? "animate-pulse text-orange-500" : ""}`}>{formatTimer(remaining)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="outline" className="h-6 px-1.5 text-[10px]" onClick={() => setRunning(!running)}>{running ? "Pause" : done ? "Restart" : "Resume"}</Button>
          <Button type="button" size="sm" variant="outline" className="h-6 px-1.5 text-[10px]" onClick={() => { setRunning(false); setDone(false); setHasStarted(false); setRemaining(targetSeconds); }}>Reset</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex h-8 items-center gap-1 rounded-md bg-muted px-2">
        <Timer className="h-3.5 w-3.5 shrink-0 text-primary" />
        <Input
          type="text"
          inputMode="numeric"
          value={targetSeconds}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10);
            if (Number.isFinite(parsed) && parsed > 0) {
              setTargetSeconds(parsed);
              setRemaining(parsed);
              onChange(parsed);
            }
          }}
          className="h-6 w-10 border-0 bg-transparent p-0 text-center text-sm focus-visible:ring-0"
          aria-label="Timer duration"
        />
        <span className="text-[11px] leading-none text-muted-foreground">s</span>
      </div>
      <Button type="button" size="sm" className="h-8 shrink-0 gap-1 px-2 text-xs" onClick={() => { setHasStarted(true); setDone(false); setRunning(true); }}>
        <Play className="h-3 w-3" />Start
      </Button>
    </div>
  );
}

export function Current() {
  const [drills, setDrills] = useState(initialDrills);
  const [entries, setEntries] = useState(initialEntries);
  const [manualDuration, setManualDuration] = useState("");
  const [globalChallenge, setGlobalChallenge] = useState("");
  const [addingDrill, setAddingDrill] = useState(false);
  const [drillSearch, setDrillSearch] = useState("");
  const [detailDrill, setDetailDrill] = useState<Drill | null>(null);
  const [notice, setNotice] = useState("");
  const [elapsed, setElapsed] = useState("24:18");

  const drillGroups = useMemo(() => {
    const grouped = new Map<string, Array<{ entry: WorkoutEntry; index: number }>>();
    entries.forEach((entry, index) => {
      const group = grouped.get(entry.drillId) ?? [];
      group.push({ entry, index });
      grouped.set(entry.drillId, group);
    });
    return Array.from(grouped.entries()).flatMap(([drillId, group]) => {
      const drill = drills.find((item) => item.id === drillId);
      return drill ? [{ drill, entries: group }] : [];
    });
  }, [drills, entries]);

  const updateEntry = (index: number, key: keyof WorkoutEntry, value: string | Record<string, number>) => {
    setEntries((current) => current.map((entry, entryIndex) =>
      entryIndex === index ? { ...entry, [key]: value } : entry,
    ));
  };

  const updateMetric = (index: number, metricId: string, value: number) => {
    setEntries((current) => current.map((entry, entryIndex) =>
      entryIndex === index ? { ...entry, metrics: { ...entry.metrics, [metricId]: value } } : entry,
    ));
  };

  const addRound = (index: number) => {
    const source = entries[index];
    setEntries((current) => {
      const next = [...current];
      next.splice(index + 1, 0, { ...source, metrics: { ...source.metrics }, notes: "" });
      return next;
    });
  };

  const addDrill = (drill: Drill) => {
    setDrills((current) => current.some((item) => item.id === drill.id) ? current : [...current, drill]);
    setEntries((current) => [
      ...current,
      {
        drillId: drill.id,
        location: drill.trackShots ? "top-key-3" : "",
        metrics: Object.fromEntries(drill.metrics.map((metric) => [metric.id, 0])),
        notes: "",
        challengeId: "",
      },
    ]);
    setAddingDrill(false);
    setDrillSearch("");
  };

  const availableDrills = [
    ...drills,
    {
      id: "closeout-shooting",
      title: "Closeout Shooting",
      category: "shooting",
      difficulty: "intermediate",
      duration: 420,
      trackShots: true,
      metrics: [{ id: "makes", name: "Makes", label: "Makes", type: "number" as const }, { id: "attempts", name: "Attempts", label: "Attempts", type: "number" as const }],
    },
  ].filter((drill) => !drills.some((existing) => existing.id === drill.id) || entries.every((entry) => entry.drillId !== drill.id));

  const filteredDrills = availableDrills.filter((drill) =>
    `${drill.title} ${drill.category} ${drill.difficulty}`.toLowerCase().includes(drillSearch.toLowerCase().trim()),
  );

  return (
    <main className="workout-tracker-current dark min-h-screen overflow-y-auto bg-[#050505] text-foreground [background-image:radial-gradient(circle_at_85%_0%,rgba(249,115,22,0.12),transparent_32%)]" data-testid="workout-fullscreen">
      <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
        <Card className="overflow-hidden border-white/10 bg-zinc-950/90 shadow-2xl shadow-orange-950/20">
          <CardHeader className="border-b border-white/10 bg-white/[0.025] p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl text-white">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-500 text-black"><Play className="h-4 w-4 fill-current" /></span>
                    Midweek Shooting Session
                  </CardTitle>
                  <CardDescription className="mt-2 text-zinc-400">
                    {drillGroups.length} drills · Track your work as you go
                  </CardDescription>
                </div>
                <div className="flex rounded-xl border border-white/10 bg-black/30 p-1" aria-label="Workout logging mode">
                  <Button type="button" size="sm" variant="ghost" className="text-zinc-400 hover:bg-white/5 hover:text-white" onClick={() => setNotice("Quick Complete is a separate workout logging mode.")} aria-pressed="false">
                    <Check className="mr-1.5 h-4 w-4" />Quick Complete
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="bg-orange-500 text-black hover:bg-orange-400 hover:text-black" aria-pressed="true">
                    <Target className="mr-1.5 h-4 w-4" />Track Stats
                  </Button>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-orange-400/20 bg-orange-400/10 px-3 py-2" data-testid="workout-elapsed-timer">
                  <Timer className="h-4 w-4 text-orange-300" />
                  <span className="font-mono text-lg font-bold tabular-nums text-orange-200">{elapsed}</span>
                </div>
                <div className="flex items-center gap-1.5" title="Override session duration if timer was inaccurate">
                  <Input
                    type="number"
                    min="1"
                    max="600"
                    placeholder="Override min"
                    value={manualDuration}
                    onChange={(event) => setManualDuration(event.target.value)}
                    className="h-8 w-24 border-white/10 bg-black/30 px-2 text-sm tabular-nums text-white placeholder:text-zinc-600"
                    data-testid="input-manual-duration"
                  />
                  <span className="text-xs text-zinc-500">min</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setNotice("Workout cancelled")} className="gap-2 border-white/10 text-zinc-300 hover:bg-white/5 hover:text-white">
                  <X className="h-4 w-4" />Cancel
                </Button>
                {entries.length >= 2 && (
                  <Button variant="outline" onClick={() => setNotice("Workout saved to your library")} className="gap-2">
                    <Bookmark className="h-4 w-4" />Save as Workout
                  </Button>
                )}
                <Button onClick={() => setNotice("Workout saved to Training History")} className="gap-2" data-testid="button-finish-workout">
                  <Save className="h-4 w-4" />Finish Workout
                </Button>
              </div>
            </div>
            {notice && (
              <div className="mt-4 flex items-center justify-between rounded-lg border border-orange-500/20 bg-orange-500/[0.06] px-3 py-2 text-sm text-orange-200" role="status">
                <span>{notice}</span>
                <button type="button" onClick={() => setNotice("")} aria-label="Dismiss message"><X className="h-4 w-4" /></button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6 p-5 sm:p-7">
            {challenges.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                <Target className="h-4 w-4 shrink-0 text-primary" />
                <span className="shrink-0 text-sm text-muted-foreground">Apply challenge to all drills:</span>
                <Select
                  value={globalChallenge}
                  onValueChange={(challengeId) => {
                    setGlobalChallenge(challengeId === "none" ? "" : challengeId);
                    setEntries((current) => current.map((entry) => {
                      if (challengeId === "none") return { ...entry, challengeId: "" };
                      const drill = drills.find((item) => item.id === entry.drillId);
                      const challenge = challenges.find((item) => item.id === challengeId);
                      return drill?.category === challenge?.category ? { ...entry, challengeId } : entry;
                    }));
                  }}
                >
                  <SelectTrigger className="h-8 min-w-[160px] max-w-xs flex-1 border-primary/30 text-xs" data-testid="select-global-challenge">
                    <SelectValue placeholder="Pick a challenge…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none"><span className="text-muted-foreground">Clear all</span></SelectItem>
                    {challenges.map((challenge) => (
                      <SelectItem key={challenge.id} value={challenge.id}>
                        <span className="flex items-center gap-2">{challenge.name}<Badge variant="outline" className="px-1 py-0 text-[10px]">{challenge.currentValue}/{challenge.targetValue}</Badge></span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {drillGroups.map(({ drill, entries: drillEntries }) => {
              const metrics = [...drill.metrics].sort((a, b) =>
                Number(a.name.toLowerCase().includes("attempt")) - Number(b.name.toLowerCase().includes("attempt")),
              );
              const estimatedMinutes = drill.duration ? Math.round(drill.duration / 60) : null;
              const matchingChallenges = challenges.filter((challenge) => challenge.category === drill.category);
              return (
                <Card key={drill.id} className="border-muted" data-testid={`drill-table-${drill.id}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{drill.title}</CardTitle>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <CardDescription className="text-xs">
                            {categoryLabel(drill.category)} · {drillEntries.length} round{drillEntries.length > 1 ? "s" : ""}
                            {estimatedMinutes ? ` · ~${estimatedMinutes}m est.` : ""}
                          </CardDescription>
                          {drill.coachingNotes && <p className="mt-1 text-xs text-orange-300/80">Why this drill helps: {drill.coachingNotes}</p>}
                          {drill.id === "free-throws" && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3 shrink-0" />Started 18:42 · Ended 21:03</span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDetailDrill(drill)} title="View drill details" aria-label={`View details for ${drill.title}`}>
                          <Info className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => addRound(drillEntries[drillEntries.length - 1].index)} className="gap-1">
                          <Plus className="h-3 w-3" />Add Round
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="-mx-1 overflow-x-auto px-1">
                      <table className="w-full min-w-[400px] text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="w-14 p-2 text-left text-xs font-medium text-muted-foreground sm:w-20 sm:p-3 sm:text-sm">Round</th>
                            {drill.trackShots && <th className="p-2 text-left text-xs font-medium text-muted-foreground sm:p-3 sm:text-sm">Location</th>}
                            {metrics.map((metric) => (
                              <th key={metric.id} className="whitespace-nowrap p-2 text-left text-xs font-medium text-muted-foreground sm:p-3 sm:text-sm">
                                <span className="inline-flex max-w-[80px] items-center gap-1 truncate sm:max-w-none sm:whitespace-normal">
                                  {metric.type === "timer" && <Timer className="h-3 w-3 shrink-0 text-primary" />}
                                  {metric.label}
                                </span>
                                {metric.required && <span className="ml-1 text-destructive">*</span>}
                              </th>
                            ))}
                            <th className="hidden p-2 text-left font-medium text-muted-foreground sm:table-cell sm:p-3">Notes</th>
                            {matchingChallenges.length > 0 && (
                              <th className="whitespace-nowrap p-2 text-left text-xs font-medium text-primary sm:p-3 sm:text-sm">
                                <div className="flex flex-col gap-1">
                                  <span className="flex items-center gap-1"><Target className="h-3 w-3" />Challenge</span>
                                  {drillEntries.length > 1 && (
                                    <Select onValueChange={(value) => {
                                      drillEntries.forEach(({ index }) => updateEntry(index, "challengeId", value === "none" ? "" : value));
                                    }}>
                                      <SelectTrigger className="h-6 w-28 border-primary/40 text-[10px] text-primary"><SelectValue placeholder="Apply all…" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none"><span className="text-xs text-muted-foreground">Clear all</span></SelectItem>
                                        {matchingChallenges.map((challenge) => <SelectItem key={challenge.id} value={challenge.id}><span className="text-xs">{challenge.name}</span></SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </th>
                            )}
                            <th className="w-10 p-2 text-center font-medium text-muted-foreground sm:w-12 sm:p-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {drillEntries.map(({ entry, index }, roundIndex) => (
                            <tr key={`${drill.id}-${index}`} className="border-b last:border-0 hover:bg-muted/20" data-testid={`workout-row-${index}`}>
                              <td className="p-2 sm:p-3"><Badge variant="secondary" className="text-xs font-semibold">{roundIndex + 1}</Badge></td>
                              {drill.trackShots && (
                                <td className="p-1 sm:p-2">
                                  <Select value={entry.location} onValueChange={(value) => updateEntry(index, "location", value)}>
                                    <SelectTrigger className="h-8 w-32 text-xs sm:w-40" data-testid={`select-location-${index}`}><SelectValue placeholder="Select location" /></SelectTrigger>
                                    <SelectContent className="max-h-[50vh]">
                                      {locationOptions.map((location) => (
                                        <SelectItem key={location.slug} value={location.slug}>
                                          <span className="flex items-center gap-2">{location.label}<Badge variant="outline" className="px-1 py-0 text-[10px]">{location.classification === "free-throw" ? "FT" : location.classification === "2-pointer" ? "2PT" : "3PT"}</Badge></span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                              )}
                              {metrics.map((metric) => (
                                <td key={metric.id} className="p-1 sm:p-2">
                                  {metric.type === "timer" ? (
                                    <TimerMetric value={entry.metrics[metric.id] || 0} onChange={(value) => updateMetric(index, metric.id, value)} />
                                  ) : (
                                    <Input
                                      type="text"
                                      inputMode="numeric"
                                      pattern="[0-9]*"
                                      value={entry.metrics[metric.id] || ""}
                                      onChange={(event) => updateMetric(index, metric.id, Number.parseFloat(event.target.value) || 0)}
                                      className="h-8 w-14 text-sm sm:w-20"
                                      placeholder="0"
                                      data-testid={`input-metric-${index}-${metric.id}`}
                                    />
                                  )}
                                </td>
                              ))}
                              <td className="hidden p-2 sm:table-cell">
                                <Input placeholder="Notes..." value={entry.notes} onChange={(event) => updateEntry(index, "notes", event.target.value)} className="h-8 min-w-[100px] text-sm" data-testid={`input-notes-${index}`} />
                              </td>
                              {matchingChallenges.length > 0 && (
                                <td className="p-1 sm:p-2">
                                  <Select value={entry.challengeId || "none"} onValueChange={(value) => updateEntry(index, "challengeId", value === "none" ? "" : value)}>
                                    <SelectTrigger className="h-8 w-28 text-xs sm:w-36" data-testid={`select-challenge-${index}`}><SelectValue placeholder="Select..." /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none"><span className="text-muted-foreground">None</span></SelectItem>
                                      {matchingChallenges.map((challenge) => (
                                        <SelectItem key={challenge.id} value={challenge.id}>
                                          <span className="flex items-center gap-1"><Target className="h-3 w-3 text-primary" /><span className="max-w-[80px] truncate">{challenge.name}</span><Badge variant="outline" className="ml-1 px-1 py-0 text-[10px]">{challenge.currentValue}/{challenge.targetValue}</Badge></span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                              )}
                              <td className="p-1 text-center sm:p-2">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEntries((current) => current.filter((_, entryIndex) => entryIndex !== index))} data-testid={`button-remove-${index}`}>
                                  <X className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Button variant="outline" className="w-full gap-2 border-dashed" onClick={() => setAddingDrill(true)} data-testid="button-add-drill-to-workout">
              <Plus className="h-4 w-4" />Add Drill to Workout
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(detailDrill)} onOpenChange={(open) => !open && setDetailDrill(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {detailDrill && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-primary" />{detailDrill.title}</DialogTitle>
                <DialogDescription className="capitalize">{categoryLabel(detailDrill.category)} · ~{Math.round(detailDrill.duration / 60)} min · {detailDrill.difficulty}</DialogDescription>
              </DialogHeader>
              {detailDrill.coachingNotes && <p className="text-sm text-muted-foreground">{detailDrill.coachingNotes}</p>}
              <Button variant="outline" onClick={() => setDetailDrill(null)}>Close</Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {addingDrill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="presentation" onClick={(event) => event.target === event.currentTarget && setAddingDrill(false)}>
          <section className="flex max-h-[80vh] w-full max-w-lg flex-col gap-4 rounded-xl border bg-background p-6 text-foreground shadow-xl" role="dialog" aria-modal="true" aria-labelledby="add-drill-heading">
            <header>
              <h2 id="add-drill-heading" className="font-heading text-xl uppercase">Add Drill to Workout</h2>
              <p className="mt-1 text-sm text-muted-foreground">Select a drill to add to your active workout</p>
            </header>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search drills..." value={drillSearch} onChange={(event) => setDrillSearch(event.target.value)} className="pl-9" data-testid="input-add-drill-search" />
            </div>
            <div className="space-y-2 overflow-y-auto pr-2">
              {filteredDrills.length ? filteredDrills.map((drill) => (
                <button key={drill.id} type="button" onClick={() => addDrill(drill)} className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-muted/50">
                  <span><span className="block text-sm font-medium uppercase">{drill.title}</span><span className="text-xs capitalize text-muted-foreground">{categoryLabel(drill.category)} - {drill.difficulty}</span></span>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              )) : <p className="py-8 text-center text-sm text-muted-foreground">{drillSearch ? "No drills match your search" : "No drills available"}</p>}
            </div>
            <Button variant="outline" onClick={() => { setAddingDrill(false); setDrillSearch(""); }}>Close</Button>
          </section>
        </div>
      )}
      <span className="sr-only" aria-live="polite">{elapsed}</span>
    </main>
  );
}
