import {
  ArrowRight,
  Brain,
  Radar,
  ChevronRight,
  Crosshair,
  BookOpen,
  Target,
  Zap,
} from "lucide-react";
import { DAY4_LEAD_MAGNET_OPTIONS, type LeadMagnetOption } from "@/components/onboarding-day4/day4-lead-magnet-options";

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
      className="mx-auto w-full max-w-[680px] px-4 py-7 text-[#f5f2eb] sm:px-6 sm:py-10"
    >
      <div className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">
        <span className="h-px w-7 bg-orange-400/70" />
        Day 4 · Find your focus
      </div>
      <h1
        id="day4-interest-heading"
        className="max-w-[540px] font-heading text-3xl font-black uppercase leading-[1.02] tracking-wide sm:text-4xl"
      >
        What would help your game right now?
      </h1>
      <p className="mt-3 max-w-[500px] text-sm leading-6 text-zinc-400 sm:text-[15px]">
        Pick the area you want to understand better. Start with what’s showing
        up in your game.
      </p>

      <div className="mt-7 grid gap-3 sm:mt-8 sm:grid-cols-2">
        {options.map(({ id, title, category, description }, index) => {
          const Icon = {
            "shooting-mechanics": Target,
            "footwork-open-shots": Crosshair,
            "confidence-reality-check": Brain,
            "game-speed-shooting": Zap,
          }[id];
          return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className="group flex min-h-[118px] w-full items-start gap-4 rounded-2xl border border-white/[0.11] bg-[#111113] p-4 text-left transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-orange-400/50 hover:bg-[#171513] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909] active:translate-y-0 sm:min-h-[138px] sm:p-5"
            aria-label={`Choose ${title}`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-400/[0.08] text-orange-300 transition-colors group-hover:border-orange-300/40 group-hover:bg-orange-400/[0.14]">
              <Icon className="h-[19px] w-[19px]" strokeWidth={1.8} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.17em] text-orange-300/80">
                0{index + 1} / {category}
              </span>
              <span className="block font-heading text-lg font-bold uppercase leading-tight tracking-wide text-zinc-100">
                {title}
              </span>
              <span className="mt-1.5 block text-xs leading-[1.55] text-zinc-500">
                {description}
              </span>
            </span>
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-600 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-orange-300" />
          </button>
          );
        })}
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
      className="mx-auto w-full max-w-[680px] px-4 py-6 text-[#f5f2eb] sm:px-6 sm:py-8"
    >
      <div className="mb-5 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">
        <span className="h-px w-7 bg-orange-400/70" />
        Your next reps
      </div>
      <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-2">
        <div>
          <h2
            id="day4-hub-heading"
            className="font-heading text-3xl font-black uppercase leading-none tracking-wide sm:text-4xl"
          >
            Keep your game moving.
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Choose a place to explore, or build a session for today.
          </p>
        </div>
        <span className="pb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
          Day 4
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-7">
        <button
          type="button"
          onClick={onGameInsights}
          className="group flex min-h-[122px] flex-col items-start justify-between rounded-2xl border border-white/[0.11] bg-[#111113] p-4 text-left transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-orange-400/45 hover:bg-[#171513] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909] active:translate-y-0 sm:min-h-[148px] sm:p-5"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-orange-300 group-hover:border-orange-300/30">
            <Radar className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <span className="mt-5 flex w-full items-center justify-between gap-2">
            <span className="font-heading text-lg font-bold uppercase tracking-wide text-zinc-100 sm:text-xl">
              Game Insights
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-orange-300" />
          </span>
        </button>

        <button
          type="button"
          onClick={onDrillLibrary}
          className="group flex min-h-[122px] flex-col items-start justify-between rounded-2xl border border-white/[0.11] bg-[#111113] p-4 text-left transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 hover:border-orange-400/45 hover:bg-[#171513] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909] active:translate-y-0 sm:min-h-[148px] sm:p-5"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-orange-300 group-hover:border-orange-300/30">
            <BookOpen className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <span className="mt-5 flex w-full items-center justify-between gap-2">
            <span className="font-heading text-lg font-bold uppercase tracking-wide text-zinc-100 sm:text-xl">
              Drill Library
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-orange-300" />
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={onBuildWorkout}
        className="group mt-3 flex min-h-[68px] w-full items-center justify-between gap-4 rounded-2xl border border-orange-300/80 bg-orange-500 px-5 py-4 text-left text-[#160d08] shadow-[0_10px_28px_rgba(238,112,45,0.12)] transition-[background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-orange-400 hover:shadow-[0_12px_32px_rgba(238,112,45,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909] active:translate-y-0 sm:px-6"
      >
        <span>
          <span className="block text-[9px] font-extrabold uppercase tracking-[0.19em] text-[#47210f]/75">
            Make today count
          </span>
          <span className="mt-1 block font-heading text-xl font-black uppercase leading-none tracking-wide sm:text-2xl">
            Build a Workout
          </span>
        </span>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#4a2410]/20 bg-[#301708]/[0.08] transition-transform duration-200 group-hover:translate-x-0.5">
          <ArrowRight className="h-5 w-5" strokeWidth={2} />
        </span>
      </button>
    </section>
  );
}
