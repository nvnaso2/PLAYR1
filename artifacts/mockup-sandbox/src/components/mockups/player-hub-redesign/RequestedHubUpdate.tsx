import { ArrowUpRight, BookOpen, ChevronRight, Dumbbell, Layers3, MessageCircle } from "lucide-react";
import "./_group.css";

const coachPrompt = "What is one adjustment I can make to show my shooting when the game speeds up?";
const suggestedDrills = [
  { title: "Change-of-Pace Handle Series", detail: "Ball handling · Advanced · 12 min" },
  { title: "Quick-Release Spot-Up", detail: "Shooting · Advanced · 15 min" },
  { title: "Read-and-React Finishing", detail: "Finishing · Intermediate · 10 min" },
];

function navigate(_path: string) {
  // Preview actions are intentionally inert.
}

export function RequestedHubUpdate() {
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
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">TRAINING SNAPSHOT</p>
            <button type="button" onClick={() => navigate("/progress?from=hub")} className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-orange-400">
              Full dashboard <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex justify-end">
            <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-600">Past month</p>
          </div>
          <div className="rounded-2xl border border-zinc-700 bg-zinc-950 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Your daily anchor</p>
                <p className="mt-1 text-2xl font-black text-white">12 day streak</p>
              </div>
              <div className="flex h-10 items-end gap-1" aria-label="Seven day activity">
                {[18, 12, 25, 4, 20, 30, 15].map((height, index) => (
                  <span key={index} className="w-1.5 rounded-full bg-orange-500" style={{ height }} />
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 divide-x divide-zinc-800 border-t border-white/10 pt-3">
              <div><p className="font-mono text-lg font-bold text-white">38</p><p className="text-[9px] uppercase text-zinc-500">Sessions</p></div>
              <div className="px-3"><p className="font-mono text-lg font-bold text-white">14h</p><p className="text-[9px] uppercase text-zinc-500">Time trained</p></div>
              <div className="pl-3"><p className="font-mono text-lg font-bold text-white">51%</p><p className="text-[9px] uppercase text-zinc-500">FG made</p></div>
            </div>
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
          <div className="space-y-2">
            {suggestedDrills.map((drill, index) => (
              <button
                key={drill.title}
                type="button"
                onClick={() => navigate(`/drill/${index + 1}`)}
                className="group flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-left transition hover:border-orange-500/40"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-orange-500/25 bg-orange-500/10 text-orange-300">
                  <Dumbbell className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-zinc-100">{drill.title}</span>
                  <span className="mt-0.5 block truncate text-[10px] capitalize text-zinc-500">{drill.detail}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-orange-300" />
              </button>
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
              className="group flex min-h-[104px] flex-col gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-left text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800"
              data-testid="button-start-coach-p-prompt"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400"><MessageCircle className="h-4 w-4" /></span>
              <span>
                <span className="block font-heading text-sm uppercase leading-tight tracking-wide">A question for Coach P</span>
                <span className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-orange-500/20 bg-zinc-950/80 px-2 py-1.5 text-[10px] leading-snug text-zinc-300">
                  <MessageCircle className="mt-0.5 h-3 w-3 shrink-0 text-orange-300" />
                  <span className="line-clamp-2">“{coachPrompt}”</span>
                </span>
              </span>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}