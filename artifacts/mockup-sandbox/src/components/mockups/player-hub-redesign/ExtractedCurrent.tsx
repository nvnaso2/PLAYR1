import { BookOpen, ChevronRight, ClipboardCheck, Dumbbell, Layers3, MessageCircle } from "lucide-react";
import "./_group.css";

const trainingChoices = [
  { label: "Log a session", detail: "Track today's work", path: "/log", icon: Dumbbell },
  { label: "Start a program", detail: "Follow a plan", path: "/programs", icon: Layers3 },
  { label: "Drill library", detail: "Find your next drill", path: "/drills", icon: BookOpen },
  { label: "Custom workout", detail: "Request a session built for you", path: "/custom-workouts", icon: ClipboardCheck },
];

const coachPrompt = "What is the one adjustment that would make the biggest difference in my next game?";

function navigate(_path: string) {
  // Extracted navigation is intentionally inert in the preview.
}

export function ExtractedCurrent() {
  return (
    <main className="player-hub-current min-h-[100dvh] bg-background px-4 pb-8 pt-5 text-foreground">
      <div className="mx-auto max-w-[430px]">
        <header>
          <p className="text-[10px] font-medium text-zinc-500">Monday, October 4</p>
          <h1 className="mt-1 font-heading text-[28px] uppercase leading-none tracking-wide text-white">Good afternoon,<br /><span className="text-orange-400">Jordan.</span></h1>
        </header>

        <section className="mt-5 space-y-3" data-testid="card-progress-preview">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">TRAINING SNAPSHOT</p>
              <h2 className="mt-1 text-lg font-black text-white">See your work add up.</h2>
            </div>
            <button type="button" onClick={() => navigate("/progress?from=hub")} className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-orange-400">
              Full dashboard <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-zinc-600">
            <span className="uppercase tracking-[0.18em]">Past month</span>
            <span>Category 1 of 3 · 8 active days</span>
          </div>
          <div className="rounded-2xl border border-zinc-700 bg-zinc-950 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Your daily anchor</p>
            <p className="mt-1 text-2xl font-black text-white">12 day streak</p>
            <div className="mt-4 grid grid-cols-3 divide-x divide-zinc-800 border-t border-white/10 pt-3">
              <div><p className="font-mono text-lg font-bold text-white">38</p><p className="text-[9px] uppercase text-zinc-500">Sessions</p></div>
              <div className="px-3"><p className="font-mono text-lg font-bold text-white">14h</p><p className="text-[9px] uppercase text-zinc-500">Time trained</p></div>
              <div className="pl-3"><p className="font-mono text-lg font-bold text-white">51%</p><p className="text-[9px] uppercase text-zinc-500">FG made</p></div>
            </div>
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4" data-testid="section-custom-drills">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Custom Drills</p>
          <h2 className="mt-1 text-lg font-black text-white">Your drills, your way.</h2>
          <p className="mt-1 text-sm text-zinc-400">Find and manage the drills you have created for your training.</p>
          <button type="button" onClick={() => navigate("/drills?tab=my-drills")} className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white">
            Open Custom Drills <ChevronRight className="h-4 w-4" />
          </button>
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
                <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-950 text-orange-400">
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block font-heading text-sm uppercase leading-tight tracking-wide">{label}</span>
                  <span className="mt-0.5 block text-[11px] text-zinc-500">{detail}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <button
          type="button"
          onClick={() => navigate("/coach-p")}
          className="mt-5 w-full rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/15 via-zinc-900 to-zinc-950 p-4 text-left"
        >
          <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">
            <MessageCircle className="h-3.5 w-3.5" /> A question for Coach P
          </span>
          <span className="mt-3 block font-heading text-lg uppercase leading-snug tracking-wide text-white">“{coachPrompt}”</span>
          <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-orange-300">Ask Coach P <ChevronRight className="h-3.5 w-3.5" /></span>
        </button>
      </div>
    </main>
  );
}