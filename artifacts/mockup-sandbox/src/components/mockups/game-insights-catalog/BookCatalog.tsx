import { useState } from "react";
import { ArrowDownRight, ArrowRight, BookOpen, ChevronRight, Circle, Crosshair, Sparkles, Target, Zap } from "lucide-react";
import "./_group.css";

type Guide = {
  id: string;
  title: string;
  category: string;
  description: string;
  coverLabel: string;
  coverNote: string;
  icon: typeof Target;
  variant: string;
};

const guides: Guide[] = [
  {
    id: "shooting-mechanics",
    title: "Shooting Mechanics",
    category: "Shooting",
    description: "Find a clear adjustment for your shot and the drills to practice it.",
    coverLabel: "THE SHOT\nSTARTS HERE",
    coverNote: "A form field guide",
    icon: Target,
    variant: "shot",
  },
  {
    id: "footwork-open-shots",
    title: "Footwork That Leads to Open Shots",
    category: "Footwork",
    description: "Build the footwork habits that help you create cleaner looks.",
    coverLabel: "CREATE\nYOUR SPACE",
    coverNote: "Feet first. Eyes up.",
    icon: Crosshair,
    variant: "feet",
  },
  {
    id: "confidence-reality-check",
    title: "Confidence Reality Check",
    category: "Confidence",
    description: "Turn what you feel on court into a useful focus for your next reps.",
    coverLabel: "TRUST WHAT\nYOU'VE BUILT",
    coverNote: "A player’s notebook",
    icon: Sparkles,
    variant: "mind",
  },
  {
    id: "game-speed-shooting",
    title: "Game-Speed Shooting",
    category: "Game performance",
    description: "See what changes when your shot moves from practice into live play.",
    coverLabel: "READY BEFORE\nTHE CATCH",
    coverNote: "Practice at game pace",
    icon: Zap,
    variant: "pace",
  },
];

function CoverArt({ variant }: { variant: string }) {
  if (variant === "shot") {
    return (
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 400" aria-hidden="true">
        <defs>
          <linearGradient id="shot-sky" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#ff914d" />
            <stop offset="1" stopColor="#dc4d27" />
          </linearGradient>
        </defs>
        <rect width="320" height="400" fill="url(#shot-sky)" />
        <circle cx="260" cy="72" r="123" fill="#ffd08a" opacity=".28" />
        <circle cx="260" cy="72" r="82" fill="none" stroke="#ffe0ae" strokeWidth="2" opacity=".8" />
        <circle cx="260" cy="72" r="50" fill="none" stroke="#ffe0ae" strokeWidth="2" opacity=".75" />
        <path d="M-30 329 Q118 238 352 297 L352 430 -30 430Z" fill="#17191a" />
        <path d="M-10 347 Q143 283 342 330" fill="none" stroke="#f9a96f" strokeWidth="2" opacity=".6" />
        <path d="M151 280 L220 186 L278 115" fill="none" stroke="#fff1d3" strokeWidth="3" strokeDasharray="6 9" />
        <circle cx="151" cy="280" r="9" fill="#fff1d3" />
      </svg>
    );
  }
  if (variant === "feet") {
    return (
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 400" aria-hidden="true">
        <rect width="320" height="400" fill="#d8e5d4" />
        <path d="M-20 72 L340 12 M-20 127 L340 67 M-20 182 L340 122 M-20 237 L340 177 M-20 292 L340 232 M-20 347 L340 287 M-20 402 L340 342" stroke="#a6bba7" strokeWidth="1" />
        <path d="M48 0 L105 400 M128 0 L185 400 M208 0 L265 400 M288 0 L345 400" stroke="#a6bba7" strokeWidth="1" />
        <path d="M29 264 C73 253 88 225 118 216 C151 206 169 227 181 250" fill="none" stroke="#e85c39" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 12" />
        <path d="M150 190 L183 249 L243 207" fill="none" stroke="#e85c39" strokeWidth="3" />
        <path d="M235 209 L248 204 L243 218" fill="#e85c39" />
        <circle cx="110" cy="216" r="34" fill="#f5c95c" opacity=".9" />
        <circle cx="110" cy="216" r="10" fill="#21312c" />
        <path d="M18 331 H302" stroke="#e85c39" strokeWidth="2" opacity=".65" />
      </svg>
    );
  }
  if (variant === "mind") {
    return (
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 400" aria-hidden="true">
        <rect width="320" height="400" fill="#c9c1d8" />
        <path d="M0 0 H320 V400 H0Z" fill="#26273b" />
        <path d="M0 270 Q80 225 160 270 T320 270 V400 H0Z" fill="#3f4057" />
        <circle cx="160" cy="177" r="94" fill="#f0d29d" />
        <path d="M160 82 A95 95 0 0 0 160 272Z" fill="#ed815c" />
        <path d="M161 101 V253 M112 119 Q160 147 208 119 M96 177 H224 M112 235 Q160 206 208 235" fill="none" stroke="#25263a" strokeWidth="2" opacity=".7" />
        <path d="M30 48 H102 M218 48 H290" stroke="#f0d29d" strokeWidth="2" />
        <circle cx="160" cy="177" r="108" fill="none" stroke="#f0d29d" strokeWidth="1" opacity=".55" />
        <path d="M24 330 H296" stroke="#ed815c" strokeWidth="5" />
      </svg>
    );
  }
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 320 400" aria-hidden="true">
      <rect width="320" height="400" fill="#d9e6e7" />
      <path d="M0 230 L320 111 V400 H0Z" fill="#f0c75f" />
      <path d="M0 282 L320 164" stroke="#f7efdd" strokeWidth="2" />
      <path d="M0 332 L320 215" stroke="#f7efdd" strokeWidth="2" />
      <path d="M58 0 L180 400 M141 0 L263 400 M224 0 L346 400" stroke="#f7efdd" strokeWidth="2" opacity=".8" />
      <circle cx="240" cy="111" r="48" fill="#ef744b" />
      <path d="M192 111 H288 M240 63 V159 M206 77 Q240 112 274 145 M274 77 Q240 112 206 145" fill="none" stroke="#713b30" strokeWidth="2" opacity=".8" />
      <path d="M30 314 C105 275 162 252 255 213" fill="none" stroke="#293a42" strokeWidth="4" strokeDasharray="3 11" strokeLinecap="round" />
      <path d="M248 205 L266 210 L254 224" fill="#293a42" />
    </svg>
  );
}

export function BookCatalog() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <main
      className="lm-page min-h-[100dvh] px-4 pb-12 pt-6 sm:px-8 sm:pt-9"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, #fff9ee 0, #f5efe4 55%, #ece4d5 100%)",
        color: "#20211e",
      }}
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 flex items-end justify-between gap-4 border-b border-[#d7cebf] pb-5 sm:mb-9 sm:pb-7">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.24em] text-[#df542e] sm:text-[11px]">
              <span className="h-[2px] w-5 bg-[#df542e]" />
              PLAYR1 / PLAYER TOOLS
            </div>
            <h1 className="!m-0 !text-[2.7rem] !leading-[.86] !tracking-[-.045em] text-[#20211e] sm:!text-[4.3rem]">
              Game Insights
            </h1>
            <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-[#68675f] sm:mt-4 sm:text-[15px]">
              Four field guides for turning what you notice into what you do next.
            </p>
          </div>
          <div className="mb-1 hidden shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#898478] sm:flex">
            <BookOpen className="h-4 w-4 text-[#df542e]" />
            Vol. 01 <span className="text-[#c6bcac]">/</span> On-court
          </div>
        </header>

        <div className="mb-4 flex items-center justify-between sm:mb-5">
          <p className="m-0 text-[10px] font-extrabold uppercase tracking-[.2em] text-[#777367]">The PLAYR1 field guide series</p>
          <p className="m-0 text-[10px] font-semibold tracking-[.12em] text-[#a19a8d]">01—04</p>
        </div>

        <section aria-label="Game insight field guides" className="grid grid-cols-2 items-start gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4 lg:gap-x-7">
          {guides.map((guide, index) => {
            const Icon = guide.icon;
            const isSelected = selected === guide.id;
            return (
              <button
                key={guide.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelected(isSelected ? null : guide.id)}
                className="group min-w-0 appearance-none border-0 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#df542e] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f5efe4]"
              >
                <div className={`relative mx-auto aspect-[.78] w-full max-w-[310px] overflow-hidden rounded-[3px] shadow-[5px_7px_0_#c7bdaE,8px_11px_18px_rgba(50,40,27,.16)] transition-transform duration-300 group-hover:-translate-y-1.5 group-active:translate-y-0 group-active:scale-[.985] ${isSelected ? "ring-2 ring-[#df542e] ring-offset-4 ring-offset-[#f5efe4]" : ""}`}>
                  <CoverArt variant={guide.variant} />
                  <div className="absolute inset-y-0 left-0 w-[7px] bg-black/15" />
                  <div className={`absolute inset-0 ${guide.variant === "shot" ? "text-[#fff1d5]" : guide.variant === "feet" ? "text-[#22352f]" : guide.variant === "mind" ? "text-[#fff0d2]" : "text-[#253a40]"}`}>
                    <div className="absolute left-4 right-3 top-4 flex items-center justify-between sm:left-5 sm:right-4 sm:top-5">
                      <span className="text-[8px] font-extrabold uppercase tracking-[.2em] sm:text-[9px]">PLAYR1 · FIELD NOTES</span>
                      <span className="font-mono text-[9px] opacity-70">0{index + 1}</span>
                    </div>
                    <div className="absolute left-4 right-3 top-[25%] sm:left-5 sm:right-4">
                      <h2 className="!m-0 whitespace-pre-line !text-[1.55rem] !leading-[.9] !tracking-[-.03em] sm:!text-[2rem]">{guide.coverLabel}</h2>
                      <p className="mt-2 text-[9px] font-semibold tracking-[.05em] opacity-85 sm:mt-3 sm:text-[11px]">{guide.coverNote}</p>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between sm:bottom-5 sm:left-5 sm:right-5">
                      <span className="max-w-[72%] text-[8px] font-bold uppercase leading-snug tracking-[.13em] opacity-85 sm:text-[9px]">Notice it.<br />Work on it.</span>
                      <Icon className="h-6 w-6 opacity-90 sm:h-7 sm:w-7" strokeWidth={1.5} />
                    </div>
                    {guide.variant === "mind" && <Circle className="absolute right-5 top-[64%] h-7 w-7 opacity-70" strokeWidth={1} />}
                    {guide.variant === "pace" && <ArrowDownRight className="absolute right-[22%] top-[49%] h-8 w-8 rotate-[-25deg] opacity-70" strokeWidth={1.4} />}
                  </div>
                  <div className="absolute inset-y-0 left-0 w-[2px] bg-white/20" />
                </div>
                <div className="mx-auto mt-4 max-w-[310px] px-1 sm:mt-5">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[9px] font-extrabold uppercase tracking-[.17em] text-[#dc5b36]">{guide.category}</span>
                    <span className="text-[9px] font-semibold text-[#9b9588]">GUIDE 0{index + 1}</span>
                  </div>
                  <h3 className="!m-0 !text-[1.15rem] !leading-[.98] !tracking-[-.015em] text-[#262621] sm:!text-[1.45rem]">{guide.title}</h3>
                  <p className="mb-0 mt-2 text-[11px] leading-[1.55] text-[#6e6b62] sm:mt-2.5 sm:text-[12px]">{guide.description}</p>
                  <span className={`mt-3 inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[.14em] transition-colors sm:mt-4 ${isSelected ? "text-[#b74427]" : "text-[#33342e] group-hover:text-[#dc5b36]"}`}>
                    {isSelected ? "Selected" : "Open guide"}
                    {isSelected ? <ChevronRight className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />}
                  </span>
                </div>
              </button>
            );
          })}
        </section>

        <footer className="mt-9 flex items-center justify-between border-t border-[#d7cebf] pt-4 text-[9px] font-bold uppercase tracking-[.17em] text-[#938c7e] sm:mt-12 sm:pt-5">
          <span>PLAYR1 · Train with purpose</span>
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#df633b]" />Built for your next rep</span>
        </footer>
      </div>
    </main>
  );
}
