import { ArrowLeft, ArrowUpRight, Crosshair, ScanLine } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

type LeadMagnetId =
  | "shooting-mechanics"
  | "footwork-open-shots"
  | "confidence-reality-check"
  | "game-speed-shooting";

const reports: { id: LeadMagnetId; title: string; tag: string }[] = [
  { id: "shooting-mechanics", title: "Shooting Mechanics", tag: "FORM / RELEASE" },
  { id: "footwork-open-shots", title: "Footwork That Leads to Open Shots", tag: "BASE / SEPARATION" },
  { id: "confidence-reality-check", title: "Confidence Reality Check", tag: "MINDSET / MOMENTUM" },
  { id: "game-speed-shooting", title: "Game-Speed Shooting", tag: "PACE / PRESSURE" },
];

function HalfCourt() {
  return (
    <svg viewBox="0 0 560 420" className="h-full w-full" role="img" aria-label="Basketball half-court scouting diagram">
      <defs>
        <pattern id="scouting-court-grid" width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M28 0H0V28" fill="none" stroke="currentColor" strokeOpacity=".055" strokeWidth="1" />
        </pattern>
        <linearGradient id="scouting-court-focus" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ff7626" stopOpacity=".18" />
          <stop offset="1" stopColor="#ff7626" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="560" height="420" fill="url(#scouting-court-grid)" />
      <path d="M70 382V38H490V382" fill="none" stroke="#eee9e2" strokeOpacity=".48" strokeWidth="2.5" />
      <path d="M70 210H490M188 382V295a92 92 0 0 1 184 0v87M231 382V320a49 49 0 0 1 98 0v62" fill="none" stroke="#eee9e2" strokeOpacity=".38" strokeWidth="2.5" />
      <path d="M205 38v58a75 75 0 0 0 150 0V38M70 80a190 190 0 0 1 420 0" fill="none" stroke="#eee9e2" strokeOpacity=".3" strokeWidth="2" />
      <path d="M121 310C162 265 180 221 250 198S352 167 401 108" fill="none" stroke="#ff7626" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 12" />
      <path d="M121 310C162 265 180 221 250 198S352 167 401 108l-8 22m8-22-22 6" fill="none" stroke="#ff7626" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="121" cy="310" r="10" fill="#ff7626" />
      <circle cx="250" cy="198" r="18" fill="url(#scouting-court-focus)" stroke="#ff7626" strokeWidth="2.5" />
      <circle cx="401" cy="108" r="11" fill="#ff7626" />
      <circle cx="401" cy="108" r="24" fill="none" stroke="#ff7626" strokeOpacity=".5" strokeWidth="2" />
      <g fill="#eee9e2" fillOpacity=".72" fontFamily="monospace" fontSize="10" letterSpacing="1">
        <text x="83" y="366">START</text>
        <text x="413" y="97">RELEASE</text>
        <text x="238" y="230">READ</text>
        <text x="84" y="58">HALF COURT / 01</text>
      </g>
    </svg>
  );
}

export function LeadMagnetCatalog({ onSelect }: { onSelect: (id: LeadMagnetId) => void }) {
  return (
    <main className="lm-page min-h-full overflow-hidden px-4 pb-10 pt-5 text-white sm:px-7 sm:pt-7">
      <style>{`
        .scout-report { --report-line: rgba(239,235,227,.15); }
        .scout-report .report-kicker { font-family: "DM Sans", sans-serif; }
        .scout-report .report-title { font-size: clamp(3.3rem, 9vw, 7.8rem); line-height: .78; letter-spacing: -.045em; }
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
            <Link href="/hub">
              <Button
                type="button"
                variant="ghost"
                data-testid="button-back-to-hub"
                className="h-9 gap-2 rounded-lg border border-white/10 bg-white/[0.025] px-3 text-zinc-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <span className="hidden h-9 w-9 items-center justify-center border border-orange-400/70 text-orange-400 sm:flex">
              <Crosshair className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <div className="report-kicker text-[10px] font-extrabold uppercase tracking-[.16em] sm:text-[11px]">
              PLAYR1 <span className="text-orange-400">/</span> PLAYER DEVELOPMENT
            </div>
          </div>
          <div className="report-kicker hidden items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-zinc-500 md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-400" /> FIELD NOTES <span className="text-zinc-700">—</span> 01 / 04
          </div>
        </div>

        <header className="relative grid gap-8 pb-8 pt-9 sm:pb-10 sm:pt-12 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
          <div className="relative z-10">
            <p className="report-kicker mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.25em] text-orange-400 sm:text-xs">
              <ScanLine className="h-3.5 w-3.5" /> GAME INSIGHTS <span className="text-zinc-600">/</span> SCOUTING REPORT
            </p>
            <h1 className="report-title m-0 max-w-[760px] font-black uppercase text-[#f3f0e9]">
              Know your<br /><span className="text-orange-400">next move.</span>
            </h1>
            <div className="mt-7 flex items-center gap-4">
              <span className="h-px w-10 bg-orange-400" />
              <p className="report-kicker m-0 text-[11px] font-semibold uppercase tracking-[.12em] text-zinc-400">
                Choose a report. Get to work.
              </p>
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
              {reports.map((report, index) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => onSelect(report.id)}
                  aria-label={`Start ${report.title}`}
                  className="drill-row group relative flex min-h-[86px] w-full items-center gap-4 border-b border-white/10 px-5 py-4 text-left last:border-b-0 hover:bg-white/[.035] focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400 sm:min-h-[96px] sm:gap-5 sm:px-7"
                  data-testid={`card-lead-magnet-${report.id}`}
                >
                  <span className="report-kicker w-8 shrink-0 text-xs font-bold tracking-[.08em] text-zinc-600">{`0${index + 1}`}</span>
                  <span className="h-8 w-px shrink-0 bg-white/15 transition-colors group-hover:bg-orange-400" />
                  <span className="min-w-0 flex-1">
                    <span className="report-kicker mb-1 block text-[8px] font-bold tracking-[.18em] text-zinc-500 sm:text-[9px]">{report.tag}</span>
                    <span className="drill-title block max-w-[350px] text-[1.25rem] font-extrabold uppercase leading-[.98] tracking-[-.02em] text-[#f3f0e9] sm:text-[1.55rem]">{report.title}</span>
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/15 text-orange-400 transition-colors group-hover:border-orange-400 group-hover:bg-orange-400 group-hover:text-[#14110e]">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </button>
              ))}
            </div>
            <div className="flex min-h-[62px] items-center justify-between gap-3 border-t border-white/15 bg-black/20 px-5 py-3 sm:px-7">
              <div className="report-kicker text-[9px] font-bold uppercase tracking-[.15em] text-zinc-500 sm:text-[10px]">SELECT A REPORT TO BEGIN</div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-orange-400" />
            </div>
          </div>
        </section>

        <footer className="report-kicker mt-5 flex flex-col gap-2 text-[9px] font-bold uppercase tracking-[.18em] text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <span>PLAYR1 ATHLETE PERFORMANCE <span className="mx-2 text-zinc-800">/</span> SCOUTING SERIES</span>
          <span className="flex items-center gap-2"><ArrowUpRight className="h-3 w-3 text-orange-400" /> ALL REPORTS BUILT FOR THE NEXT REP</span>
        </footer>
      </div>
    </main>
  );
}
