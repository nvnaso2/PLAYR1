import type { ReactNode } from "react";
import { ArrowLeft, BarChart3, Check, Clock3, Info } from "lucide-react";
import { dayTwoWorkoutArt } from "@/lib/day-two-workout-art";

export type QuickCompleteDrill = {
  id: string;
  title: string;
  category: string;
  summary: string;
  description: string;
  complete: boolean;
  image?: string;
};

type QuickCompleteWorkoutProps = {
  workoutName: string;
  drills: QuickCompleteDrill[];
  elapsed: string;
  saving: boolean;
  mode: "complete" | "track";
  isDayTwo: boolean;
  onCancel: () => void;
  onToggle: (drillId: string) => void;
  onShowInfo: (drillId: string) => void;
  onQuickComplete: () => void;
  onTrackStats: () => void;
  onSave: () => void;
  canSave: boolean;
  renderTrackControls?: (drillId: string) => ReactNode;
};

export function QuickCompleteWorkout({
  workoutName,
  drills,
  elapsed,
  saving,
  mode,
  isDayTwo,
  onCancel,
  onToggle,
  onShowInfo,
  onQuickComplete,
  onTrackStats,
  onSave,
  canSave,
  renderTrackControls,
}: QuickCompleteWorkoutProps) {
  const completedCount = drills.filter((drill) => drill.complete).length;
  const progress = drills.length > 0 ? (completedCount / drills.length) * 100 : 0;
  const tracking = mode === "track";

  return (
    <main
      className={`fixed inset-0 z-40 overflow-y-auto text-[#181818] ${tracking ? "bg-white" : "bg-[#f5f4f0]"}`}
      data-testid="quick-complete-workout"
    >
      <div className={`pointer-events-none fixed inset-0 ${tracking ? "opacity-[0.07]" : "opacity-[0.16]"}`} aria-hidden="true">
        <svg className="h-full w-full" viewBox="0 0 560 1100" preserveAspectRatio="none">
          <g fill="none" stroke="#aaa69f" strokeWidth="2">
            <circle cx="280" cy="560" r="238" />
            <path d="M42 560H518M280 322V798M68 365C175 451 175 669 68 755M492 365C385 451 385 669 492 755" />
            <path d="M-70 170C135 110 425 112 630 170M-85 930C115 990 445 990 645 930" />
          </g>
        </svg>
      </div>
      <div className="relative mx-auto min-h-full max-w-4xl px-4 pb-32 pt-[calc(env(safe-area-inset-top,0px)+1rem)] sm:px-7 sm:pt-[calc(env(safe-area-inset-top,0px)+1.75rem)]">
        <header className="rounded-2xl border border-black/10 bg-white/95 p-4 shadow-[0_12px_34px_rgba(0,0,0,.07)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-bold uppercase tracking-[.2em] text-orange-600">Workout in progress</p>
              <h1 className="mt-1 font-heading text-3xl font-black uppercase leading-none sm:text-5xl">{workoutName}</h1>
              <div className="mt-3 flex items-center gap-2 text-xs font-semibold text-zinc-500">
                <Clock3 className="h-4 w-4 text-orange-600" />
                <span>{elapsed}</span>
                <span className="text-zinc-300">·</span>
                <span>{drills.length} drills</span>
              </div>
            </div>
            <div className="flex w-[132px] shrink-0 flex-col items-stretch gap-2">
              <button type="button" onClick={onCancel} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-black/10 px-3 text-xs font-bold uppercase tracking-wide text-zinc-600 transition hover:border-black/25 hover:text-black" data-testid="button-cancel-workout">
                <ArrowLeft className="h-4 w-4" />
                Exit
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving || !canSave}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-2 font-mono text-[9px] font-extrabold uppercase tracking-[.08em] text-black shadow-[0_3px_0_#a93c0d] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-45"
                data-testid="button-complete-workout-header"
              >
                <Check className="h-4 w-4" />
                {saving ? "Saving…" : "Complete Workout"}
              </button>
            </div>
          </div>

          <div className={`mt-5 flex w-full items-center rounded-xl p-1 ${tracking ? "border border-zinc-200 bg-white" : "bg-zinc-100"}`} aria-label="Workout logging mode">
            <button type="button" onClick={onQuickComplete} aria-pressed={!tracking} className={`flex-1 rounded-lg px-3 py-2.5 text-xs font-extrabold uppercase tracking-[.12em] shadow-sm transition ${!tracking ? "bg-[#111] text-white" : "text-zinc-500 hover:text-black"}`}>
              <Check className="mr-1.5 inline h-4 w-4 text-orange-400" />
              Quick Complete
            </button>
            <button type="button" onClick={onTrackStats} aria-pressed={tracking} className={`flex-1 rounded-lg px-3 py-2.5 text-xs font-extrabold uppercase tracking-[.12em] shadow-sm transition ${tracking ? "bg-[#111] text-white" : "text-zinc-500 hover:text-black"}`}>
              <BarChart3 className="mr-1.5 inline h-4 w-4" />
              Track Stats
            </button>
          </div>
        </header>

        <section className="mt-4 rounded-2xl border border-black/10 bg-white/95 p-4 shadow-[0_8px_24px_rgba(0,0,0,.05)] sm:p-5" aria-label="Workout progress">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[.18em] text-zinc-500">Your progress</p>
              <p className="mt-1 font-heading text-2xl font-black uppercase">{completedCount}<span className="mx-1 text-orange-500">/</span>{drills.length} {tracking ? "tracked" : "complete"}</p>
            </div>
            <p className="pb-1 text-right text-xs text-zinc-500">{tracking ? "Choose a spot and enter your results." : <>Tap each drill as you finish.<br className="sm:hidden" /> No stats needed.</>}</p>
          </div>
          <div className={`mt-3 h-2 overflow-hidden rounded-full ${tracking ? "border border-zinc-200 bg-white" : "bg-zinc-100"}`}>
            <div className="h-full rounded-full bg-orange-500 transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        </section>

        <section className="mt-5 space-y-4" aria-label="Workout drills">
          {drills.map((drill, index) => {
            const content = (
              <>
                {drill.image ? (
                  <span className="flex h-[88px] w-[104px] shrink-0 items-center justify-center sm:h-[110px] sm:w-[132px]">
                    <img src={drill.image} alt="" className="max-h-full max-w-full object-contain" />
                  </span>
                ) : (
                  <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-[#f3f1ed] font-heading text-3xl font-black text-orange-600 sm:h-[84px] sm:w-[84px]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                )}
                <span className="min-w-0 flex-1 py-1">
                  <span className="block font-mono text-[9px] font-bold uppercase tracking-[.18em] text-orange-600">
                    {isDayTwo && index === 5 ? "Bonus drills" : `Drill ${String(index + 1).padStart(2, "0")}`}
                  </span>
                  <span className="mt-0.5 block font-heading text-xl font-black uppercase leading-tight sm:text-2xl">{drill.title}</span>
                  <span className="mt-1.5 block font-heading text-sm font-black uppercase text-zinc-900">{drill.summary}</span>
                </span>
                {!tracking && <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition ${
                  drill.complete ? "border-orange-500 bg-orange-500 text-black" : "border-zinc-300 text-transparent"
                }`}>
                  <Check className="h-5 w-5" strokeWidth={3} />
                </span>}
              </>
            );
            return (
            <article key={drill.id} className={`flex items-center gap-2 rounded-2xl border bg-white/95 p-2 shadow-[0_8px_24px_rgba(0,0,0,.05)] transition sm:gap-3 sm:p-3 ${
              drill.complete ? "border-orange-400/70 ring-1 ring-orange-400/30" : "border-black/10 hover:border-black/25"
            }`}>
              {tracking ? (
                <div className="flex min-w-0 flex-1 flex-col gap-1 sm:gap-2 lg:flex-row lg:items-center lg:gap-3">
                  <div className="group flex min-w-0 items-center gap-3 rounded-xl p-1 text-left sm:gap-5 sm:p-2 lg:flex-[1.15]" data-testid={`quick-complete-drill-${drill.id}`}>
                    {content}
                  </div>
                  <div className="min-w-0 flex-1 lg:max-w-[56%]">{renderTrackControls?.(drill.id)}</div>
                </div>
              ) : (
                <button type="button" onClick={() => onToggle(drill.id)} aria-pressed={drill.complete} data-testid={`quick-complete-drill-${drill.id}`} className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:gap-5 sm:p-2">
                  {content}
                </button>
              )}
              <button
                type="button"
                onClick={() => onShowInfo(drill.id)}
                aria-label={`More information about ${drill.title}`}
                title="Drill information"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:mr-1"
                data-testid={`button-drill-info-${drill.id}`}
              >
                <Info className="h-5 w-5" />
              </button>
            </article>
          );})}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white/95 px-4 py-3 backdrop-blur-md sm:px-7">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-heading text-xl font-black uppercase">{completedCount} of {drills.length} {tracking ? "tracked" : "selected"}</p>
            <p className="truncate text-[11px] text-zinc-500">{tracking ? "Your spot-by-spot results will be saved to Training History." : completedCount ? "Only completed drills are saved." : "Check off at least one drill to save."}</p>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !canSave}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 font-mono text-[10px] font-extrabold uppercase tracking-[.12em] text-black shadow-[0_3px_0_#a93c0d] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-45 sm:px-6 sm:text-xs"
            data-testid="button-finish-workout"
          >
            {saving ? "Saving…" : "Complete Workout"}
          </button>
        </div>
      </div>
    </main>
  );
}
