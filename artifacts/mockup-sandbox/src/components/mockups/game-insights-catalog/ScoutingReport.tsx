import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Crosshair, MoveUpRight, ScanLine } from "lucide-react";
import "./_group.css";

const drills = [
  { id: "shooting-mechanics", title: "Shooting Mechanics", number: "01", tag: "FORM / RELEASE", metric: "SHOT PROFILE" },
  { id: "footwork-open-shots", title: "Footwork That Leads to Open Shots", number: "02", tag: "BASE / SEPARATION", metric: "MOVEMENT PROFILE" },
  { id: "confidence-reality-check", title: "Confidence Reality Check", number: "03", tag: "MINDSET / MOMENTUM", metric: "CONFIDENCE PROFILE" },
  { id: "game-speed-shooting", title: "Game-Speed Shooting", number: "04", tag: "PACE / PRESSURE", metric: "GAME PROFILE" },
] as const;

function HalfCourt() {
  return (
    <svg viewBox="0 0 560 420" className="h-full w-full" role="img" aria-label="Basketball half-court scouting diagram">
      <defs>
        <pattern id="courtGrid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M28 0H0V28" fill="none" stroke="currentColor" strokeOpacity=".055" strokeWidth="1" />
        </pattern>
        <linearGradient id="courtFade" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ff7626" stopOpacity=".12" />
          <stop offset="1" stopColor="#ff7626" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="560" height="420" fill="url(#courtGrid)" />
      <path d="M70 382V38H490V382" fill="none" stroke="#eee9e2" strokeOpacity=".42" strokeWidth="2" />
      <path d="M70 210H490M188 382V295a92 92 0 0 1 184 0v87M231 382V320a49 49 0 0 1 98 0v62" fill="none" stroke="#eee9e2" strokeOpacity=".34" strokeWidth="2" />
      <path d="M205 38v58a75 75 0 0 0 150 0V38M70 80a190 190 0 0 1 420 0" fill="none" stroke="#eee9e2" strokeOpacity=".26" strokeWidth="2" />
      <path d="M121 310C162 265 180 221 250 198S352 167 401 108" fill="none" stroke="#ff7626" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 12" />
      <path d="M121 310C162 265 180 221 250 198S352 167 401 108L393 130M401 108l-22 6" fill="none" stroke="#ff7626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="121" cy="310" r="9" fill="#ff7626" />
      <circle cx="250" cy="198" r="17" fill="url(#courtFade)" stroke="#ff7626" strokeWidth="2" />
      <circle cx="401" cy="108" r="10" fill="#ff7626" />
      <circle cx="401" cy="108" r="22" fill="none" stroke="#ff7626" strokeOpacity=".45" />
      <g fill="#eee9e2" fillOpacity=".72" fontFamily="monospace" fontSize="10" letterSpacing="1">
        <text x="83" y="366">START</text><text x="413" y="97">RELEASE</text>
        <text x="238" y="230">READ</text><text x="84" y="58">HALF COURT / 01</text>
      </g>
    </svg>
  );
}

export function ScoutingReport() {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedDrill = drills.find((drill) => drill.id === selected);

  return (
    <main className="lm-page min-h-[100dvh] overflow-hidden px-4 pb-10 pt-5 text-white sm:px-7 sm:pt-7">
      <style>{`
        .scout-report { --report-line: rgba(239,235,227,.15); --report-paper: #eee9e2; }
        .scout-report .report-kicker { font-family: "DM Sans", sans-serif; }
        .scout-report .report-title { font-size: clamp(3.5rem, 9vw, 7.8rem); line-height: .78; letter-spacing: -.045em; }
        .scout-report .drill-title { font-family: "Barlow Condensed", Impact, sans-serif; }
        .scout-report .report-grid { background-image: linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px); background-size: 32px 32px; }
        .scout-report .drill-row { transition: background-color 180ms ease, border-color 180ms ease, transform 180ms ease; }
        .scout-report .drill-row:hover { transform: translateX(4px); }
        .scout-report .court-panel::before { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(135deg, rgba(255,118,38,.07), transparent 48%); }
        @media (prefers-reduced-motion: reduce) { .scout-report .drill-row { transition-duration: .01ms; } }
      `}</style>
      <div className="scout-report mx-auto max-w-[1240px]">
        <div className="flex items-center justify-between border-b border-white/15 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center border border-orange-400/70 text-orange-400">
              <Crosshair className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div className="report-kicker text-[11px] font-extrabold uppercase tracking-[.2em]">PLAYR1 <span className="text-orange-400">/</span> PLAYER DEVELOPMENT</div>
          </div>
          <div className="report-kicker hidden items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-zinc-500 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" /> FIELD NOTES <span className="text-zinc-700">—</span> 2025 / 01
          </div>
        </div>

        <header className="relative grid gap-8 pb-8 pt-9 sm:pb-10 sm:pt-12 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
          <div className="relative z-10">
            <p className="report-kicker mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.25em] text-orange-400 sm:text-xs">
              <ScanLine className="h-3.5 w-3.5" /> GAME INSIGHTS <span className="text-zinc-600">/</span> SCOUTING REPORT
            </p>
            <h1 className="report-title m-0 max-w-[760px] font-black uppercase text-[#f3f0e9]">Know your<br /><span className="text-orange-400">next move.</span></h1>
            <div className="mt-7 flex items-center gap-4">
              <span className="h-px w-10 bg-orange-400" />
              <p className="report-kicker m-0 text-[11px] font-semibold uppercase tracking-[.12em] text-zinc-400">Choose a report. Get to work.</p>
            </div>
          </div>
          <div className="report-kicker relative hidden justify-self-end pb-1 text-right lg:block">
            <div className="text-[9px] font-bold uppercase tracking-[.25em] text-zinc-500">PLAYER DEVELOPMENT SERIES</div>
            <div className="mt-2 text-5xl font-black leading-none text-white/10">PLAYR1</div>
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 top-[-3rem] hidden h-[23rem] w-[23rem] rounded-full border border-white/[.045] lg:block">
            <span className="absolute inset-8 rounded-full border border-white/[.05]" />
            <span className="absolute inset-[5.5rem] rounded-full border border-orange-400/10" />
          </div>
        </header>

        <section aria-label="Choose a game insight quiz" className="report-grid grid overflow-hidden border border-white/15 bg-[#111112] lg:grid-cols-[1.02fr_.98fr]">
          <div className="court-panel relative min-h-[260px] border-b border-white/15 p-4 sm:min-h-[360px] sm:p-7 lg:border-b-0 lg:border-r">
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="report-kicker m-0 text-[9px] font-bold uppercase tracking-[.22em] text-zinc-500">COURT MAP / SHOT SEQUENCE</p>
                <p className="report-kicker mt-1 text-[10px] font-medium tracking-[.08em] text-zinc-400">READ THE SPACE. OWN THE REP.</p>
              </div>
              <span className="report-kicker border border-white/15 px-2 py-1 text-[9px] font-bold tracking-[.14em] text-zinc-400">01—04</span>
            </div>
            <div className="absolute inset-x-3 bottom-3 top-[4.5rem] sm:inset-x-7 sm:bottom-5 sm:top-[5.5rem]">
              <HalfCourt />
            </div>
            <div className="report-kicker absolute bottom-4 left-4 z-10 text-[9px] font-bold tracking-[.15em] text-zinc-600 sm:bottom-6 sm:left-7">PLAY DESIGN / 001</div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b border-white/15 px-5 py-4 sm:px-7">
              <h2 className="m-0 text-xl font-black tracking-wide text-white sm:text-2xl">SELECT YOUR FOCUS</h2>
              <span className="report-kicker text-[9px] font-bold tracking-[.16em] text-zinc-600">4 REPORTS</span>
            </div>
            <div className="flex flex-1 flex-col">
              {drills.map((drill) => {
                const isSelected = selected === drill.id;
                return (
                  <button
                    key={drill.id}
                    type="button"
                    onClick={() => setSelected(drill.id)}
                    aria-pressed={isSelected}
                    className={`drill-row group relative flex min-h-[86px] w-full items-center gap-4 border-b border-white/10 px-5 py-4 text-left last:border-b-0 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400 sm:min-h-[96px] sm:gap-5 sm:px-7 ${isSelected ? "bg-orange-400/[.09]" : "hover:bg-white/[.035]"}`}
                  >
                    <span className={`report-kicker w-8 shrink-0 text-xs font-bold tracking-[.08em] ${isSelected ? "text-orange-400" : "text-zinc-600"}`}>{drill.number}</span>
                    <span className={`h-8 w-px shrink-0 ${isSelected ? "bg-orange-400" : "bg-white/15"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="report-kicker mb-1 block text-[8px] font-bold tracking-[.18em] text-zinc-500 sm:text-[9px]">{drill.tag}</span>
                      <span className="drill-title block max-w-[350px] text-[1.25rem] font-extrabold uppercase leading-[.98] tracking-[-.02em] text-[#f3f0e9] sm:text-[1.55rem]">{drill.title}</span>
                    </span>
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center border transition-colors ${isSelected ? "border-orange-400 bg-orange-400 text-[#14110e]" : "border-white/15 text-orange-400 group-hover:border-orange-400"}`}>
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex min-h-[62px] items-center justify-between gap-3 border-t border-white/15 bg-black/20 px-5 py-3 sm:px-7">
              <div className="report-kicker text-[9px] font-bold uppercase tracking-[.15em] text-zinc-500 sm:text-[10px]">
                {selectedDrill ? <><span className="text-orange-400">{selectedDrill.metric}</span><span className="mx-2 text-zinc-700">/</span>READY TO BEGIN</> : "SELECT A REPORT TO BEGIN"}
              </div>
              <MoveUpRight className={`h-4 w-4 shrink-0 ${selectedDrill ? "text-orange-400" : "text-zinc-700"}`} />
            </div>
          </div>
        </section>

        <footer className="report-kicker mt-5 flex flex-col gap-2 text-[9px] font-bold uppercase tracking-[.18em] text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <span>PLAYR1 ATHLETE PERFORMANCE <span className="mx-2 text-zinc-800">/</span> SCOUTING SERIES</span>
          <span className="flex items-center gap-2"><ArrowDownRight className="h-3 w-3 text-orange-400" /> ALL REPORTS BUILT FOR THE NEXT REP</span>
        </footer>
      </div>
    </main>
  );
}
