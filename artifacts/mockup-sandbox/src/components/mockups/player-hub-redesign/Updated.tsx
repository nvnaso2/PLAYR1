import {
  ArrowRight,
  ArrowUpRight,
  BookMarked,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Layers3,
  MessageCircle,
  Play,
  Radar,
  Target,
} from "lucide-react";
import "./_group.css";

const weeklyActivity = [
  { day: "M", minutes: 42 },
  { day: "T", minutes: 28 },
  { day: "W", minutes: 65 },
  { day: "T", minutes: 0 },
  { day: "F", minutes: 50 },
  { day: "S", minutes: 75 },
  { day: "S", minutes: 35 },
];

const trainingChoices = [
  { label: "Log a session", detail: "Track today's work", path: "/log", icon: Dumbbell },
  { label: "Start a program", detail: "Follow a plan", path: "/programs", icon: Layers3 },
  { label: "Drill library", detail: "Find your next drill", path: "/drills", icon: BookMarked },
  { label: "Custom workout", detail: "Request a session built for you", path: "/custom-workouts", icon: Target },
];

const playerTools = [
  { label: "3 Point Challenge", path: "/streak-challenges/fifty-in-a-row?returnTo=%2Fhub", icon: Play, className: "border-orange-300/60 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-700 text-zinc-950" },
  { label: "Journal", path: "/journal", icon: BookMarked, className: "border-[#f2e6cc] bg-gradient-to-br from-[#eee1c4] to-[#c9b894] text-[#423727]" },
  { label: "Game Insights", path: "/lead-magnets", icon: Radar, className: "border-orange-300/30 bg-[radial-gradient(circle_at_35%_25%,rgba(249,115,22,0.28),rgba(24,24,27,0.96)_72%)] text-orange-200" },
];

function navigate(_path: string) {
  // Mockup navigation is intentionally local and inert.
}

export function Updated() {
  return (
    <main className="player-hub-current min-h-[100dvh] bg-background px-4 pb-8 pt-5 text-foreground">
      <div className="mx-auto max-w-[430px]">
        <header className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-medium text-zinc-500">Monday, May 19</p>
            <h1 className="mt-1 font-heading text-[28px] uppercase leading-none tracking-[0.025em] text-white">
              Good afternoon,<br /><span className="text-orange-400">Jordan.</span>
            </h1>
          </div>
          <div className="mb-0.5 flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-orange-300">
            <Flame className="h-4 w-4" />
            <span className="font-mono text-sm font-bold">12</span>
            <span className="text-[9px] font-bold uppercase tracking-wide">day streak</span>
          </div>
        </header>

        <section className="mt-5 overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-900/75" aria-labelledby="snapshot-title" data-testid="card-progress-preview">
          <div className="flex items-start justify-between gap-2 px-4 pt-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-zinc-500">Training snapshot · past month</p>
              <h2 id="snapshot-title" className="mt-1 font-heading text-[20px] uppercase leading-none tracking-wide text-white">See your work add up.</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/progress?from=hub")}
              data-nav-target="/progress?from=hub"
              aria-label="View full dashboard"
              className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-zinc-700 px-2 text-[9px] font-bold uppercase tracking-wide text-orange-300 transition hover:border-orange-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              Progress <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>

          <div className="mx-4 mt-4 rounded-xl border border-orange-500/20 bg-[linear-gradient(120deg,rgba(249,115,22,0.12),rgba(9,9,11,0.72)_62%)] p-3.5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-400/25 bg-orange-500/10 text-orange-300">
                  <Flame className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-500">Your daily anchor</p>
                  <p className="mt-0.5 font-heading text-[17px] uppercase leading-none text-white">12 day streak</p>
                </div>
              </div>
              <div className="flex h-11 items-end gap-[5px]" aria-label="Seven day training minutes">
                {weeklyActivity.map(({ day, minutes }, index) => (
                  <div key={`${day}-${index}`} className="flex h-full flex-col items-center justify-end gap-1">
                    <span
                      className={`w-[6px] rounded-full ${minutes === 0 ? "bg-zinc-700" : "bg-orange-500"}`}
                      style={{ height: `${Math.max(5, Math.round((minutes / 75) * 31))}px` }}
                      title={`${day}: ${minutes} minutes`}
                    />
                    <span className="text-[7px] font-mono text-zinc-600">{day}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 divide-x divide-zinc-800 border-t border-white/[0.07] pt-3">
              <div className="pr-2">
                <p className="font-mono text-lg font-bold leading-none text-white">38</p>
                <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.12em] text-zinc-500">Sessions</p>
              </div>
              <div className="px-3">
                <p className="font-mono text-lg font-bold leading-none text-white">14<span className="ml-0.5 text-[10px] text-zinc-400">h</span></p>
                <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.12em] text-zinc-500">Time trained</p>
              </div>
              <div className="pl-3">
                <p className="font-mono text-lg font-bold leading-none text-white">51<span className="text-[10px] text-zinc-400">%</span></p>
                <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.12em] text-zinc-500">FG made</p>
              </div>
            </div>
          </div>

          <div className="px-4 pb-4 pt-3">
            <p className="text-[9px] leading-relaxed text-zinc-500">You showed up on 6 days this week. Keep stacking good reps.</p>
          </div>
        </section>

        <button
          type="button"
          onClick={() => navigate("/custom-drills")}
          data-nav-target="/custom-drills"
          data-testid="button-custom-drills"
          className="group mt-3 flex w-full items-center gap-3 rounded-2xl border border-orange-500/30 bg-[linear-gradient(105deg,rgba(249,115,22,0.17),rgba(24,24,27,0.88)_62%)] p-3.5 text-left transition hover:border-orange-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-400/30 bg-zinc-950/60 text-orange-300">
            <Dumbbell className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[8px] font-bold uppercase tracking-[0.2em] text-orange-300">Make it your own</span>
            <span className="mt-0.5 block font-heading text-[16px] uppercase leading-none tracking-wide text-white">Custom Drills</span>
            <span className="mt-1 block text-[10px] text-zinc-400">Build a session around the part of your game you want next.</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-orange-300 transition group-hover:translate-x-0.5" />
        </button>

        <section className="mt-6 space-y-3" aria-labelledby="start-training-title" data-testid="section-start-training">
          <div className="flex items-end justify-between border-b border-zinc-800 pb-3">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-zinc-500">Start training</p>
              <h2 id="start-training-title" className="mt-1 font-heading text-[21px] uppercase leading-none tracking-wide text-white">Choose your next rep.</h2>
            </div>
            <Clock3 className="mb-0.5 h-4 w-4 text-zinc-600" />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {trainingChoices.map(({ label, detail, path, icon: Icon }, index) => (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                data-nav-target={path}
                className="group flex min-h-[72px] items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-left transition hover:border-zinc-600 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                data-testid={`button-start-choice-${index}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-heading text-[13px] uppercase leading-tight tracking-wide text-zinc-100">{label}</span>
                  <span className="mt-0.5 block text-[9px] leading-snug text-zinc-500">{detail}</span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-orange-400" />
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6" aria-label="PLAYR1 Tools" data-testid="section-hub-player-tools">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-zinc-500">PLAYR1 Tools</p>
              <p className="mt-1 text-xs text-zinc-400">Small challenges. Useful signals.</p>
            </div>
            <span className="font-mono text-[9px] text-zinc-600">03 / TOOLS</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {playerTools.map(({ label, path, icon: Icon, className }) => (
              <button
                key={label}
                type="button"
                onClick={() => navigate(path)}
                data-nav-target={path}
                className="group flex min-h-[95px] min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/55 px-2 py-3 text-center transition hover:border-orange-500/35 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                data-testid={`button-tool-${label.toLowerCase().replaceAll(" ", "-")}`}
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl border transition group-hover:-translate-y-0.5 ${className}`}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="text-[9px] font-bold leading-tight text-zinc-300">{label}</span>
              </button>
            ))}
          </div>
        </section>

        <button
          type="button"
          onClick={() => navigate("/coach-p")}
          data-nav-target="/coach-p"
          data-testid="button-coach-p-prompt"
          className="group relative mt-5 w-full overflow-hidden rounded-[18px] border border-orange-500/30 bg-[linear-gradient(120deg,rgba(249,115,22,0.16),rgba(24,24,27,0.96)_54%)] p-4 text-left transition hover:border-orange-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        >
          <span className="absolute -right-5 -top-8 h-28 w-28 rounded-full border border-orange-500/10 transition group-hover:scale-110" />
          <span className="relative flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-orange-300">
              <MessageCircle className="h-3.5 w-3.5" />
              Coach P · a question to start
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-orange-300 transition group-hover:translate-x-1" />
          </span>
          <span className="relative mt-3 block max-w-[330px] font-heading text-[19px] uppercase leading-[1.15] tracking-wide text-white">
            “How do I create space for a pull-up when my defender goes under the screen?”
          </span>
          <span className="relative mt-3 flex items-center gap-1 text-[10px] font-bold text-orange-300">
            Ask Coach P
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </button>
      </div>
    </main>
  );
}