import { useState } from "react";
import { Activity, ArrowUpRight, Brain, Footprints, Target } from "lucide-react";
import "./_group.css";

const drills = [
  { id: "shooting-mechanics", title: "Shooting Mechanics", number: "01", tag: "FORM / RELEASE", Icon: Target },
  { id: "footwork-open-shots", title: "Footwork That Leads to Open Shots", number: "02", tag: "BASE / SEPARATION", Icon: Footprints },
  { id: "confidence-reality-check", title: "Confidence Reality Check", number: "03", tag: "MINDSET / MOMENTUM", Icon: Brain },
  { id: "game-speed-shooting", title: "Game-Speed Shooting", number: "04", tag: "PACE / PRESSURE", Icon: Activity },
] as const;

export function ScoutingReport() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <main className="lm-page min-h-[100dvh] px-4 py-7 text-white sm:px-8 sm:py-10">
      <style>{`
        .scout-report h1, .scout-report .drill-title { font-family: "Barlow Condensed", Impact, sans-serif; }
        .scout-report .quiz-choice { transition: border-color 160ms ease, transform 160ms ease; }
        .scout-report .quiz-choice:hover { transform: translateY(-1px); }
        @media (prefers-reduced-motion: reduce) { .scout-report .quiz-choice { transition-duration: .01ms; } }
      `}</style>
      <div className="scout-report mx-auto max-w-[940px]">
        <h1 className="mb-5 border-l-[3px] border-orange-500 pl-3 text-[2.35rem] font-extrabold leading-none tracking-[-.02em] text-white sm:mb-6 sm:text-[2.8rem]">GAME INSIGHTS</h1>
        <section aria-label="Game insight quizzes" className="grid grid-cols-1 gap-3">
          {drills.map(({ Icon, ...drill }) => {
            const isSelected = selected === drill.id;
            return (
              <button
                key={drill.id}
                type="button"
                onClick={() => setSelected(drill.id)}
                aria-pressed={isSelected}
                className={`quiz-choice group flex min-h-[126px] w-full flex-col justify-between overflow-hidden rounded-2xl border p-4 text-left shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 sm:min-h-[138px] sm:p-5 ${isSelected ? "border-orange-500/60 bg-gradient-to-b from-orange-950/60 to-black" : "border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-black hover:border-orange-500/40"}`}
              >
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-500/25 bg-gradient-to-br from-orange-500/20 to-orange-500/[0.04] text-orange-300">
                      <Icon className="h-[19px] w-[19px]" strokeWidth={1.8} />
                    </span>
                    <span className="truncate text-[10px] font-bold uppercase leading-tight tracking-[.12em] text-zinc-400 sm:text-[11px]">{drill.tag}</span>
                  </span>
                  <ArrowUpRight className={`h-4 w-4 shrink-0 transition-colors ${isSelected ? "text-orange-300" : "text-orange-400/70 group-hover:text-orange-300"}`} />
                </span>
                <span className="drill-title block pr-2 text-[1.55rem] font-extrabold uppercase leading-[.98] tracking-[-.015em] text-white sm:text-[1.8rem]">{drill.title}</span>
              </button>
            );
          })}
        </section>
      </div>
    </main>
  );
}
