import { ArrowLeft, ArrowRight, Brain, Footprints, Wrench } from "lucide-react";
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

type CoverStyle = "book" | "bleed";

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

function GuideArtwork({ cover, palette }: { cover: Guide["cover"]; palette: Guide["palette"] }) {
  const ArtworkIcon = {
    shot: Wrench,
    feet: Footprints,
    mind: Brain,
    pace: ArrowRight,
  }[cover];
  const isOrange = palette === "orange";

  return (
    <div
      className={`lm-quiz-artwork absolute inset-0 flex items-center justify-center ${
        isOrange ? "lm-quiz-artwork-orange" : "lm-quiz-artwork-mono"
      }`}
      aria-hidden="true"
    >
      {cover === "pace" ? (
        <div className="lm-speed-arrow-group -translate-y-7 flex w-[68%] flex-col items-center gap-1">
          {[0, 1, 2].map((arrow) => (
            <ArrowRight
              key={arrow}
              className={`lm-speed-arrow h-10 w-full ${arrow === 1 ? "translate-x-2" : ""}`}
              strokeWidth={3}
            />
          ))}
        </div>
      ) : (
        <ArtworkIcon className="h-[46%] w-[46%]" strokeWidth={2.6} />
      )}
    </div>
  );
}

export function LeadMagnetCatalog({ onSelect }: { onSelect: (id: GuideId) => void }) {
  const coverStyles: { id: CoverStyle; title: string }[] = [
    { id: "book", title: "Book Covers" },
    { id: "bleed", title: "Full-Bleed Covers" },
  ];

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
          <h1 data-testid="text-game-insights-title" className="m-0 text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">Game Insights</h1>
        </header>

        <div className="mt-6 space-y-9 sm:mt-8 sm:space-y-12">
          {coverStyles.map((style, styleIndex) => (
            <section key={style.id} aria-label={`${style.title} quiz options`}>
              <div className="mb-3 flex items-center gap-3 sm:mb-4">
                <h2 className="m-0 text-lg font-black uppercase tracking-wide text-white sm:text-xl">{style.title}</h2>
                <span className="h-px flex-1 bg-white/15" aria-hidden="true" />
                <span className="font-mono text-xs tracking-[.16em] text-zinc-500">0{styleIndex + 1} / 02</span>
              </div>
              <div className="lm-book-grid grid grid-cols-2 items-start gap-x-3 gap-y-5 sm:gap-x-5 sm:gap-y-7 lg:grid-cols-4">
                {guides.map((guide) => (
                  <button
                    key={`${style.id}-${guide.id}`}
                    type="button"
                    onClick={() => onSelect(guide.id)}
                    className={`lm-quiz-tile lm-quiz-tile-${guide.palette} lm-quiz-${style.id} group relative min-w-0 appearance-none overflow-hidden border p-0 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-4 focus-visible:ring-offset-black`}
                    data-testid={`card-lead-magnet-${style.id}-${guide.id}`}
                    aria-label={`Start the ${guide.title} quiz, ${style.title.toLowerCase()} version`}
                  >
                    <div className="lm-quiz-tile-art absolute inset-0">
                      <GuideArtwork cover={guide.cover} palette={guide.palette} />
                    </div>
                    <div className="lm-quiz-tile-title absolute inset-x-0 bottom-0 px-3 pb-4 pt-14 sm:px-4 sm:pb-5">
                      <h3 className="m-0 text-[1.35rem] font-black uppercase leading-[.98] tracking-[-.015em] sm:text-[1.65rem]">
                        {guide.title}
                      </h3>
                    </div>
                    {style.id === "book" && (
                      <>
                        <span className="lm-book-spine absolute inset-y-0 left-0" aria-hidden="true" />
                        <span className="lm-book-page-edge absolute inset-y-2 right-0" aria-hidden="true" />
                      </>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
