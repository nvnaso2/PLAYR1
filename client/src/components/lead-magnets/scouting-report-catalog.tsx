import { Activity, ArrowUpRight, Brain, Footprints, Target } from "lucide-react";

type LeadMagnetId =
  | "shooting-mechanics"
  | "footwork-open-shots"
  | "confidence-reality-check"
  | "game-speed-shooting";

const quizzes: {
  id: LeadMagnetId;
  title: string;
  category: string;
  Icon: typeof Target;
}[] = [
  { id: "shooting-mechanics", title: "Shooting Mechanics", category: "Form / Release", Icon: Target },
  { id: "footwork-open-shots", title: "Footwork That Leads to Open Shots", category: "Base / Separation", Icon: Footprints },
  { id: "confidence-reality-check", title: "Confidence Reality Check", category: "Mindset / Momentum", Icon: Brain },
  { id: "game-speed-shooting", title: "Game-Speed Shooting", category: "Pace / Pressure", Icon: Activity },
];

export function LeadMagnetCatalog({ onSelect }: { onSelect: (id: LeadMagnetId) => void }) {
  return (
    <main
      className="lm-page min-h-full px-4 py-7 text-white sm:px-8 sm:py-10"
      style={{ background: "#050505" }}
    >
      <style>{`
        .game-insights-title,
        .game-insights-quiz-title {
          font-family: "Barlow Condensed", Impact, sans-serif;
          text-transform: uppercase;
        }
        .game-insights-quiz {
          transition: border-color 160ms ease, transform 160ms ease;
        }
        .game-insights-quiz:hover { transform: translateY(-1px); }
        @media (prefers-reduced-motion: reduce) {
          .game-insights-quiz { transition-duration: .01ms; }
        }
      `}</style>
      <div className="mx-auto max-w-[940px]">
        <h1 className="game-insights-title mb-5 border-l-[3px] border-orange-500 pl-3 text-[2.35rem] font-extrabold leading-none tracking-[-.02em] text-white sm:mb-6 sm:text-[2.8rem]">
          Game Insights
        </h1>
        <section aria-label="Game insight quizzes" className="grid grid-cols-1 gap-3">
          {quizzes.map(({ Icon, ...quiz }) => (
            <button
              key={quiz.id}
              type="button"
              onClick={() => onSelect(quiz.id)}
              aria-label={`Start ${quiz.title}`}
              className="game-insights-quiz group flex min-h-[126px] w-full flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-black p-4 text-left shadow-none hover:border-orange-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400 sm:min-h-[138px] sm:p-5"
              data-testid={`card-lead-magnet-${quiz.id}`}
            >
              <span className="flex w-full items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-500/25 bg-gradient-to-br from-orange-500/20 to-orange-500/[0.04] text-orange-300">
                    <Icon className="h-[19px] w-[19px]" strokeWidth={1.8} />
                  </span>
                  <span className="truncate text-[10px] font-bold uppercase leading-tight tracking-[.12em] text-zinc-400 sm:text-[11px]">
                  {quiz.category}
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-orange-400/70 transition-colors group-hover:text-orange-300" />
              </span>
              <span className="game-insights-quiz-title block pr-2 text-[1.55rem] font-extrabold leading-[.98] tracking-[-.015em] text-white sm:text-[1.8rem]">
                {quiz.title}
              </span>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}
