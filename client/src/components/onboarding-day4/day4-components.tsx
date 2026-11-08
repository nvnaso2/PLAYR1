import {
  ChevronRight,
  Dumbbell,
} from "lucide-react";
import { DAY4_LEAD_MAGNET_OPTIONS, type LeadMagnetOption } from "@/components/onboarding-day4/day4-lead-magnet-options";
import { volumeWorkoutCardArt } from "@/lib/day-three-workout-art";
import logoImg from "@assets/PNG_image_auth_trimmed.png";

export type Day4LeadMagnetInterestStepProps = {
  options?: readonly LeadMagnetOption[];
  onSelect: (option: LeadMagnetOption["id"]) => void;
};

export function Day4LeadMagnetInterestStep({
  options = DAY4_LEAD_MAGNET_OPTIONS,
  onSelect,
}: Day4LeadMagnetInterestStepProps) {
  return (
    <section
      aria-labelledby="day4-interest-heading"
      className="mx-auto w-full max-w-[680px] px-5 py-7 text-white sm:px-6 sm:py-9"
    >
      <div className="flex flex-col items-center">
        <img src={logoImg} alt="PLAYR1" className="mb-9 h-12 w-auto max-w-[190px] object-contain" />
        <div className="w-full">
          <h1
            id="day4-interest-heading"
            className="mb-8 font-heading text-[26px] font-black uppercase leading-none tracking-tight"
          >
            Game Insights
          </h1>
          <fieldset className="m-0 w-full border-0 p-0">
            <legend className="mb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-zinc-300">
              Which part of your game would you like to work on the most?
            </legend>
            <div className="space-y-3">
              {options.map(({ id, title }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelect(id)}
                  className="group flex min-h-[60px] w-full items-center justify-between rounded-full border border-[#f97316] bg-[#090909] px-6 text-left text-zinc-200 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-px hover:border-[#fb923c] hover:bg-[#100d0b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] focus-visible:ring-offset-2 focus-visible:ring-offset-black active:translate-y-0 sm:min-h-[66px] sm:px-7"
                  aria-label={`Choose ${title}`}
                >
                  <span className="text-sm font-semibold tracking-[0.04em] sm:text-base">{title}</span>
                  <span aria-hidden="true" className="ml-4 text-xl leading-none text-zinc-600 transition-colors group-hover:text-[#f97316]">›</span>
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </div>
    </section>
  );
}

export type Day4HubActionSurfaceProps = {
  onGameInsights: () => void;
  onDrillLibrary: () => void;
  onBuildWorkout: () => void;
};

export function Day4HubActionSurface({
  onGameInsights,
  onDrillLibrary,
  onBuildWorkout,
}: Day4HubActionSurfaceProps) {
  return (
    <section
      aria-labelledby="day4-hub-heading"
      className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col justify-between gap-2 pb-2 text-white"
    >
      <h2 id="day4-hub-heading" className="sr-only">Day 4 Hub</h2>
      <div className="grid flex-1 grid-cols-2 items-center gap-3">
        <button
          type="button"
          onClick={onGameInsights}
          className="group flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-1 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          aria-label="Game Insights"
        >
          <span className="relative flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-[20px] border border-white bg-gradient-to-br from-white to-zinc-200 shadow-[0_7px_22px_rgba(255,255,255,0.12)] transition group-hover:scale-[1.04] group-hover:shadow-[0_9px_26px_rgba(255,255,255,0.2)]">
            <svg viewBox="0 0 68 68" className="h-full w-full" fill="none" aria-hidden="true">
              <path d="M13 48.5a22 22 0 0 1 42 0" stroke="#18181b" strokeOpacity=".2" strokeWidth="1.2" />
              <path d="M19 48.5a16 16 0 0 1 30 0" stroke="#18181b" strokeOpacity=".34" strokeWidth="1.2" />
              <path d="M25 48.5a10 10 0 0 1 18 0" stroke="#18181b" strokeOpacity=".5" strokeWidth="1.2" />
              <path d="M14 43.5h40M18 36.5h32M24 30h20" stroke="#18181b" strokeOpacity=".12" strokeWidth="1" />
              <path d="M17 46 27 38l8 4 15-17" stroke="#09090b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="17" cy="46" r="2.4" fill="#09090b" />
              <circle cx="27" cy="38" r="2.4" fill="#09090b" />
              <circle cx="35" cy="42" r="2.4" fill="#09090b" />
              <circle cx="50" cy="25" r="3.8" fill="#09090b" stroke="#fff" strokeWidth="1.6" />
              <path d="M22 54h24" stroke="#09090b" strokeOpacity=".72" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-[10px] font-bold leading-tight text-zinc-300">Game Insights</span>
        </button>

        <button
          type="button"
          onClick={onDrillLibrary}
          className="group flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-1 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          aria-label="Drill Library"
        >
          <span className="relative flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-[20px] border border-orange-300/45 bg-[linear-gradient(145deg,#39302a,#151516_65%)] shadow-[0_5px_18px_rgba(0,0,0,0.34)] transition group-hover:-translate-y-0.5 group-hover:border-orange-200/70">
            <svg viewBox="0 0 68 68" className="h-full w-full" fill="none" aria-hidden="true">
              <path d="M18 16.5h31a4 4 0 0 1 4 4v31H22a4 4 0 0 1-4-4v-31Z" fill="#211d1a" stroke="#f97316" strokeOpacity=".75" strokeWidth="1.4" />
              <path d="M14 21h31a4 4 0 0 1 4 4v31H18a4 4 0 0 1-4-4V21Z" fill="#f0e4d0" stroke="#f8c58e" strokeWidth="1.3" />
              <path d="M19 26h21v18H19z" stroke="#4a4137" strokeWidth="1.3" />
              <path d="M29.5 26v18M19 35h21" stroke="#4a4137" strokeOpacity=".65" strokeWidth="1" />
              <path d="M25 26a4.5 4.5 0 0 0 9 0" stroke="#4a4137" strokeWidth="1" />
              <circle cx="23" cy="32" r="1.7" fill="#ea580c" />
              <circle cx="36" cy="40" r="1.7" fill="#ea580c" />
              <path d="m23 32 6 5 7 3" stroke="#ea580c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2" />
              <path d="m41 49 3 3 6-8" stroke="#c2410c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M19 48h17" stroke="#b3a48f" strokeWidth="1.1" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-[10px] font-bold leading-tight text-zinc-300">Drill Library</span>
        </button>
      </div>

      <button
        type="button"
        onClick={onBuildWorkout}
        className="group flex h-[min(50dvh,440px)] max-h-[440px] w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-zinc-300 bg-[#f6f6f4] text-left text-zinc-950 shadow-[0_14px_38px_rgba(0,0,0,0.3)] transition hover:shadow-[0_18px_44px_rgba(0,0,0,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
        aria-label="Build a Workout"
      >
        <span className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-3 sm:px-6 sm:pt-5">
          <span
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              backgroundImage:
                "linear-gradient(135deg, transparent 0 34%, rgba(0,0,0,.035) 34% 35%, transparent 35% 65%, rgba(0,0,0,.025) 65% 66%, transparent 66%), repeating-linear-gradient(135deg, transparent 0 54px, rgba(0,0,0,.018) 55px 56px, transparent 57px 96px), radial-gradient(ellipse at top right, white, transparent 55%)",
            }}
          />
          <span className="relative flex min-h-0 flex-1 flex-col border-b-[3px] border-black pb-3 sm:pb-4">
            <span className="relative z-10 flex items-start justify-between gap-2">
              <span className="min-w-0 pt-1 pr-1">
                <span className="block font-heading text-3xl font-black uppercase leading-none tracking-tight sm:text-4xl">
                  Build <span className="text-orange-600">A</span> Workout
                </span>
                <span className="mt-2 block font-heading text-base font-black uppercase leading-tight sm:text-lg">Create a Custom Workout</span>
                <span className="mt-1.5 block text-xs font-semibold leading-snug text-zinc-600 sm:text-sm">Unlimited drills to improve your game</span>
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-900 shadow-sm sm:h-10 sm:w-10">
                <Dumbbell className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
            </span>
            <span className="relative flex min-h-0 flex-1 items-center justify-center">
              <img
                src={volumeWorkoutCardArt}
                alt=""
                className="pointer-events-none block h-[min(31dvh,260px)] w-[min(82vw,380px)] max-h-full max-w-full object-contain sm:h-[min(33dvh,300px)] sm:w-[min(58vw,430px)]"
              />
            </span>
          </span>
          <span className="relative mt-2 flex min-h-12 shrink-0 items-center justify-between gap-3 rounded-xl bg-black px-4 py-2 text-left text-white shadow-[0_12px_22px_rgba(0,0,0,0.35)] transition group-hover:bg-zinc-900 group-hover:shadow-[0_14px_26px_rgba(0,0,0,0.42)]">
            <span>
              <span className="block text-xs font-black uppercase tracking-[0.12em] sm:text-sm">Build your workout</span>
              <span className="mt-0.5 block text-[10px] text-zinc-400">Pick your drills and get to work</span>
            </span>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-orange-400 transition group-hover:translate-x-1">
              <ChevronRight className="h-5 w-5" />
            </span>
          </span>
        </span>
      </button>
    </section>
  );
}
