import { ArrowUp, ArrowUpRight, BookOpen, ChevronLeft, ChevronRight, Clock, Dumbbell, Flame, HandMetal, Layers3, MessageCircle, Play, Star, Target } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import "./_group.css";

const coachPrompt = "What is one adjustment I can make to show my shooting when the game speeds up?";
const suggestedDrills = [
  { id: "sample-handle", title: "Change-of-Pace Handle Series", category: "ball-handling", difficulty: "advanced", duration: 720, thumbnailUrl: null, videoUrl: null },
  { id: "sample-shot", title: "Quick-Release Spot-Up", category: "shooting", difficulty: "advanced", duration: 900, thumbnailUrl: null, videoUrl: null },
  { id: "sample-finish", title: "Read-and-React Finishing", category: "finishing", difficulty: "intermediate", duration: 600, thumbnailUrl: null, videoUrl: null },
];
const categoryLabels: Record<string, string> = {
  "ball-handling": "Ball Handling",
  shooting: "Shooting",
  finishing: "Finishing",
};
const categoryIcons = {
  "ball-handling": HandMetal,
  shooting: Target,
  finishing: Flame,
};
const categoryAccent: Record<string, string> = {
  "ball-handling": "from-orange-500/25 via-orange-950/50 to-zinc-950 text-orange-300",
  shooting: "from-emerald-500/20 via-emerald-950/50 to-zinc-950 text-emerald-300",
  finishing: "from-red-500/20 via-red-950/50 to-zinc-950 text-red-300",
};
const difficultyColors: Record<string, string> = {
  beginner: "bg-green-500/10 text-green-600",
  intermediate: "bg-yellow-500/10 text-yellow-600",
  advanced: "bg-orange-500/10 text-orange-600",
  elite: "bg-red-500/10 text-red-600",
};
const statGroups = [
  [
    { label: "Day Streak", value: "12 days", detail: "Consecutive training days in your current run.", icon: Flame },
    { label: "Total Drills", value: "38", detail: "Drills completed in the past month.", icon: Dumbbell },
    { label: "Hours Trained", value: "14h", detail: "Total training time in the past month.", icon: Clock },
  ],
  [
    { label: "Total Shots Made", value: "142", detail: "All made shots logged in the selected period.", icon: Target },
    { label: "3-Pointers Made", value: "48", detail: "Made three-pointers from your logged shots.", icon: Target },
    { label: "Free Throws Made", value: "22", detail: "Made free throws from your logged shots.", icon: Target },
  ],
  [
    { label: "3-Point Percentage", value: "38%", detail: "Made three-pointers divided by three-point attempts.", icon: Target },
    { label: "Free Throw Percentage", value: "78%", detail: "Made free throws divided by free throw attempts.", icon: Target },
    { label: "Mid-Range Percentage", value: "44%", detail: "Made mid-range shots divided by mid-range attempts.", icon: Target },
  ],
];

function getObjectUrl(path: string | null) {
  if (!path) return undefined;
  return path.startsWith("/objects/") ? path : `/objects/${path.replace(/^\//, "")}`;
}

function SuggestedDrillCard({ drill }: { drill: (typeof suggestedDrills)[number] }) {
  const CategoryIcon = categoryIcons[drill.category as keyof typeof categoryIcons] || Target;
  const categoryStyle = categoryAccent[drill.category] || "from-orange-500/20 via-orange-950/50 to-zinc-950 text-orange-300";
  const duration = `${Math.floor(drill.duration / 60)} min`;

  return (
    <a href="#" onClick={(event) => event.preventDefault()} className="block">
      <Card className="group cursor-pointer overflow-hidden border-white/[0.08] bg-zinc-950/90 text-zinc-100 shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition-all duration-200 hover:border-white/70" data-testid={`card-drill-${drill.id}`}>
        <div className="relative aspect-[11/5] w-full shrink-0 overflow-hidden bg-zinc-900">
          {drill.videoUrl ? (
            <video src={getObjectUrl(drill.videoUrl)} poster={getObjectUrl(drill.thumbnailUrl)} preload="none" muted playsInline className="pointer-events-none h-full w-full object-cover" />
          ) : drill.thumbnailUrl ? (
            <img src={getObjectUrl(drill.thumbnailUrl)} alt={drill.title} className="h-full w-full object-cover" />
          ) : (
            <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${categoryStyle}`}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-current/20 bg-black/20"><CategoryIcon className="h-5 w-5" /></div>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-transparent transition-colors group-hover:bg-black/20">
            <div className="flex h-11 w-11 scale-90 items-center justify-center rounded-full border border-white/25 bg-zinc-950/70 text-orange-300 opacity-0 shadow-lg backdrop-blur-md transition-all group-hover:scale-100 group-hover:opacity-100">
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            </div>
          </div>
          <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] gap-2">
            <Badge className={`max-w-full truncate px-1.5 py-0 text-[9px] capitalize ${difficultyColors[drill.difficulty]}`}>
              {categoryLabels[drill.category]}<span className="mx-1 opacity-60">·</span>{drill.difficulty}
            </Badge>
          </div>
        </div>
        <CardContent className="min-w-0 flex-1 p-2.5">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug transition-colors group-hover:text-primary">{drill.title}</h3>
          <div className="flex min-w-0 items-center gap-3 text-[10px] text-zinc-400">
            <span className="flex shrink-0 items-center gap-1"><Clock className="h-3 w-3 text-orange-400" />{duration}</span>
            <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium tabular-nums text-zinc-300" role="img" aria-label="Not rated yet">
              <Star className="h-3 w-3 fill-orange-400 text-orange-400" />—
            </span>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

function navigate(_path: string) {
  // Preview actions are intentionally inert.
}

export function RequestedHubUpdate() {
  const [activeGroup, setActiveGroup] = useState(0);
  const [activeStatIndexes, setActiveStatIndexes] = useState<[number, number, number]>([0, 0, 0]);
  const activePage = statGroups[activeGroup] ?? statGroups[0];
  const activeStatIndex = activeStatIndexes[activeGroup] ?? 0;
  const activeStat = activePage[activeStatIndex] ?? activePage[0];
  const activeStatHeading = activeGroup === 0 && activeStatIndex === 0 ? "YOUR DAILY ANCHOR" : activeStat.label;
  const selectStat = (statIndex: number) => {
    setActiveStatIndexes((current) => {
      const next = [...current] as [number, number, number];
      next[activeGroup] = statIndex;
      return next;
    });
  };
  const cycleGroup = (direction: 1 | -1) => {
    setActiveGroup((current) => (current + direction + statGroups.length) % statGroups.length);
  };
  const trainingChoices = [
    { label: "Log a session", detail: "Track today's work", path: "/log", icon: Dumbbell },
    { label: "Start a program", detail: "Follow a plan", path: "/programs", icon: Layers3 },
    { label: "Drill library", detail: "Find your next drill", path: "/drills", icon: BookOpen },
  ];

  return (
    <main className="player-hub-current min-h-[100dvh] bg-background px-4 pb-8 pt-5 text-foreground">
      <div className="mx-auto max-w-[430px]">
        <header>
          <p className="text-[10px] font-medium text-zinc-500">Monday, October 4</p>
          <h1 className="mt-1 font-heading text-[28px] uppercase leading-none tracking-wide text-white">Good afternoon,<br /><span className="text-orange-400">Jordan.</span></h1>
        </header>

        <section className="mt-5 space-y-3" data-testid="card-progress-preview">
          <div className="flex items-end justify-between">
            <button type="button" onClick={() => navigate("/progress?from=hub")} className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-orange-400">
              Full dashboard <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 p-4" aria-live="polite" data-testid="card-active-weekly-recap">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(249,115,22,0.16),transparent_62%)]" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">{activeStatHeading}</p>
                <p className="mt-1 text-xs text-zinc-300">{activeStat.detail}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => cycleGroup(-1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/60 text-zinc-400 transition hover:border-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400" aria-label="Show previous stat group" data-testid="button-previous-weekly-recap">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => cycleGroup(1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950/60 text-zinc-400 transition hover:border-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400" aria-label="Show next stat group" data-testid="button-next-weekly-recap">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="relative mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-4xl font-black leading-none text-white">{activeStat.value}</p>
                <p className="mt-2 text-[11px] font-medium text-zinc-500">Choose a stat below or switch groups with the arrows.</p>
              </div>
              <div className="flex h-11 items-end gap-1" aria-label="Seven day activity">
                {[18, 12, 25, 4, 20, 30, 15].map((height, index) => (
                  <span key={index} className="w-1.5 rounded-full bg-orange-500" style={{ height }} />
                ))}
              </div>
            </div>
            <div className="relative mt-3 flex items-center justify-between border-t border-white/10 pt-2.5 text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-500">
              <span>{activeGroup === 0 ? "Keep the run alive" : "7-day activity"}</span>
              <span>Group {activeGroup + 1} of {statGroups.length}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Training Snapshot</p>
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-600">Past month</p>
          </div>
          <div className="grid grid-cols-3 gap-2" role="group" aria-label={`Stats in group ${activeGroup + 1}`}>
            {activePage.map((stat, statIndex) => {
              const StatIcon = stat.icon;
              const isActive = statIndex === activeStatIndex;
              return (
                <button key={stat.label} type="button" onClick={() => selectStat(statIndex)} aria-pressed={isActive} aria-label={`Show ${stat.label}`} data-testid={`hub-stat-slot-${statIndex}`} className={`min-w-0 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${isActive ? "border-orange-400/50 bg-orange-500/10 text-orange-200" : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500"}`}>
                  <span className="flex items-center justify-between gap-1">
                    <StatIcon className="h-3.5 w-3.5 shrink-0" />
                    {isActive && <span className="text-[8px] font-bold uppercase tracking-wider text-orange-300">Selected</span>}
                  </span>
                  <span className="mt-1.5 block truncate text-base font-black leading-none text-white">{stat.value}</span>
                  <span className="mt-1 block truncate text-[9px] uppercase tracking-wide text-zinc-500">{stat.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-5 space-y-3" data-testid="section-custom-drills">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Custom Drills</p>
              <h2 className="mt-1 text-lg font-black text-white">Today’s picks for you.</h2>
            </div>
            <span className="shrink-0 pb-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">New picks daily</span>
          </div>
          <div className="grid grid-cols-3 gap-2" data-testid="suggested-drills-row">
            {suggestedDrills.map((drill) => (
              <SuggestedDrillCard key={drill.id} drill={drill} />
            ))}
          </div>
        </section>

        <section className="mt-6 space-y-3" data-testid="section-start-training">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">START TRAINING</p>
            <h2 className="mt-1 text-lg font-black text-white">Choose your next rep.</h2>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {trainingChoices.map(({ label, detail, path, icon: Icon }) => (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                className="group flex min-h-[104px] flex-col gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-left text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400"><Icon className="h-4 w-4" /></span>
                <span>
                  <span className="block font-heading text-sm uppercase leading-tight tracking-wide">{label}</span>
                  <span className="mt-0.5 block text-[11px] text-zinc-500">{detail}</span>
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => navigate(`/coach-p?prompt=${encodeURIComponent(coachPrompt)}`)}
              aria-label={`Open Coach P with prompt: ${coachPrompt}`}
              className="group flex min-h-[104px] w-full flex-row items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-left text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800"
              data-testid="button-start-coach-p-prompt"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400"><MessageCircle className="h-4 w-4" /></span>
              <span className="shrink-0 font-heading text-sm uppercase leading-tight tracking-wide text-white">Coach P</span>
              <span className="flex min-h-[48px] min-w-0 flex-1 items-center gap-2 rounded-full border border-orange-400/20 bg-zinc-950/95 py-1.5 pl-3 pr-1.5 shadow-[0_12px_44px_rgba(0,0,0,0.42),0_0_30px_rgba(249,115,22,0.08)]" aria-hidden="true">
                  <span className="line-clamp-2 min-w-0 flex-1 text-[10px] leading-snug text-zinc-400">{coachPrompt}</span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.22)]"><ArrowUp className="h-4 w-4" /></span>
                </span>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}