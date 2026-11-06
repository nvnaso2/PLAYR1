import { useMemo } from "react";
import { X, ArrowUpRight } from "lucide-react";
import type { Drill, Workout, WorkoutDrill } from "@shared/schema";
import drillOneMap from "@/assets/workout-2-drill-1.png";
import drillTwoMap from "@/assets/workout-2-drill-2.png";
import drillThreeMap from "@/assets/workout-2-drill-3.png";
import drillFourMap from "@/assets/workout-2-drill-4.png";
import drillFiveMap from "@/assets/workout-2-drill-5.png";
import bonusDrillMap from "@/assets/workout-2-drill-6.png";

export type DayTwoWorkoutPreviewProps = {
  workout: Workout | null;
  drills: Array<WorkoutDrill & { drill: Drill }>;
  loading: boolean;
  error: boolean;
  onClose: () => void;
  onRetry: () => void;
  onLogWorkout: () => void;
};

const drillMaps = [
  drillOneMap,
  drillTwoMap,
  drillThreeMap,
  drillFourMap,
  drillFiveMap,
  bonusDrillMap,
];

const shotTotals = [30, 20, 40, 25, 10];

export function DayTwoWorkoutPreview({
  workout,
  drills,
  loading,
  error,
  onClose,
  onRetry,
  onLogWorkout,
}: DayTwoWorkoutPreviewProps) {
  const orderedDrills = useMemo(
    () => [...drills].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [drills],
  );

  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="day-two-preview-title"
      className="relative mx-auto w-full max-w-none overflow-hidden rounded-xl border border-[#dedbd4] bg-[#fbfaf7] text-[#25231f] shadow-[0_24px_70px_rgba(41,35,26,.16)]"
      style={{ backgroundImage: "linear-gradient(135deg, transparent 0 34%, rgba(0,0,0,.028) 34% 35%, transparent 35% 65%, rgba(0,0,0,.02) 65% 66%, transparent 66%), repeating-linear-gradient(135deg, transparent 0 54px, rgba(0,0,0,.012) 55px 56px, transparent 57px 96px)" }}
    >
      <header className="relative bg-white px-5 pb-4 pt-5 sm:px-8 sm:pb-5 sm:pt-7">
        <button
          type="button"
          aria-label="Close workout preview"
          onClick={onClose}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-[#dedbd4] bg-white/90 text-[#5d5952] transition hover:border-[#ec6b31] hover:text-[#ec6b31] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ec6b31] sm:right-5 sm:top-5"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 id="day-two-preview-title" className="font-heading text-5xl font-black uppercase leading-[.9] tracking-[-.04em] text-black sm:text-7xl">
          Workout <span className="text-[#ec6b31]">#2</span>
        </h2>
        <div className="mt-3 h-[4px] bg-black" />
        <p className="mx-auto mt-3 max-w-xl text-center font-heading text-base font-black uppercase leading-[1.05] text-black sm:text-xl">
          My Recommended 125 Shot workout I Used during COVID
          <span className="block">between 8th and 9th grade</span>
        </p>
      </header>

      <div className="px-4 pb-5 pt-1 sm:px-7 sm:pb-7">
        {loading && (
          <div aria-label="Loading workout details" className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="grid animate-pulse gap-4 rounded-xl border border-[#e7e3dc] bg-white p-4 sm:grid-cols-[180px_1fr]">
                <div className="aspect-[1.45/1] rounded-lg bg-[#efede8]" />
                <div className="space-y-3 py-1"><div className="h-3 w-24 rounded bg-[#efede8]" /><div className="h-5 w-2/3 rounded bg-[#efede8]" /><div className="h-3 w-full rounded bg-[#efede8]" /><div className="h-3 w-4/5 rounded bg-[#efede8]" /></div>
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div role="alert" className="flex flex-col items-start justify-between gap-4 rounded-xl border border-[#edc9b7] bg-[#fff4ee] p-5 sm:flex-row sm:items-center">
            <div>
              <p className="font-heading text-lg font-bold text-[#38312c]">This workout didn’t load.</p>
              <p className="mt-1 text-sm text-[#766a61]">Your session is still here. Try loading the drill details again.</p>
            </div>
            <button type="button" onClick={onRetry} className="rounded-full bg-[#ec6b31] px-5 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[.14em] text-white transition hover:bg-[#d95620] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ec6b31]">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            {orderedDrills.map((entry, index) => {
              const isBonus = index === 5;
              const titleLabel = isBonus ? "Bonus Drills" : `Drill #${index + 1}`;
              const total = isBonus ? "40 layups + 5 cone sets" : `${shotTotals[index] ?? entry.defaultReps ?? "—"} shots`;
              const image = drillMaps[index];
              return (
                <article
                  key={entry.drillId}
                  className={`grid grid-cols-[minmax(112px,36%)_1fr] gap-3 overflow-hidden rounded-xl border bg-white p-3 shadow-[0_10px_24px_rgba(0,0,0,.11)] sm:grid-cols-[165px_1fr] sm:gap-5 sm:p-4 ${isBonus ? "border-[#e9c9b3]" : "border-[#e7e3dc]"}`}
                >
                  <figure className="relative flex aspect-[1.08/1] items-center justify-center overflow-hidden border-[3px] border-black bg-white">
                    {image && (
                      <img
                        src={image}
                        alt={`${titleLabel} court diagram for ${entry.drill.title}`}
                        className="h-full w-full object-contain mix-blend-multiply"
                      />
                    )}
                    <figcaption className="sr-only">{titleLabel} court diagram</figcaption>
                  </figure>
                  <div className="flex min-w-0 flex-col justify-center py-1 pr-1 sm:py-2 sm:pr-2">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-mono text-[10px] font-extrabold uppercase tracking-[.18em] text-[#ec6b31]">{titleLabel}</p>
                    </div>
                    <h4 className="mt-0.5 font-heading text-xl font-black uppercase leading-tight tracking-[-.025em] text-[#26231f] sm:text-2xl">{entry.drill.title}</h4>
                    <p className="mt-1.5 text-[11px] leading-[1.32] text-[#302e2b] sm:text-sm sm:leading-[1.4]">{entry.drill.description}</p>
                    <p className="mt-2 font-heading text-base font-black leading-none text-black sm:text-lg">Total — {total}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && !error && (
          <div className="mt-5 flex flex-col gap-4 border-t border-[#dcd7ce] pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[.19em] text-[#817a70]">{workout?.name || "Find Your Shooting Range"}</p>
              <p className="mt-1 font-heading text-xl font-black uppercase tracking-[-.025em] text-[#26231f]">125 shots <span className="text-[#b8b1a7]">+</span> 40 layups <span className="text-[#b8b1a7]">/</span> 5 cone sets</p>
              <p className="mt-1 text-xs text-[#777168]">Five shooting drills, then finishing and ball handling.</p>
            </div>
            <button
              type="button"
              onClick={onLogWorkout}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ec6b31] px-7 font-mono text-[11px] font-extrabold uppercase tracking-[.15em] text-white shadow-[0_4px_0_#c44e1d] transition hover:-translate-y-0.5 hover:bg-[#d95620] hover:shadow-[0_5px_0_#b84518] active:translate-y-0 active:shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ec6b31] sm:w-auto"
            >
              Log workout <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
