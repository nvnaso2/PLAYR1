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
        .scout-report .quiz-choice { transition: border-color 160ms ease, background-color 160ms ease, transform 160ms ease; }
        .scout-report .quiz-choice:hover { transform: translateY(-2px); }
        @media (prefers-reduced-motion: reduce) { .scout-report .quiz-choice { transition-duration: .01ms; } }
      `}</style>
      <div className="scout-report mx-auto max-w-[940px]">
        <h1 className="mb-5 border-l-[3px] border-orange-500 pl-3 text-[2.35rem] font-extrabold leading-none tracking-[-.02em] text-white sm:mb-6 sm:text-[2.8rem]">GAME INSIGHTS</h1>
        <section aria-label="Game insight quizzes" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
          {drills.map(({ Icon, ...drill }) => {
            const isSelected = selected === drill.id;
            return (
              <button
                key={drill.id}
                type="button"
                onClick={() => setSelected(drill.id)}
                aria-pressed={isSelected}
                className={`quiz-choice group flex min-h-[82px] w-full items-center gap-3 rounded-lg border px-3.5 py-3 text-left shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 sm:min-h-[90px] sm:px-4 ${isSelected ? "border-orange-500/60 bg-[#1b1714]" : "border-zinc-800 bg-zinc-950/70 hover:border-orange-500/35"}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-orange-500/20 bg-orange-500/10 text-orange-400 sm:h-10 sm:w-10">
                  <Icon className="h-[17px] w-[17px]" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="mb-1 block truncate text-[9px] font-bold uppercase leading-tight tracking-[.12em] text-zinc-500 sm:text-[10px]">{drill.tag}</span>
                  <span className="drill-title block text-[1.28rem] font-extrabold uppercase leading-[.98] tracking-[-.015em] text-white sm:text-[1.45rem]">{drill.title}</span>
                </span>
                <ArrowUpRight className={`h-4 w-4 shrink-0 transition-colors ${isSelected ? "text-orange-400" : "text-zinc-600 group-hover:text-orange-400"}`} />
              </button>
            );
          })}
        </section>
      </div>
    </main>
  );
}
