import { ArrowLeft, ArrowRight, Brain, Crosshair, Target, Zap } from "lucide-react";
import "./_group.css";

const leadMagnetCards = [
  {
    id: "shooting-mechanics",
    title: "Shooting Mechanics",
    category: "Shooting",
    description: "Find a clear adjustment for your shot and the drills to practice it.",
    icon: Target,
  },
  {
    id: "footwork-open-shots",
    title: "Footwork That Leads to Open Shots",
    category: "Footwork",
    description: "Build the footwork habits that help you create cleaner looks.",
    icon: Crosshair,
  },
  {
    id: "confidence-reality-check",
    title: "Confidence Reality Check",
    category: "Confidence",
    description: "Turn what you feel on court into a useful focus for your next reps.",
    icon: Brain,
  },
  {
    id: "game-speed-shooting",
    title: "Game-Speed Shooting",
    category: "Game performance",
    description: "See what changes when your shot moves from practice into live play.",
    icon: Zap,
  },
] as const;

export function Current() {
  return (
    <main className="lm-page min-h-screen bg-zinc-950 px-4 pb-10 pt-5 text-white sm:px-6 sm:pt-7">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          className="h-9 gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] px-3 text-zinc-300"
        >
          <ArrowLeft className="mr-1 inline h-4 w-4" />
          Hub
        </button>

        <header className="lm-catalog-heading mb-6 mt-5 max-w-2xl sm:mb-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-400">
            PLAYR1 · Player tools
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Game Insights
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
            Take a short quiz and get customized drills tailored to help improve your game.
          </p>
        </header>

        <section aria-label="Game insight tools">
          <div className="lm-catalog-grid grid gap-3 sm:grid-cols-2 sm:gap-4">
            {leadMagnetCards.map((magnet) => {
              const Icon = magnet.icon;
              return (
                <button
                  key={magnet.id}
                  type="button"
                  className="group flex min-h-44 flex-col rounded-2xl border border-white/[0.08] bg-zinc-900/50 p-4 text-left sm:p-5"
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-500/10 text-orange-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full border border-white/[0.07] bg-black/20 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.13em] text-zinc-500">
                      {magnet.category}
                    </span>
                  </div>
                  <h2 className="mt-4 text-base font-bold leading-snug text-white sm:text-lg">
                    {magnet.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{magnet.description}</p>
                  <span className="mt-auto flex items-center gap-1.5 pt-5 text-xs font-semibold text-orange-300">
                    Explore
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
