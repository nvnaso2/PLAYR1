import { ArrowLeft, Brain } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

type GuideId =
  | "shooting-mechanics"
  | "footwork-open-shots"
  | "confidence-reality-check"
  | "game-speed-shooting";

type Guide = {
  id: GuideId;
  title: string;
  cover: "shot" | "feet" | "mind" | "pace";
  palette: "orange" | "mono";
};

const guides: Guide[] = [
  {
    id: "shooting-mechanics",
    title: "Shooting Mechanics",
    cover: "shot",
    palette: "orange",
  },
  {
    id: "footwork-open-shots",
    title: "Footwork That Leads to Open Shots",
    cover: "feet",
    palette: "orange",
  },
  {
    id: "confidence-reality-check",
    title: "Confidence Reality Check",
    cover: "mind",
    palette: "mono",
  },
  {
    id: "game-speed-shooting",
    title: "Game-Speed Shooting",
    cover: "pace",
    palette: "mono",
  },
];

function GuideArtwork({ cover }: { cover: Guide["cover"] }) {
  if (cover === "shot") {
    return (
      <svg viewBox="0 0 320 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="guide-shot-gradient" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#ff914d" />
            <stop offset="1" stopColor="#d74e29" />
          </linearGradient>
        </defs>
        <rect width="320" height="400" fill="url(#guide-shot-gradient)" />
        <circle cx="260" cy="82" r="111" fill="#ffd190" opacity=".24" />
        <circle cx="260" cy="82" r="74" fill="none" stroke="#fff0d3" strokeWidth="2" opacity=".8" />
        <circle cx="260" cy="82" r="42" fill="none" stroke="#fff0d3" strokeWidth="2" opacity=".8" />
        <path d="M-20 324Q118 246 340 296v130H-20Z" fill="#202020" />
        <path d="M-10 346Q150 286 340 328" fill="none" stroke="#f5a56d" strokeWidth="2" opacity=".7" />
        <path d="M68 290 149 253 220 189 277 119" fill="none" stroke="#fff1d3" strokeWidth="3" strokeDasharray="5 9" />
        <circle cx="68" cy="290" r="8" fill="#fff1d3" />
      </svg>
    );
  }

  if (cover === "feet") {
    return (
      <svg viewBox="0 0 320 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <rect width="320" height="400" fill="#f36a2b" />
        <path d="M28 40H292V360H28Z" fill="#171718" />
        <path d="M28 198H292M78 360V294a82 82 0 0 1 164 0v66" fill="none" stroke="#fff1d5" strokeWidth="10" />
        <circle cx="78" cy="174" r="22" fill="#f36a2b" />
        <circle cx="242" cy="174" r="22" fill="#f36a2b" />
        <path d="M78 174 131 229M242 174 189 229" stroke="#f36a2b" strokeWidth="14" strokeLinecap="round" />
        <path d="m144 215 17 20 17-20" fill="none" stroke="#fff1d5" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="161" cy="292" r="25" fill="#fff1d5" />
        <path d="M145 292a16 16 0 0 0 32 0" fill="none" stroke="#171718" strokeWidth="7" />
      </svg>
    );
  }

  if (cover === "mind") {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white" aria-hidden="true">
        <div className="flex h-[72%] w-[72%] items-center justify-center rounded-full border-[12px] border-black bg-white">
          <Brain className="h-[72%] w-[72%] text-black" strokeWidth={2.8} />
        </div>
      </div>
    );
  }

  return (
    <svg viewBox="0 0 320 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <rect width="320" height="400" fill="#fff" />
      <path d="M34 35H286V365H34Z" fill="none" stroke="#111" strokeWidth="13" />
      <path d="M34 200H286M90 365V284a70 70 0 0 1 140 0v81" fill="none" stroke="#111" strokeWidth="12" />
      <path d="M126 365v-57a34 34 0 0 1 68 0v57" fill="none" stroke="#111" strokeWidth="10" />
      <circle cx="74" cy="161" r="26" fill="#111" />
      <circle cx="246" cy="161" r="26" fill="#111" />
      <circle cx="160" cy="275" r="24" fill="#111" />
      <circle cx="74" cy="161" r="10" fill="#fff" />
      <circle cx="246" cy="161" r="10" fill="#fff" />
      <circle cx="160" cy="275" r="10" fill="#fff" />
      <path d="M100 105h120" stroke="#111" strokeWidth="14" strokeLinecap="round" />
      <path d="M112 387h96" stroke="#111" strokeWidth="11" strokeLinecap="round" />
    </svg>
  );
}

export function LeadMagnetCatalog({ onSelect }: { onSelect: (id: GuideId) => void }) {
  return (
    <main className="lm-library min-h-full px-4 pb-12 pt-5 text-white sm:px-7 sm:pt-7">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center gap-4">
          <Link href="/hub">
            <Button
              type="button"
              variant="ghost"
              data-testid="button-back-to-hub"
              className="h-9 gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 text-xs font-semibold text-zinc-300 transition hover:border-white/25 hover:bg-white/[0.07] hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <h1 data-testid="text-game-insights-title" className="m-0 text-lg font-black uppercase tracking-wide text-white sm:text-xl">Game Insights</h1>
        </header>

        <section aria-label="Game insight quizzes" className="lm-book-grid mt-6 grid grid-cols-2 items-start gap-x-3 gap-y-5 sm:mt-8 sm:gap-x-5 sm:gap-y-7 lg:grid-cols-4">
          {guides.map((guide) => (
            <button
              key={guide.id}
              type="button"
              onClick={() => onSelect(guide.id)}
              className={`lm-quiz-tile lm-quiz-tile-${guide.palette} group min-w-0 appearance-none overflow-hidden rounded-2xl border p-0 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-4 focus-visible:ring-offset-black`}
              data-testid={`card-lead-magnet-${guide.id}`}
              aria-label={`Start the ${guide.title} quiz`}
            >
              <div className="lm-quiz-tile-art relative aspect-[.88] w-full">
                <GuideArtwork cover={guide.cover} />
              </div>
              <div className="lm-quiz-tile-title px-3 py-3 sm:px-4 sm:py-4">
                <h2 className="m-0 text-base font-black uppercase leading-[.92] tracking-[-.025em] sm:text-xl">
                  {guide.title}
                </h2>
              </div>
            </button>
          ))}
        </section>
      </div>
    </main>
  );
}
